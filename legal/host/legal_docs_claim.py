"""Legal-only native Docs CAS reservation planner.

The native parser follows the strict Finance Docs protocol supplied with BO-04,
while store identity, effect class, receipt and canonical target are Legal-only.
This file plans writes; the host performs connected-tool reads, required-revision
Docs updates and exact readback. It never writes raw Drive JSON.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import math
import re
import sys

FORMAT = "FERNAIN_LEGAL_RESERVATIONS_V1"
VERSION = "legal-reservation-v1"
SUCCESSOR_FORMAT = "FERNAIN_LEGAL_MATTER_V1"
LEGAL_PARENT = "{{CONFIGURE_GOOGLE_ID_078}}"
CANONICAL_RECORD = "{{CONFIGURE_GOOGLE_ID_034}}"
BINDING_FIELDS = {
    "request_id", "matter_id", "source_id", "source_version", "source_sha256",
    "policy_sha256", "guide_sha256", "consumer_id", "output_parent_id",
    "queue_id", "operation", "original_source_id", "current_source_id",
    "authorization_reference",
}


class Held(ValueError):
    """No write is admitted; preserve current state and evidence."""


def require(ok, reason):
    if not ok:
        raise Held(reason)


def exact_object(value, fields, label):
    require(type(value) is dict and set(value) == set(fields), label + " fields/types")


def ident(value):
    require(type(value) is str and bool(re.fullmatch(r"[A-Za-z0-9_.:@-]{1,200}", value)), "invalid identifier")
    return value


def request_id(value):
    require(type(value) is str and 0 < len(value) <= 1024 and not any(ord(c) < 33 or ord(c) == 127 for c in value), "invalid request ID")
    require(
        bool(re.fullmatch(r"[A-Za-z0-9_.:@-]{1,200}", value))
        or bool(re.fullmatch(r"https://(?:drive\.google\.com/file/d|docs\.google\.com/document/d)/[A-Za-z0-9_-]+/(?:view|edit)(?:\?usp=[A-Za-z0-9_-]+)?", value)),
        "unrecognized request ID",
    )
    return value


def digest(value):
    require(type(value) is str and bool(re.fullmatch(r"[0-9a-f]{64}", value)), "invalid lowercase SHA256")
    return value


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def sha(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def strict_json_loads(value):
    def pairs(items):
        out = {}
        for key, item in items:
            require(key not in out, "duplicate JSON key")
            out[key] = item
        return out
    return json.loads(value, object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(Held("nonfinite JSON")))


def validate_config(config):
    base = {"documentId", "tabId", "ownerId", "parentId", "canonicalRecordId"}
    successor = {"canonicalTabId", "legacyRecordId", "matterId", "privateAllowedEmails"}
    require(type(config) is dict and set(config) in (base, base | successor), "Legal Docs config fields/types")
    for key, value in config.items():
        if key != "privateAllowedEmails":
            ident(value)
    require(config["parentId"] == LEGAL_PARENT, "wrong Legal private parent")
    if successor <= set(config):
        emails = config["privateAllowedEmails"]
        require(type(emails) is list and bool(emails) and len(emails) <= 10
                and all(type(email) is str and bool(re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", email))
                        for email in emails), "Legal private ACL allowlist invalid")
        require(len(set(emails)) == len(emails), "duplicate Legal private ACL principal")
        require(config["legacyRecordId"] == CANONICAL_RECORD
                and config["canonicalRecordId"] not in {CANONICAL_RECORD, config["documentId"]}
                and config["documentId"] != CANONICAL_RECORD,
                "wrong successor Legal target")
    else:
        require(config["canonicalRecordId"] == CANONICAL_RECORD and config["documentId"] != CANONICAL_RECORD,
                "wrong legacy Legal target")
    return config


def successor_mode(config):
    return "canonicalTabId" in config


def validate_binding(binding, config):
    exact_object(binding, BINDING_FIELDS, "Legal binding")
    for key in BINDING_FIELDS - {"source_sha256", "policy_sha256", "guide_sha256", "request_id"}:
        ident(binding[key])
    request_id(binding["request_id"])
    for key in ("source_sha256", "policy_sha256", "guide_sha256"):
        digest(binding[key])
    require(binding["consumer_id"] == config["ownerId"], "unregistered Legal consumer")
    require(binding["output_parent_id"] == LEGAL_PARENT and binding["queue_id"] == config["canonicalRecordId"],
            "wrong private Legal destination")
    if successor_mode(config):
        require(binding["matter_id"] == config["matterId"], "wrong canonical Legal matter")
    require(binding["current_source_id"] == binding["source_id"], "current source mismatch")
    require(binding["operation"] in {"legal_private_review", "reservation_probe"}, "unapproved Legal effect class")
    return binding


def action_key(binding, config):
    validate_binding(binding, config)
    return sha({key: binding[key] for key in ("source_id", "source_version", "consumer_id", "operation")})


def validate_ledger(store, config):
    exact_object(store, {"format", "owner_id", "active_key", "entries"}, "Legal reservation store")
    require(store["format"] == FORMAT and store["owner_id"] == config["ownerId"], "wrong Legal reservation store")
    require(type(store["entries"]) is dict and len(store["entries"]) <= 1000, "reservation capacity/schema")
    active = []
    for key, record in store["entries"].items():
        digest(key)
        exact_object(record, {"binding", "token", "state", "output", "record_receipt", "cancel_reason", "manual_base_sha256"}, "Legal record")
        binding = validate_binding(record["binding"], config)
        require(key == action_key(binding, config), "Legal action key mismatch")
        digest(record["token"])
        digest(record["manual_base_sha256"])
        require(record["state"] in {"claimed", "effect_uncertain", "effect_confirmed", "closed", "cancelled_before_effect"}, "bad Legal state")
        if record["state"] in {"claimed", "effect_uncertain", "effect_confirmed"}:
            active.append(key)
        if record["state"] in {"effect_confirmed", "closed"}:
            exact_object(record["output"], {"id", "parent_id", "content_sha256", "result_sha256"}, "Legal output")
            require(record["output"]["id"] == config["canonicalRecordId"] and record["output"]["parent_id"] == LEGAL_PARENT,
                    "wrong Legal output target")
            digest(record["output"]["content_sha256"])
            digest(record["output"]["result_sha256"])
        else:
            require(record["output"] is None, "premature Legal output")
        if record["state"] == "closed":
            exact_object(record["record_receipt"], {"record_id", "content_sha256", "result_sha256"}, "Legal record receipt")
            require(record["record_receipt"]["record_id"] == config["canonicalRecordId"]
                    and record["record_receipt"]["content_sha256"] == record["output"]["content_sha256"]
                    and record["record_receipt"]["result_sha256"] == record["output"]["result_sha256"],
                    "Legal receipt mismatch")
        else:
            require(record["record_receipt"] is None, "premature Legal record receipt")
        if record["state"] == "cancelled_before_effect":
            ident(record["cancel_reason"])
        else:
            require(record["cancel_reason"] is None, "invalid Legal cancellation")
    require(len(active) <= 1, "multiple active Legal owners")
    require(store["active_key"] == (active[0] if active else None), "Legal active owner mismatch")


def provider_metadata(raw, config, expected_mime, expected_id=None):
    require(type(raw) is dict and "structuredContent" in raw, "connected-tool metadata envelope required")
    require(raw.get("isError") is not True, "connected-tool metadata error")
    data = raw["structuredContent"]
    require(type(data) is dict, "provider metadata object required")
    expected_id = expected_id or (config["documentId"] if expected_mime == "application/vnd.google-apps.document"
                                  else CANONICAL_RECORD)
    require(data.get("id") == expected_id, "wrong provider object")
    require(data.get("mime_type") == expected_mime, "wrong provider MIME type")
    parents = data.get("parent_ids")
    require(type(parents) is list and LEGAL_PARENT in parents and all(type(x) is str for x in parents),
            "wrong Legal private parent")
    return data


def unwrap_document(result):
    require(type(result) is dict, "Docs object required")
    data = result
    if "structuredContent" in data:
        require(set(data) <= {"structuredContent", "content", "isError", "_meta"}, "ambiguous Docs envelope")
        require(data.get("isError") is not True, "Docs connector error")
        data = data["structuredContent"]
    for _ in range(2):
        require(type(data) is dict, "Docs structured resource required")
        if "documentId" in data:
            return data
        require(set(data) in ({"result"}, {"document"}), "unsupported/ambiguous Docs wrapper")
        data = data[next(iter(data))]
    raise Held("Docs documentId unavailable")


def native_object(value, required, optional, label):
    require(type(value) is dict and set(required) <= set(value) <= set(required) | set(optional),
            "unknown/missing/mixed native " + label + " shape")


def native_index(value, label):
    require(type(value) is int and value >= 0, "native " + label + " must be integer")
    return value


FLAT_ROOT = {"documentId", "title", "revisionId", "suggestionsViewMode", "url", "body", "tabs", "document_url"}
FLAT_TAB = {"tabId", "title", "parentTabId", "index", "nestingLevel", "iconEmoji", "body",
            "headers", "footers", "footnotes", "documentStyle", "suggestedDocumentStyleChanges",
            "namedStyles", "suggestedNamedStylesChanges", "lists", "namedRanges", "inlineObjects",
            "positionedObjects", "documentId", "document_url"}
EMPTY_NATIVE_MAPS = {"headers", "footers", "footnotes", "inlineObjects", "positionedObjects", "lists", "namedRanges"}


def normalized_document_shape(doc):
    tabs = doc.get("tabs")
    require(type(tabs) is list and len(tabs) == 1 and type(tabs[0]) is dict,
            "single typed Legal tab required")
    tab = tabs[0]
    if "tabId" not in tab:
        return doc
    native_object(doc, FLAT_ROOT, set(), "flattened Legal document")
    native_object(tab, FLAT_TAB, set(), "flattened Legal tab")
    require(type(doc["documentId"]) is str and tab["documentId"] == doc["documentId"],
            "flattened Legal document mismatch")
    url = "https://docs.google.com/document/d/" + doc["documentId"]
    require(doc["document_url"] == url and tab["document_url"] == url
            and doc["url"] in (None, url), "flattened Legal URL mismatch")
    require(doc["body"] is None, "mixed flattened root body forbidden")
    require(tab["parentTabId"] is None and (tab["nestingLevel"] is None or
            type(tab["nestingLevel"]) is int and tab["nestingLevel"] == 0),
            "nested flattened Legal tab")
    require(type(tab["index"]) is int and tab["index"] == 0, "flattened Legal tab index")
    require(type(tab["title"]) is str and tab["iconEmoji"] is None,
            "unsupported flattened Legal tab metadata")
    require(tab["suggestedDocumentStyleChanges"] is None
            and tab["suggestedNamedStylesChanges"] is None,
            "suggested flattened Legal styles forbidden")
    require(type(tab["documentStyle"]) is dict and type(tab["namedStyles"]) is dict
            and type(tab["body"]) is dict, "flattened Legal native content required")
    for field in EMPTY_NATIVE_MAPS:
        require(tab[field] is None or type(tab[field]) is dict and not tab[field],
                "flattened non-ledger Legal content")
    return {"documentId": doc["documentId"], "revisionId": doc["revisionId"],
            "title": doc["title"], "suggestionsViewMode": doc["suggestionsViewMode"],
            "documentStyle": tab["documentStyle"], "namedStyles": tab["namedStyles"],
            "tabs": [{"tabProperties": {"tabId": tab["tabId"], "title": tab["title"], "index": tab["index"]},
                      "documentTab": {"body": tab["body"], **{field: {} for field in EMPTY_NATIVE_MAPS}}}]}


def metadata(value, allowed, label):
    native_object(value, set(), set(allowed.split()), label)
    objects = {"foregroundColor", "backgroundColor", "fontSize", "weightedFontFamily", "spaceAbove",
               "spaceBelow", "borderBetween", "borderTop", "borderBottom", "borderLeft", "borderRight",
               "indentFirstLine", "indentStart", "indentEnd", "shading", "marginTop", "marginBottom",
               "marginLeft", "marginRight", "marginHeader", "marginFooter", "background", "pageSize",
               "documentSize", "documentFormat", "color", "rgbColor", "width", "height", "padding",
               "paddingEnd", "offset"}
    arrays = {"tabStops", "columnProperties"}
    booleans = {"bold", "italic", "underline", "strikethrough", "smallCaps", "keepWithNext",
                "keepTogether", "keepLinesTogether", "pageBreakBefore", "avoidWidowAndOrphan",
                "flipPageOrientation", "useFirstPageHeaderFooter", "useEvenPageHeaderFooter",
                "useCustomHeaderFooterMargins"}
    numbers = {"lineSpacing", "pageNumberStart", "magnitude", "red", "green", "blue", "alpha", "weight"}
    nested = {"magnitude", "unit", "color", "rgbColor", "red", "green", "blue", "alpha",
              "fontFamily", "weight", "width", "height", "padding", "paddingEnd", "dashStyle",
              "backgroundColor", "offset", "alignment", "documentMode"}

    def check(key, item):
        if key in objects:
            native_object(item, set(), nested, "nested " + key)
            for child, child_item in item.items():
                check(child, child_item)
        elif key in arrays:
            require(type(item) is list, "native metadata array")
            for child_item in item:
                native_object(child_item, set(), nested, "nested " + key)
                for child, nested_item in child_item.items():
                    check(child, nested_item)
        elif key in booleans:
            require(type(item) is bool, "native metadata boolean")
        elif key in numbers:
            require(type(item) in (int, float) and -1_000_000_000 <= item <= 1_000_000_000
                    and math.isfinite(item), "native metadata number")
        else:
            require(type(item) is str and bool(item.strip()), "native metadata string")
    for key, item in value.items():
        check(key, item)


TEXT_STYLE = "bold italic underline strikethrough smallCaps foregroundColor backgroundColor fontSize weightedFontFamily baselineOffset"
PARAGRAPH_STYLE = "headingId namedStyleType alignment lineSpacing direction spacingMode spaceAbove spaceBelow borderBetween borderTop borderBottom borderLeft borderRight indentFirstLine indentStart indentEnd keepWithNext keepTogether keepLinesTogether pageBreakBefore avoidWidowAndOrphan shading tabStops"
SECTION_STYLE = "columnProperties columnSeparatorStyle contentDirection sectionType marginTop marginBottom marginLeft marginRight marginHeader marginFooter flipPageOrientation defaultHeaderId defaultFooterId firstPageHeaderId firstPageFooterId evenPageHeaderId evenPageFooterId useFirstPageHeaderFooter pageNumberStart"
DOCUMENT_STYLE = "pageNumberStart background defaultHeaderId defaultFooterId evenPageHeaderId firstPageHeaderId useFirstPageHeaderFooter useEvenPageHeaderFooter pageSize documentSize marginTop marginBottom marginLeft marginRight marginHeader marginFooter flipPageOrientation useCustomHeaderFooterMargins defaultTabStop documentFormat"


def native_text(raw, config):
    doc = normalized_document_shape(unwrap_document(raw))
    native_object(doc, {"documentId", "revisionId", "tabs"},
                  {"title", "documentStyle", "namedStyles", "suggestionsViewMode",
                   "headers", "footers", "footnotes", "inlineObjects", "positionedObjects",
                   "lists", "namedRanges"}, "document")
    require(doc["documentId"] == config["documentId"], "wrong durable Legal document")
    revision = doc["revisionId"]
    require(type(revision) is str and revision and revision == revision.strip()
            and not any(ord(c) < 33 or ord(c) == 127 for c in revision), "Docs revision unavailable")
    if "suggestionsViewMode" in doc:
        require(doc["suggestionsViewMode"] == "SUGGESTIONS_INLINE", "unsupported suggestions view")
    if "documentStyle" in doc:
        metadata(doc["documentStyle"], DOCUMENT_STYLE, "documentStyle")
    if "namedStyles" in doc:
        native_object(doc["namedStyles"], {"styles"}, set(), "namedStyles")
        require(type(doc["namedStyles"]["styles"]) is list, "named styles array")
        for style in doc["namedStyles"]["styles"]:
            native_object(style, {"namedStyleType"}, {"textStyle", "paragraphStyle"}, "named style")
            require(type(style["namedStyleType"]) is str and bool(style["namedStyleType"]), "named style type")
            if "textStyle" in style:
                metadata(style["textStyle"], TEXT_STYLE, "named text style")
            if "paragraphStyle" in style:
                metadata(style["paragraphStyle"], PARAGRAPH_STYLE, "named paragraph style")
    tabs = doc["tabs"]
    require(type(tabs) is list and len(tabs) == 1, "dedicated single-tab Legal ledger required")
    tab = tabs[0]
    native_object(tab, {"tabProperties", "documentTab"}, {"childTabs"}, "Legal tab")
    if "childTabs" in tab:
        require(tab["childTabs"] == [], "nested Legal tabs forbidden")
    props = tab["tabProperties"]
    native_object(props, {"tabId"}, {"title", "index", "parentTabId"}, "Legal tab properties")
    require(props["tabId"] == config["tabId"], "wrong Legal tab")
    if "index" in props:
        require(native_index(props["index"], "Legal tab index") == 0, "wrong Legal tab index")
    if "parentTabId" in props:
        require(props["parentTabId"] == "", "nested Legal tab forbidden")
    body = tab["documentTab"]
    native_object(body, {"body"}, {"headers", "footers", "footnotes", "inlineObjects",
                                  "positionedObjects", "lists", "namedRanges"}, "Legal documentTab")
    for parent in (doc, body):
        for field in ("headers", "footers", "footnotes", "inlineObjects", "positionedObjects", "lists", "namedRanges"):
            if field in parent:
                require(type(parent[field]) is dict and not parent[field], "non-ledger native content")
    native_object(body["body"], {"content"}, set(), "Legal body")
    content = body["body"]["content"]
    require(type(content) is list and len(content) >= 2, "Legal ledger body missing")
    section = content[0]
    native_object(section, {"endIndex", "sectionBreak"}, {"startIndex"}, "section element")
    require(native_index(section.get("startIndex", 0), "section start") == 0
            and native_index(section["endIndex"], "section end") == 1, "wrong Legal body start")
    native_object(section["sectionBreak"], set(), {"sectionStyle"}, "section break")
    if "sectionStyle" in section["sectionBreak"]:
        metadata(section["sectionBreak"]["sectionStyle"], SECTION_STYLE, "section style")
    text = ""
    cursor = 1
    for element in content[1:]:
        native_object(element, {"startIndex", "endIndex", "paragraph"}, set(), "paragraph")
        start = native_index(element["startIndex"], "paragraph start")
        end = native_index(element["endIndex"], "paragraph end")
        require(start == cursor and end > start, "Legal paragraph indices")
        paragraph = element["paragraph"]
        native_object(paragraph, {"elements"}, {"paragraphStyle"}, "paragraph body")
        if "paragraphStyle" in paragraph:
            style = paragraph["paragraphStyle"]
            metadata(style, PARAGRAPH_STYLE, "paragraph style")
            require(style.get("namedStyleType", "NORMAL_TEXT") == "NORMAL_TEXT", "non-normal Legal paragraph")
        runs = paragraph["elements"]
        require(type(runs) is list and runs, "Legal text runs missing")
        run_cursor = start
        paragraph_text = ""
        for run in runs:
            native_object(run, {"startIndex", "endIndex", "textRun"}, set(), "Legal text run")
            rs = native_index(run["startIndex"], "run start")
            re_ = native_index(run["endIndex"], "run end")
            tr = run["textRun"]
            native_object(tr, {"content"}, {"textStyle"}, "textRun")
            part = tr["content"]
            require(type(part) is str and bool(part), "Legal text missing")
            if "textStyle" in tr:
                metadata(tr["textStyle"], TEXT_STYLE, "text style")
            try:
                units = len(part.encode("utf-16-le")) // 2
            except UnicodeError as exc:
                raise Held("invalid UTF-16 text") from exc
            require(rs == run_cursor and re_ == rs + units and re_ <= end, "Legal run UTF-16 indices")
            paragraph_text += part
            run_cursor = re_
        require(run_cursor == end and paragraph_text.endswith("\n"), "Legal paragraph range/text")
        text += paragraph_text
        cursor = end
    require(cursor == 1 + len(text.encode("utf-16-le")) // 2, "Legal body UTF-16 length")
    require(text.endswith("\n") and len(text) <= 1_000_000, "Legal reservation text limits")
    return revision, text, cursor


def snapshot(document, metadata, config):
    validate_config(config)
    provider_metadata(metadata, config, "application/vnd.google-apps.document")
    revision, text, end = native_text(document, config)
    store = strict_json_loads(text)
    validate_ledger(store, config)
    require(text == canonical(store) + "\n", "Legal ledger must be canonical JSON plus newline")
    return revision, text, end, store


def parse_record_readback(raw, config):
    provider_metadata(raw, config, "application/json")
    data = raw["structuredContent"]
    payload = data.get("b64_string")
    require(type(payload) is str and 0 < len(payload) <= 4_000_000, "raw Legal content missing")
    try:
        binary = base64.b64decode(payload, validate=True)
        text = binary.decode("utf-8")
    except (ValueError, UnicodeError) as exc:
        raise Held("invalid raw Legal JSON content") from exc
    require(len(binary) <= 3_000_000, "raw Legal content too large")
    content = strict_json_loads(text)
    require(type(content) is dict, "Legal canonical JSON object required")
    return content, hashlib.sha256(binary).hexdigest()


def manual_base(record):
    # Preserve all existing manual-review fields and values verbatim. Runtime
    # results may be appended only by an explicitly chosen safe writer.
    return {key: value for key, value in record.items() if key != "runtime_results"}


def legacy_reference(raw, config):
    record, content_sha = parse_record_readback(raw, config)
    require(record.get("record_type") == "LEGAL_REVIEW_CANDIDATE", "wrong legacy Legal record type")
    require(record.get("matter_key_candidate") == config["matterId"], "legacy matter identity mismatch")
    return {
        "file_id": CANONICAL_RECORD,
        "content_sha256": content_sha,
        "manual_base_sha256": sha(manual_base(record)),
        "matter_key_candidate": config["matterId"],
        "record_type": "LEGAL_REVIEW_CANDIDATE",
    }


def successor_seed(config, legacy_readback):
    validate_config(config)
    require(successor_mode(config), "successor Legal config required")
    return {
        "format": SUCCESSOR_FORMAT, "owner_id": config["ownerId"],
        "matter_id": config["matterId"],
        "legacy_ref": legacy_reference(legacy_readback, config),
        "runtime_results": {},
    }


def validate_successor_record(record, config, legacy_readback=None):
    require(successor_mode(config), "successor Legal config required")
    exact_object(record, {"format", "owner_id", "matter_id", "legacy_ref", "runtime_results"},
                 "successor Legal matter")
    require(record["format"] == SUCCESSOR_FORMAT and record["owner_id"] == config["ownerId"]
            and record["matter_id"] == config["matterId"], "wrong successor Legal identity")
    ref = record["legacy_ref"]
    exact_object(ref, {"file_id", "content_sha256", "manual_base_sha256", "matter_key_candidate", "record_type"},
                 "successor legacy source link")
    require(ref["file_id"] == CANONICAL_RECORD and ref["record_type"] == "LEGAL_REVIEW_CANDIDATE"
            and ref["matter_key_candidate"] == config["matterId"], "wrong legacy Legal source link")
    digest(ref["content_sha256"])
    digest(ref["manual_base_sha256"])
    if legacy_readback is not None:
        require(ref == legacy_reference(legacy_readback, config), "legacy Legal source changed")
    results = record["runtime_results"]
    require(type(results) is dict and len(results) <= 1000, "successor results schema/capacity")
    for key, item in results.items():
        digest(key)
        exact_object(item, {"schema_version", "binding", "classification"}, "successor result")
        require(type(item["schema_version"]) is int and item["schema_version"] == 1,
                "successor result version")
        binding = validate_binding(item["binding"], config)
        require(key == action_key(binding, config), "successor action key mismatch")
        require(type(item["classification"]) is dict, "successor classification object")
        require(type(item["classification"].get("schema_version")) is int
                and item["classification"]["schema_version"] == 1,
                "successor classification version")
        lineage = item["classification"].get("lineage")
        require(type(lineage) is dict and lineage.get("matter_id") == config["matterId"]
                and lineage.get("source_id") == binding["source_id"]
                and lineage.get("source_version") == binding["source_version"]
                and lineage.get("source_sha256") == binding["source_sha256"]
                and lineage.get("policy_sha256") == binding["policy_sha256"]
                and lineage.get("guide_sha256") == binding["guide_sha256"]
                and lineage.get("original_source_id") == binding["original_source_id"]
                and lineage.get("current_source_id") == binding["current_source_id"],
                "successor classification lineage mismatch")
        projection = item["classification"].get("executive_projection")
        require(type(projection) is dict
                and projection.get("minimum_private_reference") == LEGAL_PARENT,
                "successor classification private target mismatch")
    return record


def successor_snapshot(readback, config, legacy_readback=None):
    require(successor_mode(config), "successor Legal config required")
    exact_object(readback, {"metadata", "document"}, "successor connected readback")
    target = config["canonicalRecordId"]
    provider_metadata(readback["metadata"], config, "application/vnd.google-apps.document", target)
    revision, text, end = native_text(readback["document"],
                                       {"documentId": target, "tabId": config["canonicalTabId"]})
    record = strict_json_loads(text)
    validate_successor_record(record, config, legacy_readback)
    require(text == canonical(record) + "\n", "successor Legal JSON not canonical")
    return revision, text, end, record


def runtime_entry(readback, config, binding, key, expected_result_sha, manual_base_sha):
    if successor_mode(config):
        _, _, _, record = successor_snapshot(readback, config)
        require(record["legacy_ref"]["manual_base_sha256"] == manual_base_sha,
                "successor manual Legal source changed")
        results = record["runtime_results"]
        require(key in results and results[key]["binding"] == binding,
                "successor Legal result absent/binding mismatch")
        require(sha(results[key]["classification"]) == expected_result_sha,
                "successor classification digest mismatch")
        # Receipt is for this immutable result entry, not the aggregate Doc:
        # later distinct source versions may append without invalidating it.
        return {"id": config["canonicalRecordId"], "parent_id": LEGAL_PARENT,
                "content_sha256": sha(results[key]), "result_sha256": expected_result_sha}
    record, content_sha = parse_record_readback(readback, config)
    require(sha(manual_base(record)) == manual_base_sha, "existing manual Legal review changed")
    results = record.get("runtime_results")
    require(type(results) is dict and key in results, "runtime result not present in canonical record")
    item = results[key]
    exact_object(item, {"schema_version", "binding", "classification"}, "runtime Legal result")
    require(type(item["schema_version"]) is int and item["schema_version"] == 1, "runtime result version")
    require(item["binding"] == binding, "runtime result binding mismatch")
    require(type(item["classification"]) is dict, "runtime classification object required")
    require(sha(item["classification"]) == expected_result_sha, "runtime classification digest mismatch")
    lineage = item["classification"].get("lineage")
    require(type(lineage) is dict and lineage.get("matter_id") == binding["matter_id"],
            "runtime result matter mismatch")
    return {
        "id": config["canonicalRecordId"], "parent_id": LEGAL_PARENT,
        "content_sha256": content_sha, "result_sha256": expected_result_sha,
    }


def plan(inp):
    require(type(inp) is dict, "Legal plan object required")
    config = validate_config(inp.get("config"))
    revision, text, end, store = snapshot(inp.get("document"), inp.get("metadata"), config)
    operation = inp.get("operation")
    if operation == "inspect":
        return {"store": store, "revision": revision}
    if operation == "verify":
        require(inp.get("expected_text") == text, "Legal CAS readback mismatch")
        return {"verified": True, "revision": revision}
    binding = validate_binding(inp.get("binding"), config)
    key = action_key(binding, config)
    token = digest(inp.get("token"))
    updated = copy.deepcopy(store)
    record = updated["entries"].get(key)
    if operation == "claim":
        if successor_mode(config):
            _, _, _, successor_before = successor_snapshot(inp.get("successor_before"), config,
                                                             inp.get("legacy_before"))
        if record is not None:
            require(record["binding"] == binding, "existing logical Legal action has different matter/binding")
            if record["state"] == "closed":
                current = runtime_entry(inp.get("successor_before") if successor_mode(config)
                                        else inp.get("record_before"), config, binding, key,
                                        record["output"]["result_sha256"], record["manual_base_sha256"])
                require(current == record["output"], "closed Legal result readback changed")
                return {"record": record, "already_recorded": True, "action_key": key}
            if record["state"] == "effect_confirmed":
                current = runtime_entry(inp.get("successor_before") if successor_mode(config)
                                        else inp.get("record_before"), config, binding, key,
                                        record["output"]["result_sha256"], record["manual_base_sha256"])
                require(current == record["output"], "confirmed Legal result readback changed")
                return {"record": record, "reconcile_only": True, "action_key": key}
            if record["state"] == "effect_uncertain":
                return {"record": record, "reconcile_only": True, "action_key": key}
            if record["state"] == "claimed" and record["token"] == token:
                return {"record": record, "resume_claimed": True, "action_key": key}
            raise Held("existing Legal action; inspect, never replay")
        require(store["active_key"] is None, "another Legal action owns writer lane")
        require(len(updated["entries"]) < 1000, "Legal reservation capacity")
        before, _ = parse_record_readback(inp.get("legacy_before") if successor_mode(config)
                                          else inp.get("record_before"), config)
        existing_results = (successor_before["runtime_results"] if successor_mode(config)
                            else before.get("runtime_results", {}))
        require(type(existing_results) is dict, "malformed canonical Legal results")
        require(key not in existing_results, "canonical Legal result already exists")
        record = {
            "binding": binding, "token": token, "state": "claimed",
            "output": None, "record_receipt": None, "cancel_reason": None,
            "manual_base_sha256": sha(manual_base(before)),
        }
        updated["entries"][key] = record
        updated["active_key"] = key
    else:
        require(record is not None and record["binding"] == binding and record["token"] == token,
                "Legal claim/binding/token mismatch")
        if operation == "mark_uncertain":
            require(binding["operation"] != "reservation_probe", "Legal probe cannot perform effects")
            require(record["state"] == "claimed" and store["active_key"] == key, "invalid Legal effect admission")
            before, _ = parse_record_readback(inp.get("legacy_before") if successor_mode(config)
                                              else inp.get("record_before"), config)
            require(sha(manual_base(before)) == record["manual_base_sha256"],
                    "manual Legal record changed before effect admission")
            if successor_mode(config):
                _, _, _, successor_before = successor_snapshot(inp.get("successor_before"), config,
                                                                 inp.get("legacy_before"))
                existing_results = successor_before["runtime_results"]
            else:
                existing_results = before.get("runtime_results", {})
            require(type(existing_results) is dict and key not in existing_results,
                    "Legal result already exists before effect admission")
            record["state"] = "effect_uncertain"
        elif operation == "confirm_effect":
            expected = digest(inp.get("expected_result_sha256"))
            if record["state"] in {"effect_confirmed", "closed"}:
                output = runtime_entry(inp.get("record_after"), config, binding, key, expected,
                                       record["manual_base_sha256"])
                require(record["output"] == output, "Legal effect receipt conflict")
                return {"record": record, "already_recorded": True, "action_key": key}
            require(record["state"] == "effect_uncertain" and store["active_key"] == key,
                    "cannot infer Legal effect")
            record["output"] = runtime_entry(inp.get("record_after"), config, binding, key, expected,
                                             record["manual_base_sha256"])
            record["state"] = "effect_confirmed"
        elif operation == "close":
            require(record["state"] in {"effect_confirmed", "closed"}, "unconfirmed Legal effect remains held")
            require(record["output"] == runtime_entry(inp.get("record_after"), config, binding, key,
                                                      record["output"]["result_sha256"],
                                                      record["manual_base_sha256"]),
                    "Legal final readback changed")
            receipt = {
                "record_id": config["canonicalRecordId"],
                "content_sha256": record["output"]["content_sha256"],
                "result_sha256": record["output"]["result_sha256"],
            }
            if record["state"] == "closed":
                require(record["record_receipt"] == receipt, "terminal Legal record immutable")
                return {"record": record, "already_recorded": True, "action_key": key}
            require(store["active_key"] == key, "wrong Legal active owner")
            record["record_receipt"] = receipt
            record["state"] = "closed"
            updated["active_key"] = None
        elif operation == "cancel_before_effect":
            require(record["state"] == "claimed" and store["active_key"] == key,
                    "uncertain Legal effect cannot be cancelled")
            ident(inp.get("reason"))
            record["state"] = "cancelled_before_effect"
            record["cancel_reason"] = inp["reason"]
            updated["active_key"] = None
        else:
            raise Held("unsupported Legal reservation transition")
    validate_ledger(updated, config)
    newtext = canonical(updated) + "\n"
    require(len(newtext) <= 1_000_000, "Legal reservation capacity; no replacement store")
    return {
        "version": VERSION,
        "action_key": key,
        "record": record,
        "expected_text": newtext,
        "batch": {
            "document_id": config["documentId"],
            "write_control": {"requiredRevisionId": revision},
            "requests": [
                {"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end - 1,
                                                   "tabId": config["tabId"]}}},
                {"insertText": {"location": {"index": 1, "tabId": config["tabId"]},
                                "text": newtext[:-1]}},
            ],
        },
    }


if __name__ == "__main__":
    try:
        print(canonical(plan(strict_json_loads(sys.stdin.read()))))
    except (Held, ValueError, TypeError, KeyError, OverflowError, UnicodeError) as exc:
        print(canonical({"status": "HELD_OR_UNCERTAIN", "error": str(exc)}), file=sys.stderr)
        sys.exit(1)

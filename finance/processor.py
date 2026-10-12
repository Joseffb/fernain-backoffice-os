"""Bounded pure Finance invoice decision adapter; no Google/API/filesystem effects.

Call contract (all records are supplied by the existing coordinator):

    make_candidate(policy_before=..., policy_after=..., admission=...,
        source_before=..., source_after=..., source_text=..., source_read=...,
        invoice_facts=..., effects=None, original_context=None)
        -> READY_TO_CLAIM plus exact reservation binding; no claim/effect

    evaluate(policy_before=..., policy_after=..., admission=..., queue_rows=...,
        source_before=..., source_after=..., source_text=..., source_read=...,
        invoice_facts=..., effects=..., reservation=..., observed_at=...,
        original_context=None)
        -> JSON-compatible decision/patch plan only

    reconcile_arrivals(policy, queue_rows, metadata, reservation=None)
        -> at most one metadata-only registration decision/patch plan

Policies are complete stable trusted readbacks. Required fields include
`policy_id`, `version`, `policy_sha256`, `guide_sha256`, `queue_id`, exact
`reservation_doc_id`, `status="ACTIVE"`, `consumer_id`, fixed `bindings`
(`finance_inbox_id`, `finance_drive_id`, `guide_file_id`, `review_folder_id`),
supported MIME types, currencies/minor units, required fields, and a current
`intake_authority` bound to the exact Finance Inbox/Drive. If optional
`allowed_source_ids` exists, both original and current source IDs must be in it.

Trusted per-item admission binds request/matter identity, current policy, fixed
bindings, source department/destination, and exact original/current source IDs,
versions, URLs, drive, parents and MIME type. A clarification preserves the
immutable matter and original source, links to the original request/source,
and names exact `clarifies_fields` from the existing Queue missing-field state.

Source metadata snapshots use exact `id`, `version`, `drive_id`, `parent_ids`,
and `mime_type`; `source_read` must say `complete: true` and give the SHA-256 of
the full supplied text. Present extracted facts have exact source-ID/range/quote
citations. Vendor/reference/date/currency/amount values are checked against
supported lexical tokens in their cited text; this does not prove semantic
labels, so human review remains required. Extracted facts and source text are
never authority.

For clarification, `original_context` carries exact original-source pre/post
metadata, complete text/digest, original cited invoice facts and prior missing
fields. The prior missing set must match trusted `clarifies_fields`; the reply
may fill only those fields. Original facts stay cited to the original source;
reply facts cite the clarification. These are the only two permitted bodies.

With `reservation=None`, a validated item returns `READY_TO_CLAIM` (or
`READY_TO_REGISTER`) plus the exact Finance Docs-CAS binding; that is not a
claim/effect. The coordinator acquires the reservation through its host
adapter, then supplies CAS result/readback. Reservation evidence is bound to
the full planner binding, token, revisions, active key, and policy-pinned
reservation document ID. A confirmed effect includes an exact durable output
receipt that must match the single provider result and complete readback. A
bare boolean, Sheet reread or local lock is insufficient; host validation is
outside this pure module.

Output states distinguish not-attempted, uncertain and confirmed; searches
distinguish zero/one/multiple/error. An uncertain create remains held even
after zero search. Output is completely read back under the fixed private
Finance review folder before a Queue row can become terminal.

`reconcile_arrivals` compares one exact Inbox metadata item to Queue IDs and
versions and returns at most one CAS-gated append/update plan. It preserves
native Request IDs/URLs; a new item uses its observed file ID as stable
Request ID and matter ID. A linked reply observation is held from becoming a
second invoice matter. Metadata alone proves no invoice content.

All returns are decisions/patch plans. No call sends mail, writes accounting,
marks an invoice paid, changes payment details, or executes a Drive write.
"""
from __future__ import annotations

import argparse
import copy
import datetime as _dt
import hashlib
import json
import re
import sys
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import parse_qs, urlparse
import intake_provenance as I
import native_gemini_review as G
import continuation_grant as R


class Hold(ValueError):
    """The caller must reconcile or obtain a valid current input; do not act."""


QUEUE_COLUMNS = (
    "request_id", "source_url", "source_department", "destination_department",
    "document_type", "source_version", "status", "missing_fields",
    "responsible_person", "next_action", "return_link", "hop_count",
    "processed_at", "review_disposition",
)
TERMINAL = {"READY_FOR_REVIEW", "REVIEWED", "EXCEPTION", "CLOSED", "CANCELLED", "SUPERSEDED"}
SUPPORTED_STATUS = {"STAGED", "MISSING_DATA", "PROCESSING", "UNCERTAIN", *TERMINAL}
_CURRENCY_SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "CAD": "C$", "AUD": "A$"}
FINANCE_DISCLOSURE = ("This message was generated by Backoffice’s Finance AI assistant. "
                     "Please report any unusual or unexpected behavior to Owner at operator@example.com.")
SCOPE_FIELDS = ("due_date", "service_period", "tax_fee_basis", "project_allocation",
                "payment_evidence_applicability")
MISSING_REASONS = {
    "vendor": "needed to identify the payee and reconcile vendor history",
    "invoice_number": "needed to detect repeats and corrected versions",
    "issue_date": "needed to establish invoice timing",
    "currency": "needed to interpret the monetary amount without guessing",
    "total": "needed to record the stated invoice amount",
}


def _canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _nonempty(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise Hold(f"{label} is missing")
    return value.strip()


def canonical_file_id(url: str) -> str:
    """Return the ID from a supported Google Docs/Drive file URL, no network."""
    if not isinstance(url, str) or not url.strip():
        raise Hold("source URL is missing")
    candidate = url.strip()
    p = urlparse(candidate)
    # Google redirect wrappers are data only; unwrap only the single q target.
    if (p.scheme == "https" and p.hostname in {"google.com", "example.org"}
            and p.path == "/url"):
        qs = parse_qs(p.query, keep_blank_values=True)
        q_values = qs.get("q", [])
        if len(q_values) != 1:
            raise Hold("ambiguous Google URL wrapper")
        candidate = q_values[0]
        p = urlparse(candidate)
    if p.scheme != "https" or p.hostname not in {"docs.google.com", "drive.google.com"}:
        raise Hold("unapproved source URL host")
    patterns = (
        r"/document/d/([A-Za-z0-9_-]+)(?:/(?:edit|view|preview))?/?",
        r"/spreadsheets/d/([A-Za-z0-9_-]+)(?:/(?:edit|view))?/?",
        r"/presentation/d/([A-Za-z0-9_-]+)(?:/(?:edit|view))?/?",
        r"/file/d/([A-Za-z0-9_-]+)(?:/(?:edit|view|preview))?/?",
    )
    for pattern in patterns:
        m = re.fullmatch(pattern, p.path)
        if m:
            return m.group(1)
    if p.hostname == "drive.google.com" and p.path == "/open":
        ids = parse_qs(p.query, keep_blank_values=True).get("id", [])
        if len(ids) == 1 and re.fullmatch(r"[A-Za-z0-9_-]+", ids[0]):
            return ids[0]
    raise Hold("unsupported or ambiguous source URL")


def canonical_url(file_id: str) -> str:
    if not isinstance(file_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", file_id):
        raise Hold("invalid observed Google file ID")
    return f"https://drive.google.com/open?id={file_id}"


def _version(meta: dict) -> str:
    return _nonempty(meta.get("version"), "source version")


def _meta_identity(meta: dict) -> tuple:
    return (
        _nonempty(meta.get("id"), "source metadata ID"),
        _version(meta),
        _nonempty(meta.get("drive_id"), "source drive ID"),
        tuple(sorted(meta.get("parent_ids", []))) if isinstance(meta.get("parent_ids"), list) else (),
        _nonempty(meta.get("mime_type"), "source MIME type"),
    )


def _row_dict(row: list | tuple | dict) -> dict:
    if isinstance(row, dict):
        # Dict rows are accepted for tests/integrations, but are normalized to
        # the same A:N contract. Unknown fields are ignored, never written.
        return {name: row.get(name, "") for name in QUEUE_COLUMNS}
    if not isinstance(row, (list, tuple)):
        raise Hold("malformed Queue row")
    vals = list(row[:len(QUEUE_COLUMNS)]) + [""] * max(0, len(QUEUE_COLUMNS) - len(row))
    return dict(zip(QUEUE_COLUMNS, vals))


def _norm_req(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        return ""
    return value.strip().casefold()


def _queue_missing_fields(value: object, required_fields: list) -> list[str]:
    if not isinstance(value, str) or not value.strip():
        return []
    aliases = {
        "invoice_number": (r"invoice[\s_-]+(?:number|reference)", r"invoice\s*#", r"reference"),
        "issue_date": (r"issue[\s_-]+date",),
        "currency": (r"currency",),
        "vendor": (r"vendor",),
        "total": (r"(?:invoice\s+)?total", r"amount due"),
    }
    text = value.casefold()
    found = []
    for field in required_fields:
        patterns = aliases.get(field, (re.escape(field.replace("_", " ")),))
        if any(re.search(rf"(?<![a-z])(?:{pattern})(?![a-z])", text) for pattern in patterns):
            found.append(field)
    return found


def _claim_markers(text: object) -> dict:
    if not isinstance(text, str):
        return {}
    # Later clarification attempts are appended without erasing prior history;
    # parse only the latest attempt segment for current ownership checks.
    text = text.split(" || NEXT_ATTEMPT || ")[-1]
    found = {}
    for part in text.split("; "):
        if "=" in part:
            k, v = part.split("=", 1)
            if k and k not in found:
                found[k] = v
    return found


def _policy(policy_before: dict, policy_after: dict) -> dict:
    if not isinstance(policy_before, dict) or not isinstance(policy_after, dict):
        raise Hold("trusted policy readbacks are required")
    if _canonical_json(policy_before) != _canonical_json(policy_after):
        raise Hold("policy changed during processing")
    p = policy_after
    if 'native_gemini_review' in p:
        try:
            G.settings(p['native_gemini_review'])
        except (ValueError, TypeError, KeyError) as e:
            raise Hold(str(e)) from e
    if 'intake_provenance_version' in p:
        try:
            I.require(type(p['intake_provenance_version']) is int and p['intake_provenance_version']==1,'INTAKE_PROVENANCE_VERSION_REQUIRED')
            I.registrations(p.get('synthetic_invoice_admissions',[]),p.get('excluded_fixture_ids',[]))
        except ValueError as e:
            raise Hold(str(e)) from e
    if p.get("status") != "ACTIVE":
        raise Hold("current Finance policy is not active")
    for key in ("policy_id", "version", "policy_sha256", "guide_sha256", "queue_id", "reservation_doc_id", "consumer_id"):
        _nonempty(p.get(key), f"policy {key}")
    for key in ("policy_sha256", "guide_sha256"):
        if not re.fullmatch(r"[0-9a-f]{64}", p[key]):
            raise Hold(f"policy {key} must be a lowercase SHA-256 digest")
    bindings = p.get("bindings")
    if not isinstance(bindings, dict):
        raise Hold("fixed Finance bindings are missing")
    for key in ("finance_inbox_id", "finance_drive_id", "guide_file_id", "review_folder_id"):
        _nonempty(bindings.get(key), f"fixed binding {key}")
    intake = p.get("intake_authority")
    if (not isinstance(intake, dict) or intake.get("status") != "CURRENT"
            or intake.get("folder_id") != bindings["finance_inbox_id"]
            or intake.get("drive_id") != bindings["finance_drive_id"]
            or not isinstance(intake.get("permitted_actions"), list)
            or "invoice_review" not in intake["permitted_actions"]):
        raise Hold("current policy does not authorize invoice review from the fixed Finance Inbox")
    _nonempty(intake.get("authority_ref"), "current Finance Inbox authority reference")
    _nonempty(intake.get("source_class"), "Finance Inbox source class")
    if "allowed_source_ids" in p:
        ids = p["allowed_source_ids"]
        if not isinstance(ids, list) or any(not isinstance(x, str) or not x for x in ids):
            raise Hold("configured exact source ID allowlist is malformed")
    if not isinstance(p.get("supported_mime_types"), list) or not p["supported_mime_types"]:
        raise Hold("supported Finance source formats are not configured")
    if not isinstance(p.get("currencies"), dict) or not p["currencies"]:
        raise Hold("currency/minor-unit policy is missing")
    required = p.get("required_fields")
    if not isinstance(required, list) or not required or any(not isinstance(x, str) for x in required):
        raise Hold("required invoice fields are not configured")
    maximum = p.get("max_output_attempts", 1)
    if not isinstance(maximum, int) or isinstance(maximum, bool) or maximum < 1 or maximum > 3:
        raise Hold("output retry bound is invalid")
    return p


def _validate_intake(policy, admission, source_hash, source_text):
    if 'intake_provenance_version' in policy:
        try:
            context=admission.get('continuation_context')
            if context is not None:
                I.require(policy.get('native_gemini_review',{}).get('required') is True,'NATIVE_REVIEW_REQUIRED_FOR_CONTINUATION')
                registered=I.registration_for(policy,admission['current_source']['id'])
                I.require(registered is not None and admission['current_source']['role']=='original','SYNTHETIC_ORIGINAL_CONTINUATION_REQUIRED')
                binding,key=_reservation_binding(policy,admission,admission['current_source'],source_hash)
                R.validate_context(context,binding=binding,action_key=key,original_expiry=registered['expires_at'],now=I.time.time(),excluded_ids=policy.get('excluded_fixture_ids',[]))
            return I.validate(policy, admission, source_hash, source_text,check_window=context is None)
        except (ValueError, KeyError, TypeError) as e:
            raise Hold(str(e)) from e
    return None


def _admission(policy: dict, admission: dict) -> tuple[dict, dict, dict]:
    if not isinstance(admission, dict) or admission.get("status") != "ADMITTED":
        raise Hold("item lacks current trusted admission")
    if admission.get("policy_id") != policy["policy_id"] or admission.get("policy_version") != policy["version"]:
        raise Hold("admission is not bound to the current policy")
    if admission.get("policy_sha256") != policy["policy_sha256"] or admission.get("guide_sha256") != policy["guide_sha256"]:
        raise Hold("admission policy/guide digest changed")
    for key in ("request_id", "matter_id", "source_department"):
        _nonempty(admission.get(key), f"admission {key}")
    if admission.get("destination_department") != "Finance":
        raise Hold("admission destination is not Finance")
    if _canonical_json(admission.get("bindings")) != _canonical_json(policy["bindings"]):
        raise Hold("admission Finance Inbox/Drive/guide binding changed")
    orig, cur = admission.get("original_source"), admission.get("current_source")
    if not isinstance(orig, dict) or not isinstance(cur, dict):
        raise Hold("original and current source records are required")
    orig_id = _nonempty(orig.get("id"), "original source ID")
    orig_ver = _nonempty(orig.get("version"), "original source version")
    allowed = policy.get("allowed_source_ids")
    if allowed is not None and (orig_id not in allowed or cur.get("id") not in allowed):
        raise Hold("source ID is outside the current exact policy allowlist")
    if canonical_file_id(orig.get("url", "")) != orig_id:
        raise Hold("original source URL/ID provenance mismatch")
    if cur.get("role") == "original":
        if cur.get("id") != orig_id or cur.get("version") != orig_ver:
            raise Hold("original source identity/version is not immutable")
        if canonical_file_id(cur.get("url", "")) != orig_id:
            raise Hold("current source URL/ID provenance mismatch")
    elif cur.get("role") == "clarification":
        if cur.get("matter_id") != admission["matter_id"]:
            raise Hold("clarification changed the immutable matter identity")
        if _norm_req(cur.get("reply_to_request_id")) != _norm_req(admission["request_id"]):
            raise Hold("clarification is not linked to the original request")
        if cur.get("reply_to_source_id") != orig_id:
            raise Hold("clarification is not linked to the original source")
        if not isinstance(cur.get("id"), str) or not cur["id"] or cur["id"] == orig_id:
            raise Hold("clarification must be a distinct admitted source")
        _nonempty(cur.get("version"), "clarification source version")
        if canonical_file_id(cur.get("url", "")) != cur["id"]:
            raise Hold("clarification source URL/ID provenance mismatch")
        fields = cur.get("clarifies_fields")
        if (not isinstance(fields, list) or not fields
                or any(not isinstance(x, str) or x not in policy["required_fields"] for x in fields)
                or len(set(fields)) != len(fields)):
            raise Hold("clarification must name exact currently missing/correctable invoice fields")
    else:
        raise Hold("current source role must be original or clarification")
    return admission, orig, cur


def _prepare_invoice_context(policy: dict, admission: dict, cur: dict,
                             current_text: str, current_facts: dict,
                             original_context: dict | None) -> tuple[dict, dict, str | None]:
    if cur["role"] == "original":
        if original_context is not None:
            raise Hold("original invoice review does not accept extra source context")
        return current_facts, {cur["id"]: current_text}, None
    if not isinstance(original_context, dict):
        raise Hold("clarification requires exact original-source context; reply alone cannot replace the invoice")
    original = admission["original_source"]
    original_text = original_context.get("source_text")
    if policy.get('intake_provenance_version') == 1 and isinstance(original_text, str) and re.search(r'^\s*(?:TEST|SYNTHETIC)\b', original_text, re.I | re.M):
        raise Hold('SYNTHETIC_CLARIFICATION_UNSUPPORTED')
    original_hash = _check_source(policy, original, original_context.get("source_before"),
        original_context.get("source_after"), original_text, original_context.get("source_read"))
    base_facts, reply_facts = original_context.get("invoice_facts"), current_facts
    if not isinstance(base_facts, dict) or not isinstance(reply_facts, dict):
        raise Hold("original and current source-cited fact records are required")
    expected = cur["clarifies_fields"]
    prior_missing = original_context.get("prior_missing_fields")
    if not isinstance(prior_missing, list) or set(prior_missing) != set(expected):
        raise Hold("clarification field scope differs from the prior admitted missing-field set")
    merged = copy.deepcopy(base_facts)
    for field, fact in reply_facts.items():
        if _present(reply_facts, field) and field not in expected:
            raise Hold(f"clarification adds unrequested invoice field {field}")
        if field in expected and _present(reply_facts, field):
            merged[field] = fact
    return merged, {original["id"]: original_text, cur["id"]: current_text}, original_hash


def _check_source(policy: dict, current: dict, before: dict, after: dict,
                  source_text: str, source_read: dict) -> str:
    if not isinstance(before, dict) or not isinstance(after, dict):
        raise Hold("exact source pre/post metadata are required")
    b, a = _meta_identity(before), _meta_identity(after)
    if b != a:
        raise Hold("source changed during read; reconcile the new version")
    expected_id = _nonempty(current.get("id"), "admitted current source ID")
    expected_version = _nonempty(current.get("version"), "admitted current source version")
    if a[0] != expected_id or a[1] != expected_version:
        raise Hold("observed source ID/version differs from current admission")
    if a[2] != policy["bindings"]["finance_drive_id"]:
        raise Hold("source is outside the fixed Finance Drive")
    if policy["bindings"]["finance_inbox_id"] not in a[3]:
        raise Hold("source is outside the fixed Finance Inbox")
    if a[4] not in policy["supported_mime_types"]:
        raise Hold("unsupported source format")
    # Admission must repeat the exact observed location and format.
    expected_meta = (current.get("drive_id"), current.get("parent_ids"), current.get("mime_type"))
    if expected_meta != (a[2], list(a[3]), a[4]):
        raise Hold("source location/format differs from admitted provenance")
    if not isinstance(source_text, str) or not source_text:
        raise Hold("complete source text is missing")
    if not isinstance(source_read, dict) or source_read.get("complete") is not True:
        raise Hold("source read is not verified complete")
    digest = _sha256(source_text)
    if source_read.get("sha256") != digest:
        raise Hold("complete-read digest does not match supplied source text")
    return digest


def _fact_matches_citation(field: str, value: object, quote: str) -> bool:
    """Conservative lexical/value check; it does not certify semantic labels."""
    leaf = field.rsplit(".", 1)[-1]
    if "]" in leaf:
        leaf = leaf.rsplit("]", 1)[-1].lstrip(".")
    if leaf in {"total", "subtotal", "tax", "fees", "discounts", "amount", "quantity", "unit_price"}:
        expected = _decimal(value, field)
        token_pattern = r"(?<![A-Za-z0-9])[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![A-Za-z0-9])"
        for token in re.findall(token_pattern, quote):
            try:
                if _decimal(token, field) == expected:
                    return True
            except Hold:
                pass
        return False
    if leaf in {"issue_date", "due_date"}:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise Hold(f"{field} must use an exact ISO date")
        try:
            if _dt.date.fromisoformat(value).isoformat() != value:
                return False
        except ValueError:
            raise Hold(f"{field} is not a valid calendar date")
        return value in quote
    if leaf == "currency":
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z]{3}", value.strip()):
            raise Hold("currency must be a three-letter ISO code")
        code = value.strip().upper()
        if re.search(rf"(?<![A-Za-z]){re.escape(code)}(?![A-Za-z])", quote.upper()):
            return True
        return code in _CURRENCY_SYMBOLS and _CURRENCY_SYMBOLS[code] in quote
    if isinstance(value, str):
        normalized = " ".join(value.strip().casefold().split())
        return bool(normalized) and normalized in " ".join(quote.casefold().split())
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        normalized_quote = " ".join(quote.casefold().split())
        return all(" ".join(item.strip().casefold().split()) in normalized_quote for item in value if item.strip())
    # Booleans and structured extraction containers retain exact source cites;
    # they remain review inputs, never authority.
    return True


def _citation_rows(field: str, fact: dict, source_id: str, source_text: str,
                   source_texts: dict | None = None) -> list:
    cits = fact.get("citations")
    if not isinstance(cits, list) or not cits:
        raise Hold(f"present invoice fact {field} lacks source citation")
    out = []
    for cit in cits:
        if not isinstance(cit, dict):
            raise Hold(f"invoice fact {field} citation is malformed")
        cited_source = cit.get("source_id")
        if source_texts is None:
            if cited_source != source_id:
                raise Hold(f"invoice fact {field} cites the wrong source")
            cited_text = source_text
        else:
            if cited_source not in source_texts:
                raise Hold(f"invoice fact {field} cites a source outside the admitted two-source matter")
            cited_text = source_texts[cited_source]
        start, end, quote = cit.get("start"), cit.get("end"), cit.get("quote")
        if (not isinstance(start, int) or isinstance(start, bool) or not isinstance(end, int)
                or isinstance(end, bool) or start < 0 or end <= start or end > len(cited_text)
                or not isinstance(quote, str) or cited_text[start:end] != quote):
            raise Hold(f"invoice fact {field} citation does not match source text")
        if not _fact_matches_citation(field, fact.get("value"), quote):
            raise Hold(f"invoice fact {field} value does not match its cited source text")
        out.append({"field": field, "source_id": cited_source, "start": start, "end": end, "quote": quote})
    return out


def _unique_citations(citations: list) -> list:
    seen = set(); unique = []
    for cit in citations:
        key = (cit.get("field"), cit.get("source_id"), cit.get("start"), cit.get("end"), cit.get("quote"))
        if key not in seen:
            seen.add(key); unique.append(cit)
    return unique


def _present(facts: dict, key: str) -> bool:
    f = facts.get(key)
    if not isinstance(f, dict) or f.get("value") is None:
        return False
    if isinstance(f.get("value"), str):
        value = f["value"].strip().casefold()
        return bool(value) and value not in {"not supplied", "not provided", "missing"}
    return True


def _decimal(raw: object, field: str) -> Decimal:
    if isinstance(raw, bool) or not isinstance(raw, (str, int, Decimal)):
        raise Hold(f"{field} is not an exact decimal string")
    s = str(raw).strip()
    if not re.fullmatch(r"-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?", s):
        raise Hold(f"{field} has an invalid decimal format")
    try:
        d = Decimal(s.replace(",", ""))
    except InvalidOperation as e:
        raise Hold(f"{field} has an invalid decimal format") from e
    if not d.is_finite():
        raise Hold(f"{field} must be finite")
    return d


def _amount_fact(facts: dict, key: str, source_id: str, source_text: str,
                 digits: int, source_texts: dict | None = None) -> tuple[Decimal | None, list]:
    if not _present(facts, key):
        return None, []
    f = facts[key]
    cites = _citation_rows(key, f, source_id, source_text, source_texts)
    amount = _decimal(f["value"], key)
    quantum = Decimal(1).scaleb(-digits)
    if amount != amount.quantize(quantum, rounding=ROUND_HALF_UP):
        raise Hold(f"{key} has more precision than its currency permits")
    return amount, cites


def _invoice_review(policy: dict, admission: dict, cur: dict, source_text: str,
                    source_digest: str, facts: dict, effects: dict,
                    source_texts: dict | None = None,
                    original_source_digest: str | None = None) -> dict:
    if not isinstance(facts, dict):
        raise Hold("source-cited invoice facts are required")
    source_id = cur["id"]
    citations = []
    missing = []
    for key in policy["required_fields"]:
        if key not in {"vendor", "invoice_number", "issue_date", "currency", "total"}:
            raise Hold(f"unsupported required-field policy: {key}")
        if not _present(facts, key):
            missing.append(key)
        else:
            citations.extend(_citation_rows(key, facts[key], source_id, source_text, source_texts))
    recognized = {"vendor", "invoice_number", "issue_date", "due_date", "currency", "total",
                  "subtotal", "tax", "fees", "discounts", "payment_risk_flags",
                  "bank_details_changed", "conflicting_totals", "line_items", "purpose",
                  "service_period", "tax_fee_basis", "project_allocation", "payment_evidence_applicability"}
    for key, fact in facts.items():
        if key in recognized and _present(facts, key):
            if key not in policy["required_fields"]:
                citations.extend(_citation_rows(key, fact, source_id, source_text, source_texts))
    if missing:
        partial = {key: facts[key]["value"] for key in recognized if _present(facts, key)}
        scope_checks = {
            key: ({"status": "SOURCE_STATED", "value": facts[key]["value"]}
                  if _present(facts, key) else {"status": "NOT_STATED_IN_REVIEWED_SOURCE", "value": None})
            for key in SCOPE_FIELDS
        }
        source_subtotal = str(facts["subtotal"]["value"]) if _present(facts, "subtotal") else None
        source_total = str(facts["total"]["value"]) if _present(facts, "total") else None
        return {
            "status": "MISSING_DATA", "missing_fields": missing,
            "missing_field_reasons": {key: MISSING_REASONS.get(key, "required by the current Finance policy") for key in missing},
            "decision": "PREPARE_BOUNDED_CLARIFICATION; no message is sent",
            "next_owner": admission.get("request_owner") or policy.get("review_owner") or "UNASSIGNED",
            "next_action": "Ask only for the listed required fields through the admitted internal route; this adapter has not sent a message",
            "facts": partial, "scope_checks": scope_checks,
            "arithmetic": {"status": "NOT_EVALUATED_MISSING_INPUTS; absent amounts are not zero",
                           "source_subtotal": source_subtotal, "line_subtotal": None,
                           "calculated_total": None, "source_total": source_total,
                           "total_check": "NOT_EVALUATED_MISSING_INPUTS"},
            "flags": [f"SCOPE_NOT_STATED:{key}" for key in SCOPE_FIELDS if scope_checks[key]["status"] != "SOURCE_STATED"],
            "citations": _unique_citations(citations),
            "source_sha256": source_digest,
            "original_source_sha256": original_source_digest,
        }

    vendor = str(facts["vendor"]["value"]).strip()
    invoice_number = str(facts["invoice_number"]["value"]).strip()
    if not vendor or not invoice_number:
        raise Hold("vendor and invoice reference must be non-empty")
    issue_raw = str(facts["issue_date"]["value"]).strip()
    try:
        issue_date = _dt.date.fromisoformat(issue_raw)
    except ValueError:
        issue_date = None
    currency = str(facts["currency"]["value"]).strip().upper()
    flags = []
    if issue_date is None or issue_date.isoformat() != issue_raw:
        flags.append("INVALID_ISSUE_DATE")
    digits = policy["currencies"].get(currency)
    if not isinstance(digits, int) or isinstance(digits, bool) or digits < 0 or digits > 4:
        flags.append("UNSUPPORTED_CURRENCY")
        # Use a conservative decimal check only; never quantize to a guessed currency.
        digits = 4
    total, cites = _amount_fact(facts, "total", source_id, source_text, digits, source_texts)
    citations.extend(cites)
    if total is None:
        # Required-field processing above makes this unreachable, retained defensively.
        raise Hold("invoice total is missing")
    if total <= 0:
        flags.append("NON_POSITIVE_INVOICE_TOTAL")

    arithmetic_flags = []
    subtotal, cites = _amount_fact(facts, "subtotal", source_id, source_text, digits, source_texts); citations.extend(cites)
    tax, cites = _amount_fact(facts, "tax", source_id, source_text, digits, source_texts); citations.extend(cites)
    fees, cites = _amount_fact(facts, "fees", source_id, source_text, digits, source_texts); citations.extend(cites)
    discounts, cites = _amount_fact(facts, "discounts", source_id, source_text, digits, source_texts); citations.extend(cites)
    line_sum = None
    line_items = facts.get("line_items")
    if _present(facts, "line_items"):
        # line_items itself is source-cited and every present numerical field is too.
        line_items = facts["line_items"]["value"]
        if not isinstance(line_items, list) or not line_items:
            arithmetic_flags.append("LINE_ITEMS_UNVERIFIABLE")
        else:
            computed = Decimal("0")
            complete_lines = True
            for idx, line in enumerate(line_items):
                if not isinstance(line, dict):
                    raise Hold("line item is malformed")
                for key in ("quantity", "unit_price"):
                    if not _present(line, key):
                        complete_lines = False
                        arithmetic_flags.append("LINE_ITEMS_INCOMPLETE")
                    else:
                        citations.extend(_citation_rows(f"line_items[{idx}].{key}", line[key], source_id, source_text, source_texts))
                if not _present(line, "quantity") or not _present(line, "unit_price"):
                    continue
                quantity = _decimal(line["quantity"]["value"], f"line_items[{idx}].quantity")
                unit = _decimal(line["unit_price"]["value"], f"line_items[{idx}].unit_price")
                extension = (quantity * unit).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
                if _present(line, "amount"):
                    amount, cc = _amount_fact({"amount": line["amount"]}, "amount", source_id, source_text, digits, source_texts)
                    citations.extend([{**c, "field": f"line_items[{idx}].amount"} for c in cc])
                    if amount != extension:
                        arithmetic_flags.append("LINE_TOTAL_MISMATCH")
                computed += extension
            if complete_lines:
                line_sum = computed.quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
                if subtotal is not None and subtotal != line_sum:
                    arithmetic_flags.append("SUBTOTAL_MISMATCH")

    base = subtotal if subtotal is not None else line_sum
    if base is None:
        arithmetic_flags.append("ARITHMETIC_UNVERIFIABLE")
        total_check = "UNVERIFIABLE"
        calculated_total = None
    elif tax is None or fees is None or discounts is None:
        # Do not default absent components to zero.
        arithmetic_flags.append("MISSING_TOTAL_COMPONENTS")
        total_check = "UNVERIFIABLE"
        calculated_total = None
    else:
        calculated_total = (base + tax + fees - discounts).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
        total_check = "MATCH" if calculated_total == total else "MISMATCH"
        if total_check == "MISMATCH":
            arithmetic_flags.append("INVOICE_TOTAL_MISMATCH")
    flags.extend(arithmetic_flags)

    # Payment instructions and bank-change language are risk signals only.
    if _present(facts, "bank_details_changed") and bool(facts["bank_details_changed"]["value"]):
        citations.extend(_citation_rows("bank_details_changed", facts["bank_details_changed"], source_id, source_text, source_texts))
        flags.append("CHANGED_BANK_DETAILS")
    if _present(facts, "payment_risk_flags"):
        citations.extend(_citation_rows("payment_risk_flags", facts["payment_risk_flags"], source_id, source_text, source_texts))
        val = facts["payment_risk_flags"]["value"]
        if isinstance(val, list):
            flags.extend(f"PAYMENT_RISK:{str(x)[:120]}" for x in val if str(x).strip())
        elif str(val).strip():
            flags.append(f"PAYMENT_RISK:{str(val)[:120]}")
    if re.search(r"\b(?:change|changed|new|updated)\s+(?:bank|payment|remittance|wire|account)\b|\b(?:urgent|immediate)\s+(?:payment|wire|transfer)\b|routing\s+number|account\s+number", source_text, re.I):
        flags.append("PAYMENT_INSTRUCTION_REVIEW")
    if _present(facts, "conflicting_totals"):
        citations.extend(_citation_rows("conflicting_totals", facts["conflicting_totals"], source_id, source_text, source_texts))
        flags.append("CONFLICTING_TOTALS")

    scope_checks = {}
    for key in SCOPE_FIELDS:
        if _present(facts, key):
            scope_checks[key] = {"status": "SOURCE_STATED", "value": facts[key]["value"]}
        else:
            scope_checks[key] = {"status": "NOT_STATED_IN_REVIEWED_SOURCE", "value": None}
            flags.append(f"SCOPE_NOT_STATED:{key}")

    # Duplicate invoice identity is a review flag, not a deletion or a write.
    known = effects.get("known_invoice_keys", []) if isinstance(effects, dict) else []
    invoice_key = "|".join((vendor.casefold(), invoice_number.casefold(), currency))
    if any(isinstance(k, str) and k.casefold() == invoice_key.casefold() for k in known):
        flags.append("POSSIBLE_DUPLICATE_INVOICE")

    safe_facts = {
        "vendor": vendor, "invoice_number": invoice_number,
        "issue_date": issue_date.isoformat() if issue_date else issue_raw,
        "currency": currency, "total": format(total, "f"),
        "subtotal": format(subtotal, "f") if subtotal is not None else None,
        "tax": format(tax, "f") if tax is not None else None,
        "fees": format(fees, "f") if fees is not None else None,
        "discounts": format(discounts, "f") if discounts is not None else None,
        "due_date": facts["due_date"]["value"] if _present(facts, "due_date") else None,
        "service_period": facts["service_period"]["value"] if _present(facts, "service_period") else None,
        "tax_fee_basis": facts["tax_fee_basis"]["value"] if _present(facts, "tax_fee_basis") else None,
        "project_allocation": facts["project_allocation"]["value"] if _present(facts, "project_allocation") else None,
        "payment_evidence_applicability": facts["payment_evidence_applicability"]["value"] if _present(facts, "payment_evidence_applicability") else None,
        "purpose": facts["purpose"]["value"] if _present(facts, "purpose") else None,
    }
    safe_lines = []
    if _present(facts, "line_items") and isinstance(facts["line_items"]["value"], list):
        for line in facts["line_items"]["value"]:
            if not isinstance(line, dict):
                continue
            safe_lines.append({key: (str(line[key]["value"]) if _present(line, key) else None)
                               for key in ("description", "quantity", "unit_price", "amount")})
    safe_facts["line_items"] = safe_lines or (None if not _present(facts, "line_items") else facts["line_items"]["value"])
    disposition = "REVIEW_REQUIRED" if flags else "READY_FOR_REVIEW"
    return {
        "status": "READY_FOR_REVIEW",
        "missing_fields": [],
        "disposition": disposition,
        "decision": (("REVIEW_REQUIRED; resolve every listed discrepancy/unknown" if flags else "READY_FOR_REVIEW; source values and supplied arithmetic checks are internally consistent") + "; no payment, paid status, terms acceptance, or accounting entry"),
        "next_owner": admission.get("review_owner") or policy.get("review_owner") or "UNASSIGNED",
        "next_action": "Human Finance reviewer to resolve all listed flags/unknowns before any separate ledger or payment decision",
        "facts": safe_facts,
        "scope_checks": scope_checks,
        "arithmetic": {
            "currency_minor_units": policy["currencies"].get(currency),
            "source_subtotal": format(subtotal, "f") if subtotal is not None else None,
            "line_subtotal": format(line_sum, "f") if line_sum is not None else None,
            "calculated_total": format(calculated_total, "f") if calculated_total is not None else None,
            "source_total": format(total, "f"), "total_check": total_check,
            "flags": arithmetic_flags,
        },
        "flags": sorted(set(flags)),
        "citations": _unique_citations(citations),
        "source_sha256": source_digest,
        "original_source_sha256": original_source_digest,
        "invoice_key": invoice_key,
    }


def _find_queue_row(queue_rows: list, admission: dict, original: dict) -> tuple[int, dict, list[dict]]:
    if not isinstance(queue_rows, list):
        raise Hold("observed Queue rows are required")
    parsed = []
    req_key = _norm_req(admission["request_id"])
    matches = []
    for index, raw in enumerate(queue_rows):
        # Header rows are ignored; the A:N row contract remains fixed.
        if isinstance(raw, (list, tuple)) and raw and str(raw[0]).strip().casefold() == "request id":
            continue
        row = _row_dict(raw)
        rid = _norm_req(row["request_id"])
        if not rid:
            continue
        try:
            source_id = canonical_file_id(row["source_url"])
        except Hold:
            if rid == req_key:
                raise Hold("admitted request row has invalid source URL")
            parsed.append((index, row, None))
            continue
        parsed.append((index, row, source_id))
        if rid == req_key:
            matches.append((index, row, source_id))
    if len(matches) != 1:
        raise Hold("admitted request must have exactly one Queue row")
    index, row, row_source_id = matches[0]
    if row_source_id != original["id"] or str(row["source_version"]).strip() != str(original["version"]):
        raise Hold("Queue source/version differs from immutable original matter")
    if str(row["source_department"]).strip().casefold() != str(admission["source_department"]).strip().casefold():
        raise Hold("Queue source department differs from trusted admission")
    if str(row["destination_department"]).strip().casefold() != "finance":
        raise Hold("Queue destination is not Finance")
    # Deduplicate across *all* observed rows by canonical source/version/department.
    # Legacy/synthetic rows are retained; any true collision holds rather than being rewritten.
    target_key = (row_source_id, str(original["version"]), str(admission["source_department"]).strip().casefold(), "finance")
    for other_index, other, other_id in parsed:
        if other_index == index or other_id is None:
            continue
        key = (other_id, str(other["source_version"]).strip(), str(other["source_department"]).strip().casefold(), str(other["destination_department"]).strip().casefold())
        if key == target_key:
            raise Hold("duplicate canonical source/version/department row; preserve and reconcile history")
    return index, row, [item[1] for item in parsed]


def _action_key(policy: dict, admission: dict, cur: dict) -> str:
    operation = "clarification_staging" if cur["role"] == "clarification" else "review_staging"
    # Exact finance_docs_claim.action_key contract: hash the canonical JSON of
    # source_id/source_version/consumer_id/operation only.
    material = {"source_id": cur["id"], "source_version": cur["version"],
                "consumer_id": policy["consumer_id"], "operation": operation}
    return _sha256(_canonical_json(material))


def _reservation_binding(policy: dict, admission: dict, cur: dict,
                         source_hash: str) -> tuple[dict, str]:
    operation = "clarification_staging" if cur["role"] == "clarification" else "review_staging"
    binding = {
        "request_id": admission["request_id"], "matter_id": admission["matter_id"],
        "source_id": cur["id"], "source_version": cur["version"],
        "source_sha256": source_hash, "policy_sha256": policy["policy_sha256"],
        "guide_sha256": policy["guide_sha256"], "consumer_id": policy["consumer_id"],
        "output_parent_id": policy["bindings"]["review_folder_id"],
        "queue_id": policy["queue_id"], "operation": operation,
    }
    key = _sha256(_canonical_json({k: binding[k] for k in ("source_id", "source_version", "consumer_id", "operation")}))
    return binding, key


def _validate_reservation(reservation: dict, binding: dict, action_key: str,
                          expected_document_id: str) -> None:
    if not isinstance(reservation, dict):
        raise Hold("verified single-writer CAS reservation evidence is required")
    if reservation.get("method") != "google_docs_requiredRevisionId_cas":
        raise Hold("reservation is not from the approved Docs revision-CAS mechanism")
    if reservation.get("cas_result") != "UPDATED" or reservation.get("readback_verified") is not True:
        raise Hold("reservation lacks successful verified CAS readback")
    if reservation.get("action_key") != action_key or reservation.get("binding") != binding:
        raise Hold("reservation binding/action key mismatch")
    token = reservation.get("token")
    if not isinstance(token, str) or not re.fullmatch(r"[0-9a-f]{64}", token):
        raise Hold("reservation token is malformed")
    if reservation.get("state") not in {"claimed", "effect_uncertain", "effect_confirmed", "closed", "cancelled_before_effect"}:
        raise Hold("reservation state is not recognized")
    for key in ("record_id", "prior_revision_id", "committed_revision_id"):
        _nonempty(reservation.get(key), f"reservation {key}")
    if reservation.get("record_id") != expected_document_id:
        raise Hold("reservation evidence refers to an unapproved reservation document")
    receipt = reservation.get("output")
    if reservation.get("state") in {"effect_confirmed", "closed"}:
        if not isinstance(receipt, dict) or set(receipt) != {"id", "parent_id", "content_sha256"}:
            raise Hold("confirmed reservation lacks its exact durable output receipt")
        _nonempty(receipt.get("id"), "reservation output ID")
        _nonempty(receipt.get("parent_id"), "reservation output parent")
        if not re.fullmatch(r"[0-9a-f]{64}", str(receipt.get("content_sha256", ""))):
            raise Hold("reservation output content hash is malformed")
    elif receipt is not None:
        raise Hold("unconfirmed reservation carries premature output evidence")
    rb = reservation.get("readback")
    if not isinstance(rb, dict):
        raise Hold("reservation readback record is missing")
    if rb.get("record_id") != reservation.get("record_id") or rb.get("committed_revision_id") != reservation.get("committed_revision_id"):
        raise Hold("reservation CAS readback revision/record mismatch")
    for key, expected in {"action_key": action_key, "binding": binding, "token": token, "state": reservation.get("state")}.items():
        if rb.get(key) != expected:
            raise Hold(f"reservation readback {key} mismatch")
    if rb.get("active_key") != action_key:
        raise Hold("reservation readback does not prove unique active writer ownership")
    if rb.get("output") != receipt:
        raise Hold("reservation output receipt differs from exact CAS readback")


def _expected_artifact(review: dict, policy: dict, admission: dict,
                       original: dict, cur: dict, action_key: str, source_read: dict | None = None) -> dict:
    artifact = {
        "schema": "fernain.finance.invoice-review.v1",
        "action_key": action_key,
        "matter_id": admission["matter_id"],
        "request_id": admission["request_id"],
        "policy_id": policy["policy_id"], "policy_version": policy["version"],
        "policy_sha256": policy["policy_sha256"], "guide_sha256": policy["guide_sha256"],
        "queue_id": policy["queue_id"],
        "guide_file_id": policy["bindings"]["guide_file_id"],
        "source_department": admission["source_department"],
        "destination_department": "Finance",
        "original_source": {"id": original["id"], "version": original["version"], "url": canonical_url(original["id"])},
        "current_source": {"id": cur["id"], "version": cur["version"], "url": canonical_url(cur["id"]), "role": cur["role"]},
        "review": review,
        "payment_status": "NOT_ASSESSED_BY_ADAPTER",
        "accounting_entry": "NOT_CREATED",
    }
    if source_read and source_read.get('format') in {'application/pdf','application/vnd.google-apps.document'}:
        # Evidence only: financial extraction and the existing effect identity
        # are unchanged. These mappings name the normalized text cited below.
        artifact['source_extraction'] = {k: v for k, v in source_read.items() if k in {
            'format','sha256','raw_file_sha256','raw_file_byte_length','raw_hash_origin',
            'source_revision_id','native_snapshot_sha256','extraction_method','ocr_status',
            'page_count','page_text_ranges','offset_unit','text_mapping'}}
    if 'intake_provenance_version' in policy:
        artifact['intake_provenance']=copy.deepcopy(admission['intake_provenance'])
    if admission.get('continuation_context') is not None:
        artifact['execution_continuation']=copy.deepcopy(admission['continuation_context']['grant'])
    return artifact


def _display(value: object) -> str:
    if value is None:
        return "Not stated in the reviewed source (not inferred; not treated as zero)"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)
    return str(value)


def _native_review(policy, admission, source_hash, review):
    try:
        evidence=G.validate(policy, admission, source_hash, review)
    except (ValueError, TypeError, KeyError) as e:
        raise Hold(str(e)) from e
    if evidence is not None:
        review['native_gemini_review']=evidence
    return review


def _render_artifact_text(artifact: dict) -> str:
    """Deterministic UTF-8 human-readable private staging text."""
    review = artifact["review"]
    facts = review.get("facts", {})
    original, current = artifact["original_source"], artifact["current_source"]
    lines = [
        "FERNAIN FINANCE — PRIVATE INVOICE REVIEW",
        "",
        f"Disposition: {review.get('disposition', review.get('status'))}",
        f"Decision: {review.get('decision', '')}",
        f"Matter ID: {artifact['matter_id']}",
        f"Request ID: {artifact['request_id']}",
        f"Policy: {artifact['policy_id']} / {artifact['policy_version']} (sha256 {artifact['policy_sha256']})",
        f"Finance guide: {artifact['guide_file_id']} (sha256 {artifact['guide_sha256']})",
        f"Original source: {original['url']} (ID {original['id']}, version {original['version']})",
        f"Current source: {current['url']} (ID {current['id']}, version {current['version']}, role {current['role']})",
        f"Source SHA-256: {review['source_sha256']}",
        "",
        "INVOICE FACTS (source-cited extraction; human verification remains required)",
    ]
    if review.get("original_source_sha256"):
        lines.insert(10, f"Original source SHA-256: {review['original_source_sha256']}")
    if 'intake_provenance' in artifact:
        provenance=artifact['intake_provenance']
        banner=['TEST ONLY / NOT A REAL PAYABLE'] if provenance['mode']=='SYNTHETIC' else []
        attribution='Processor: native Gemini draft; deterministic validation and recording' if review.get('native_gemini_review') else 'Processor: deterministic Finance consumer; native Gemini execution not established'
        lines[1:1]=banner+[f"Intake mode: {provenance['mode']}", 'Intake provenance: '+I.canonical(provenance), attribution, '']
    if artifact.get('execution_continuation'):
        lines[1:1]=['Execution continuation: '+_canonical_json(artifact['execution_continuation']),'']
    if artifact.get('source_extraction'):
        pos=lines.index('INVOICE FACTS (source-cited extraction; human verification remains required)')
        lines[pos:pos]=['SOURCE EXTRACTION EVIDENCE (source SHA-256 hashes the exact normalized citation text; raw/native proof is separate)',json.dumps(artifact['source_extraction'],sort_keys=True,ensure_ascii=False),'']
    if review.get('native_gemini_review'):
        pos=lines.index('INVOICE FACTS (source-cited extraction; human verification remains required)')
        lines[pos:pos]=['NATIVE GEMINI DRAFT (fixed-purpose controls; independently bound input; no native record/send effects)','Native Gemini draft: '+_canonical_json(review['native_gemini_review']),'']
    for key in ("vendor", "invoice_number", "issue_date", "due_date", "currency", "total",
                "subtotal", "tax", "fees", "discounts", "tax_fee_basis", "service_period",
                "project_allocation", "payment_evidence_applicability", "purpose", "line_items"):
        value = facts.get(key)
        if isinstance(value, dict) and "value" in value:
            value = value["value"]
        lines.append(f"- {key}: {_display(value)}")
    lines.extend(["", "FINANCE SCOPE CHECKS"])
    for key in SCOPE_FIELDS:
        check = review.get("scope_checks", {}).get(key, {"status": "NOT_ASSESSED", "value": None})
        lines.append(f"- {key}: {check.get('status')}; {_display(check.get('value'))}")
    lines.extend(["", "REQUIRED CLARIFICATION"])
    missing = review.get("missing_fields", [])
    if missing:
        reasons = review.get("missing_field_reasons", {})
        for field in missing:
            if field == "currency":
                question = "What currency is the stated invoice total denominated in? Do not infer currency from a symbol or locale."
            else:
                question = f"Please provide {field.replace('_', ' ')}; {reasons.get(field, 'it is required by current Finance policy')}."
            lines.append(f"- {field}: missing; {reasons.get(field, 'required by current Finance policy')}. Question to prepare (not sent): {question}")
    else:
        lines.append("- None of the configured required invoice fields are missing.")
    lines.extend(["", "DETERMINISTIC ARITHMETIC"])
    arithmetic = review.get("arithmetic", {})
    lines.append(f"- Source-stated subtotal: {_display(arithmetic.get('source_subtotal'))}")
    lines.append(f"- Calculated line subtotal: {_display(arithmetic.get('line_subtotal'))}")
    lines.append(f"- Calculated invoice total: {_display(arithmetic.get('calculated_total'))}")
    lines.append(f"- Source total: {_display(arithmetic.get('source_total'))}")
    lines.append(f"- Total check: {arithmetic.get('total_check', arithmetic.get('status', 'NOT_EVALUATED'))}")
    lines.append(f"- Flags: {', '.join(review.get('flags', [])) if review.get('flags') else 'None detected by deterministic checks'}")
    lines.extend(["", "SOURCE CITATIONS"])
    if review.get("citations"):
        source_map = {original["id"]: {**original, "role": "original"}, current["id"]: {**current, "role": current["role"]}}
        for cit in review["citations"]:
            src = source_map.get(cit["source_id"], {"url": canonical_url(cit["source_id"]), "version": "unknown"})
            quote = cit["quote"].replace("\n", "\\n")
            lines.append(f"- {cit['field']} ({src.get('role', 'admitted source')}): {src['url']} (version {src['version']}, chars {cit['start']}:{cit['end']}): {quote}")
    else:
        lines.append("- No cited facts were available.")
    lines.extend([
        "", "OWNER / NEXT ACTION",
        f"- Next owner: {review.get('next_owner', 'UNASSIGNED')}",
        f"- Next action: {review.get('next_action', 'Human Finance review required')}",
        "- This is a private review staging artifact only. It is not a payment instruction, paid status, accounting entry, approval, terms acceptance, or external message.",
        "", "---", FINANCE_DISCLOSURE, "",
    ])
    return "\n".join(lines)


def make_candidate(*, policy_before: dict, policy_after: dict, admission: dict,
                   source_before: dict, source_after: dict, source_text: str,
                   source_read: dict, invoice_facts: dict,
                   effects: dict | None = None,
                   original_context: dict | None = None) -> dict:
    """Validate exact policy/source/facts and return a CAS binding, before Queue admission.

    This permits the coordinator to win the shared Docs CAS lane before it
    normalizes/appends the Queue row. It never claims the lane or writes Queue.
    """
    try:
        p = _policy(policy_before, policy_after)
        adm, orig, cur = _admission(p, admission)
        source_hash = _check_source(p, cur, source_before, source_after, source_text, source_read)
        _validate_intake(p,adm,source_hash,source_text)
        prepared_facts, source_texts, original_hash = _prepare_invoice_context(
            p, adm, cur, source_text, invoice_facts, original_context)
        action_key = _action_key(p, adm, cur)
        binding, expected = _reservation_binding(p, adm, cur, source_hash)
        if action_key != expected:
            raise Hold("reservation action-key calculation mismatch")
        review = _invoice_review(p, adm, cur, source_text, source_hash, prepared_facts,
                                 effects or {}, source_texts, original_hash)
        _native_review(p,adm,source_hash,review)
        artifact = _expected_artifact(review, p, adm, orig, cur, action_key, source_read)
        artifact_text = _render_artifact_text(artifact)
        return {
            "action": "READY_TO_CLAIM", "action_key": action_key,
            "binding": binding, "review": review,
            "artifact_sha256": _sha256(artifact_text),
            "artifact": artifact, "artifact_text": artifact_text,
            "reservation_document_id": p["reservation_doc_id"],
            "reason": "exact current source and policy validated; acquire the shared CAS reservation before Queue mutation",
        }
    except Hold as e:
        return {"action": "HOLD", "reason": str(e)}


def reconcile_arrivals(policy: dict, queue_rows: list, metadata: dict | list,
                       reservation: dict | None = None) -> dict:
    """Plan at most one exact Finance Inbox Queue admission; metadata is not authority.

    Existing native Request IDs and source URLs are preserved verbatim. A
    missing row uses the observed Google file ID as both stable Request ID and
    initial matter ID; the original provider `webViewLink` is preserved in the
    source URL cell. Caller must acquire and verify the same review_staging CAS
    reservation before applying the returned patch/append plan.
    """
    try:
        p = _policy(policy, policy)
        auth = p.get("intake_authority")
        if not isinstance(auth, dict) or auth.get("status") != "CURRENT":
            raise Hold("current Finance Inbox source-class authority record is required")
        if (auth.get("folder_id") != p["bindings"]["finance_inbox_id"]
                or auth.get("drive_id") != p["bindings"]["finance_drive_id"]
                or not isinstance(auth.get("permitted_actions"), list)
                or not {"metadata_registration", "invoice_review"}.issubset(set(auth["permitted_actions"]))):
            raise Hold("intake authority does not bind the fixed Finance Inbox/Drive and review action")
        _nonempty(auth.get("authority_ref"), "intake authority reference")
        candidates = metadata if isinstance(metadata, list) else [metadata]
        if not candidates or any(not isinstance(m, dict) for m in candidates):
            raise Hold("exact Inbox metadata candidate is required")
        if any(any(isinstance(m.get(k), str) and m.get(k).strip()
                   for k in ("admitted_reply_to_source_id", "admitted_reply_to_request_id"))
               for m in candidates):
            return {"action": "HOLD_LINKED_REPLY_OBSERVATION",
                    "reason": "this source is linked to an existing matter; preserve the observation and do not register a second invoice matter",
                    "preserve_existing_rows": True}
        prepared = []
        for m in candidates:
            file_id = _nonempty(m.get("id"), "metadata file ID")
            version = _nonempty(m.get("version", m.get("modified_time", m.get("modifiedTime"))), "metadata source version")
            drive_id = _nonempty(m.get("drive_id", m.get("driveId")), "metadata drive ID")
            parents = m.get("parent_ids", m.get("parents"))
            if not isinstance(parents, list) or set(parents) != {p["bindings"]["finance_inbox_id"]}:
                raise Hold("metadata parent is not exactly the fixed Finance Inbox")
            if drive_id != p["bindings"]["finance_drive_id"]:
                raise Hold("metadata source is outside the fixed Finance Drive")
            mime = _nonempty(m.get("mime_type", m.get("mimeType")), "metadata MIME type")
            if mime not in p["supported_mime_types"]:
                raise Hold("metadata source format is unsupported")
            source_url = m.get("web_view_link", m.get("webViewLink")) or canonical_url(file_id)
            if canonical_file_id(source_url) != file_id:
                raise Hold("metadata link does not match observed file ID")
            source_hash = _nonempty(m.get("source_sha256"), "complete source SHA-256")
            if not re.fullmatch(r"[0-9a-f]{64}", source_hash):
                raise Hold("metadata source SHA-256 is malformed")
            prepared.append({"id": file_id, "version": version, "drive_id": drive_id,
                             "parent_ids": parents, "mime_type": mime,
                             "source_url": source_url, "source_sha256": source_hash})
        # Avoid choosing among multiple newly missing sources in one pass.
        distinct = {}
        for m in prepared:
            key = m["id"]
            if key in distinct and distinct[key] != m:
                raise Hold("same file has conflicting metadata observations")
            distinct[key] = m
        if len(distinct) != 1:
            raise Hold("one source candidate per bounded registration decision")
        m = next(iter(distinct.values()))
        if not isinstance(queue_rows, list):
            raise Hold("observed Queue rows are required")
        hits = []
        for idx, raw in enumerate(queue_rows):
            if isinstance(raw, (list, tuple)) and raw and str(raw[0]).strip().casefold() == "request id":
                continue
            row = _row_dict(raw)
            rid, source_url = row["request_id"], row["source_url"]
            ids = set()
            for value in (source_url, rid):
                try:
                    ids.add(canonical_file_id(value))
                except Hold:
                    if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]+", value.strip()):
                        ids.add(value.strip())
            if m["id"] in ids:
                hits.append((idx, row))
        if len(hits) > 1:
            raise Hold("multiple Queue rows already refer to this canonical source ID")
        if hits:
            idx, row = hits[0]
            existing_version = str(row["source_version"]).strip()
            if existing_version and existing_version != m["version"]:
                raise Hold("same source ID has a different Queue version; reconcile replacement in place")
            if existing_version == m["version"] and str(row["status"]).strip().upper() not in {"NEEDS_OPERATOR_REVIEW", "UNVERIFIED", ""}:
                return {"action": "ALREADY_REGISTERED", "row_number": idx + 1, "request_id": row["request_id"], "source_id": m["id"], "source_version": m["version"], "preserve_existing_rows": True}
            request_id = row["request_id"]
            source_department = "Finance Inbox"
            operation = "review_staging"
            binding = {
                "request_id": request_id, "matter_id": m["id"], "source_id": m["id"],
                "source_version": m["version"], "source_sha256": m["source_sha256"],
                "policy_sha256": p["policy_sha256"], "guide_sha256": p["guide_sha256"],
                "consumer_id": p["consumer_id"], "output_parent_id": p["bindings"]["review_folder_id"],
                "queue_id": p["queue_id"], "operation": operation,
            }
            action_key = _sha256(_canonical_json({k: binding[k] for k in ("source_id", "source_version", "consumer_id", "operation")}))
            patch = _patch(idx + 1, str(row["status"]), {
                "source_department": source_department, "destination_department": "Finance",
                "document_type": "UNCLASSIFIED FINANCE INBOX ARRIVAL", "source_version": m["version"],
                "status": "STAGED", "responsible_person": "UNASSIGNED",
                "next_action": "Read the exact admitted source and prepare a cited Finance review; metadata alone is not invoice validation.",
                "review_disposition": str(row["review_disposition"] or "") + ("; " if row["review_disposition"] else "") + f"metadata_intake=verified; source_id={m['id']}; source_version={m['version']}; authority_ref={auth['authority_ref']}; content_assessment=none",
            })
            kind = "ADMIT_EXISTING_ROW"
            row_number = idx + 1
        else:
            request_id = m["id"]  # exact Drive file ID; no random/synthetic ID
            source_department = "Finance Inbox"
            binding = {
                "request_id": request_id, "matter_id": m["id"], "source_id": m["id"],
                "source_version": m["version"], "source_sha256": m["source_sha256"],
                "policy_sha256": p["policy_sha256"], "guide_sha256": p["guide_sha256"],
                "consumer_id": p["consumer_id"], "output_parent_id": p["bindings"]["review_folder_id"],
                "queue_id": p["queue_id"], "operation": "review_staging",
            }
            action_key = _sha256(_canonical_json({k: binding[k] for k in ("source_id", "source_version", "consumer_id", "operation")}))
            append = [request_id, m["source_url"], source_department, "Finance",
                      "UNCLASSIFIED FINANCE INBOX ARRIVAL", m["version"], "STAGED", "",
                      "UNASSIGNED", "Read the exact admitted source and prepare a cited Finance review; metadata alone is not invoice validation.",
                      "", "0", "", f"metadata_intake=verified; source_id={m['id']}; source_version={m['version']}; authority_ref={auth['authority_ref']}; content_assessment=none"]
            patch = {"append_row_values": append, "expected_row_count": len(queue_rows)}
            kind, row_number = "APPEND_ADMITTED_ROW", None
        if reservation is None:
            return {"action": "READY_TO_REGISTER", "action_key": action_key, "binding": binding,
                    "reservation_document_id": p["reservation_doc_id"],
                    "reason": "metadata is exactly bound to the current Finance Inbox source-class authority; acquire review_staging CAS before Queue mutation",
                    "preserve_existing_rows": True}
        _validate_reservation(reservation, binding, action_key, p["reservation_doc_id"])
        if reservation.get("state") != "claimed":
            raise Hold("Queue admission requires an unused claimed review_staging reservation")
        if 'intake_provenance_version' in p:
            try:
                provenance=I.provenance(p,m,m['source_sha256'])
            except (ValueError,KeyError,TypeError) as e:
                raise Hold(str(e)) from e
            marker='intake_provenance_sha256='+I.digest(provenance)
            document_type='SYNTHETIC TEST INVOICE' if provenance['mode']=='SYNTHETIC' else 'INVOICE'
            if 'append_row_values' in patch:
                patch['append_row_values'][4]=document_type
                patch['append_row_values'][13]+='; '+marker+'; intake_mode='+provenance['mode']
            else:
                patch['updates']['document_type']=document_type
                patch['updates']['review_disposition']+='; '+marker+'; intake_mode='+provenance['mode']
        return {"action": kind, "action_key": action_key, "binding": binding,
                "reservation_document_id": p["reservation_doc_id"],
                "patch_plan": patch, "row_number": row_number,
                "source_id": m["id"], "source_version": m["version"],
                "request_id": request_id, "matter_id": m["id"],
                "preserve_existing_rows": True,
                "authority_note": "source-class permission comes from the trusted policy; metadata itself proves no invoice content or payment authority"}
    except Hold as e:
        return {"action": "HOLD", "reason": str(e)}


def _reservation_markers(row: dict) -> dict:
    return _claim_markers(row.get("review_disposition", ""))


def _patch(row_number: int, expected_status: str, updates: dict) -> dict:
    return {"row_number": row_number, "expected_status": expected_status, "updates": updates}


def evaluate(*, policy_before: dict, policy_after: dict, admission: dict,
             queue_rows: list, source_before: dict, source_after: dict,
             source_text: str, source_read: dict, invoice_facts: dict,
             effects: dict, reservation: dict | None, observed_at: str,
             original_context: dict | None = None) -> dict:
    """Return a bounded pure decision. See module docstring / `--help` contract."""
    try:
        p = _policy(policy_before, policy_after)
        if not isinstance(effects, dict):
            raise Hold("observed effects/recovery state are required")
        try:
            _dt.datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
        except (AttributeError, ValueError):
            raise Hold("observed_at must be an ISO timestamp")
        adm, orig, cur = _admission(p, admission)
        source_hash = _check_source(p, cur, source_before, source_after, source_text, source_read)
        provenance=_validate_intake(p,adm,source_hash,source_text)
        row_index, row, rows = _find_queue_row(queue_rows, adm, orig)
        row_number = row_index + 1 if queue_rows and isinstance(queue_rows[0], (list, tuple)) and str(queue_rows[0][0]).strip().casefold() == "request id" else row_index + 2
        status = str(row["status"]).strip().upper()
        if status not in SUPPORTED_STATUS:
            raise Hold("Queue row has an unsupported status")
        action_key = _action_key(p, adm, cur)
        if cur["role"] == "clarification":
            if status not in {"MISSING_DATA", "PROCESSING", *TERMINAL}:
                raise Hold("clarification may resume only the same matter in MISSING_DATA")
            prior = _reservation_markers(row)
            if prior.get("matter") and prior["matter"] != adm["matter_id"]:
                raise Hold("Queue matter identity changed")
            if not prior.get("matter"):
                raise Hold("legacy missing-data row has no immutable matter binding")
            if status not in TERMINAL:
                queue_missing = _queue_missing_fields(row.get("missing_fields", ""), p["required_fields"])
                if set(queue_missing) != set(cur["clarifies_fields"]):
                    raise Hold("Queue missing-field state differs from admitted clarification scope")
            if (status == "MISSING_DATA" and prior.get("current_source_id") == cur["id"]
                    and prior.get("current_source_version") == cur["version"]):
                if row.get("return_link"):
                    return {"action": "NO_OP_TERMINAL", "reason": "same clarification source already produced a terminal outcome", "row_number": row_number}
                raise Hold("same clarification source already ran but output link is absent; reconcile")
        elif status == "MISSING_DATA":
            raise Hold("invoice is waiting for admitted clarification; original source is unchanged")
        if status in TERMINAL:
            if row.get("return_link"):
                return {"action": "NO_OP_TERMINAL", "reason": "terminal Queue row; no repeated output effect", "row_number": row_number, "output_url": row["return_link"]}
            raise Hold("terminal Queue row lacks output readback; reconcile before any effect")
        if status == "UNCERTAIN":
            return {"action": "RECONCILE_ONLY", "reason": "uncertain Queue effect must be reconciled before continuation", "row_number": row_number}
        if status == "STAGED" and (row.get("return_link") or row.get("processed_at")):
            raise Hold("staged row already has effect markers; reconcile rather than replay")
        if status not in {"STAGED", "PROCESSING", "MISSING_DATA"}:
            raise Hold("Queue row is not eligible")

        prepared_facts, source_texts, original_hash = _prepare_invoice_context(
            p, adm, cur, source_text, invoice_facts, original_context)
        review = _invoice_review(p, adm, cur, source_text, source_hash, prepared_facts,
                                 effects, source_texts, original_hash)
        _native_review(p,adm,source_hash,review)
        artifact = _expected_artifact(review, p, adm, orig, cur, action_key, source_read)
        artifact_text = _render_artifact_text(artifact)
        output_hash = _sha256(artifact_text)
        binding, expected_key = _reservation_binding(p, adm, cur, source_hash)
        if action_key != expected_key:
            raise Hold("reservation action-key calculation mismatch")
        if reservation is None:
            if status not in {"STAGED", "MISSING_DATA"}:
                raise Hold("processing work cannot proceed without its exact CAS reservation")
            return {
                "action": "READY_TO_CLAIM", "reason": "source/policy/matter and invoice facts validated; no reservation or effect yet",
                "row_number": row_number, "action_key": action_key,
                "binding": binding, "review": review,
                "artifact_sha256": output_hash,
                "reservation_operation": binding["operation"],
            }
        _validate_reservation(reservation, binding, action_key, p["reservation_doc_id"])
        token = reservation["token"]

        # Verify the reservation is unique in the observed Queue and is the exact
        # claim attached to this row. Historical rows remain untouched.
        markers = _reservation_markers(row)
        if status == "STAGED" or (status == "MISSING_DATA" and cur["role"] == "clarification"):
            if reservation.get("state") != "claimed":
                raise Hold("new Queue claim requires the current reservation in claimed state")
            # First call requests the claim patch only. Caller must re-read and
            # call again with PROCESSING plus a verified unique claim receipt.
            for other in rows:
                om = _reservation_markers(other)
                if om.get("claim_token") == token:
                    raise Hold("claim token already appears in Queue history")
            observed_tokens = effects.get("observed_claim_tokens", [])
            if isinstance(observed_tokens, list) and token in observed_tokens:
                raise Hold("claim token is not unique in provider evidence")
            prior_disp = str(row.get("review_disposition", "")).strip()
            claim_text = "; ".join([
                f"consumer={p['consumer_id']}", f"claim_token={token}",
                f"action_key={action_key}", f"matter={adm['matter_id']}",
                f"original_source_id={orig['id']}", f"original_source_version={orig['version']}",
                f"current_source_id={cur['id']}", f"current_source_version={cur['version']}",
                f"source_sha256={source_hash}", f"policy_version={p['version']}",
                f"output_state=NOT_ATTEMPTED", f"attempt_count=0",
            ])
            if provenance is not None:
                claim_text+='; intake_provenance_sha256='+I.digest(provenance)+'; intake_mode='+provenance['mode']
            if review.get('native_gemini_review'):
                claim_text+='; native_gemini_response_sha256='+review['native_gemini_review']['response_sha256']
            if cur["role"] == "clarification" and prior_disp:
                # Preserve prior history rather than erase the missing-data attempt.
                if row.get("return_link"):
                    claim_text += f"; prior_output_url={row['return_link']}"
                claim_text = prior_disp + " || NEXT_ATTEMPT || " + claim_text
            return {
                "action": "CLAIM_PATCH_ONLY",
                "reason": "write the per-item reservation claim, read it back, then re-evaluate",
                "row_number": row_number, "action_key": action_key,
                "reservation_id": reservation["record_id"], "claim_token": token,
                "patch_plan": _patch(row_number, status, {
                    "status": "PROCESSING", "processed_at": observed_at,
                    "review_disposition": claim_text,
                    **({'document_type':'SYNTHETIC TEST INVOICE' if provenance['mode']=='SYNTHETIC' else 'INVOICE'} if provenance is not None else {}),
                }),
                "source_sha256": source_hash,
            }

        # A processing row may proceed only with the same current, unique claim.
        if provenance is not None:
            current_trace=str(row.get('review_disposition','')).split(' || NEXT_ATTEMPT || ')[-1].split('; ')
            if any(sum(part.startswith(key+'=') for part in current_trace)!=1 for key in ('intake_provenance_sha256','intake_mode')):
                raise Hold('Queue intake provenance markers are not unique')
            if markers.get('intake_provenance_sha256')!=I.digest(provenance) or markers.get('intake_mode')!=provenance['mode']:
                raise Hold('Queue intake provenance differs from exact admission')
            expected_type='SYNTHETIC TEST INVOICE' if provenance['mode']=='SYNTHETIC' else 'INVOICE'
            if row['document_type']!=expected_type:
                raise Hold('Queue intake document type differs from exact admission')
        if review.get('native_gemini_review'):
            trace=str(row.get('review_disposition','')).split(' || NEXT_ATTEMPT || ')[-1].split('; ')
            if sum(x.startswith('native_gemini_response_sha256=') for x in trace)!=1 or markers.get('native_gemini_response_sha256')!=review['native_gemini_review']['response_sha256']:
                raise Hold('Queue native Gemini response hash changed')
        if markers.get("consumer") != p["consumer_id"] or markers.get("claim_token") != token:
            raise Hold("Queue claim token/consumer does not match reservation")
        if markers.get("action_key") != action_key or markers.get("source_sha256") != source_hash:
            raise Hold("Queue claim is bound to a different source/action")
        if markers.get("policy_version") != p["version"] or markers.get("matter") != adm["matter_id"]:
            raise Hold("Queue claim is bound to a different policy/matter")
        if markers.get("current_source_id") != cur["id"] or markers.get("current_source_version") != cur["version"]:
            raise Hold("Queue claim is bound to a different current source")
        claim = effects.get("claim")
        if not isinstance(claim, dict) or claim.get("unique") is not True:
            raise Hold("independent unique claim readback is missing")
        for key, expected in {"token": token, "action_key": action_key, "source_id": cur["id"], "source_version": cur["version"], "policy_version": p["version"], "consumer_id": p["consumer_id"], "matter_id": adm["matter_id"]}.items():
            if claim.get(key) != expected:
                raise Hold(f"claim readback {key} mismatch")

        output = effects.get("output")
        if not isinstance(output, dict):
            raise Hold("provider output search/attempt state is required")
        search_state = output.get("search_state")
        output_state = output.get("state")
        candidates = output.get("candidates", [])
        if search_state == "MULTIPLE" or output_state == "MULTIPLE" or (isinstance(candidates, list) and len(candidates) > 1):
            return {"action": "HOLD_MULTIPLE_OUTPUTS", "reason": "multiple candidate outputs require reconciliation", "row_number": row_number}
        if search_state == "ZERO" and candidates:
            return {"action": "HOLD_CONTRADICTORY_OUTPUT_SEARCH", "reason": "zero-result search conflicts with nonempty output candidates", "row_number": row_number}
        if (output_state in {"ATTEMPT_IN_PROGRESS", "EFFECT_UNCERTAIN"}
                or reservation.get("state") == "effect_uncertain"):
            return {"action": "HOLD_UNCERTAIN_EFFECT", "reason": "output create may have committed; zero search does not authorize duplicate creation", "row_number": row_number, "search_state": search_state}
        if output_state == "CREATED" or search_state == "ONE":
            if reservation.get("state") not in {"effect_confirmed", "closed"}:
                raise Hold("output exists without confirmed CAS reservation state")
            if output_state != "CREATED":
                raise Hold("one output candidate lacks a confirmed create receipt")
            if search_state != "ONE" or not isinstance(candidates, list) or len(candidates) != 1:
                raise Hold("created effect does not have exactly one provider output")
            candidate = candidates[0]
            if not isinstance(candidate, dict):
                raise Hold("output provider result is malformed")
            output_id = _nonempty(candidate.get("id"), "observed output ID")
            if canonical_file_id(candidate.get("url", "")) != output_id:
                raise Hold("observed output URL/ID mismatch")
            if p["bindings"]["review_folder_id"] not in candidate.get("parent_ids", []):
                raise Hold("observed output is outside the fixed Finance review folder")
            if candidate.get("action_key") != action_key or candidate.get("content_sha256") != output_hash:
                raise Hold("observed output is not the expected source-bound review artifact")
            receipt = reservation.get("output")
            if not isinstance(receipt, dict) or receipt != {
                    "id": output_id, "parent_id": p["bindings"]["review_folder_id"],
                    "content_sha256": output_hash}:
                raise Hold("observed output differs from the durable CAS effect receipt")
            readback = effects.get("output_readback")
            if not isinstance(readback, dict) or readback.get("complete") is not True:
                raise Hold("output has not been read back completely")
            if readback.get("id") != output_id or readback.get("content_sha256") != output_hash:
                raise Hold("output readback differs from the planned artifact")
            if readback.get("action_key") != action_key or readback.get("parent_id") != p["bindings"]["review_folder_id"]:
                raise Hold("output readback provenance mismatch")
            terminal = review["status"]
            missing_text = ", ".join(review["missing_fields"])
            next_action = ("Request only the listed missing fields through the admitted internal route; no message sent" if terminal == "MISSING_DATA" else "Human Finance review required; no payment or accounting entry")
            disp = str(row.get("review_disposition", ""))
            # The exact output is read back before this terminal Queue patch.
            return {
                "action": "FINALIZE_AFTER_OUTPUT_READBACK",
                "row_number": row_number, "output_id": output_id,
                "output_url": candidate["url"], "status": terminal,
                "patch_plan": _patch(row_number, "PROCESSING", {
                    "status": terminal, "missing_fields": missing_text,
                    "responsible_person": p.get("review_owner", p["consumer_id"]),
                    "next_action": next_action,
                    "return_link": candidate["url"], "processed_at": observed_at,
                    "review_disposition": (disp + f"; output_id={output_id}; output_sha256={output_hash}; output_readback=verified; outcome={terminal}"),
                }),
                "review": review,
            }
        if search_state != "ZERO":
            raise Hold("output search is not an authoritative single/zero result")
        if reservation.get("state") != "claimed":
            raise Hold("new output effect requires an unused claimed reservation")
        if output_state == "NO_EFFECT_CONFIRMED":
            attempt_count = output.get("attempt_count")
            if not isinstance(attempt_count, int) or isinstance(attempt_count, bool) or attempt_count < 1:
                raise Hold("verified no-effect retry count is invalid")
            if attempt_count >= p["max_output_attempts"]:
                return {"action": "HOLD_RETRY_LIMIT", "reason": "bounded output retry limit reached", "row_number": row_number}
        elif output_state != "NOT_ATTEMPTED":
            raise Hold("output effect state is unknown; cannot create")
        else:
            attempt_count = 0
        if markers.get("output_state") not in {"NOT_ATTEMPTED", "NO_EFFECT_CONFIRMED"}:
            raise Hold("Queue write-ahead output state is not safe to create")
        if markers.get("attempt_count") != str(attempt_count):
            raise Hold("Queue output attempt count differs from provider evidence")
        return {
            "action": "CREATE_REVIEW_OUTPUT",
            "reason": "one source-cited internal review artifact may be created in the fixed Finance review folder",
            "row_number": row_number, "action_key": action_key,
            "target_folder_id": p["bindings"]["review_folder_id"],
            "claim_token": token, "attempt_number": attempt_count + 1,
            "idempotency_key": action_key,
            "artifact": artifact, "artifact_text": artifact_text,
            "artifact_sha256": output_hash,
            "effects_warning": "record create attempt before provider call; on timeout mark uncertain and reconcile; never replay on zero search alone",
        }
    except Hold as e:
        return {"action": "HOLD", "reason": str(e)}


def _help_text() -> str:
    return """Pure JSON adapter. Read one JSON object from stdin and emit one JSON decision.
No network/API/file writes are performed. Required input keys:
  policy_before, policy_after, admission, queue_rows, source_before, source_after,
  source_text, source_read, invoice_facts, effects, reservation, observed_at
Optional key: original_context (required for an admitted clarification; omitted for a new invoice)
Call make_candidate before reservation/Queue admission; call evaluate after the
matching Queue row and reservation are read back. Call reconcile_arrivals for
one metadata-only Inbox registration plan. See module docstring for full schema.
The coordinator must independently verify Docs requiredRevisionId CAS evidence;
this module validates supplied reservation/readback fields only. It never sends
mail, pays, writes accounting, or marks invoices paid."""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=_help_text(), formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--help-contract", action="store_true", help="print the adapter input contract and exit")
    args = parser.parse_args(argv)
    if args.help_contract:
        print(_help_text())
        return 0
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise ValueError("input JSON must be an object")
        result = evaluate(**payload)
    except (TypeError, ValueError, json.JSONDecodeError) as e:
        result = {"action": "HOLD", "reason": f"invalid adapter input: {e}"}
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

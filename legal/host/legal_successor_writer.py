"""Conditional native-Docs canonical writer for one private Legal matter.

This module uses the existing, separate Legal reservation Doc. It never
updates the legacy raw JSON. All provider calls are injected as connected
tool methods by the parent host and checked through strict native parsers.
"""
from __future__ import annotations

import copy

from .legal_docs_claim import (
    CANONICAL_RECORD, Held, LEGAL_PARENT, action_key, canonical, digest,
    legacy_reference, native_text, parse_record_readback, plan, provider_metadata,
    require, runtime_entry, sha, snapshot, successor_mode, successor_seed, successor_snapshot,
    validate_binding, validate_config, validate_successor_record,
)
from .legal_docs_host import Uncertain


def _batch(config, revision, end, updated):
    text = canonical(updated) + "\n"
    require(len(text) <= 1_000_000, "successor Legal record capacity")
    return {
        "document_id": config["canonicalRecordId"],
        "write_control": {"requiredRevisionId": revision},
        "requests": [
            {"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end - 1,
                                               "tabId": config["canonicalTabId"]}}},
            {"insertText": {"location": {"index": 1, "tabId": config["canonicalTabId"]},
                            "text": text[:-1]}},
        ],
    }, text


def plan_seed(inp):
    """Plan initial content for a newly created, empty private native Doc."""
    require(type(inp) is dict, "successor seed input required")
    config = validate_config(inp.get("config"))
    require(successor_mode(config), "native successor configuration required")
    legacy = inp.get("legacy_readback")
    seed = successor_seed(config, legacy)
    readback = inp.get("successor_readback")
    require(type(readback) is dict, "connected successor readback required")
    provider_metadata(readback.get("metadata"), config,
                      "application/vnd.google-apps.document", config["canonicalRecordId"])
    revision, text, end = native_text(readback.get("document"), {
        "documentId": config["canonicalRecordId"], "tabId": config["canonicalTabId"]})
    expected_text = canonical(seed) + "\n"
    if text == expected_text:
        successor_snapshot(readback, config, legacy)
        return {"already_seeded": True, "expected_text": expected_text,
                "legacy_content_sha256": seed["legacy_ref"]["content_sha256"]}
    require(text == "\n" and end == 2, "successor Doc contains nonempty/unrecognized content")
    return {"expected_text": expected_text,
            "legacy_content_sha256": seed["legacy_ref"]["content_sha256"],
            "batch": {
                "document_id": config["canonicalRecordId"],
                "write_control": {"requiredRevisionId": revision},
                "requests": [{"insertText": {"location": {"index": 1, "tabId": config["canonicalTabId"]},
                                             "text": expected_text[:-1]}}],
            }}


def seed_successor(tools, config):
    """Seed once after parent creates the Doc; report success on exact readback."""
    validate_config(config)
    require(successor_mode(config), "native successor configuration required")
    _check_private_visibility(tools, config, config["documentId"])
    _check_private_visibility(tools, config, config["canonicalRecordId"])
    successor = _read_native(tools, config["canonicalRecordId"])
    legacy = _read_legacy(tools, config)
    proposed = plan_seed({"config": config, "successor_readback": successor,
                          "legacy_readback": legacy})
    if "batch" not in proposed:
        return proposed
    try:
        tools.batch_update_document(document_id=proposed["batch"]["document_id"],
                                    requests=proposed["batch"]["requests"],
                                    write_control=proposed["batch"]["write_control"])
    except Exception:
        pass
    try:
        _check_private_visibility(tools, config, config["documentId"])
        _check_private_visibility(tools, config, config["canonicalRecordId"])
        fresh_successor = _read_native(tools, config["canonicalRecordId"])
        fresh_legacy = _read_legacy(tools, config)
        _, text, _, record = successor_snapshot(fresh_successor, config, fresh_legacy)
        require(text == proposed["expected_text"]
                and record["legacy_ref"]["content_sha256"] == proposed["legacy_content_sha256"],
                "successor seed readback mismatch")
    except Exception as exc:
        raise Uncertain("Legal successor seed uncertain; inspect before registration") from exc
    return {**proposed, "readback_verified": True}


def plan_result_write(inp):
    require(type(inp) is dict, "successor write input required")
    config = validate_config(inp.get("config"))
    require(successor_mode(config), "native successor configuration required")
    binding = validate_binding(inp.get("binding"), config)
    token = digest(inp.get("token"))
    key = action_key(binding, config)
    classification = inp.get("classification")
    require(type(classification) is dict, "Legal classification object required")
    lineage = classification.get("lineage")
    require(type(lineage) is dict and all(lineage.get(field) == binding[field] for field in
            ("matter_id", "source_id", "source_version", "source_sha256",
             "policy_sha256", "guide_sha256", "original_source_id", "current_source_id")),
            "Legal classification not bound to admitted source")
    projection = classification.get("executive_projection")
    require(type(classification.get("schema_version")) is int
            and classification["schema_version"] == 1 and type(projection) is dict
            and projection.get("minimum_private_reference") == LEGAL_PARENT,
            "Legal classification version/private target mismatch")
    result_sha = sha(classification)
    legacy_ref = legacy_reference(inp.get("legacy_readback"), config)
    _, _, _, reservation = snapshot(inp.get("reservation_document"),
                                     inp.get("reservation_metadata"), config)
    record = reservation["entries"].get(key)
    require(type(record) is dict and record["binding"] == binding and record["token"] == token,
            "Legal reservation binding/token absent")
    require(reservation["active_key"] == key and record["state"] in
            {"effect_uncertain", "effect_confirmed"}, "Legal effect admission absent")
    require(record["manual_base_sha256"] == legacy_ref["manual_base_sha256"],
            "legacy manual source changed since claim")
    revision, _, end, successor = successor_snapshot(inp.get("successor_readback"), config,
                                                      inp.get("legacy_readback"))
    existing = successor["runtime_results"].get(key)
    if existing is not None:
        require(existing == {"schema_version": 1, "binding": binding,
                             "classification": classification},
                "existing successor result differs; never overwrite")
        output = runtime_entry(inp["successor_readback"], config, binding, key,
                               result_sha, record["manual_base_sha256"])
        if record["output"] is not None:
            require(record["output"] == output, "reservation/result receipt conflict")
        return {"already_recorded": True, "action_key": key, "output": output,
                "result_sha256": result_sha}
    require(record["state"] == "effect_uncertain" and record["output"] is None,
            "confirmed Legal result missing from successor")
    require(len(successor["runtime_results"]) < 1000, "successor result capacity")
    updated = copy.deepcopy(successor)
    updated["runtime_results"][key] = {
        "schema_version": 1, "binding": binding, "classification": classification,
    }
    # Validate the complete proposed object before any batch can be emitted.
    validate_successor_record(updated, config, inp.get("legacy_readback"))
    batch, expected_text = _batch(config, revision, end, updated)
    return {"action_key": key, "batch": batch, "expected_text": expected_text,
            "expected_content_sha256": sha(updated), "result_sha256": result_sha,
            "legacy_content_sha256": legacy_ref["content_sha256"]}


def _read_native(tools, file_id):
    try:
        metadata = tools.get_file_metadata(fileId=file_id)
        document = tools.get_document(document_id=file_id)
    except Exception as exc:
        raise Held("connected native Legal Doc read failed") from exc
    return {"metadata": metadata, "document": document}


def _check_private_visibility(tools, config, file_id):
    """Require a parent-bound permissions read, not a shared/private Boolean."""
    try:
        raw = tools.get_private_file_visibility(file_id=file_id)
    except Exception as exc:
        raise Held("connected Legal permissions read unavailable") from exc
    require(type(raw) is dict and raw.get("isError") is not True
            and type(raw.get("structuredContent")) is dict,
            "connected Legal permissions envelope required")
    data = raw["structuredContent"]
    require(set(data) == {"file_id", "parent_id", "permissions", "next_page_token", "pages_exhausted"}
            and data["next_page_token"] is None and data["pages_exhausted"] is True,
            "complete Legal permissions pagination required")
    require(data.get("file_id") == file_id and data.get("parent_id") == LEGAL_PARENT,
            "Legal permissions target/parent mismatch")
    permissions = data.get("permissions")
    require(type(permissions) is list and bool(permissions) and len(permissions) <= 20,
            "complete Legal permissions readback required")
    actual = set()
    for item in permissions:
        require(type(item) is dict and set(item) == {"type", "email", "role"}
                and item["type"] == "user"
                and type(item["email"]) is str and item["email"] in config["privateAllowedEmails"]
                and item["role"] in {"owner", "writer", "reader", "commenter", "organizer", "fileOrganizer"},
                "Legal file has unapproved permission")
        require(item["email"] not in actual, "duplicate Legal permission")
        actual.add(item["email"])
    return sha(sorted(permissions, key=lambda item: item["email"]))


def _read_legacy(tools, config):
    try:
        _check_private_visibility(tools, config, CANONICAL_RECORD)
        metadata = tools.get_file_metadata(fileId=CANONICAL_RECORD)
        data = provider_metadata(metadata, config, "application/json")
        url = data.get("url") or data.get("display_url")
        require(type(url) is str and url.startswith("https://drive.google.com/file/d/"
                                                    + CANONICAL_RECORD + "/"),
                "trusted legacy Drive URL absent")
        raw = tools.fetch(url=url, download_raw_file=True)
        parse_record_readback(raw, config)
    except Held:
        raise
    except Exception as exc:
        raise Held("connected legacy Legal read failed") from exc
    return raw


def _read_all(tools, config):
    _check_private_visibility(tools, config, config["documentId"])
    _check_private_visibility(tools, config, config["canonicalRecordId"])
    return (_read_native(tools, config["documentId"]),
            _read_native(tools, config["canonicalRecordId"]),
            _read_legacy(tools, config))


def _transition_input(config, operation, reservation, successor, legacy,
                      binding, token, expected_result_sha256, reason):
    inp = {"config": config, "metadata": reservation["metadata"],
           "document": reservation["document"], "operation": operation}
    if operation != "inspect":
        inp.update(binding=binding, token=token)
    if operation in {"claim", "mark_uncertain"}:
        inp.update(legacy_before=legacy, successor_before=successor)
    if operation in {"confirm_effect", "close"}:
        inp["record_after"] = successor
    if operation == "confirm_effect":
        inp["expected_result_sha256"] = expected_result_sha256
    if operation == "cancel_before_effect":
        inp["reason"] = reason
    return inp


def reservation_transition(tools, config, operation, *, binding=None, token=None,
                           expected_result_sha256=None, reason=None):
    """Run one conditional reservation transition, including all three readbacks."""
    validate_config(config)
    require(successor_mode(config), "native successor configuration required")
    require(operation in {"inspect", "claim", "mark_uncertain", "confirm_effect",
                          "close", "cancel_before_effect"}, "unsupported Legal transition")
    if operation != "inspect":
        validate_binding(binding, config)
        digest(token)
    reservation, successor, legacy = _read_all(tools, config)
    successor_snapshot(successor, config, legacy)
    proposed = plan(_transition_input(config, operation, reservation, successor,
                                       legacy, binding, token, expected_result_sha256, reason))
    if "batch" not in proposed:
        return proposed
    try:
        tools.batch_update_document(document_id=proposed["batch"]["document_id"],
                                    requests=proposed["batch"]["requests"],
                                    write_control=proposed["batch"]["write_control"])
    except Exception:
        # An error may follow a committed write. Never replay it here.
        pass
    try:
        fresh_reservation, fresh_successor, fresh_legacy = _read_all(tools, config)
        plan({"config": config, "metadata": fresh_reservation["metadata"],
              "document": fresh_reservation["document"], "operation": "verify",
              "expected_text": proposed["expected_text"]})
        _, before_text, _, _ = successor_snapshot(successor, config, legacy)
        _, after_text, _, _ = successor_snapshot(fresh_successor, config, fresh_legacy)
        if operation in {"claim", "mark_uncertain", "cancel_before_effect"}:
            require(after_text == before_text, "successor changed during reservation CAS")
        elif operation in {"confirm_effect", "close"}:
            result_sha = proposed["record"]["output"]["result_sha256"]
            require(runtime_entry(fresh_successor, config, binding, proposed["action_key"],
                                  result_sha, proposed["record"]["manual_base_sha256"])
                    == proposed["record"]["output"], "successor receipt changed during settlement")
        require(legacy_reference(fresh_legacy, config) == legacy_reference(legacy, config),
                "legacy Legal source changed during reservation CAS")
    except Exception as exc:
        raise Uncertain("Legal reservation CAS uncertain; reconcile before any effect") from exc
    return {**proposed, "readback_verified": True}


def write_result(tools, config, *, binding, token, classification, allow_new=True):
    """One CAS attempt on successor canonical Doc, followed by exact readback."""
    validate_config(config)
    require(successor_mode(config), "native successor configuration required")
    validate_binding(binding, config)
    digest(token)
    reservation, successor, legacy = _read_all(tools, config)
    proposed = plan_result_write({
        "config": config, "binding": binding, "token": token,
        "classification": classification,
        "reservation_metadata": reservation["metadata"],
        "reservation_document": reservation["document"],
        "successor_readback": successor, "legacy_readback": legacy,
    })
    if "batch" not in proposed:
        return proposed
    if not allow_new:
        raise Uncertain("prior Legal effect uncertain and no exact canonical result; never replay")
    try:
        tools.batch_update_document(document_id=proposed["batch"]["document_id"],
                                    requests=proposed["batch"]["requests"],
                                    write_control=proposed["batch"]["write_control"])
    except Exception:
        pass
    try:
        fresh_reservation, fresh_successor, fresh_legacy = _read_all(tools, config)
        _, text, _, fresh_record = successor_snapshot(fresh_successor, config, fresh_legacy)
        require(text == proposed["expected_text"] and sha(fresh_record) == proposed["expected_content_sha256"],
                "successor exact write readback mismatch")
        require(legacy_reference(fresh_legacy, config)["content_sha256"] == proposed["legacy_content_sha256"],
                "legacy Legal source drifted during effect")
        _, _, _, ledger = snapshot(fresh_reservation["document"], fresh_reservation["metadata"], config)
        current = ledger["entries"].get(proposed["action_key"])
        require(current is not None and current["binding"] == binding and current["token"] == token
                and current["state"] == "effect_uncertain" and ledger["active_key"] == proposed["action_key"],
                "Legal reservation changed during effect")
    except Exception as exc:
        raise Uncertain("Legal canonical write uncertain; reconcile exact Docs state") from exc
    return {**proposed, "readback_verified": True}

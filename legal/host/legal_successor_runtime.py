"""Private Legal matter route: connected admission -> pure review -> CAS -> settlement.

The parent binds `get_owner_admission` and `read_review_evidence` to its
registered, connected Legal source/admission adapters. This file never sends
mail, changes permissions, or exposes source/body to an external renderer.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import re

from legal_review import review

from .legal_docs_claim import (
    Held, action_key, digest, require, sha, successor_mode, successor_snapshot,
    validate_binding, validate_config,
)
from .legal_docs_host import Uncertain
from .legal_successor_writer import _read_all, reservation_transition, write_result


def _structured(result, label):
    require(type(result) is dict and result.get("isError") is not True
            and type(result.get("structuredContent")) is dict,
            "connected " + label + " readback required")
    return result["structuredContent"]


def _gmail_source(tools, message_id, owner_email):
    require(type(message_id) is str and bool(re.fullmatch(r"[0-9a-f]{12,32}", message_id)),
            "immutable Gmail source ID required")
    profile = _structured(tools.get_profile(), "owner profile")
    require(profile.get("email") == owner_email, "authenticated owner mailbox mismatch")
    email = _structured(tools.read_email(message_id=message_id, format="raw"), "Gmail source")
    require(email.get("id") == message_id, "wrong immutable Gmail source")
    raw = email.get("raw")
    require(type(raw) is str and 0 < len(raw) <= 8_000_000
            and bool(re.fullmatch(r"[A-Za-z0-9_-]+={0,2}", raw)), "Gmail raw bytes missing")
    try:
        binary = base64.b64decode(raw + "=" * (-len(raw) % 4), altchars=b"-_", validate=True)
    except ValueError as exc:
        raise Held("invalid Gmail raw source") from exc
    require(0 < len(binary) <= 6_000_000, "Gmail source size invalid")
    source_sha = hashlib.sha256(binary).hexdigest()
    return {"source_id": "gmail:" + message_id,
            "source_version": "sha256:" + source_sha,
            "source_sha256": source_sha,
            "owner_email": owner_email}


def _admit(tools, config, *, owner_email, message_id):
    source = _gmail_source(tools, message_id, owner_email)
    raw = _structured(tools.get_owner_admission(matter_id=config["matterId"],
                                                       source_id=source["source_id"],
                                                       consumer_id=config["ownerId"]),
                      "registered Legal admission")
    require(raw.get("registered") is True and raw.get("current") is True
            and raw.get("revoked") is False, "registered Legal owner admission inactive")
    require(raw.get("principal_email") == owner_email
            and raw.get("consumer_id") == config["ownerId"]
            and raw.get("matter_id") == config["matterId"],
            "Legal owner/matter admission mismatch")
    revision = raw.get("registry_revision")
    require(type(revision) is str and bool(revision.strip()), "admission revision unavailable")
    admission = raw.get("admission")
    require(type(admission) is dict and admission.get("verified") is True
            and admission.get("current_approval") is True
            and admission.get("source_validated") is True,
            "Legal admission content not verified")
    require(all(admission.get(key) == value for key, value in (
        ("department", "Legal"), ("matter_id", config["matterId"]),
        ("consumer_id", config["ownerId"]), ("queue_id", config["canonicalRecordId"]),
        ("output_parent_id", config["parentId"]), ("operation", "legal_private_review"),
        ("source_id", source["source_id"]), ("current_source_id", source["source_id"]),
        ("source_version", source["source_version"]),
        ("source_sha256", source["source_sha256"]),
        ("source_provider", "gmail"), ("source_account", owner_email))),
        "Legal admission source/target mismatch")
    require(admission.get("allowed_effects") == ["legal_private_review"],
            "Legal admission effect scope mismatch")
    binding = {key: admission[key] for key in (
        "request_id", "matter_id", "source_id", "source_version", "source_sha256",
        "policy_sha256", "guide_sha256", "consumer_id", "output_parent_id", "queue_id",
        "operation", "original_source_id", "current_source_id", "authorization_reference")}
    validate_binding(binding, config)
    return admission, binding, {"registry_revision": revision, **source}


def _evidence(tools, config, admission, source):
    raw = _structured(tools.read_review_evidence(matter_id=config["matterId"],
                                                        source_id=source["source_id"],
                                                        source_version=source["source_version"]),
                      "private Legal evidence")
    require(raw.get("matter_id") == config["matterId"]
            and raw.get("source_id") == source["source_id"]
            and raw.get("source_version") == source["source_version"]
            and raw.get("source_sha256") == source["source_sha256"],
            "Legal evidence/source readback mismatch")
    payload = raw.get("payload")
    require(type(payload) is dict and payload.get("schema_version") == 1,
            "private Legal review payload unavailable")
    require(payload.get("admission") in (None, admission),
            "untrusted Legal admission override")
    require(payload.get("reservation") in (None, {}),
            "untrusted Legal reservation override")
    payload = copy.deepcopy(payload)
    payload["admission"] = copy.deepcopy(admission)
    return payload


def _review_payload(payload, config, binding):
    updated = copy.deepcopy(payload)
    updated["reservation"] = {
        "verified": True, "department": "Legal", "record_id": config["documentId"],
        "consumer_id": config["ownerId"], "queue_id": config["canonicalRecordId"],
        "finance_reuse": False, "state": "claimed", "binding": copy.deepcopy(binding),
    }
    result = review(updated)
    require(type(result) is dict and result.get("lineage", {}).get("matter_id") == config["matterId"]
            and result["lineage"].get("source_id") == binding["source_id"]
            and result["lineage"].get("source_version") == binding["source_version"]
            and result["lineage"].get("source_sha256") == binding["source_sha256"],
            "classifier lineage mismatch")
    return result


def _fingerprint(tools, config, owner_email, message_id):
    admission, binding, source = _admit(tools, config, owner_email=owner_email,
                                        message_id=message_id)
    payload = _evidence(tools, config, admission, source)
    return admission, binding, source, payload, sha({"admission": admission,
                                                    "source": source, "evidence": payload})


def _current_result(tools, config, binding):
    _, successor, legacy = _read_all(tools, config)
    _, _, _, record = successor_snapshot(successor, config, legacy)
    key = action_key(binding, config)
    item = record["runtime_results"].get(key)
    require(type(item) is dict and item["binding"] == binding, "canonical Legal result unavailable")
    return item["classification"]


def execute(tools, config, *, owner_email, message_id):
    """Run or reconcile one private Legal source version. No external output."""
    validate_config(config)
    require(successor_mode(config), "native canonical Legal Doc required")
    require(owner_email in config["privateAllowedEmails"],
            "authenticated owner outside private Legal ACL policy")
    admission, binding, source, payload, initial_fingerprint = _fingerprint(
        tools, config, owner_email, message_id)
    key = action_key(binding, config)
    # Stable derivation allows restart to resume an unperformed claimed state.
    token = sha({"action_key": key, "authorization_reference": binding["authorization_reference"],
                 "owner_id": config["ownerId"], "canonical_record_id": config["canonicalRecordId"]})
    claim = reservation_transition(tools, config, "claim", binding=binding, token=token)
    if claim.get("already_recorded"):
        return {"state": "CLOSED", "classification": _current_result(tools, config, binding),
                "action_key": key, "replayed": False}
    classification = _review_payload(payload, config, binding)
    fresh = _fingerprint(tools, config, owner_email, message_id)
    require(fresh[4] == initial_fingerprint and fresh[1] == binding,
            "Legal source/admission/evidence drift before effect")
    state = claim["record"]["state"]
    if state == "effect_confirmed":
        require(_current_result(tools, config, binding) == classification,
                "confirmed Legal result/classification drift")
    elif state == "effect_uncertain":
        # A previous write may have committed. Read back only; never retry it.
        write_result(tools, config, binding=binding, token=token,
                     classification=classification, allow_new=False)
        reservation_transition(tools, config, "confirm_effect", binding=binding,
                               token=token, expected_result_sha256=sha(classification))
    else:
        require(state == "claimed", "unsupported Legal reservation recovery state")
        reservation_transition(tools, config, "mark_uncertain", binding=binding, token=token)
        fresh = _fingerprint(tools, config, owner_email, message_id)
        require(fresh[4] == initial_fingerprint and fresh[1] == binding,
                "Legal source/admission/evidence drift before canonical write")
        write_result(tools, config, binding=binding, token=token,
                     classification=classification)
        reservation_transition(tools, config, "confirm_effect", binding=binding,
                               token=token, expected_result_sha256=sha(classification))
    reservation_transition(tools, config, "close", binding=binding, token=token)
    require(_current_result(tools, config, binding) == classification,
            "closed Legal result readback mismatch")
    return {"state": "CLOSED", "classification": classification,
            "action_key": key, "replayed": False}

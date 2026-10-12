"""Pure, deterministic BO-04 Legal evidence classifier.

The parent host authenticates and admits evidence, reserves the Legal queue,
and performs any rendering or effect. This module has no I/O, provider
dependencies, mutable state, or effect capability. See integration_contract.txt
for the wire schema.
"""

from __future__ import annotations

from collections.abc import Mapping
import copy
from datetime import datetime, timezone
from typing import Any
import re


SCHEMA_VERSION = 1
LEGAL_OUTPUT_PARENT_ID = "{{CONFIGURE_GOOGLE_ID_078}}"
_BINDING_FIELDS = (
    "request_id", "matter_id", "source_id", "source_version", "source_sha256",
    "policy_sha256", "guide_sha256", "consumer_id", "output_parent_id",
    "queue_id", "operation", "original_source_id", "current_source_id",
    "authorization_reference",
)
_HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")
_INJECTION_MARKERS = (
    "ignore all rules",
    "ignore previous instructions",
    "send source body to an external recipient",
    "change recipients or permissions",
)


def _obj(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _present(value: Any) -> bool:
    return value is not None and value != "" and value != [] and value != {}


def _valid_sha(value: Any) -> bool:
    return isinstance(value, str) and bool(_HEX64.fullmatch(value))


def _safe_text(value: Any) -> str | None:
    return value if isinstance(value, str) else None


def _unknown(code: str, detail: str) -> dict[str, str]:
    return {"code": code, "detail": detail}


def _base(admission: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "facts": {},
        "differences": [],
        "actual_use_relevance": {"status": "UNKNOWN", "services": [], "account_scope": "unresolved", "reasons": []},
        "materiality": "UNKNOWN",
        "unknowns": [],
        "next_action": {"action": "recover_required_evidence", "requires_host_effect": False},
        "outcome": "WAITING_FOR_INPUT",
        "lineage": {
            "matter_id": _safe_text(admission.get("matter_id")),
            "original_source_id": _safe_text(admission.get("original_source_id")),
            "current_source_id": _safe_text(admission.get("current_source_id")),
            "source_id": _safe_text(admission.get("source_id")),
            "source_version": _safe_text(admission.get("source_version")),
            "source_sha256": _safe_text(admission.get("source_sha256")),
            "policy_sha256": _safe_text(admission.get("policy_sha256")),
            "guide_sha256": _safe_text(admission.get("guide_sha256")),
        },
        "executive_projection": {
            "matter_id": _safe_text(admission.get("matter_id")),
            "status": "WAITING_FOR_INPUT",
            "responsible_owner": _safe_text(admission.get("consumer_id")),
            "minimum_private_reference": LEGAL_OUTPUT_PARENT_ID if admission.get("output_parent_id") == LEGAL_OUTPUT_PARENT_ID else None,
        },
    }


def _set_outcome(result: dict[str, Any], outcome: str, action: str, unknowns: list[dict[str, str]] | None = None) -> dict[str, Any]:
    result["outcome"] = outcome
    result["next_action"] = {"action": action, "requires_host_effect": False}
    if unknowns is not None:
        result["unknowns"] = unknowns
    result["executive_projection"]["status"] = outcome
    return result


def _admission_errors(admission: Mapping[str, Any]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    required_text = (
        "request_id", "matter_id", "source_id", "source_version", "consumer_id", "queue_id",
        "requester_identity_evidence", "authorization_reference", "purpose", "source_provider",
        "source_account", "observation_utc", "original_source_id", "current_source_id",
    )
    if admission.get("verified") is not True or admission.get("department") != "Legal":
        errors.append(_unknown("ADMISSION_UNVERIFIED", "Host admission is not verified for Legal."))
    for key in required_text:
        if not isinstance(admission.get(key), str) or not admission[key].strip():
            errors.append(_unknown("ADMISSION_FIELD_MISSING", f"Admission field {key} must be a nonempty string."))
    for key in ("source_sha256", "policy_sha256", "guide_sha256"):
        if not _valid_sha(admission.get(key)):
            errors.append(_unknown("ADMISSION_HASH_INVALID", f"Admission field {key} must be a 64-character SHA256."))
    if admission.get("operation") != "legal_private_review":
        errors.append(_unknown("ADMISSION_OPERATION_INVALID", "Operation must be legal_private_review."))
    if admission.get("output_parent_id") != LEGAL_OUTPUT_PARENT_ID:
        errors.append(_unknown("ADMISSION_DESTINATION_INVALID", "Admission does not name the fixed private Legal output parent."))
    if admission.get("current_source_id") != admission.get("source_id"):
        errors.append(_unknown("ADMISSION_SOURCE_DRIFT", "current_source_id must equal admitted source_id."))
    permitted = admission.get("permitted_source_ids")
    if not isinstance(permitted, list) or not permitted or any(not isinstance(x, str) or not x.strip() for x in permitted):
        errors.append(_unknown("ADMISSION_SOURCE_SET_INVALID", "permitted_source_ids must be a nonempty list of IDs."))
    elif all(isinstance(admission.get(field), str) for field in ("source_id", "original_source_id", "current_source_id")) and not {admission.get("source_id"), admission.get("original_source_id"), admission.get("current_source_id")}.issubset(set(permitted)):
        errors.append(_unknown("ADMISSION_SOURCE_SET_INCOMPLETE", "Permitted source IDs must include original and current source IDs."))
    if admission.get("allowed_effects") != ["legal_private_review"]:
        errors.append(_unknown("ADMISSION_EFFECT_SCOPE_INVALID", "allowed_effects must exactly equal [legal_private_review]."))
    for key in ("current_approval", "source_validated"):
        if admission.get(key) is not True:
            errors.append(_unknown("ADMISSION_APPROVAL_INVALID", f"Admission field {key} must be true."))
    observation = admission.get("observation_utc")
    if isinstance(observation, str):
        try:
            if "T" not in observation or not (observation.endswith("Z") or observation.endswith("+00:00")):
                raise ValueError
            parsed = datetime.fromisoformat(observation.replace("Z", "+00:00"))
            if parsed.tzinfo is None or parsed.utcoffset() != timezone.utc.utcoffset(parsed):
                raise ValueError
        except ValueError:
            errors.append(_unknown("ADMISSION_TIME_INVALID", "observation_utc must be an ISO8601 UTC timestamp."))
    return errors


def _reservation_error(reservation: Mapping[str, Any], admission: Mapping[str, Any]) -> str | None:
    state = reservation.get("state")
    if (
        reservation.get("verified") is not True
        or reservation.get("department") != "Legal"
        or not isinstance(reservation.get("record_id"), str)
        or not reservation.get("record_id").strip()
        or reservation.get("consumer_id") != admission.get("consumer_id")
        or reservation.get("queue_id") != admission.get("queue_id")
        or reservation.get("finance_reuse") is not False
        or not isinstance(state, str)
        or state not in {"claimed", "effect_uncertain", "effect_confirmed", "closed"}
        or not _binding_matches(_obj(reservation.get("binding")), admission)
    ):
        return "Legal-only verified reservation binding is missing or inconsistent."
    return None


def _binding_matches(binding: Mapping[str, Any], admission: Mapping[str, Any]) -> bool:
    return all(_present(admission.get(field)) and binding.get(field) == admission.get(field) for field in _BINDING_FIELDS)


def _permitted_ref(ref: Any, admission: Mapping[str, Any]) -> bool:
    return isinstance(ref, str) and ref in admission.get("permitted_source_ids", [])


def _valid_refs(refs: Any, admission: Mapping[str, Any]) -> bool:
    return isinstance(refs, list) and bool(refs) and all(_permitted_ref(ref, admission) for ref in refs)


def _resolved_predicates(predicates: Any, use: Mapping[str, Any]) -> tuple[bool, list[str]]:
    if predicates is None:
        return True, []
    if not isinstance(predicates, Mapping):
        return False, ["Applicability predicates are malformed"]
    reasons: list[str] = []
    for name, expected in predicates.items():
        observed = use.get(name)
        if not isinstance(expected, bool) or not isinstance(observed, bool):
            reasons.append(f"Applicability predicate {name} is unresolved")
    return not reasons, reasons


def review(payload: dict) -> dict:
    """Return a structured Legal review classification; perform no effects."""
    root = _obj(payload)
    admission = _obj(root.get("admission"))
    # Do not project even string-shaped caller metadata before admission passes.
    result = _base({})

    if type(root.get("schema_version")) is not int or root.get("schema_version") != SCHEMA_VERSION:
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_payload_schema", [_unknown("SCHEMA_VERSION", "Payload schema_version must be 1.")])
    admission_errors = _admission_errors(admission)
    if admission_errors:
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_authenticated_admission", admission_errors)
    result = _base(admission)

    reservation = _obj(root.get("reservation"))
    reservation_problem = _reservation_error(reservation, admission)
    if reservation_problem:
        return _set_outcome(result, "REFUSED_ADMISSION", "acquire_verified_legal_reservation", [_unknown("RESERVATION_INVALID", reservation_problem)])
    if reservation.get("state") in {"effect_uncertain", "effect_confirmed", "closed"}:
        return _set_outcome(result, "RECONCILE_NO_REPLAY", "reconcile_canonical_queue_and_destination_without_replay", [_unknown("EXISTING_EFFECT", "Reservation records an uncertain, confirmed, or closed effect.")])

    hold = _obj(root.get("hold"))
    resumption = _obj(root.get("resumption"))
    if root.get("hold") is not None and not isinstance(hold.get("active"), bool):
        return _set_outcome(result, "HOLD_PRESERVED", "repair_hold_boolean", [_unknown("HOLD_FLAG_INVALID", "An observed hold must include an explicit boolean active state.")])
    if hold.get("active") is True:
        if not isinstance(hold.get("hold_id"), str) or not hold.get("hold_id").strip():
            return _set_outcome(result, "HOLD_PRESERVED", "obtain_exact_hold_identifier_and_resumption", [_unknown("HOLD_ID_MISSING", "An active hold requires a nonempty hold_id." )])
        valid_resume = (
            resumption.get("verified") is True
            and isinstance(resumption.get("authorization_reference"), str)
            and bool(resumption.get("authorization_reference").strip())
            and resumption.get("hold_id") == hold.get("hold_id")
            and _binding_matches(_obj(resumption.get("binding")), admission)
        )
        if not valid_resume:
            return _set_outcome(result, "HOLD_PRESERVED", "obtain_exact_hold_resumption_bound_to_current_admission", [_unknown("HOLD_ACTIVE", "No exact verified resumption matches this hold and current admission.")])

    source_text = root.get("source_text")
    if isinstance(source_text, str) and any(marker in source_text.casefold() for marker in _INJECTION_MARKERS):
        return _set_outcome(result, "REJECT_SOURCE_INSTRUCTIONS", "ignore_embedded_instructions_and_review_only_structured_host_evidence", [_unknown("UNTRUSTED_SOURCE_INSTRUCTION", "Source contains an instruction pattern; it cannot change authority, routing, or permitted effects.")])

    decision = _obj(root.get("decision"))
    if root.get("decision") is not None:
        if decision.get("verified") is not True or not isinstance(decision.get("authorization_reference"), str) or not decision.get("authorization_reference").strip() or not _binding_matches(_obj(decision.get("binding")), admission):
            return _set_outcome(result, "WAITING_FOR_CURRENT_DECISION", "obtain_current_decision_bound_to_exact_matter_source_and_action", [_unknown("DECISION_BINDING_MISMATCH", "Decision does not match every current admission binding field.")])
        if decision.get("decision") != "approve_private_review":
            return _set_outcome(result, "WAITING_FOR_CURRENT_DECISION", "obtain_decision_for_legal_private_review", [_unknown("DECISION_SCOPE_MISMATCH", "Only approve_private_review can continue this review operation.")])

    malformed_sections = []
    for key in ("baseline", "current", "use", "provision_assessments"):
        value = root.get(key)
        if value is not None and not isinstance(value, Mapping):
            malformed_sections.append(_unknown("INPUT_SHAPE_INVALID", f"{key} has an invalid JSON shape."))
    if root.get("dates") is not None and not isinstance(root.get("dates"), list):
        malformed_sections.append(_unknown("INPUT_SHAPE_INVALID", "dates must be a list."))
    for key in ("decision", "hold", "resumption", "account_relationship"):
        value = root.get(key)
        if value is not None and not isinstance(value, Mapping):
            malformed_sections.append(_unknown("INPUT_SHAPE_INVALID", f"{key} must be an object or null."))
    if malformed_sections:
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_structured_input_shape", malformed_sections)
    notice_account = root.get("notice_account")
    if notice_account is not None and not isinstance(notice_account, str):
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_notice_account_shape", [_unknown("INPUT_SHAPE_INVALID", "notice_account must be a string or null.")])
    if root.get("unresolved_obligations") is not None and not isinstance(root.get("unresolved_obligations"), list):
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_obligation_list_shape", [_unknown("INPUT_SHAPE_INVALID", "unresolved_obligations must be a list.")])
    if root.get("source_text") is not None and not isinstance(root.get("source_text"), str):
        return _set_outcome(result, "REFUSED_ADMISSION", "repair_untrusted_source_text_shape", [_unknown("INPUT_SHAPE_INVALID", "source_text must be a string or null.")])

    # Validate current source identity before consuming its extracted dates or
    # returning a separate missing-baseline wait. Missing context cannot hide drift.
    current = _obj(root.get("current"))
    if (current.get("verified") is not True
            or any(not isinstance(current.get(key), str) or not current.get(key).strip()
                   for key in ("source_id", "version", "evidence_ref"))
            or not _valid_sha(current.get("sha256"))):
        return _set_outcome(result, "WAITING_FOR_INPUT", "recover_verified_current_source_identity", [_unknown("CURRENT_IDENTITY_INCOMPLETE", "Current source identity, version, hash and verification must be established.")])
    if not _permitted_ref(current["evidence_ref"], admission):
        return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_current_evidence_reference", [_unknown("CURRENT_REFERENCE_UNPERMITTED", "Current evidence is outside the admitted source set.")])
    if (current["source_id"] != admission["source_id"]
            or current["version"] != admission["source_version"]
            or current["sha256"].lower() != admission["source_sha256"].lower()):
        return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_exact_current_source_version", [_unknown("CURRENT_SOURCE_BINDING_MISMATCH", "Current evidence does not match admitted source ID, version and SHA256.")])

    # Retain dates and admitted source identity even when a separate required
    # evidence item is absent; keep source wording and applicability verbatim.
    raw_dates = root.get("dates", [])
    date_facts = []
    date_errors = []
    if isinstance(raw_dates, list):
        for date in raw_dates:
            if not isinstance(date, Mapping):
                date_errors.append(_unknown("DATE_EVIDENCE_INVALID", "A date is missing literal applicability or a permitted source reference."))
            elif isinstance(date.get("source_ref"), str) and date.get("source_ref") and not _permitted_ref(date.get("source_ref"), admission):
                return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_date_evidence_with_permitted_reference", [_unknown("DATE_REFERENCE_UNPERMITTED", "Date evidence is outside the admitted source set.")])
            elif (not isinstance(date.get("kind"), str)
                    or date.get("kind") not in {"source_stated", "suggested_review"}
                    or not isinstance(date.get("value"), str) or not date.get("value").strip()
                    or not isinstance(date.get("applicability"), str) or not date.get("applicability").strip()
                    or not _permitted_ref(date.get("source_ref"), admission)):
                date_errors.append(_unknown("DATE_EVIDENCE_INVALID", "A date is missing literal applicability or a permitted source reference."))
            else:
                date_facts.append(copy.deepcopy(dict(date)))
    result["facts"].update({
        "matter_id": admission["matter_id"], "source_id": admission["source_id"],
        "source_version": admission["source_version"], "source_sha256": admission["source_sha256"],
        "policy_sha256": admission["policy_sha256"], "guide_sha256": admission["guide_sha256"],
        "dates": date_facts,
    })
    if date_errors:
        return _set_outcome(result, "WAITING_FOR_INPUT", "resolve_date_source_and_applicability_evidence", date_errors)

    permitted = set(admission["permitted_source_ids"])
    baseline = _obj(root.get("baseline"))
    current = _obj(root.get("current"))
    use = _obj(root.get("use"))
    for flag in ("coverage_complete", "platform", "affected_connected_accounts", "dashboard_access"):
        if flag in use and not isinstance(use.get(flag), bool):
            return _set_outcome(result, "WAITING_FOR_INPUT", "resolve_actual_use_boolean_evidence", [_unknown("USE_FLAG_INVALID", f"Actual-use flag {flag} must be a boolean.")])
    missing: list[dict[str, str]] = []
    if not baseline:
        missing.append(_unknown("BASELINE_MISSING", "Accepted baseline evidence is missing."))
    if not current:
        missing.append(_unknown("CURRENT_MISSING", "Current publication evidence is missing."))
    if not use:
        missing.append(_unknown("USE_MISSING", "Verified actual-use evidence is missing."))
    if missing:
        return _set_outcome(result, "WAITING_FOR_INPUT", "recover_exact_baseline_current_publication_and_actual_use", missing)

    required_version = ("source_id", "version", "evidence_ref", "provider")
    for label, snapshot in (("baseline", baseline), ("current", current)):
        absent = [key for key in required_version if key not in snapshot or not isinstance(snapshot.get(key), str) or not snapshot.get(key).strip()]
        if absent:
            missing.append(_unknown(f"{label.upper()}_INCOMPLETE", f"{label} lacks required fields: {', '.join(absent)}."))
        if snapshot.get("verified") is not True or not _valid_sha(snapshot.get("sha256")):
            missing.append(_unknown(f"{label.upper()}_UNVERIFIED", f"{label} verification or SHA256 is invalid."))
        if _present(snapshot.get("evidence_ref")) and not _valid_refs([snapshot.get("evidence_ref")], admission):
            return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_version_evidence_with_permitted_reference", [_unknown(f"{label.upper()}_REFERENCE_UNPERMITTED", f"{label} evidence reference is outside the admitted source set.")])
        if not _present(snapshot.get("evidence_ref")):
            missing.append(_unknown(f"{label.upper()}_REFERENCE_MISSING", f"{label} evidence reference is missing."))
        if snapshot.get("provisions_complete") is not True:
            missing.append(_unknown(f"{label.upper()}_PROVISIONS_INCOMPLETE", f"{label} extraction is not attested complete."))
        if not isinstance(snapshot.get("provisions"), Mapping):
            missing.append(_unknown(f"{label.upper()}_PROVISIONS_MISSING", f"{label} must contain an explicit provision mapping."))
        elif any(not isinstance(k, str) or not k.strip() or not isinstance(v, str) for k, v in snapshot["provisions"].items()):
            missing.append(_unknown(f"{label.upper()}_PROVISIONS_INVALID", f"{label} provisions must map IDs to literal text."))
    if baseline.get("acceptance_verified") is not True:
        missing.append(_unknown("BASELINE_ACCEPTANCE_UNVERIFIED", "Accepted-version evidence is not verified."))
    if missing:
        return _set_outcome(result, "WAITING_FOR_INPUT", "recover_verified_version_and_acceptance_evidence", missing)

    if baseline.get("provider") != current.get("provider"):
        return _set_outcome(result, "WAITING_FOR_INPUT", "establish_comparable_provider_identity", [_unknown("PROVIDER_MISMATCH", "Baseline and current provider identities differ.")])
    if baseline.get("source_id") not in permitted:
        return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_exact_baseline_source", [_unknown("BASELINE_SOURCE_UNPERMITTED", "Baseline source is outside the admitted source set.")])
    same_version = baseline.get("version") == current.get("version")
    same_hash = baseline.get("sha256", "").lower() == current.get("sha256", "").lower()
    if same_version and not same_hash:
        return _set_outcome(result, "WAITING_FOR_INPUT", "resolve_version_content_identity_conflict", [_unknown("VERSION_HASH_CONTRADICTION", "Same version label has different content hashes.")])

    use_missing: list[dict[str, str]] = []
    for key in ("provider", "account_id"):
        if not isinstance(use.get(key), str) or not use.get(key).strip():
            use_missing.append(_unknown("USE_MAPPING_MISSING", f"Actual use {key} is missing."))
    if use.get("verified") is not True:
        use_missing.append(_unknown("USE_UNVERIFIED", "Actual-use evidence is not verified."))
    if use.get("provider") != current.get("provider"):
        use_missing.append(_unknown("USE_PROVIDER_MISMATCH", "Actual-use provider does not match compared provider."))
    if use.get("provider") != baseline.get("provider"):
        use_missing.append(_unknown("USE_PROVIDER_MISMATCH", "Actual-use provider does not match baseline provider."))
    if not isinstance(use.get("services"), list) or not use.get("services") or any(not isinstance(s, str) or not s.strip() for s in use.get("services", [])):
        use_missing.append(_unknown("USE_SERVICES_MISSING", "Actual-use service identities are missing."))
    invalid_use_refs = not _valid_refs(use.get("evidence_refs"), admission)
    if invalid_use_refs and _present(use.get("evidence_refs")):
        return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_actual_use_evidence_with_permitted_references", [_unknown("USE_REFERENCE_UNPERMITTED", "Actual-use evidence reference is outside the admitted source set." )])
    if invalid_use_refs:
        use_missing.append(_unknown("USE_REFERENCE_MISSING", "Actual-use evidence references are missing."))
    if use_missing:
        return _set_outcome(result, "WAITING_FOR_INPUT", "recover_verified_provider_account_service_use", use_missing)

    relationship = _obj(root.get("account_relationship"))
    if notice_account and notice_account != use.get("account_id"):
        valid_join = (
            relationship.get("verified") is True
            and relationship.get("notice_account") == notice_account
            and relationship.get("use_account") == use.get("account_id")
            and _valid_refs([relationship.get("evidence_ref")], admission)
        )
        if not valid_join:
            if relationship.get("evidence_ref") and not _permitted_ref(relationship.get("evidence_ref"), admission):
                return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_account_relationship_evidence", [_unknown("ACCOUNT_RELATIONSHIP_UNPERMITTED", "Account relationship evidence is outside the admitted source set.")])
            result["actual_use_relevance"] = {"status": "UNKNOWN", "services": list(use["services"]), "account_scope": "unresolved", "reasons": ["Notice and actual-use accounts differ without an exact verified mapping."]}
            return _set_outcome(result, "WAITING_FOR_ACCOUNT_RELATIONSHIP", "obtain_exact_account_relationship_evidence", [_unknown("ACCOUNT_RELATIONSHIP_MISSING", "Different account identifiers cannot be merged without evidence.")])

    baseline_provisions = baseline["provisions"]
    current_provisions = current["provisions"]
    if same_hash and baseline_provisions != current_provisions:
        return _set_outcome(result, "WAITING_FOR_INPUT", "resolve_hash_and_literal_content_conflict", [_unknown("HASH_CONTENT_CONTRADICTION", "Matching hashes have contradictory literal provision content.")])
    provision_ids = sorted(set(baseline_provisions) | set(current_provisions))
    changed = [pid for pid in provision_ids if baseline_provisions.get(pid) != current_provisions.get(pid)]
    result["differences"] = [
        {"provision_id": pid, "before": baseline_provisions.get(pid), "after": current_provisions.get(pid)}
        for pid in changed
    ]
    assessment_map = _obj(root.get("provision_assessments"))
    unresolved: list[dict[str, str]] = []
    material_items: list[str] = []
    unknown_items: list[str] = []
    irrelevant_items: list[str] = []
    relevance_reasons: list[str] = []
    use_services = set(use["services"])

    for pid in changed:
        assessment = _obj(assessment_map.get(pid))
        assessment_refs = assessment.get("evidence_refs")
        if isinstance(assessment_refs, list) and assessment_refs and not _valid_refs(assessment_refs, admission):
            return _set_outcome(result, "REFUSED_SOURCE_BINDING", "re_admit_provision_assessment_evidence", [_unknown("ASSESSMENT_REFERENCE_UNPERMITTED", f"Assessment reference for {pid} is outside the admitted source set.")])
        if _present(assessment_refs) and not isinstance(assessment_refs, list):
            unresolved.append(_unknown("ASSESSMENT_REFERENCE_INVALID", f"Assessment references for {pid} must be a list."))
            unknown_items.append(pid)
            continue
        if assessment.get("verified") is not True or not _valid_refs(assessment_refs, admission):
            unresolved.append(_unknown("PROVISION_ASSESSMENT_MISSING", f"Changed provision {pid} lacks verified permitted evidence."))
            unknown_items.append(pid)
            continue
        services = assessment.get("services")
        if not isinstance(services, list) or not services or any(not isinstance(s, str) or not s.strip() for s in services):
            unresolved.append(_unknown("PROVISION_SERVICES_MISSING", f"Changed provision {pid} lacks affected service identities."))
            unknown_items.append(pid)
            continue
        if (not isinstance(assessment.get("material"), bool)
                or not isinstance(assessment.get("obligation"), str)
                or not assessment.get("obligation").strip()):
            unresolved.append(_unknown("MATERIALITY_UNKNOWN", f"Changed provision {pid} lacks materiality or obligation assessment."))
            unknown_items.append(pid)
            continue
        predicates_ok, predicate_reasons = _resolved_predicates(assessment.get("applicability"), use)
        if not predicates_ok:
            unresolved.extend(_unknown("APPLICABILITY_UNKNOWN", f"Provision {pid}: {reason}.") for reason in predicate_reasons)
            unknown_items.append(pid)
            continue
        relevant_service = bool(use_services.intersection(services))
        predicates_relevant = True
        predicates = assessment.get("applicability") or {}
        for name, expected in predicates.items():
            if use.get(name) != expected:
                predicates_relevant = False
        relevant = relevant_service and predicates_relevant
        if relevant:
            relevance_reasons.append(f"{pid} applies to documented in-use service scope.")
            result["facts"].setdefault("assessed_obligations", []).append({
                "provision_id": pid,
                "obligation": assessment["obligation"],
                "evidence_refs": list(assessment["evidence_refs"]),
            })
            if assessment["material"]:
                material_items.append(pid)
        else:
            if use.get("coverage_complete") is not True:
                unresolved.append(_unknown("USE_COVERAGE_INCOMPLETE", f"Cannot establish provision {pid} is irrelevant without complete use coverage."))
                unknown_items.append(pid)
            else:
                irrelevant_items.append(pid)

    obligations = root.get("unresolved_obligations")
    if not isinstance(obligations, list):
        unresolved.append(_unknown("OBLIGATION_STATUS_MISSING", "Unresolved obligations must be supplied as a list."))
        obligations = None
    elif obligations:
        result["facts"]["unresolved_obligations"] = copy.deepcopy(obligations)

    result["facts"].update({
        "matter_id": admission["matter_id"],
        "source_id": admission["source_id"],
        "source_version": admission["source_version"],
        "source_sha256": admission["source_sha256"],
        "policy_sha256": admission["policy_sha256"],
        "guide_sha256": admission["guide_sha256"],
        "baseline_version": baseline["version"],
        "baseline_sha256": baseline["sha256"],
        "baseline_evidence_ref": baseline["evidence_ref"],
        "current_evidence_ref": current["evidence_ref"],
        "provider": current["provider"],
        "account_id": use["account_id"],
        "services": list(use["services"]),
        "dates": date_facts,
    })
    result["actual_use_relevance"] = {
        "status": "relevant" if changed and (material_items or any(pid not in irrelevant_items for pid in changed)) else "verified_scope",
        "services": sorted(use_services),
        "account_scope": "verified_exact_relationship" if notice_account and notice_account != use.get("account_id") else "verified_same_or_unspecified",
        "reasons": relevance_reasons,
        "irrelevant_provisions": irrelevant_items,
    }
    result["materiality"] = "MATERIAL" if material_items else ("UNKNOWN" if unresolved or unknown_items or obligations else "NO_MATERIAL_CONSEQUENCE")

    if unresolved:
        result["unknowns"] = unresolved
        if material_items or obligations:
            return _set_outcome(result, "NEEDS_OWNER_REVIEW", "prepare_private_owner_or_counsel_review_packet", unresolved)
        return _set_outcome(result, "WAITING_FOR_INPUT", "resolve_missing_scope_materiality_or_obligation_evidence", unresolved)
    if obligations:
        return _set_outcome(result, "NEEDS_OWNER_REVIEW", "prepare_private_owner_or_counsel_review_packet", [])
    if material_items:
        return _set_outcome(result, "NEEDS_OWNER_REVIEW", "prepare_private_owner_or_counsel_review_packet", [])
    if changed and not irrelevant_items and not all(
        isinstance(_obj(assessment_map.get(pid)).get("material"), bool) for pid in changed
    ):
        return _set_outcome(result, "WAITING_FOR_INPUT", "complete_changed_provision_assessments", [_unknown("ASSESSMENT_INCOMPLETE", "Changed provision assessment is incomplete.")])
    return _set_outcome(result, "REVIEWED_NO_ACTION_CANDIDATE", "host_may_prepare_private_review_candidate_then_require_effect_readback", [])

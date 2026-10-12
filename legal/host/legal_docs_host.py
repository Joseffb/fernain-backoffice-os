"""Narrow connected-tool adapter for the private Legal reservation document.

The caller supplies *actual* connector methods with the signatures in
host/integration_contract.txt. This adapter does not accept caller assertions
of verification. A write is reported successful only after a fresh native Docs
readback exactly matches the planned canonical JSON. Canonical raw JSON writes
are deliberately unavailable because the current Drive update tool has no CAS.
"""
from __future__ import annotations

from .legal_docs_claim import (
    CANONICAL_RECORD, Held, digest, parse_record_readback, plan, runtime_entry,
    validate_binding, validate_config,
)


class Uncertain(Held):
    """A write may have happened, but exact connected readback is unavailable."""


def _read(tools, config, needs_record):
    try:
        metadata = tools.get_file_metadata(fileId=config["documentId"])
        document = tools.get_document(document_id=config["documentId"])
        record = (tools.fetch(url=CANONICAL_RECORD, download_raw_file=True)
                  if needs_record else None)
    except Exception as exc:
        raise Held("connected Legal read failed") from exc
    return metadata, document, record


def transition(tools, config, operation, *, binding=None, token=None,
               expected_result_sha256=None, reason=None):
    """Perform one CAS transition, never a raw JSON content write.

    `tools` is a host-bound adapter to the four named connected Drive actions.
    Binding authorization and source acquisition are upstream Legal intake
    duties; this method only enforces the reservation and readback boundary.
    """
    validate_config(config)
    if operation not in {"inspect", "claim", "mark_uncertain", "confirm_effect",
                         "close", "cancel_before_effect"}:
        raise Held("unsupported Legal reservation transition")
    if operation != "inspect":
        validate_binding(binding, config)
        digest(token)
    needs_record = operation in {"claim", "mark_uncertain", "confirm_effect", "close"}
    metadata, document, record = _read(tools, config, needs_record)
    inp = {"config": config, "metadata": metadata, "document": document,
           "operation": operation}
    if operation != "inspect":
        inp.update(binding=binding, token=token)
    if operation in {"claim", "mark_uncertain"}:
        inp["record_before"] = record
    elif operation in {"confirm_effect", "close"}:
        inp["record_after"] = record
    if operation == "confirm_effect":
        inp["expected_result_sha256"] = expected_result_sha256
    if operation == "cancel_before_effect":
        inp["reason"] = reason
    proposed = plan(inp)
    if "batch" not in proposed:
        return proposed

    batch = proposed["batch"]
    write_error = None
    try:
        # No targetRevisionId merge and no retry. One conditional attempt only.
        tools.batch_update_document(
            document_id=batch["document_id"], requests=batch["requests"],
            write_control=batch["write_control"])
    except Exception as exc:
        write_error = exc
    try:
        fresh_metadata, fresh_document, fresh_record = _read(tools, config, needs_record)
        verified = plan({"config": config, "metadata": fresh_metadata,
                         "document": fresh_document, "operation": "verify",
                         "expected_text": proposed["expected_text"]})
        if operation in {"claim", "mark_uncertain"}:
            # The manual record and any prior result must be the same ones
            # examined before this reservation transition.
            _, before_sha = parse_record_readback(record, config)
            _, after_sha = parse_record_readback(fresh_record, config)
            if before_sha != after_sha:
                raise Held("canonical Legal JSON changed across reservation write")
        elif operation in {"confirm_effect", "close"}:
            planned_record = proposed["record"]
            observed_output = runtime_entry(
                fresh_record, config, binding, proposed["action_key"],
                planned_record["output"]["result_sha256"],
                planned_record["manual_base_sha256"])
            if observed_output != planned_record["output"]:
                raise Held("canonical Legal result changed across reservation write")
    except Exception as exc:
        raise Uncertain("Legal CAS outcome/readback uncertain; reconcile before another effect") from exc
    # The exact current document content is authoritative even if the tool
    # returned an ambiguous error after applying the conditional write.
    return {**proposed, "readback": verified,
            "write_returned_error": write_error is not None}


def write_canonical_json(*_args, **_kwargs):
    raise Held("raw Legal JSON has no conditional update/readback write path")

"""Conservative, complete-byte PDF text-layer extraction for the Finance bridge.

This module never performs OCR, guesses missing values, or reads remote files.
It accepts only PDFs with an embedded text layer and no page images, form data,
widgets, or annotations. Callers supply an already-authorized, locally
materialized PDF plus expected byte length and SHA-256; the hash is checked
against the same bytes passed to the PDF parsers.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
from pathlib import Path
from typing import Any

MAX_FILE_BYTES = 2_097_152
MAX_SOURCE_TEXT_CHARS = 20_000
MAX_PAGE_COUNT = 300
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


class PdfSourceHold(ValueError):
    """The source cannot be accepted as a complete text-layer PDF read."""

    def __init__(self, code: str, *, details: dict[str, Any] | None = None):
        super().__init__(code)
        self.code = code
        self.details = details or {}


def _read_verified_bytes(
    path: str | Path,
    expected_byte_length: int,
    expected_sha256: str,
    workspace_root: str | Path,
) -> tuple[bytes, str]:
    if isinstance(expected_byte_length, bool) or not isinstance(expected_byte_length, int):
        raise PdfSourceHold("invalid_expected_byte_length")
    if expected_byte_length < 1 or expected_byte_length > MAX_FILE_BYTES:
        raise PdfSourceHold("expected_byte_length_out_of_bounds")
    if not isinstance(expected_sha256, str) or not _SHA256.fullmatch(expected_sha256):
        raise PdfSourceHold("invalid_expected_sha256")
    try:
        root = Path(workspace_root).resolve(strict=True)
        materialized = Path(path).resolve(strict=True)
        if not materialized.is_relative_to(root) or not materialized.is_file():
            raise PdfSourceHold("materialized_path_outside_workspace")
        data = materialized.read_bytes()
    except PdfSourceHold:
        raise
    except (OSError, RuntimeError, ValueError):
        raise PdfSourceHold("materialized_file_unreadable") from None
    if len(data) != expected_byte_length:
        raise PdfSourceHold(
            "byte_length_mismatch",
            details={"expected_byte_length": expected_byte_length, "observed_byte_length": len(data)},
        )
    observed_sha256 = hashlib.sha256(data).hexdigest()
    if observed_sha256 != expected_sha256:
        raise PdfSourceHold("sha256_mismatch")
    return data, observed_sha256


def digest_materialized_file(
    path: str | Path,
    expected_byte_length: int,
    workspace_root: str | Path,
) -> dict[str, Any]:
    """Compute a digest for the exact materialized stream before extraction.

    The PDF reader passes this digest to ``extract_pdf`` for a second-pass
    integrity check. Provider version/identity checks remain the host adapter's
    responsibility; this digest is explicitly derived from the downloaded
    bytes, not claimed to be a provider-supplied checksum.
    """
    if isinstance(expected_byte_length, bool) or not isinstance(expected_byte_length, int):
        raise PdfSourceHold("invalid_expected_byte_length")
    if expected_byte_length < 1 or expected_byte_length > MAX_FILE_BYTES:
        raise PdfSourceHold("expected_byte_length_out_of_bounds")
    try:
        root = Path(workspace_root).resolve(strict=True)
        materialized = Path(path).resolve(strict=True)
        if not materialized.is_relative_to(root) or not materialized.is_file():
            raise PdfSourceHold("materialized_path_outside_workspace")
        data = materialized.read_bytes()
    except PdfSourceHold:
        raise
    except (OSError, RuntimeError, ValueError):
        raise PdfSourceHold("materialized_file_unreadable") from None
    if len(data) != expected_byte_length:
        raise PdfSourceHold(
            "byte_length_mismatch",
            details={"expected_byte_length": expected_byte_length, "observed_byte_length": len(data)},
        )
    return {"complete": True, "byte_length": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def _resolve_pdf_object(value: Any) -> Any:
    """Resolve pypdf direct/indirect objects without exposing their contents."""
    try:
        return value.get_object()
    except (AttributeError, TypeError):
        return value


def _inherited_pdf_value(page: Any, key: str) -> Any:
    current = page
    seen: set[int] = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if key in current:
            return _resolve_pdf_object(current[key])
        parent = current.get("/Parent")
        current = _resolve_pdf_object(parent) if parent is not None else None
    return None


def _xobjects_contain_image(resources: Any, *, seen: set[int] | None = None, depth: int = 0) -> bool:
    """Find direct, nested Form-XObject, or inherited resource images."""
    if depth > 32:
        raise PdfSourceHold(
            "resource_nesting_exceeds_bound",
            details={"visual_verification_required": True},
        )
    if seen is None:
        seen = set()
    resources = _resolve_pdf_object(resources)
    if not isinstance(resources, dict):
        return False
    resource_identity = id(resources)
    if resource_identity in seen:
        return False
    seen.add(resource_identity)
    xobjects = _resolve_pdf_object(resources.get("/XObject"))
    if not isinstance(xobjects, dict):
        return False
    for reference in xobjects.values():
        xobject = _resolve_pdf_object(reference)
        if not isinstance(xobject, dict):
            continue
        subtype = str(xobject.get("/Subtype", ""))
        if subtype == "/Image":
            return True
        if subtype == "/Form" and _xobjects_contain_image(
            xobject.get("/Resources"), seen=seen, depth=depth + 1
        ):
            return True
    return False


def _inspect_nontext_content(structural: Any) -> list[int]:
    """Hold forms, widgets, any annotation, and image content before extraction."""
    trailer_root = _resolve_pdf_object(structural.trailer.get("/Root"))
    if isinstance(trailer_root, dict) and trailer_root.get("/AcroForm") is not None:
        acro_form = _resolve_pdf_object(trailer_root.get("/AcroForm"))
        fields = _resolve_pdf_object(acro_form.get("/Fields", [])) if isinstance(acro_form, dict) else []
        raise PdfSourceHold(
            "form_data_present",
            details={
                "visual_verification_required": True,
                "form_field_count": len(fields) if isinstance(fields, (list, tuple)) else 0,
            },
        )

    annotation_pages: list[int] = []
    annotation_types: set[str] = set()
    widget_pages: list[int] = []
    image_pages: list[int] = []
    for page_number, page in enumerate(structural.pages, start=1):
        annotations = _resolve_pdf_object(page.get("/Annots", []))
        if isinstance(annotations, (list, tuple)):
            for annotation_ref in annotations:
                annotation = _resolve_pdf_object(annotation_ref)
                subtype = str(annotation.get("/Subtype", "/Unknown")) if isinstance(annotation, dict) else "/Unknown"
                if subtype == "/Widget":
                    widget_pages.append(page_number)
                else:
                    annotation_pages.append(page_number)
                    annotation_types.add(subtype)
        elif annotations:
            annotation_pages.append(page_number)
            annotation_types.add("/Unknown")

        resources = _inherited_pdf_value(page, "/Resources")
        if _xobjects_contain_image(resources):
            image_pages.append(page_number)

    if widget_pages:
        raise PdfSourceHold(
            "form_widget_data_present",
            details={
                "visual_verification_required": True,
                "page_numbers": sorted(set(widget_pages)),
            },
        )
    if annotation_pages:
        raise PdfSourceHold(
            "annotations_present",
            details={
                "visual_verification_required": True,
                "page_numbers": sorted(set(annotation_pages)),
                "annotation_subtypes": sorted(annotation_types),
            },
        )
    return image_pages


def extract_pdf(
    path: str | Path,
    expected_byte_length: int,
    expected_sha256: str,
    workspace_root: str | Path,
) -> dict[str, Any]:
    """Verify and extract every PDF page, holding any unreadable/incomplete case."""
    data, raw_file_sha256 = _read_verified_bytes(
        path, expected_byte_length, expected_sha256, workspace_root
    )
    try:
        return _extract_verified_pdf(data, raw_file_sha256)
    except PdfSourceHold as exc:
        exc.details.setdefault("raw_file_sha256", raw_file_sha256)
        exc.details.setdefault("raw_file_byte_length", len(data))
        exc.details.setdefault("raw_hash_origin", "computed_from_materialized_complete_stream")
        raise


def _extract_verified_pdf(data: bytes, raw_file_sha256: str) -> dict[str, Any]:
    if not data.startswith(b"%PDF-"):
        raise PdfSourceHold("malformed_or_truncated_pdf")

    try:
        from pypdf import PdfReader

        structural = PdfReader(io.BytesIO(data), strict=True)
        if structural.is_encrypted:
            raise PdfSourceHold("encrypted_pdf")
        page_count = len(structural.pages)
    except PdfSourceHold:
        raise
    except ImportError:
        raise PdfSourceHold('pdf_dependency_unavailable') from None
    except Exception:
        raise PdfSourceHold("malformed_or_truncated_pdf") from None
    if page_count < 1:
        raise PdfSourceHold("empty_document", details={"page_count": page_count})
    if page_count > MAX_PAGE_COUNT:
        raise PdfSourceHold(
            "page_count_exceeds_bound",
            details={"page_count": page_count, "max_page_count": MAX_PAGE_COUNT},
        )
    try:
        image_page_numbers = _inspect_nontext_content(structural)
    except PdfSourceHold:
        raise
    except ImportError:
        raise PdfSourceHold('pdf_dependency_unavailable') from None
    except Exception:
        raise PdfSourceHold("malformed_or_truncated_pdf") from None
    if image_page_numbers:
        raise PdfSourceHold(
            "page_image_content_present",
            details={
                "visual_verification_required": True,
                "page_count": page_count,
                "page_numbers": image_page_numbers,
            },
        )

    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if len(pdf.pages) != page_count:
                raise PdfSourceHold("page_count_mismatch")
            page_texts: list[str] = []
            no_text_pages: list[int] = []
            for page_number, page in enumerate(pdf.pages, start=1):
                # Catch image objects, including inline images not listed in a
                # page's XObject dictionary. Any such page needs visual review.
                if page.images:
                    raise PdfSourceHold(
                        "page_image_content_present",
                        details={
                            "visual_verification_required": True,
                            "page_count": page_count,
                            "page_numbers": [page_number],
                        },
                    )
                extracted = page.extract_text(layout=False)
                if not isinstance(extracted, str) or not extracted.strip():
                    no_text_pages.append(page_number)
                    continue
                if "\x00" in extracted:
                    raise PdfSourceHold("invalid_text_layer", details={"page_number": page_number})
                normalized = "\n".join(line.rstrip() for line in extracted.replace("\r\n", "\n").replace("\r", "\n").split("\n")).strip()
                if not normalized:
                    no_text_pages.append(page_number)
                    continue
                page_texts.append(normalized)
            if no_text_pages:
                raise PdfSourceHold(
                    "page_has_no_extractable_text",
                    details={"page_count": page_count, "page_numbers": no_text_pages},
                )
    except PdfSourceHold:
        raise
    except ImportError:
        raise PdfSourceHold('pdf_dependency_unavailable') from None
    except Exception:
        raise PdfSourceHold("malformed_or_truncated_pdf") from None

    # Keep an exact page-to-source_text map without duplicating page text in JSON.
    delimiter = "\n\f\n"
    source_parts: list[str] = []
    page_text_ranges: list[dict[str, Any]] = []
    cursor = 0
    for page_number, page_text in enumerate(page_texts, start=1):
        if page_number > 1:
            source_parts.append(delimiter)
            cursor += len(delimiter)
        start_char = cursor
        source_parts.append(page_text)
        cursor += len(page_text)
        page_text_ranges.append(
            {
                "page_number": page_number,
                "start_char": start_char,
                "end_char": cursor,
                "page_text_sha256": hashlib.sha256(page_text.encode("utf-8")).hexdigest(),
            }
        )
    source_text = "".join(source_parts)
    if len(source_text) > MAX_SOURCE_TEXT_CHARS:
        raise PdfSourceHold(
            "extracted_text_exceeds_bound",
            details={"page_count": page_count, "max_source_text_chars": MAX_SOURCE_TEXT_CHARS},
        )
    source_text_sha256 = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
    return {
        "source_text": source_text,
        "source_read": {
            "complete": True,
            # Processor contract: this hashes the exact normalized source_text.
            "sha256": source_text_sha256,
            "source_text_sha256": source_text_sha256,
            # Separate evidence for the original complete materialized PDF bytes.
            "raw_file_sha256": raw_file_sha256,
            "raw_file_byte_length": len(data),
            "raw_hash_origin": "computed_from_materialized_complete_stream",
            "format": "application/pdf",
            "accepted_input_class": "text_layer_pdf_without_images_forms_or_annotations",
            "extraction_method": "embedded_text_layer_no_ocr",
            "ocr_status": "not_performed",
            "page_count": page_count,
            "page_text_ranges": page_text_ranges,
        },
    }


def _run_cli() -> int:
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in {"digest", "extract"}:
            raise PdfSourceHold("invalid_cli_operation")
        request = json.load(sys.stdin)
        path = request.get("path")
        expected_byte_length = request.get("expected_byte_length")
        workspace_root = request.get("workspace_root")
        if sys.argv[1] == "digest":
            result = digest_materialized_file(path, expected_byte_length, workspace_root)
        else:
            result = extract_pdf(
                path,
                expected_byte_length,
                request.get("expected_sha256"),
                workspace_root,
            )
        sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
        return 0
    except PdfSourceHold as exc:
        sys.stdout.write(
            json.dumps(
                {"source_read": {"complete": False, "ocr_status": "not_performed"}, "hold": {"code": exc.code, **exc.details}},
                ensure_ascii=False,
                separators=(",", ":"),
            )
            + "\n"
        )
        return 3
    except Exception:
        sys.stdout.write(
            json.dumps(
                {"source_read": {"complete": False, "ocr_status": "not_performed"}, "hold": {"code": "invalid_extractor_input"}},
                separators=(",", ":"),
            )
            + "\n"
        )
        return 3


if __name__ == "__main__":
    raise SystemExit(_run_cli())

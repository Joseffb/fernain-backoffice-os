"""Mechanical intake provenance; invoice contents never grant authority."""
import hashlib
import json
import math
import re
import time

SYNTHETIC_AUTHORITY = 'EXAMPLE_AUTHORITY_REFERENCE'
FIELDS = {'test_id', 'authority_ref', 'source_id', 'source_version', 'source_sha256', 'valid_from', 'expires_at'}


def require(ok, reason):
    if not ok:
        raise ValueError(reason)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()


def registrations(value, excluded=()):
    require(type(value) is list and len(value) <= 50, 'SYNTHETIC_REGISTRATION_BOUNDS')
    ids, tests = set(), set()
    for r in value:
        require(type(r) is dict and set(r) == FIELDS, 'EXACT_SYNTHETIC_REGISTRATION_REQUIRED')
        for key in ('source_id', 'test_id'):
            pattern=r'[A-Za-z0-9_-]{1,200}' if key=='source_id' else r'[A-Za-z0-9_.-]{1,200}'
            require(type(r[key]) is str and bool(re.fullmatch(pattern, r[key])), 'UNSAFE_SYNTHETIC_IDENTIFIER')
        require(type(r['source_version']) is str and bool(re.fullmatch(r'[A-Za-z0-9_.:@+-]{1,200}',r['source_version'])), 'UNSAFE_SYNTHETIC_SOURCE_VERSION')
        require(r['authority_ref'] == SYNTHETIC_AUTHORITY, 'SYNTHETIC_AUTHORITY_NOT_APPROVED')
        require(type(r['source_sha256']) is str and bool(re.fullmatch('[a-f0-9]{64}', r['source_sha256'])), 'INVALID_SYNTHETIC_SOURCE_HASH')
        require(all(type(r[k]) in (int, float) and math.isfinite(r[k]) and r[k] > 0 for k in ('valid_from', 'expires_at')) and r['expires_at'] == r['valid_from'] + 600 and r['expires_at']-r['valid_from']==600, 'FIXED_SYNTHETIC_WINDOW_REQUIRED')
        require(r['source_id'] not in excluded, 'HISTORICAL_FIXTURE_CANNOT_BE_ADMITTED')
        require(r['source_id'] not in ids and r['test_id'] not in tests, 'DUPLICATE_SYNTHETIC_REGISTRATION')
        ids.add(r['source_id']); tests.add(r['test_id'])
    return json.loads(canonical(value))


def title_is_synthetic(title):
    return bool(re.match(r'\s*(?:TEST|SYNTHETIC)\b', title or '', re.I))


def test_title(title):
    return bool(re.match(r'\s*TEST\b', title or '', re.I))


def registration_for(policy, source_id):
    items = registrations(policy.get('synthetic_invoice_admissions', []), policy.get('excluded_fixture_ids', []))
    return next((r for r in items if r['source_id'] == source_id), None)


def provenance(policy, source, source_hash, text=None, role='original', check_window=True):
    require(policy.get('intake_provenance_version') == 1 and type(policy.get('intake_provenance_version')) is int, 'INTAKE_PROVENANCE_VERSION_REQUIRED')
    require(type(source_hash) is str and bool(re.fullmatch('[a-f0-9]{64}', source_hash)), 'INTAKE_SOURCE_HASH_REQUIRED')
    require(source['id'] not in policy.get('excluded_fixture_ids', []), 'HISTORICAL_FIXTURE_CANNOT_BE_ADMITTED')
    r = registration_for(policy, source['id'])
    result = {'mode': 'LIVE', 'source_id': source['id'], 'source_version': source['version'], 'source_sha256': source_hash, 'authority_ref': policy['intake_authority']['authority_ref']}
    marked = text is not None and bool(re.search(r'^\s*(?:TEST|SYNTHETIC)\b', text, re.I | re.M))
    if r:
        require(role == 'original', 'SYNTHETIC_CLARIFICATION_UNSUPPORTED')
        require(source['version'] == r['source_version'] and source_hash == r['source_sha256'], 'SYNTHETIC_SOURCE_BINDING_CHANGED')
        if check_window:
            require(r['valid_from'] <= time.time() < r['expires_at'], 'SYNTHETIC_GRANT_INACTIVE')
        if text is not None:
            require(bool(re.match(r'^TEST\s+ONLY\b', text.splitlines()[0] if text else '', re.I)), 'SYNTHETIC_FIRST_LINE_MARKER_REQUIRED')
        result.update(mode='SYNTHETIC', authority_ref=r['authority_ref'], test_id=r['test_id'], valid_from=r['valid_from'], expires_at=r['expires_at'])
    else:
        require(not marked, 'SYNTHETIC_BODY_CANNOT_USE_LIVE_ADMISSION')
    return result


def validate(policy, admission, source_hash, text, check_window=True):
    expected = provenance(policy, admission['current_source'], source_hash, text, admission['current_source']['role'], check_window=check_window)
    require(type(admission.get('intake_provenance')) is dict and canonical(admission['intake_provenance']) == canonical(expected), 'INTAKE_PROVENANCE_MISMATCH')
    if admission['current_source']['role'] == 'clarification':
        require(admission['original_source']['id'] not in policy.get('excluded_fixture_ids', []), 'HISTORICAL_FIXTURE_CANNOT_BE_ADMITTED')
        require(registration_for(policy, admission['original_source']['id']) is None, 'SYNTHETIC_CLARIFICATION_UNSUPPORTED')
    return expected

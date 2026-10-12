"""Pure validation of separately approved Finance execution continuations.

The caller must independently establish claimed state, PROCESSING/attempt 0,
and no provider output before using this result. This module neither checks live
state nor grants provider capabilities. Authority comes only from trusted parent
inputs, never from invoice contents or an ordinary wake.
"""
import copy
import math
import re


FIELDS = frozenset({
    'approval_ref', 'action_key', 'source_id', 'source_version',
    'source_sha256', 'policy_sha256', 'expected_token', 'evidence_sha256',
    'valid_from', 'expires_at',
})
CONTEXT_FIELDS = frozenset({'grant', 'approved_authority_ref', 'expected_token'})
BINDING_FIELDS = ('source_id', 'source_version', 'source_sha256', 'policy_sha256')


def _require(condition, reason):
    if not condition:
        raise ValueError(reason)


def _matches(value, pattern):
    return type(value) is str and re.fullmatch(pattern, value) is not None


def _positive_number(value):
    if type(value) not in (int, float) or value <= 0:
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def validate_grant(grant, *, approved_authority_ref, binding, action_key,
                   expected_token, original_expiry, now, excluded_ids=()):
    """Return an independent copy of an active grant or raise ValueError.

    binding is the existing trusted claim binding; additional binding fields are
    preserved by the caller and are not modified here. Times are positive finite
    epoch seconds. The active interval includes valid_from and excludes expiry.
    """
    _require(type(grant) is dict and set(grant) == FIELDS,
             'EXACT_CONTINUATION_GRANT_REQUIRED')
    _require(_matches(approved_authority_ref, r'Sentinel_[a-f0-9]{32}')
             and type(grant['approval_ref']) is str
             and grant['approval_ref'] == approved_authority_ref,
             'INDEPENDENT_CONTINUATION_APPROVAL_REQUIRED')
    _require(type(binding) is dict and all(k in binding for k in BINDING_FIELDS),
             'TRUSTED_EXISTING_BINDING_REQUIRED')
    _require(_matches(grant['source_id'], r'[A-Za-z0-9_-]{1,200}'),
             'UNSAFE_CONTINUATION_SOURCE_ID')
    version = grant['source_version']
    _require(type(version) is str and 1 <= len(version) <= 512
             and not any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in version),
             'UNSAFE_CONTINUATION_SOURCE_VERSION')
    for key in ('action_key', 'source_sha256', 'policy_sha256',
                'expected_token', 'evidence_sha256'):
        _require(_matches(grant[key], r'[a-f0-9]{64}'),
                 'INVALID_CONTINUATION_' + key.upper())
    _require(all(type(binding[k]) is str and grant[k] == binding[k]
                 for k in BINDING_FIELDS), 'CONTINUATION_BINDING_CHANGED')
    _require(type(action_key) is str and grant['action_key'] == action_key,
             'CONTINUATION_ACTION_KEY_CHANGED')
    _require(type(expected_token) is str and grant['expected_token'] == expected_token,
             'CONTINUATION_EXPECTED_TOKEN_CHANGED')
    _require(type(excluded_ids) in (list, tuple, set, frozenset)
             and all(_matches(s, r'[A-Za-z0-9_-]{1,200}') for s in excluded_ids),
             'INVALID_CONTINUATION_EXCLUSIONS')
    _require(grant['source_id'] not in excluded_ids,
             'EXCLUDED_SOURCE_CANNOT_CONTINUE')
    start, expiry = grant['valid_from'], grant['expires_at']
    _require(all(_positive_number(t) for t in (start, expiry, original_expiry, now)),
             'FINITE_POSITIVE_CONTINUATION_TIMES_REQUIRED')
    _require(start >= original_expiry, 'CONTINUATION_BEFORE_ORIGINAL_EXPIRY')
    _require(expiry == start + 600 and expiry - start == 600,
             'FIXED_600_SECOND_CONTINUATION_REQUIRED')
    _require(start <= now < expiry, 'CONTINUATION_GRANT_INACTIVE')
    return copy.deepcopy(grant)


def validate_context(context, *, binding, action_key, original_expiry, now,
                     excluded_ids=()):
    """Validate an exact context supplied by the independently trusted parent."""
    _require(type(context) is dict and set(context) == CONTEXT_FIELDS,
             'EXACT_CONTINUATION_CONTEXT_REQUIRED')
    return validate_grant(
        context['grant'], approved_authority_ref=context['approved_authority_ref'],
        binding=binding, action_key=action_key,
        expected_token=context['expected_token'], original_expiry=original_expiry,
        now=now, excluded_ids=excluded_ids,
    )

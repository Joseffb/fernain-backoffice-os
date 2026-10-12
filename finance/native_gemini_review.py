"""Fixed-purpose native Gemini draft validation. No provider or write capability."""
import copy
import datetime
import hashlib
import json
import math
import time

CONTROLS = {
    'source_identity_matches', 'required_fields_complete', 'arithmetic_consistent',
    'synthetic', 'human_review_required', 'no_payment_accounting_or_send', 'review_state',
}
RECEIPT_FIELDS = {
    'source_id', 'source_version', 'source_sha256', 'guide_sha256', 'guide_version', 'mode',
    'execution', 'observed_at', 'source_ids', 'all_sources', 'downstream_effects',
    'response_text', 'response_sha256',
    'representations',
}
EXECUTION_FIELDS = {'platform', 'flow_id', 'run_id', 'model_observed'}


def need(ok, code):
    if not ok:
        raise ValueError(code)


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def settings(value):
    if value is None:
        return {'required': False, 'workflow_id': None, 'receipts': []}
    need(type(value) is dict and set(value) == {'required', 'workflow_id', 'receipts'}, 'EXACT_NATIVE_GEMINI_POLICY_REQUIRED')
    need(type(value['required']) is bool, 'NATIVE_GEMINI_REQUIRED_FLAG_INVALID')
    if value['required'] is False and value['workflow_id'] is None and value['receipts']==[]:
        return copy.deepcopy(value)
    need(type(value['workflow_id']) is str and 0 < len(value['workflow_id']) <= 200, 'NATIVE_GEMINI_WORKFLOW_REQUIRED')
    need(type(value['receipts']) is list and len(value['receipts']) <= 50, 'NATIVE_GEMINI_RECEIPT_BOUNDS')
    ids = set()
    for receipt in value['receipts']:
        need(type(receipt) is dict and set(receipt) == RECEIPT_FIELDS, 'EXACT_NATIVE_GEMINI_RECEIPT_REQUIRED')
        key = (receipt['source_id'], receipt['source_version'])
        need(all(type(x) is str and 0 < len(x) <= 512 for x in key) and key not in ids, 'NATIVE_GEMINI_RECEIPT_IDENTITY_INVALID')
        ids.add(key)
        need(type(receipt['execution']) is dict and set(receipt['execution']) == EXECUTION_FIELDS, 'NATIVE_GEMINI_EXECUTION_FIELDS_INVALID')
        execution = receipt['execution']
        need(execution['platform'] == 'Google Workspace Studio' and execution['flow_id'] == value['workflow_id'], 'NATIVE_GEMINI_EXECUTOR_MISMATCH')
        need(all(execution[x] is None or type(execution[x]) is str and 0 < len(execution[x]) <= 512 for x in ('run_id', 'model_observed')), 'NATIVE_GEMINI_UNOBSERVED_FIELD_INVALID')
        need(type(receipt['response_text']) is str and 0 < len(receipt['response_text']) <= 4096, 'NATIVE_GEMINI_RESPONSE_BOUNDS')
        need(receipt['response_sha256'] == digest(receipt['response_text']), 'NATIVE_GEMINI_RESPONSE_HASH_CHANGED')
        need(type(receipt['all_sources']) is bool and receipt['all_sources'] is False and type(receipt['downstream_effects']) is int and receipt['downstream_effects'] == 0, 'NATIVE_GEMINI_DRAFT_ONLY_REQUIRED')
        need(type(receipt['source_ids']) is list and len(receipt['source_ids']) == 2 and len(set(receipt['source_ids'])) == 2, 'NATIVE_GEMINI_EXACT_SOURCE_CHIPS_REQUIRED')
        representations=receipt['representations']
        need(type(representations) is list and len(representations)<=2, 'NATIVE_GEMINI_REPRESENTATION_BINDINGS_REQUIRED')
        for representation in representations:
            need(type(representation) is dict and set(representation)=={'role','canonical_id','canonical_version','canonical_sha256','native_id','native_version','native_revision','text_sha256'}, 'EXACT_NATIVE_REPRESENTATION_REQUIRED')
            need(representation['role'] in {'source','guide'} and all(type(representation[k]) is str and 0<len(representation[k])<=512 for k in ('canonical_id','canonical_version','native_id','native_version','native_revision')), 'NATIVE_REPRESENTATION_IDENTITY_INVALID')
            need(representation['canonical_sha256']==representation['text_sha256'], 'NATIVE_REPRESENTATION_TEXT_CHANGED')
        need(len({x['role'] for x in representations})==len(representations), 'NATIVE_GEMINI_EXACT_REPRESENTATIONS_REQUIRED')
        need(receipt['mode'] in {'LIVE', 'SYNTHETIC'}, 'NATIVE_GEMINI_MODE_INVALID')
        for key in ('source_sha256', 'guide_sha256', 'response_sha256'):
            need(type(receipt[key]) is str and len(receipt[key]) == 64 and all(c in '0123456789abcdef' for c in receipt[key]), 'NATIVE_GEMINI_DIGEST_INVALID')
        try:
            observed = datetime.datetime.fromisoformat(receipt['observed_at'].replace('Z', '+00:00'))
            need(observed.tzinfo is not None and math.isfinite(observed.timestamp()), 'NATIVE_GEMINI_OBSERVATION_TIME_INVALID')
        except (AttributeError, TypeError, ValueError):
            raise ValueError('NATIVE_GEMINI_OBSERVATION_TIME_INVALID')
    return copy.deepcopy(value)


def controls(text):
    # Preserve/hash the complete observed response. A single JSON fence is a
    # presentation wrapper only; extra prose or extra keys never become actions.
    raw = text.strip()
    if raw.startswith('```json\n') and raw.endswith('\n```'):
        raw = raw[8:-4]
    elif raw.startswith('```\n') and raw.endswith('\n```'):
        raw = raw[4:-4]
    output = json.loads(raw)
    need(type(output) is dict and set(output) == CONTROLS, 'NATIVE_GEMINI_CONTROL_FIELDS_INVALID')
    need(all(type(output[k]) is bool for k in CONTROLS - {'review_state'}), 'NATIVE_GEMINI_CONTROL_TYPE_INVALID')
    need(output['review_state'] in {'READY_FOR_REVIEW', 'MISSING_DATA', 'EXCEPTION'}, 'NATIVE_GEMINI_REVIEW_STATE_INVALID')
    return output


def validate(policy, admission, source_hash, review):
    configured = settings(policy.get('native_gemini_review'))
    if not configured['required']:
        return None
    current = admission['current_source']
    matches = [r for r in configured['receipts'] if r['source_id'] == current['id'] and r['source_version'] == current['version']]
    need(len(matches) == 1, 'NATIVE_GEMINI_DRAFT_REQUIRED')
    receipt = matches[0]
    provenance = admission['intake_provenance']
    need(receipt['source_sha256'] == source_hash and receipt['guide_sha256'] == policy['guide_sha256'] and receipt['guide_version']==policy.get('guide_version') and receipt['mode'] == provenance['mode'], 'NATIVE_GEMINI_INPUT_BINDING_CHANGED')
    represented={x['role']:x for x in receipt['representations']}
    if 'source' in represented:need(represented['source']['canonical_id']==current['id'] and represented['source']['canonical_version']==current['version'] and represented['source']['canonical_sha256']==source_hash, 'NATIVE_GEMINI_SOURCE_REPRESENTATION_CHANGED')
    if 'guide' in represented:need(represented['guide']['canonical_id']==policy['bindings']['guide_file_id'] and represented['guide']['canonical_version']==policy.get('guide_version') and represented['guide']['canonical_sha256']==policy['guide_sha256'], 'NATIVE_GEMINI_GUIDE_REPRESENTATION_CHANGED')
    expected_ids={represented.get('source',{}).get('native_id',current['id']),represented.get('guide',{}).get('native_id',policy['bindings']['guide_file_id'])}
    need(set(receipt['source_ids'])==expected_ids, 'NATIVE_GEMINI_EXACT_SOURCE_CHIPS_REQUIRED')
    observed = datetime.datetime.fromisoformat(receipt['observed_at'].replace('Z', '+00:00')).timestamp()
    need(observed <= time.time() + 1, 'NATIVE_GEMINI_OBSERVATION_IN_FUTURE')
    output = controls(receipt['response_text'])
    need(output['source_identity_matches'] and output['human_review_required'] and output['no_payment_accounting_or_send'], 'NATIVE_GEMINI_PURPOSE_CONTROL_FAILED')
    need(output['synthetic'] == (provenance['mode'] == 'SYNTHETIC'), 'NATIVE_GEMINI_MODE_DISAGREES')
    need(output['required_fields_complete'] == (not review.get('missing_fields')), 'NATIVE_GEMINI_COMPLETENESS_DISAGREES')
    need(output['arithmetic_consistent'] == (review.get('arithmetic', {}).get('total_check') == 'MATCH'), 'NATIVE_GEMINI_ARITHMETIC_DISAGREES')
    need(output['review_state'] == review['status'], 'NATIVE_GEMINI_REVIEW_STATE_DISAGREES')
    return {'execution': copy.deepcopy(receipt['execution']), 'observed_at': receipt['observed_at'], 'response_sha256': receipt['response_sha256'], 'source_sha256': source_hash, 'guide_sha256': policy['guide_sha256'], 'mode': receipt['mode'], 'controls': output, 'downstream_effects': 0, 'representations':copy.deepcopy(receipt['representations'])}

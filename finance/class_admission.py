"""Pure admission of one exact source under the current Finance Inbox class.
Authority and identity mapping come only from the authenticated parent. No IO.
"""
import copy
import json
import sys
import processor as P
import intake_provenance as I


def admit(x):
    try:
        if set(x) != {'policy_before', 'policy_after', 'source', 'identity', 'invoice_facts', 'effects'}:
            raise P.Hold('exact class-admission input required')
        p = P._policy(x['policy_before'], x['policy_after'])
        s, identity = x['source'], x['identity']
        identity_fields={'request_id', 'matter_id', 'role', 'original_source', 'original_context', 'clarifies_fields'}
        if 'intake_provenance_version' in p:identity_fields.add('intake_provenance')
        if 'continuation_context' in identity:identity_fields.add('continuation_context')
        if not isinstance(identity, dict) or set(identity) != identity_fields:
            raise P.Hold('parent-owned canonical identity mapping required')
        if set(s) != {'source_before', 'source_after', 'source_text', 'source_read'}:
            raise P.Hold('exact complete source read required')
        if s['source_before'].get('parent_ids') != [p['bindings']['finance_inbox_id']]:
            raise P.Hold('source must be directly and exclusively in approved Finance Inbox')
        cur = copy.deepcopy(s['source_before'])
        cur['role'] = identity['role']
        if cur['role'] == 'original':
            if identity['original_source'] != s['source_before'] or identity['original_context'] is not None or identity['clarifies_fields']:
                raise P.Hold('original identity mapping drift')
        elif cur['role'] == 'clarification':
            cur.update(matter_id=identity['matter_id'], reply_to_request_id=identity['request_id'],
                       reply_to_source_id=identity['original_source']['id'], clarifies_fields=identity['clarifies_fields'])
        else:
            raise P.Hold('unadmitted source role')
        a = {'status': 'ADMITTED', 'request_id': identity['request_id'], 'matter_id': identity['matter_id'],
             'policy_id': p['policy_id'], 'policy_version': p['version'], 'policy_sha256': p['policy_sha256'],
             'guide_sha256': p['guide_sha256'], 'bindings': copy.deepcopy(p['bindings']),
             'source_department': 'Finance Inbox', 'destination_department': 'Finance',
             'original_source': copy.deepcopy(identity['original_source']), 'current_source': cur}
        if 'continuation_context' in identity:
            a['continuation_context']=copy.deepcopy(identity['continuation_context'])
        if 'intake_provenance_version' in p:
            a['intake_provenance']=copy.deepcopy(identity['intake_provenance'])
            P._validate_intake(p,a,s['source_read']['sha256'],s['source_text'])
        c = {'policy_before': x['policy_before'], 'policy_after': x['policy_after'], 'admission': a,
             **s, 'invoice_facts': x['invoice_facts'], 'effects': x['effects']}
        if identity['original_context'] is not None:
            c['original_context'] = identity['original_context']
        candidate = P.make_candidate(**c)
        if candidate['action'] != 'READY_TO_CLAIM':
            return {'status': 'BLOCKED_SOURCE', 'reason': candidate['reason']}
        return {'status': 'ADMITTED', 'case': c, 'candidate': candidate}
    except (P.Hold, KeyError, TypeError, ValueError) as e:
        return {'status': 'BLOCKED_SOURCE', 'reason': str(e)}


if __name__ == '__main__':
    print(json.dumps(admit(json.load(sys.stdin)), ensure_ascii=False, allow_nan=False))

"""Pure, fail-closed gate. Parent-pinned provenance is required; no network effects.

This validates bindings, not the truth of an attestation. The parent must establish
the execution-boundary rejection independently before pinning these two digests.
Missing outputs, generic errors and timeouts never establish no dispatch.
"""
from finance_docs_claim import exact_object, require, digest, ident, sha, action_key

def validate_recovery(binding, token, config, evidence, decision, trusted):
    exact_object(trusted, {'authority_id','evidence_sha256','decision_sha256'}, 'trusted recovery pins')
    ident(trusted['authority_id'])
    for k in ('evidence_sha256','decision_sha256'): digest(trusted[k])
    require(sha(evidence)==trusted['evidence_sha256'] and sha(decision)==trusted['decision_sha256'], 'unpinned recovery evidence/decision')
    exact_object(evidence, {'kind','tool_name','tool_call_reference','original_invocation_completed','execution_outcome','binding','token','document_id','tab_id','action_key','upload','payload_sha256','rejection_text','execution_boundary_evidence_reference'}, 'rejection evidence')
    require(evidence['kind']=='FINANCE_REJECTED_UPLOAD_V1' and evidence['tool_name']=='mcp__codex_apps__google_drive_upload_file', 'wrong rejected operation')
    require(evidence['execution_outcome']=='REJECTED_BEFORE_PROVIDER_DISPATCH', 'uncertain provider outcome')
    require(evidence['original_invocation_completed'] is True, 'original invocation may still be running')
    for k in ('tool_call_reference','execution_boundary_evidence_reference'): ident(evidence[k])
    require(type(evidence['rejection_text']) is str and evidence['rejection_text'].startswith('This action was rejected due to unacceptable risk.\nReason: '), 'no positive tool rejection')
    require(evidence['binding']==binding and evidence['token']==token and evidence['action_key']==action_key(binding), 'original attempt changed')
    require(evidence['document_id']==config['documentId'] and evidence['tab_id']==config['tabId'], 'reservation destination changed')
    digest(evidence['payload_sha256'])
    exact_object(evidence['upload'], {'file_name','file_uri','mime_type','parent_folder_id'}, 'original upload arguments')
    require(type(evidence['upload']['file_uri']) is str and evidence['upload']['file_uri'].startswith('/') and '\n' not in evidence['upload']['file_uri'], 'original file path missing')
    require({k:v for k,v in evidence['upload'].items() if k!='file_uri'}=={'file_name':'Finance review '+action_key(binding)+'.txt','mime_type':'text/plain','parent_folder_id':binding['output_parent_id']}, 'upload arguments changed')
    exact_object(decision, {'kind','authority_id','decision_id','evidence_sha256','binding_sha256','token','payload_sha256','retry_invocation_id','approved','max_retry_uploads'}, 'recovery decision')
    require(decision['kind']=='FINANCE_REJECTED_UPLOAD_RETRY_V1' and decision['authority_id']==trusted['authority_id'], 'wrong recovery authority')
    require(decision['approved'] is True and type(decision['max_retry_uploads']) is int and decision['max_retry_uploads']==1, 'not one approved retry')
    require(decision['evidence_sha256']==sha(evidence) and decision['binding_sha256']==sha(binding) and decision['token']==token and decision['payload_sha256']==evidence['payload_sha256'], 'decision binding changed')
    ident(decision['decision_id']);digest(decision['retry_invocation_id'])
    return {'evidence_sha256':sha(evidence),'decision_sha256':sha(decision),'payload_sha256':evidence['payload_sha256'],'retry_invocation_id':decision['retry_invocation_id'],'authority_id':decision['authority_id']}

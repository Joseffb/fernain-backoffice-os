"""Pure current-connector normalization, bounded scanning and cited label extraction.
No provider IO or production authority creation. Registration is parent-owned.
"""
import base64
import copy
import hashlib
import json
import re
import sys
from decimal import Decimal, InvalidOperation
import processor as P
import intake_provenance as I
import native_gemini_review as G
import continuation_grant as R
from class_admission import admit

class Blocked(ValueError):
    pass

def need(value, code):
    if not value:
        raise Blocked(code)

def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def unwrap(result):
    need(isinstance(result,dict) and result.get('isError') is not True and isinstance(result.get('structuredContent'),dict),'CONNECTED_READ_UNAVAILABLE')
    return result['structuredContent']

def raw_config(result):
    x=unwrap(result)
    if x.get('b64_string'):
        return base64.b64decode(x['b64_string'],validate=True).decode('utf-8')
    need(isinstance(x.get('content'),str) and x['content'].strip(),'COMPLETE_CONFIG_BYTES_MISSING')
    return x['content']

def map_processor_policy(config):
    """Software interpretation of the existing private invoice-preparation grant.
    ACTIVE here is a candidate software label; bind_current gates its effective
    value on the saved installation flags and actual trigger binding.
    """
    formats=['text/plain','text/markdown'];options=config['coordinator_intake_bridge'].get('source_format_options',{})
    need(type(options) is dict and set(options)<= {'pdf_text_layer','native_google_docs'} and all(type(v) is bool for v in options.values()),'EXACT_SOURCE_FORMAT_OPTIONS_REQUIRED')
    if options.get('pdf_text_layer') is True:formats.append('application/pdf')
    if options.get('native_google_docs') is True:formats.append('application/vnd.google-apps.document')
    return {'policy_id':config['coordinator_intake_bridge']['consumer_id'],
            'status':'ACTIVE',
            'required_fields':['vendor','invoice_number','issue_date','currency','total'],
            'currencies':{'USD':2,'EUR':2,'GBP':2,'JPY':0,'CAD':2,'AUD':2},
            'supported_mime_types':formats,
            'max_output_attempts':1,'review_owner':'Charlie'}

def bind_current(x):
    """Reconstruct transient registration from the existing canonical sources.
    No registration store or owner-selected software window is required.
    """
    import math
    base=x['bindings'];pins=x['installation_pins'];craw=raw_config(x['config']);c=json.loads(craw);b=c['coordinator_intake_bridge'];gm=unwrap(x['guide_metadata']);cm=unwrap(x['config_metadata']);g=unwrap(x['guide']);profile=unwrap(x['profile'])
    need(profile.get('id')==base['principal_id'] and profile.get('email')==base['principal_email'],'PRINCIPAL_CHANGED')
    for name,meta in [('config',cm),('guide',gm)]:
        expected=base[name]
        need(meta.get('id')==expected['id'] and meta.get('parent_ids')==expected['parent_ids'] and meta.get('drive_id')==expected['drive_id'] and meta.get('mime_type')==expected['mime_type'] and meta.get('modified_time'),'FIXED_'+name.upper()+'_SOURCE_CHANGED')
    need(c.get('policy_version') in ['0.3.0','0.3.1'],'BUSINESS_POLICY_VERSION_UNSUPPORTED')
    need(cm['modified_time']==pins['config_version'] and sha(craw)==pins['config_sha256'],'PARENT_CONFIG_PIN_CHANGED')
    need(gm['modified_time']==pins['guide_version'],'PARENT_GUIDE_VERSION_CHANGED')
    guide_pin=pins['guide_sha256']
    need(b.get('guide_sha256',guide_pin)==guide_pin,'CANONICAL_GUIDE_PIN_CHANGED')
    need(isinstance(guide_pin,str) and re.fullmatch('[0-9a-f]{64}',guide_pin) and sha(g.get('content',''))==guide_pin,'GUIDE_PIN_CHANGED')
    need(base['approval_reference'] in g.get('content','') and 'Charlie coordinator Finance review grant' in g.get('content',''),'APPROVED_GUIDE_GRANT_MISSING')
    need(b.get('reservation_protocol')=='requiredRevisionId CAS; participating callers only; no provider exactly-once claim','CAS_PROTOCOL_CHANGED')
    lane=x['reservation'];need(lane.get('store',{}).get('owner_id')==base['consumer_id'] and bool(lane.get('revision')) and base['reservation']['ownerId']==base['consumer_id'],'CANONICAL_WRITER_LANE_UNVERIFIED')
    trigger=b.get('trigger_id')
    need(trigger is None or (isinstance(trigger,str) and 0<len(trigger)<512),'ACTUAL_TRIGGER_BINDING_INVALID')
    active=b.get('review_live') is True and b.get('hourly_wake_created') is True and bool(trigger)
    policy=map_processor_policy(c)
    if active:
        need(b.get('processor_policy')==policy,'SAVED_PROCESSOR_MAPPING_CHANGED_OR_MISSING')
        need(b.get('single_writer') is True and b.get('max_items')==1 and type(b.get('max_items')) is int and b.get('source_admission_window_seconds')==600 and type(b.get('source_admission_window_seconds')) is int and b.get('installation')=='INSTALLED','SAVED_BOOTSTRAP_BOUNDS_CHANGED_OR_MISSING')
        need(trigger==pins.get('trigger_id'),'ACTUAL_PARENT_TRIGGER_BINDING_CHANGED')
    else:
        need(b.get('processor_policy') is None or b.get('processor_policy')==policy,'SAVED_PROCESSOR_MAPPING_CHANGED')
        policy['status']='INACTIVE'
    started=x['wake_started_at'];need(isinstance(started,(float,int)) and not isinstance(started,bool) and math.isfinite(started) and started>0,'WAKE_START_REQUIRED')
    reg={k:base[k] for k in ['consumer_id','principal_id','principal_email','queue_id','sheet_id','tab','inbox_id','drive_id','staging_id','reservation','business_policy_version','approval_reference']}
    reg['business_policy_version']=c['policy_version']
    reg.update(config={'id':cm['id'],'version':cm['modified_time'],'sha256':sha(craw),'parent_ids':cm['parent_ids'],'drive_id':cm['drive_id']},guide={'id':gm['id'],'version':gm['modified_time'],'sha256':guide_pin,'parent_ids':gm['parent_ids'],'drive_id':gm['drive_id']},workspace_root=x['workspace_root'],max_items=1,excluded_fixture_ids=base['excluded_fixture_ids'],trigger_id=trigger,installation='INSTALLED' if active else 'NOT_INSTALLED',processor_policy=policy,single_writer=True,valid_from=started,expires_at=started+600,synthetic_invoice_admissions=I.registrations(b.get('synthetic_invoice_admissions',[]),base['excluded_fixture_ids']))
    # Validate the same exact fixed identities/effect bounds used by the host.
    # Inactive inspection may enumerate metadata/terminal records, not bodies.
    validation_reg=dict(reg);validation_reg['processor_policy']={**policy,'status':'ACTIVE'}
    normalize({**x,'registration':validation_reg})
    return {'status':'BOUND_CURRENT_CANONICAL_CONFIG','registration':reg,'software_policy_candidate':map_processor_policy(c),'writer_evidence':{'document_id':base['reservation']['documentId'],'revision':lane['revision'],'consumer_id':lane['store']['owner_id'],'protocol':b['reservation_protocol']},'window_kind':'per-wake ten-minute execution budget; not a new owner grant or lease','installation':reg['installation']}

def normalize(x):
    reg=x['registration'];craw=raw_config(x['config']);c=json.loads(craw);g=unwrap(x['guide']);gm=unwrap(x['guide_metadata']);cm=unwrap(x['config_metadata']);p=unwrap(x['profile'])
    need(p.get('id')==reg['principal_id'] and p.get('email')==reg['principal_email'],'PRINCIPAL_CHANGED')
    for name,meta,digest in [('config',cm,sha(craw)),('guide',gm,sha(g.get('content','')))]:
        pin=reg[name];need(meta.get('id')==pin['id'] and meta.get('modified_time')==pin['version'] and digest==pin['sha256'] and meta.get('parent_ids')==pin['parent_ids'] and meta.get('drive_id')==pin['drive_id'],name.upper()+'_PIN_CHANGED')
    need(cm.get('mime_type')=='application/json' and gm.get('mime_type')=='text/markdown','POLICY_SOURCE_FORMAT_CHANGED')
    need(c.get('owner')==reg['principal_email'] and c.get('policy_version')==reg['business_policy_version'] and c.get('department')=='Finance','BUSINESS_CONFIG_CHANGED')
    b=c['coordinator_intake_bridge'];bindings={'finance_inbox_id':b['source_folder_id'],'finance_drive_id':c['sources']['finance_drive_id'],'guide_file_id':gm['id'],'review_folder_id':b['private_staging_folder_id']}
    synthetic=I.registrations(b.get('synthetic_invoice_admissions',[]),reg['excluded_fixture_ids'])
    need(reg.get('synthetic_invoice_admissions',[])==synthetic,'SYNTHETIC_REGISTRATION_PIN_CHANGED')
    need(b['authority_approval']==reg['approval_reference'] and b['consumer_id']==reg['consumer_id'],'APPROVAL_OR_CONSUMER_CHANGED')
    for key,value in [('finance_inbox_id',reg['inbox_id']),('finance_drive_id',reg['drive_id']),('review_folder_id',reg['staging_id'])]:need(bindings[key]==value,'FIXED_BINDING_CHANGED')
    need(b['queue_id']==reg['queue_id'] and b['reservation_document_id']==reg['reservation']['documentId'] and b['reservation_tab_id']==reg['reservation']['tabId'],'CANONICAL_RECORD_CHANGED')
    need(b.get('hourly_wake_approved') is True and b.get('canonical_accounting_writes') is False and b.get('payments') is False and b.get('external_communications') is False and b.get('sharing_or_credentials_changed') is False,'EFFECT_BOUNDARY_CHANGED')
    need(b.get('allowed_effects')==['private Finance staging','same Department Review Queue'],'STAGING_QUEUE_BOUNDARY_CHANGED')
    spec=reg.get('processor_policy');need(isinstance(spec,dict),'PROCESSOR_REGISTRATION_MISSING')
    need(set(spec)=={'policy_id','required_fields','currencies','supported_mime_types','max_output_attempts','review_owner','status'},'EXACT_PROCESSOR_REGISTRATION_REQUIRED')
    need(spec['required_fields'] and set(spec['required_fields']).issubset({'vendor','invoice_number','issue_date','currency','total'}),'REQUIRED_FIELDS_UNSUPPORTED')
    need(isinstance(spec['currencies'],dict) and spec['currencies'] and all(re.fullmatch('[A-Z]{3}',k) and isinstance(v,int) and not isinstance(v,bool) and 0<=v<=4 for k,v in spec['currencies'].items()),'CURRENCY_POLICY_MISSING_OR_INVALID')
    allowed=map_processor_policy(c)['supported_mime_types']
    need(type(spec['supported_mime_types']) is list and set(spec['supported_mime_types']).issubset(set(allowed)),'UNVERIFIED_READER_FORMAT_REGISTERED')
    need(spec['status']=='ACTIVE','PROCESSOR_POLICY_NOT_CURRENTLY_REGISTERED')
    policy={**spec,'version':c['policy_version'],'policy_sha256':sha(craw),'guide_sha256':sha(g['content']),'queue_id':b['queue_id'],'reservation_doc_id':b['reservation_document_id'],'consumer_id':b['consumer_id'],'bindings':bindings,'intake_provenance_version':1,'synthetic_invoice_admissions':synthetic,'excluded_fixture_ids':reg['excluded_fixture_ids'],'native_gemini_review':G.settings(b.get('native_gemini_review')),
            'intake_authority':{'status':'CURRENT','authority_ref':b['authority_approval'],'source_class':b['source_class'],'folder_id':b['source_folder_id'],'drive_id':bindings['finance_drive_id'],'permitted_actions':['metadata_registration','invoice_review']}}
    P._policy(policy,policy)
    policy['guide_version']=gm['modified_time']
    return {'status':'NORMALIZED_CURRENT_POLICY','policy':policy,'business_review_live':b.get('review_live') is True,'hourly_wake_created':b.get('hourly_wake_created') is True}

LABELS={
 'vendor':'vendor','issuer':'vendor','invoice':'invoice_number','invoice number':'invoice_number','invoice reference':'invoice_number',
 'issue date':'issue_date','invoice date':'issue_date','currency':'currency','total':'total','invoice total':'total','subtotal':'subtotal','tax':'tax','fees':'fees','discounts':'discounts','due date':'due_date',
 'purpose':'purpose','service period':'service_period','tax/fee basis':'tax_fee_basis','tax fee basis':'tax_fee_basis','project allocation':'project_allocation','payment evidence applicability':'payment_evidence_applicability'}
NUMBERS={'total','subtotal','tax','fees','discounts'}

def extract(source):
    text=source['source_text'];meta=source['source_before'];read=source['source_read'];after=source['source_after']
    need(meta==after and read.get('complete') is True and read.get('sha256')==sha(text),'COMPLETE_SOURCE_CHANGED')
    mime=meta.get('mime_type')
    if mime=='application/pdf':
        need(read.get('format')==mime,'SOURCE_FORMAT_UNSUPPORTED')
        need(read.get('ocr_status')=='not_performed' and read.get('accepted_input_class')=='text_layer_pdf_without_images_forms_or_annotations' and re.fullmatch('[a-f0-9]{64}',str(read.get('raw_file_sha256',''))) and type(read.get('raw_file_byte_length')) is int and 0<read['raw_file_byte_length']<=2097152,'PDF_COMPLETE_BYTE_EVIDENCE_MISSING')
        ranges=read.get('page_text_ranges');need(type(ranges) is list and len(ranges)==read.get('page_count') and ranges,'PDF_PAGE_MAPPING_MISSING')
        prior=0
        for number,r in enumerate(ranges,1):
            start,end=r.get('start_char'),r.get('end_char');need(type(start) is int and type(end) is int and start==prior+(3 if number>1 else 0) and 0<=start<end<=len(text) and r.get('page_number')==number and sha(text[start:end])==r.get('page_text_sha256'),'PDF_PAGE_MAPPING_CHANGED')
            if number>1:need(text[prior:start]=='\n\f\n','PDF_PAGE_SEPARATOR_CHANGED')
            prior=end
        need(prior==len(text),'PDF_TEXT_MAPPING_INCOMPLETE')
    elif mime=='application/vnd.google-apps.document':
        need(read.get('format')==mime,'SOURCE_FORMAT_UNSUPPORTED')
        need(read.get('source_revision_id')==meta.get('docs_revision_id') and bool(meta.get('docs_revision_id')) and re.fullmatch('[a-f0-9]{64}',str(read.get('native_snapshot_sha256',''))),'NATIVE_REVISION_EVIDENCE_MISSING')
        mapping=read.get('text_mapping');need(type(mapping) is list and mapping,'NATIVE_TEXT_MAPPING_MISSING');prior=0
        for row in mapping:
            start,end=row.get('start_char'),row.get('end_char');need(type(start) is int and type(end) is int and start==prior<end<=len(text) and row.get('kind') in {'text_run','structural_separator'} and sha(text[start:end])==row.get('text_sha256'),'NATIVE_TEXT_MAPPING_CHANGED');prior=end
        need(prior==len(text),'NATIVE_TEXT_MAPPING_INCOMPLETE')
    else:need(mime in {'text/plain','text/markdown'},'SOURCE_FORMAT_UNSUPPORTED')
    need(not re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:password|api[_ -]?key|secret[_ -]?key|access[_ -]?token)\s*(?:[:=]|\t)\s*\S+',text,re.I),'SECRET_BEARING_SOURCE_HELD')
    facts={};positions={};invoice_evidence=False
    pattern=r'^([^\r\n:\t]{1,50})(?::[ \t]*|\t+)([^\r\n]*)' if mime=='application/vnd.google-apps.document' else r'^([^\r\n:]{1,50}):[ \t]*([^\r\n]*)'
    for match in re.finditer(pattern,text,re.M):
        label=match.group(1).strip().casefold();field=LABELS.get(label)
        if field is None:continue
        if label in {'invoice','invoice number','invoice reference'}:invoice_evidence=True
        value=match.group(2).strip()
        if not value:continue
        if field in NUMBERS:
            need(bool(re.fullmatch(r'[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?',value)),'UNSUPPORTED_AMOUNT_FORMAT:'+field)
            try:need(Decimal(value.replace(',','')).is_finite(),'NON_FINITE_AMOUNT')
            except InvalidOperation:raise Blocked('INVALID_AMOUNT:'+field)
        elif field=='currency':need(bool(re.fullmatch('[A-Z]{3}',value)),'EXPLICIT_CURRENCY_CODE_REQUIRED')
        elif field in {'issue_date','due_date'}:need(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',value)),'ISO_DATE_REQUIRED:'+field)
        need(field not in facts,'AMBIGUOUS_REPEATED_FIELD:'+field)
        # Every value is literal; no absent number or currency is filled by inference.
        quote=match.group(0);facts[field]={'value':value,'citations':[{'source_id':meta['id'],'start':match.start(),'end':match.end(),'quote':quote}]}
        positions[field]=(match.start(),match.end())
    need(invoice_evidence,'UNCLASSIFIED_DOCUMENT_REQUIRES_REVIEW')
    return {'status':'EXTRACTED','invoice_facts':facts,'extraction_method':'exact labelled UTF-8 invoice fields; source spans use Python Unicode codepoints','source_sha256':read['sha256']}

def row_ids(row):
    result=set()
    for value in (row[0] if row else '',row[1] if len(row)>1 else ''):
        try:result.add(P.canonical_file_id(str(value)))
        except P.Hold:
            if re.fullmatch('[A-Za-z0-9_-]+',str(value)):result.add(str(value))
    return result

def assess(x):
    meta=x['metadata'];rows=x['queue_rows'];store=x['reservation'];reg=x['registration'];sid=meta['id']
    need(meta.get('drive_id')==reg['drive_id'] and meta.get('parent_ids')==[reg['inbox_id']] and meta.get('modified_time'),'SOURCE_LOCATION_OR_VERSION_UNVERIFIED')
    registrations=I.registrations(reg.get('synthetic_invoice_admissions',[]),reg['excluded_fixture_ids'])
    synthetic_entry=next((r for r in registrations if r['source_id']==sid),None)
    synthetic=bool(synthetic_entry or sid in reg['excluded_fixture_ids'] or I.title_is_synthetic(meta.get('title','')))
    hits=[(i,row) for i,row in enumerate(rows[1:],2) if sid in row_ids(row)]
    if len(hits)>1 and sid in reg['excluded_fixture_ids']:
        return {'status':'SKIP_SYNTHETIC_FIXTURE','source_id':sid,'synthetic':True,'retained_duplicate_queue_rows':[i for i,_ in hits]}
    need(len(hits)<=1,'DUPLICATE_QUEUE_SOURCE_REQUIRES_RECONCILIATION')
    if hits:
        index,row=hits[0];row=list(row)+['']*14
        if row[6] in {'READY_FOR_REVIEW','REVIEWED','MISSING_DATA','EXCEPTION','BLOCKED','COMPLETE','CLOSED','CANCELLED','SUPERSEDED'}:return {'status':'SKIP_TERMINAL_QUEUE','source_id':sid,'queue_row':index,'queue_status':row[6],'return_link':row[10],'synthetic':synthetic}
    known=[(k,r) for k,r in store['entries'].items() if r['binding']['source_id']==sid]
    if known:
        unresolved=any(r['state'] in {'claimed','effect_uncertain','effect_confirmed'} for _,r in known)
        return {'status':'BLOCKED_SOURCE' if unresolved else 'SKIP_RETAINED_RESERVATION','source_id':sid,'retained_keys':[k for k,_ in known],'retained_states':[r['state'] for _,r in known],'synthetic':synthetic,**({'code':'EXISTING_RESERVATION_REQUIRES_RECONCILIATION'} if unresolved else {})}
    if hits:
        index,row=hits[0];row=list(row)+['']*14
        if row[5] and row[5]!=meta['modified_time']:raise Blocked('QUEUE_SOURCE_VERSION_CHANGED')
        if row[4]=='CLARIFICATION OBSERVATION' or 'linked_matter=' in row[13]:raise Blocked('LINKED_MATTER_REQUIRES_EXISTING_CLARIFICATION_ADMISSION')
        if row[6] not in {'NEEDS_OPERATOR_REVIEW','UNVERIFIED','STAGED',''}:raise Blocked('EXISTING_QUEUE_STATE_REQUIRES_RECONCILIATION')
    if sid in reg['excluded_fixture_ids'] or (I.title_is_synthetic(meta.get('title','')) and not synthetic_entry):return {'status':'SKIP_SYNTHETIC_FIXTURE','source_id':sid,'synthetic':True}
    if synthetic_entry:
        need(I.test_title(meta.get('title','')),'SYNTHETIC_TEST_TITLE_REQUIRED')
        need(meta['modified_time']==synthetic_entry['source_version'],'SYNTHETIC_SOURCE_VERSION_CHANGED')
        need(synthetic_entry['valid_from']<=I.time.time()<synthetic_entry['expires_at'],'SYNTHETIC_GRANT_INACTIVE')
    need(store['active_key'] is None,'WRITER_BUSY')
    spec=reg.get('processor_policy') or {};allowed=spec.get('supported_mime_types',['text/plain','text/markdown'])
    need(meta.get('mime_type') in allowed and meta.get('mime_type') in {'text/plain','text/markdown','application/pdf','application/vnd.google-apps.document'},'SOURCE_FORMAT_UNSUPPORTED:'+str(meta.get('mime_type')))
    request=hits[0][1][0] if hits else sid
    need(bool(request),'CANONICAL_REQUEST_ID_MISSING')
    return {'status':'ELIGIBLE_METADATA_ONLY','source_id':sid,'request_id':request,'matter_id':sid,'synthetic':bool(synthetic_entry),'intake_mode':'SYNTHETIC' if synthetic_entry else 'LIVE'}

def prepare(x):
    s=x['source'];p=x['policy'];sid=x['metadata']['id'];version=x['metadata']['modified_time']
    need(s['source_before']['id']==sid and s['source_before']['version']==version,'SOURCE_ADMISSION_VERSION_CHANGED')
    entries=x['reservation']['entries'];active=x['reservation']['active_key'];record=entries.get(active) if active else None
    if record and record['binding']['source_id']==sid and record['binding']['source_version']==version:
        b=record['binding'];need(record['state'] in {'claimed','effect_uncertain','effect_confirmed'} and b['source_sha256']==s['source_read']['sha256'] and b['policy_sha256']==p['policy_sha256'] and b['consumer_id']==p['consumer_id'],'CURRENT_CLAIM_BINDING_CHANGED')
        eligibility={'request_id':b['request_id'],'matter_id':b['matter_id']}
    else:
        eligibility=assess(x);need(eligibility['status']=='ELIGIBLE_METADATA_ONLY','SOURCE_NOT_ELIGIBLE:'+eligibility['status'])
    context=x.get('continuation_context')
    if context is not None:
        need(p.get('native_gemini_review',{}).get('required') is True,'NATIVE_REVIEW_REQUIRED_FOR_CONTINUATION')
        need(record is not None and record['state'] in {'claimed','effect_uncertain','effect_confirmed'},'EXISTING_ACTIVE_CONTINUATION_REQUIRED')
        registered=I.registration_for(p,sid)
        need(registered is not None,'SYNTHETIC_ORIGINAL_CONTINUATION_REQUIRED')
        context=copy.deepcopy(context)
        grant=R.validate_context(context,binding=record['binding'],action_key=active,original_expiry=registered['expires_at'],now=I.time.time(),excluded_ids=p.get('excluded_fixture_ids',[]))
        fenced=record.get('attempt_history',[])
        own_lineage=bool(fenced) and fenced[-1].get('prior_token')==context['expected_token'] and fenced[-1].get('evidence_sha256')==grant['evidence_sha256']
        need(record['token']==context['expected_token'] or own_lineage,'CONTINUATION_TOKEN_LINEAGE_CHANGED')
        need(record['token']!=context['expected_token'] or record['state']=='claimed' and record['output'] is None,'CONTINUATION_INITIAL_STATE_INVALID')
        if record['token']==context['expected_token']:
            need(record.get('queue_receipt') is None,'CONTINUATION_INITIAL_STATE_INVALID')
            rows=[list(row)+['']*14 for row in x['queue_rows'] if row and row[0]==record['binding']['request_id']]
            need(len(rows)==1,'CONTINUATION_QUEUE_IDENTITY_AMBIGUOUS')
            row=rows[0];parts=str(row[13]).split(' || NEXT_ATTEMPT || ')[-1].split('; ')
            markers={part.split('=',1)[0]:part.split('=',1)[1] for part in parts if '=' in part}
            need(row[4]=='SYNTHETIC TEST INVOICE' and row[6]=='PROCESSING' and not row[10] and str(row[11])=='0' and row[5]==s['source_before']['version'],'CONTINUATION_QUEUE_NOT_PRE_EFFECT')
            for name in ('claim_token','action_key','output_state','attempt_count','intake_mode'):
                need(sum(part.startswith(name+'=') for part in parts)==1,'CONTINUATION_QUEUE_MARKER_AMBIGUOUS')
            need(markers.get('claim_token')==context['expected_token'] and markers.get('action_key')==active and markers.get('output_state')=='NOT_ATTEMPTED' and markers.get('attempt_count')=='0' and markers.get('intake_mode')=='SYNTHETIC','CONTINUATION_QUEUE_NOT_PRE_EFFECT')
    facts=extract(s)['invoice_facts']
    identity={'request_id':eligibility['request_id'],'matter_id':eligibility['matter_id'],'role':'original','original_source':s['source_before'],'original_context':None,'clarifies_fields':[]}
    if p.get('intake_provenance_version') is not None:
        identity['intake_provenance']=I.provenance(p,s['source_before'],s['source_read']['sha256'],s['source_text'],check_window=context is None)
        if context is not None:identity['continuation_context']=context
        if identity['intake_provenance']['mode']=='SYNTHETIC':need(I.test_title(x['metadata'].get('title','')),'SYNTHETIC_TEST_TITLE_REQUIRED')
    inp={'policy_before':p,'policy_after':p,'source':s,'identity':identity,'invoice_facts':facts,'effects':{'known_invoice_keys':x['known_invoice_keys']}}
    admitted=admit(inp);need(admitted['status']=='ADMITTED',admitted.get('reason','CLASS_ADMISSION_HELD'))
    if record:need(admitted['candidate']['action_key']==active and admitted['candidate']['binding']==record['binding'],'ACTIVE_EFFECT_BINDING_CHANGED')
    return {'status':'PREPARED_CURRENT_SOURCE','class_input':inp,'candidate':admitted['candidate'],'source_binding':{'id':s['source_before']['id'],'version':s['source_before']['version'],'sha256':s['source_read']['sha256']},**({'intake_provenance':identity['intake_provenance'],'synthetic':identity['intake_provenance']['mode']=='SYNTHETIC'} if 'intake_provenance' in identity else {}),**({'continuation_context':context} if context is not None else {})}

def dispatch(x):
    try:
        op=x['operation']
        if op=='normalize':return normalize(x)
        if op=='bind_current':return bind_current(x)
        if op=='extract':return extract(x['source'])
        if op=='assess':return assess(x)
        if op=='prepare':return prepare(x)
        if op=='hash':return {'sha256':sha(x['text'])}
        raise Blocked('UNSUPPORTED_OPERATION')
    except (Blocked,P.Hold,KeyError,TypeError,ValueError) as e:
        return {'status':'BLOCKED_SOURCE','code':str(e)}

if __name__=='__main__':print(json.dumps(dispatch(json.load(sys.stdin)),ensure_ascii=False,allow_nan=False))

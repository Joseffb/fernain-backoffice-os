"""Optional parent-owned Google Docs CAS planner. No connector/network operations."""
import argparse,copy,json,re,secrets,sys,time,math
from pathlib import Path
from boundary import Gateway,NoSend,require,strict_json_loads,validate_registry,exact_object,ident,request_hash,V3_PIN,TEXT_PIN
from parent_bridge import ensure_sendable_request,gmail_arguments,reply_context,sha,canonical

FORMAT='FERNAIN_AGENTIC_CLAIMS_V1'
BINDING_FIELDS={'message_id','request_hash','registry_hash','actor_id','producer_id','department','authority_id','recipient_policy_id','matter_id','source_ids','thread_id','arguments_sha256','html_sha256','text_sha256'}

def validate_binding(b):
    allowed={frozenset(BINDING_FIELDS),frozenset(BINDING_FIELDS|{'reply_context'}),frozenset(BINDING_FIELDS|{'owner_context_sha256'}),frozenset(BINDING_FIELDS|{'reply_context','owner_context_sha256'})}
    require(type(b) is dict and frozenset(b) in allowed,'claim binding fields/types')
    if 'owner_context_sha256' in b:request_hash(b['owner_context_sha256'])
    if 'reply_context' in b:
        c=b['reply_context'];exact_object(c,{'reply_message_id','observed_gmail_thread_id','anchor_sha256'},'reply context')
        ident(c['reply_message_id']);ident(c['observed_gmail_thread_id']);request_hash(c['anchor_sha256'])
    for key in BINDING_FIELDS-{'source_ids','request_hash','registry_hash','arguments_sha256','html_sha256','text_sha256'}:ident(b[key])
    for key in ('request_hash','registry_hash','arguments_sha256','html_sha256','text_sha256'):request_hash(b[key])
    require(b['html_sha256']==V3_PIN and b['text_sha256']==TEXT_PIN,'binding canonical version mismatch')
    require(type(b['source_ids']) is list and 0<len(b['source_ids'])<=30,'binding source IDs')
    for x in b['source_ids']:ident(x)
    require(len(set(b['source_ids']))==len(b['source_ids']),'duplicate binding sources')

LEGACY_REASONS={'authenticated_actor_not_recorded','send_time_registry_hash_not_recorded'}

def validate_tombstone(key,r):
    exact_object(r,{'state','message_id','verified_facts','missing_binding_reasons'},'legacy tombstone')
    require(r['state']=='legacy_no_retry' and r['message_id']==key,'legacy tombstone ID/state mismatch')
    ident(r['message_id'])
    facts=r['verified_facts']
    require(type(facts) is dict and bool(facts) and set(facts)<={'request_hash','arguments_sha256','gmail_receipt'},'legacy verified facts schema')
    for field,value in facts.items():
        if field=='gmail_receipt':ident(value)
        else:request_hash(value)
    reasons=r['missing_binding_reasons']
    require(type(reasons) is list and len(reasons)==2 and all(type(x) is str for x in reasons)
            and set(reasons)==LEGACY_REASONS,'explicit legacy missing-binding reasons required')

def validate_record(key,r,owner=None):
    if type(r) is dict and r.get('state')=='legacy_no_retry':
        validate_tombstone(key,r)
        return
    fields={'attempt_token','binding','state','receipt'}
    require(type(r) is dict and set(r) in (fields,fields|{'settlement'}),'claim record fields/types')
    if 'settlement' in r:
        require(r.get('state')=='no_retry' and r.get('receipt') is None,'settlement only valid for no_retry')
        validate_no_send_evidence(key,r['attempt_token'],r['binding'],r['settlement'],owner)
    elif r.get('state')=='no_retry':raise NoSend('no_retry requires immutable settlement evidence')
    require(type(r['attempt_token']) is str and re.fullmatch('[0-9a-f]{64}',r['attempt_token']),'attempt token')
    validate_binding(r['binding']);require(r['binding']['message_id']==key,'record key mismatch')
    require(r['state'] in ('claimed','prepared','uncertain','sent','no_retry'),'invalid record state')
    if r['state']=='sent':
        exact_object(r['receipt'],{'id','thread_id','result_sha256'},'receipt')
        ident(r['receipt']['id']);require(r['receipt']['thread_id'] is None or type(r['receipt']['thread_id']) is str,'receipt thread type')
        request_hash(r['receipt']['result_sha256'])
    else:require(r['receipt'] is None,'receipt before sent')

def validate_no_send_evidence(key,token,binding,e,owner=None):
    fields={'evidence_id','proof_sha256','message_id','request_hash','attempt_token','binding_sha256','effect_owner_id','claim_state','verified_by','verified_at','provider_reconciled','audit_window_complete','transport_invocation_count','source_refs'}
    require(type(e) is dict and set(e)==fields,'exact no-dispatch evidence required')
    proof={k:v for k,v in e.items() if k!='proof_sha256'}
    request_hash(e['proof_sha256']);require(sha(proof)==e['proof_sha256'],'no-dispatch evidence digest mismatch')
    require(e['message_id']==key and e['request_hash']==binding['request_hash'] and e['attempt_token']==token and e['binding_sha256']==sha(binding),'no-dispatch claim/token/binding mismatch')
    require(e['claim_state'] in ('claimed','prepared'),'only pre-send state may be settled')
    require(type(e['effect_owner_id']) is str and e['effect_owner_id'] and type(e['verified_by']) is str and e['verified_by'] and type(e['verified_at']) in (int,float),'independent verifier/effect owner missing')
    require(math.isfinite(e['verified_at']) and 0<=e['verified_at']<=253402300799 and (owner is None or e['effect_owner_id']==owner),'effect owner/time mismatch')
    require(e['provider_reconciled'] is True and e['audit_window_complete'] is True and type(e['transport_invocation_count']) is int and e['transport_invocation_count']==0,'positive no-dispatch proof incomplete')
    require(type(e['source_refs']) is list and bool(e['source_refs']) and all(type(x) is str and x for x in e['source_refs']),'independent proof source refs required')

def validate_ledger(ledger,owner):
    exact_object(ledger,{'format','owner_id','entries'},'ledger')
    require(ledger['format']==FORMAT and ledger['owner_id']==owner,'wrong ledger/owner')
    require(type(ledger['entries']) is dict and len(ledger['entries'])<=1000,'ledger capacity/schema')
    for key,r in ledger['entries'].items():ident(key);validate_record(key,r,owner)

def unwrap(result):
    require(type(result) is dict,'Docs object required')
    d=result
    if 'structuredContent' in d:
        native_object(d,{'structuredContent'},{'content','isError','_meta'},'MCP envelope')
        if 'isError' in d:require(type(d['isError']) is bool and not d['isError'],'Docs connector error')
        if 'content' in d:require(type(d['content']) is list,'MCP content array required')
        d=d['structuredContent']
    for _ in range(2):
        require(type(d) is dict,'Docs structured resource required')
        if 'documentId' in d:return d
        require(set(d) in ({'result'},{'document'}),'unsupported/ambiguous Docs wrapper')
        d=d[next(iter(d))]
    require(type(d) is dict and 'documentId' in d,'Docs structured resource required')
    return d

FLAT_ROOT={'documentId','title','revisionId','suggestionsViewMode','url','body','tabs','document_url'}
FLAT_TAB={'tabId','title','parentTabId','index','nestingLevel','iconEmoji','body','headers','footers','footnotes','documentStyle','suggestedDocumentStyleChanges','namedStyles','suggestedNamedStylesChanges','lists','namedRanges','inlineObjects','positionedObjects','documentId','document_url'}
EMPTY_NATIVE_MAPS={'headers','footers','footnotes','inlineObjects','positionedObjects','lists','namedRanges'}

def validated_document_shape(d):
    # Two explicitly supported representations, never a permissive flattening.
    tabs=d.get('tabs')
    require(type(tabs) is list and len(tabs)==1 and type(tabs[0]) is dict,'single typed tab required')
    t=tabs[0]
    if 'tabId' not in t:
        return d  # raw API variant is fully validated by snapshot below
    native_object(d,FLAT_ROOT,set(),'flattened document')
    native_object(t,FLAT_TAB,set(),'flattened tab')
    require(type(d['documentId']) is str and t['documentId']==d['documentId'],'flattened document identity mismatch')
    url='https://docs.google.com/document/d/'+d['documentId']
    require(d['document_url']==url and t['document_url']==url and d['url'] in (None,url),'flattened document URL mismatch')
    require(d['body'] is None,'mixed flattened root body forbidden')
    require(t['parentTabId'] is None and (t['nestingLevel'] is None or type(t['nestingLevel']) is int and t['nestingLevel']==0),'nested/invalid flattened tab')
    require(type(t['index']) is int and t['index']==0,'flattened tab index must be integer zero')
    require(type(t['title']) is str and t['iconEmoji'] is None,'unsupported flattened tab metadata')
    require(t['suggestedDocumentStyleChanges'] is None and t['suggestedNamedStylesChanges'] is None,'suggested styles forbidden')
    require(type(t['documentStyle']) is dict and type(t['namedStyles']) is dict and type(t['body']) is dict,'full flattened native content required')
    for field in EMPTY_NATIVE_MAPS:
        require(t[field] is None or type(t[field]) is dict and not t[field],'flattened native map/content forbidden')
    return {'documentId':d['documentId'],'revisionId':d['revisionId'],'title':d['title'],
            'suggestionsViewMode':d['suggestionsViewMode'],'documentStyle':t['documentStyle'],'namedStyles':t['namedStyles'],
            'tabs':[{'tabProperties':{'tabId':t['tabId'],'title':t['title'],'index':t['index']},
                     'documentTab':{'body':t['body'],**{k:{} for k in EMPTY_NATIVE_MAPS}}}]}

def native_object(value, required, optional, label):
    require(type(value) is dict and required<=set(value)<=required|optional,
            'unknown/missing/mixed native '+label+' shape')

def native_index(value, label):
    require(type(value) is int and value>=0, 'native '+label+' must be integer, not bool')
    return value

def metadata(value, allowed, label):
    native_object(value,set(),set(allowed.split()),label)
    objects={'foregroundColor','backgroundColor','fontSize','weightedFontFamily','spaceAbove','spaceBelow','borderBetween','borderTop','borderBottom','borderLeft','borderRight','indentFirstLine','indentStart','indentEnd','shading','marginTop','marginBottom','marginLeft','marginRight','marginHeader','marginFooter','background','pageSize','documentSize','documentFormat','color','rgbColor','width','height','padding','paddingEnd','offset'}
    arrays={'tabStops','columnProperties'}
    booleans={'bold','italic','underline','strikethrough','smallCaps','keepWithNext','keepTogether','keepLinesTogether','pageBreakBefore','avoidWidowAndOrphan','flipPageOrientation','useFirstPageHeaderFooter','useEvenPageHeaderFooter','useCustomHeaderFooterMargins'}
    numbers={'lineSpacing','pageNumberStart','magnitude','red','green','blue','alpha','weight'}
    nested={'magnitude','unit','color','rgbColor','red','green','blue','alpha','fontFamily','weight','width','height','padding','paddingEnd','dashStyle','backgroundColor','offset','alignment','documentMode'}
    def check(key,v):
        if key in objects:
            native_object(v,set(),nested,'nested '+key)
            for k,x in v.items():check(k,x)
        elif key in arrays:
            require(type(v) is list,'native metadata array type')
            for x in v:
                native_object(x,set(),nested,'nested '+key)
                for k,y in x.items():check(k,y)
        elif key in booleans:require(type(v) is bool,'native metadata boolean type')
        elif key in numbers:
            import math
            require(type(v) in (int,float) and -1000000000<=v<=1000000000 and math.isfinite(v),'native metadata numeric type')
        else:require(type(v) is str and bool(v.strip()),'native metadata string type')
    for key,item in value.items():check(key,item)

TEXT_STYLE='bold italic underline strikethrough smallCaps foregroundColor backgroundColor fontSize weightedFontFamily baselineOffset'
PARAGRAPH_STYLE='headingId namedStyleType alignment lineSpacing direction spacingMode spaceAbove spaceBelow borderBetween borderTop borderBottom borderLeft borderRight indentFirstLine indentStart indentEnd keepWithNext keepTogether keepLinesTogether pageBreakBefore avoidWidowAndOrphan shading tabStops'
SECTION_STYLE='columnProperties columnSeparatorStyle contentDirection sectionType marginTop marginBottom marginLeft marginRight marginHeader marginFooter flipPageOrientation defaultHeaderId defaultFooterId firstPageHeaderId firstPageFooterId evenPageHeaderId evenPageFooterId useFirstPageHeaderFooter pageNumberStart'
DOCUMENT_STYLE='pageNumberStart background defaultHeaderId defaultFooterId evenPageHeaderId evenPageFooterId firstPageHeaderId firstPageFooterId useFirstPageHeaderFooter useEvenPageHeaderFooter pageSize documentSize marginTop marginBottom marginLeft marginRight marginHeader marginFooter flipPageOrientation useCustomHeaderFooterMargins defaultTabStop documentFormat'

def snapshot(raw,config):
    exact_object(config,{'documentId','tabId','ownerId'},'Docs config')
    for v in config.values():ident(v)
    d=validated_document_shape(unwrap(raw))
    empty_maps={'headers','footers','footnotes','inlineObjects','positionedObjects','lists','namedRanges'}
    native_object(d,{'documentId','revisionId','tabs'},
                  {'title','documentStyle','namedStyles','suggestionsViewMode'}|empty_maps,'document')
    require(type(d['documentId']) is str and d['documentId']==config['documentId'],'wrong durable document')
    rev=d['revisionId']
    require(type(rev) is str and bool(rev.strip()) and rev==rev.strip()
            and not any(ord(c)<33 or ord(c)==127 for c in rev), 'Docs revisionId unavailable/malformed')
    if 'title' in d:require(type(d['title']) is str,'native title type')
    if 'suggestionsViewMode' in d:require(d['suggestionsViewMode']=='SUGGESTIONS_INLINE','unsupported suggestions view')
    if 'documentStyle' in d:metadata(d['documentStyle'],DOCUMENT_STYLE,'documentStyle')
    if 'namedStyles' in d:
        native_object(d['namedStyles'],{'styles'},set(),'namedStyles')
        require(type(d['namedStyles']['styles']) is list,'named styles array required')
        for style in d['namedStyles']['styles']:
            native_object(style,{'namedStyleType'},{'textStyle','paragraphStyle'},'named style')
            require(type(style['namedStyleType']) is str and bool(style['namedStyleType']),'named style type')
            if 'textStyle' in style:metadata(style['textStyle'],TEXT_STYLE,'named textStyle')
            if 'paragraphStyle' in style:metadata(style['paragraphStyle'],PARAGRAPH_STYLE,'named paragraphStyle')
    tabs=d['tabs'];require(type(tabs) is list and len(tabs)==1,'dedicated single-tab ledger required')
    t=tabs[0]
    native_object(t,{'tabProperties','documentTab'},{'childTabs'},'tab')
    if 'childTabs' in t:require(type(t['childTabs']) is list and len(t['childTabs'])==0,'childTabs must be an empty array')
    props=t['tabProperties']
    native_object(props,{'tabId'},{'title','index','parentTabId'},'tabProperties')
    require(type(props['tabId']) is str and props['tabId']==config['tabId'],'wrong ledger tab')
    if 'title' in props:require(type(props['title']) is str,'native tab title type')
    if 'index' in props:require(native_index(props['index'],'tab index')==0,'single tab must have index zero')
    if 'parentTabId' in props:require(type(props['parentTabId']) is str and props['parentTabId']=='','nested parent tab forbidden')
    dt=t['documentTab'];native_object(dt,{'body'},empty_maps,'documentTab')
    for location in (d,dt):
        for field in empty_maps:
            if field in location:require(type(location[field]) is dict and not location[field],'non-ledger native content/map shape')
    body=dt['body'];native_object(body,{'content'},set(),'body')
    content=body['content'];require(type(content) is list and len(content)>=2,'full ledger body required')
    section=content[0]
    native_object(section,{'endIndex','sectionBreak'},{'startIndex'},'section element')
    require(native_index(section.get('startIndex',0),'section start')==0
            and native_index(section['endIndex'],'section end')==1,'unexpected ledger body start')
    native_object(section['sectionBreak'],set(),{'sectionStyle'},'sectionBreak')
    if 'sectionStyle' in section['sectionBreak']:metadata(section['sectionBreak']['sectionStyle'],SECTION_STYLE,'sectionStyle')
    text='';cursor=1
    for element in content[1:]:
        native_object(element,{'startIndex','endIndex','paragraph'},set(),'paragraph element')
        start=native_index(element['startIndex'],'paragraph start');end=native_index(element['endIndex'],'paragraph end')
        require(start==cursor and end>start,'paragraph indices not contiguous/increasing')
        p=element['paragraph'];native_object(p,{'elements'},{'paragraphStyle'},'paragraph')
        if 'paragraphStyle' in p:
            metadata(p['paragraphStyle'],PARAGRAPH_STYLE,'paragraphStyle')
            require(p['paragraphStyle'].get('namedStyleType','NORMAL_TEXT')=='NORMAL_TEXT','ledger must use normal text')
        runs=p['elements'];require(type(runs) is list and bool(runs),'nonempty native text run array required')
        run_cursor=start;paragraph_text=''
        for run in runs:
            native_object(run,{'startIndex','endIndex','textRun'},set(),'paragraph run')
            rs=native_index(run['startIndex'],'run start');re_=native_index(run['endIndex'],'run end')
            tr=run['textRun'];native_object(tr,{'content'},{'textStyle'},'textRun')
            part=tr['content'];require(type(part) is str and bool(part),'ledger text missing')
            if 'textStyle' in tr:metadata(tr['textStyle'],TEXT_STYLE,'textStyle')
            try:units=len(part.encode('utf-16-le'))//2
            except UnicodeError:raise NoSend('invalid UTF-16 text')
            require(rs==run_cursor and re_==rs+units and re_<=end,'text run UTF-16 indices/contiguity mismatch')
            paragraph_text+=part;run_cursor=re_
        require(run_cursor==end and paragraph_text.endswith('\n'),'paragraph range/text mismatch')
        text+=paragraph_text;cursor=end
    require(cursor==1+len(text.encode('utf-16-le'))//2,'ledger UTF-16 indices mismatch')
    require(text.endswith('\n') and len(text)<=1000000,'ledger text limits')
    ledger=strict_json_loads(text);validate_ledger(ledger,config['ownerId'])
    require(text==canonical(ledger)+'\n','ledger must be canonical single-line JSON plus final newline')
    return rev,text,cursor,ledger

def candidate(registry_path,request_path,actor,owner_context_path=None,owner_backend=None,active_connector=None):
    r=strict_json_loads(Path(request_path).read_text());ensure_sendable_request(r)
    baseline=validate_registry(strict_json_loads(Path(registry_path).read_text()))
    def load():
        latest=validate_registry(strict_json_loads(Path(registry_path).read_text()))
        require(latest==baseline,'registry changed during validation')
        return latest
    owner_guard=None
    if owner_context_path:
        from owner_intake import OwnerIntake,validate_owner_factual_answer
        def owner_guard(r,actor_id,policy_id):
            cfg=strict_json_loads(Path(owner_context_path).read_text())
            exact_object(cfg,{'backend','intake_db','grant_path','runtime_identity_path','readbacks_path','original_message_id'},'owner context paths')
            require(type(owner_backend) is dict and set(owner_backend)=={'kind','documentId','tabId','ownerId'} and owner_backend['kind']=='google_docs' and cfg['backend']==owner_backend,'owner Docs backend/effect owner mismatch')
            grant=strict_json_loads(Path(cfg['grant_path']).read_text())
            require(grant['policy_id']==policy_id,'owner producer policy mismatch')
            require(grant['original_message_id']==cfg['original_message_id'] and grant['effect_owner_id']==owner_backend['ownerId'] and grant['backend_kind']=='google_docs' and grant['backend_key']==sha(owner_backend),'owner original source/effect backend mismatch')
            runtime=strict_json_loads(Path(cfg['runtime_identity_path']).read_text())
            require(type(active_connector) is dict and set(active_connector)=={'provider','account_id','principal_id','from_address','verified_at','identity_evidence_sha256'} and active_connector['provider']=='gmail' and active_connector['account_id']==runtime['account_id'] and active_connector['principal_id']==runtime['principal_id'] and active_connector['from_address']==runtime['from_address'] and active_connector['identity_evidence_sha256']==runtime['identity_evidence_sha256'] and type(active_connector['verified_at']) in (int,float) and 0<=time.time()-active_connector['verified_at']<=10 and active_connector['verified_at']<=time.time()+1,'active Gmail connector identity differs from owner grant')
            reads=strict_json_loads(Path(cfg['readbacks_path']).read_text())
            require(type(reads) is dict and set(reads)=={'observed_at','sources'} and type(reads['observed_at']) in (int,float) and 0<=time.time()-reads['observed_at']<=10 and reads['observed_at']<=time.time()+1,'current factual-source readback is stale')
            intake=OwnerIntake(cfg['intake_db'],owner_address=runtime['from_address'])
            return validate_owner_factual_answer(intake,None,r,authenticated_actor=actor_id,grant=grant,runtime_identity=runtime,current_readbacks=reads['sources'])
    g=Gateway(load,None,None,owner_context_guard=owner_guard,effect_owner_id=owner_backend['ownerId'] if owner_backend else 'docs-legacy-v8')
    p=g.render(r,authenticated_actor=actor)
    require(g.render(r,authenticated_actor=actor)==p,'render changed during validation')
    args=gmail_arguments(p)
    b={k:r[k] for k in ('message_id','producer_id','department','authority_id','recipient_policy_id','matter_id','source_ids','thread_id')}
    b.update(request_hash=p.request_hash,registry_hash=sha(baseline),actor_id=actor,arguments_sha256=sha(args),html_sha256=V3_PIN,text_sha256=TEXT_PIN)
    if p.owner_context_sha256 is not None:b['owner_context_sha256']=p.owner_context_sha256
    if reply_context(p) is not None:b['reply_context']=reply_context(p)
    return {'attempt_token':secrets.token_hex(32),'binding':b,'arguments':args,'arguments_sha256':sha(args),'invoke_before':time.time()+10}

def receipt_value(result):
    require(type(result) is dict and result.get('isError') is not True,'provider error; retain uncertain')
    data=result.get('structuredContent');require(type(data) is dict,'structured Gmail receipt required')
    if 'result' in data:data=data['result']
    require(type(data) is dict,'structured Gmail receipt required')
    ident(data.get('id'));thread=data.get('thread_id');require(thread is None or type(thread) is str,'provider thread type')
    return {'id':data['id'],'thread_id':thread,'result_sha256':sha(result)}

def plan(inp):
    config=inp['config'];rev,text,end,ledger=snapshot(inp['document'],config)
    op=inp['operation']
    if op=='verify':
        require(text==inp['expected_text'],'Docs write readback mismatch; do not send')
        return {'verified':True}
    key=inp['message_id'];ident(key)
    record=ledger['entries'].get(key)
    if op=='inspect':return {'record':record,'revision':rev}
    if op=='authorize_dispatch':
        c=inp['candidate'];require(type(c) is dict and set(c)=={'attempt_token','binding','arguments','arguments_sha256','invoke_before'},'exact fresh dispatch candidate required')
        validate_binding(c['binding'])
        require(type(c['attempt_token']) is str and re.fullmatch('[0-9a-f]{64}',c['attempt_token']),'dispatch attempt token')
        require(c['binding']['message_id']==key and record is not None and record['state']=='uncertain','dispatch requires exact uncertain durable claim')
        require(record['attempt_token']==c['attempt_token'] and record['binding']==c['binding'],'dispatch claim/token/binding mismatch')
        require('owner_context_sha256' in c['binding'],'BO-01 late dispatch requires current owner gate')
        require(sha(c['arguments'])==c['arguments_sha256']==c['binding']['arguments_sha256'],'fresh dispatch argument binding mismatch')
        require(type(c['invoke_before']) in (int,float) and time.time()<=c['invoke_before'],'fresh dispatch candidate expired')
        require(config['ownerId'] and c['binding']['actor_id'],'effect owner/actor binding missing')
        return {'authorized':True,'message_id':key,'attempt_token':c['attempt_token'],'arguments_sha256':c['arguments_sha256'],'owner_context_sha256':c['binding']['owner_context_sha256']}
    updated=copy.deepcopy(ledger)
    if op=='legacy_tombstone':
        tombstone=inp['tombstone'];validate_tombstone(key,tombstone)
        if record is not None:
            require(record==tombstone,'existing history/tombstone cannot be overwritten')
            return {'record':record,'already_recorded':True}
        require(len(ledger['entries'])<1000,'ledger full; no pruning or fallback')
        updated['entries'][key]=copy.deepcopy(tombstone)
    elif op=='settle_no_send':
        require(record is not None and record['state']!='legacy_no_retry','no durable claim to settle')
        c=inp['candidate'];validate_binding(c['binding']);require(c['binding']['message_id']==key and c['attempt_token']==record['attempt_token'] and c['binding']==record['binding'],'attempt/source/registry binding mismatch')
        e=inp['evidence'];validate_no_send_evidence(key,record['attempt_token'],record['binding'],e,config['ownerId'])
        if record['state']=='no_retry':
            require(record.get('settlement')==e,'conflicting immutable terminal settlement')
            return {'record':record,'already_recorded':True}
        require(record['state'] in ('claimed','prepared') and record['receipt'] is None and e['claim_state']==record['state'],'only exact claimed/prepared state can be settled')
        updated['entries'][key]['state']='no_retry';updated['entries'][key]['settlement']=e
    else:
        require(record is None or record['state']!='legacy_no_retry','legacy NO_RETRY tombstone cannot be promoted or mutated')
        c=inp['candidate'];validate_binding(c['binding']);require(c['binding']['message_id']==key,'candidate key mismatch')
        require(type(c['attempt_token']) is str and re.fullmatch('[0-9a-f]{64}',c['attempt_token']),'candidate token')
    if op=='legacy_tombstone':
        pass
    elif op=='settle_no_send':
        pass
    elif op=='claim':
        require(record is None,'duplicate/conflicting durable message ID; no send')
        require(len(ledger['entries'])<1000,'ledger full; no pruning or fallback')
        updated['entries'][key]={'attempt_token':c['attempt_token'],'binding':c['binding'],'state':'claimed','receipt':None}
    else:
        require(record is not None and record['attempt_token']==c['attempt_token'] and record['binding']==c['binding'],'attempt/source/registry binding mismatch')
        if op=='receipt':
            value=receipt_value(inp['provider_result'])
            if 'reply_context' in record['binding']:
                require(value['thread_id']==record['binding']['reply_context']['observed_gmail_thread_id'],'Gmail reply thread mismatch; retain uncertain')
            if record['state']=='sent':
                require(record['receipt']==value,'receipt mismatch; sent record immutable')
                return {'record':record,'already_recorded':True}
            require(record['state']=='uncertain','only uncertain may record a receipt')
            updated['entries'][key]['state']='sent';updated['entries'][key]['receipt']=value
        else:
            require(op in ('prepared','uncertain'),'unsupported transition')
            require(record['state']=={'prepared':'claimed','uncertain':'prepared'}[op],'invalid transition')
            updated['entries'][key]['state']=op
    validate_ledger(updated,config['ownerId']);newtext=canonical(updated)+'\n'
    require(len(newtext)<=1000000,'ledger capacity exceeded')
    batch={'document_id':config['documentId'],'write_control':{'requiredRevisionId':rev},'requests':[
        {'deleteContentRange':{'range':{'startIndex':1,'endIndex':end-1,'tabId':config['tabId']}}},
        {'insertText':{'location':{'index':1,'tabId':config['tabId']},'text':newtext[:-1]}}]}
    return {'batch':batch,'expected_text':newtext,'record':updated['entries'][key]}

def main():
    p=argparse.ArgumentParser();p.add_argument('operation',choices=['candidate','plan']);p.add_argument('--registry');p.add_argument('--request');p.add_argument('--actor');p.add_argument('--owner-context');p.add_argument('--owner-backend-json');p.add_argument('--active-connector-json');a=p.parse_args()
    out=candidate(a.registry,a.request,a.actor,a.owner_context,strict_json_loads(a.owner_backend_json) if a.owner_backend_json else None,strict_json_loads(a.active_connector_json) if a.active_connector_json else None) if a.operation=='candidate' else plan(strict_json_loads(sys.stdin.read()))
    print(canonical(out))
if __name__=='__main__':
    try:main()
    except Exception as e:print(canonical({'status':'NO_SEND_OR_UNCERTAIN','error':str(e)}),file=sys.stderr);sys.exit(1)

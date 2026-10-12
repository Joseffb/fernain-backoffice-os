"""Finance-only Docs CAS reservation planner. No transport, network, or accounting writer.
Strict native parser extracted unchanged from reviewed outbound v8; metadata schema is
Finance-specific. An accepted CAS/readback coordinates participating bridge callers;
it is not an ACL, provider exactly-once transaction or permission to execute effects.
"""
import argparse, copy, hashlib, json, re, secrets, sys
FORMAT = "FERNAIN_FINANCE_RESERVATIONS_V1"
VERSION = "finance-reservation-v1"
class NoSend(ValueError): pass
Held = NoSend
def require(ok, reason):
    if not ok: raise Held(reason)
def ident(s):
    require(type(s) is str and bool(re.fullmatch(r"[A-Za-z0-9_.:@-]{1,200}",s)), "invalid identifier")
    return s
def request_id(s):
    require(type(s) is str and 0<len(s)<=1024 and not any(ord(c)<33 or ord(c)==127 for c in s), "invalid request ID")
    require(bool(re.fullmatch(r"[A-Za-z0-9_.:@-]{1,200}",s)) or bool(re.fullmatch(r"https://(?:drive\.google\.com/file/d|docs\.google\.com/document/d)/[A-Za-z0-9_-]+/(?:view|edit)(?:\?usp=[A-Za-z0-9_-]+)?",s)), "unrecognized request ID")
    return s
def exact_object(x, fields, label):
    require(type(x) is dict and set(x)==fields, label+" fields/types")
def canonical(x): return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False)
def strict_json_loads(s):
    def pairs(items):
        d={}
        for k,v in items:
            require(k not in d,"duplicate JSON key")
            d[k]=v
        return d
    return json.loads(s,object_pairs_hook=pairs,parse_constant=lambda x: (_ for _ in ()).throw(Held("nonfinite JSON")))
def sha(x): return hashlib.sha256(canonical(x).encode()).hexdigest()
def digest(s): require(type(s) is str and bool(re.fullmatch(r"[0-9a-f]{64}",s)), "invalid hash")
BINDING_FIELDS={"request_id","matter_id","source_id","source_version","source_sha256","policy_sha256","guide_sha256","consumer_id","output_parent_id","queue_id","operation"}
def validate_binding(b):
    exact_object(b,BINDING_FIELDS,"binding")
    for k in BINDING_FIELDS-{ "source_sha256","policy_sha256","guide_sha256","request_id" }: ident(b[k])
    request_id(b["request_id"])
    for k in ("source_sha256","policy_sha256","guide_sha256"): digest(b[k])
    require(b["operation"] in {"review_staging","clarification_staging","reservation_probe"},"unapproved effect class")
def action_key(b):
    validate_binding(b)
    return sha({k:b[k] for k in ("source_id","source_version","consumer_id","operation")})
def validate_ledger(x,owner):
    exact_object(x,{"format","owner_id","active_key","entries"},"reservation store")
    require(x["format"]==FORMAT and x["owner_id"]==owner,"wrong reservation store")
    require(type(x["entries"]) is dict and len(x["entries"])<=1000,"capacity/schema")
    active=[]
    for k,r in x["entries"].items():
        digest(k)
        fields={"binding","token","state","output","queue_receipt","cancel_reason"}
        require(type(r) is dict and fields<=set(r)<=fields|{"attempt_history","rejected_upload_retry"},"record fields/types")
        if "rejected_upload_retry" in r:
            retry=r["rejected_upload_retry"]
            exact_object(retry,{"evidence_sha256","decision_sha256","payload_sha256","retry_invocation_id","authority_id"},"rejected upload retry")
            for field in ("evidence_sha256","decision_sha256","payload_sha256","retry_invocation_id"):digest(retry[field])
            ident(retry["authority_id"])
            require(r["state"] in {"effect_uncertain","effect_confirmed","closed"},"retry receipt cannot reset claim")
            if r["output"] is not None:require(r["output"].get("content_sha256")==retry["payload_sha256"],"retry output payload changed")
        if "attempt_history" in r:
            require(type(r["attempt_history"]) is list and 0<len(r["attempt_history"])<=20,"attempt history bounds")
            seen=set()
            for h in r["attempt_history"]:
                exact_object(h,{"prior_token","reason","evidence_sha256"},"attempt history")
                digest(h["prior_token"]);ident(h["reason"]);digest(h["evidence_sha256"])
                require(h["prior_token"] not in seen and h["prior_token"]!=r["token"],"attempt token reuse")
                seen.add(h["prior_token"])
        validate_binding(r["binding"]);require(k==action_key(r["binding"]),"action key mismatch")
        digest(r["token"]);require(r["binding"]["consumer_id"]==owner,"consumer mismatch")
        require(r["state"] in {"claimed","effect_uncertain","effect_confirmed","closed","cancelled_before_effect"},"bad state")
        if r["state"] in {"claimed","effect_uncertain","effect_confirmed"}: active.append(k)
        if r["state"] in {"effect_confirmed","closed"}:
            exact_object(r["output"],{"id","parent_id","content_sha256"},"output")
            ident(r["output"]["id"]);ident(r["output"]["parent_id"]);digest(r["output"]["content_sha256"])
            require(r["output"]["parent_id"]==r["binding"]["output_parent_id"],"output parent mismatch")
        else: require(r["output"] is None,"premature output")
        if r["state"]=="closed":
            exact_object(r["queue_receipt"],{"row_key","output_id","values_sha256"},"queue receipt")
            request_id(r["queue_receipt"]["row_key"]);ident(r["queue_receipt"]["output_id"]);digest(r["queue_receipt"]["values_sha256"])
            require(r["queue_receipt"]["row_key"]==r["binding"]["request_id"] and r["queue_receipt"]["output_id"]==r["output"]["id"],"queue binding mismatch")
        else: require(r["queue_receipt"] is None,"premature queue receipt")
        if r["state"]=="cancelled_before_effect": ident(r["cancel_reason"])
        else: require(r["cancel_reason"] is None,"invalid cancellation")
    require(len(active)<=1,"multiple active Finance owners")
    require(x["active_key"]==(active[0] if active else None),"active owner mismatch")

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
    native_object(t,FLAT_TAB,{'dropdownDefinitions'},'flattened tab')
    require(t.get('dropdownDefinitions') is None,'flattened dropdown content forbidden')
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


def plan(inp):
    config=inp["config"];rev,text,end,store=snapshot(inp["document"],config)
    op=inp["operation"]
    if op=="verify":
        require(text==inp["expected_text"],"CAS readback mismatch; stop")
        return {"verified":True,"revision":rev}
    if op=="inspect": return {"store":store,"revision":rev}
    b=inp["binding"];validate_binding(b);key=action_key(b);token=inp["token"];digest(token)
    require(b["consumer_id"]==config["ownerId"],"unregistered consumer")
    updated=copy.deepcopy(store);r=updated["entries"].get(key)
    if op=="claim":
        require(r is None,"existing logical action; inspect, never replay")
        require(store["active_key"] is None,"another Finance action owns the writer lane")
        require(len(updated["entries"])<1000,"reservation capacity; no pruning")
        r={"binding":b,"token":token,"state":"claimed","output":None,"queue_receipt":None,"cancel_reason":None}
        updated["entries"][key]=r;updated["active_key"]=key
    else:
        require(r is not None and r["binding"]==b and r["token"]==token,"claim/binding mismatch")
        if op=="resume_claimed":
            require(r["state"]=="claimed" and store["active_key"]==key,"only pre-effect claim may resume")
            new_token=inp["new_token"];digest(new_token)
            require(new_token!=r["token"] and all(h["prior_token"]!=new_token for h in r.get("attempt_history",[])),"attempt token reused")
            recovery=inp["recovery"];exact_object(recovery,{"reason","evidence_sha256"},"recovery")
            ident(recovery["reason"]);digest(recovery["evidence_sha256"])
            r.setdefault("attempt_history",[]).append({"prior_token":r["token"],**recovery})
            r["token"]=new_token
        elif op=="mark_uncertain":
            require(b["operation"]!="reservation_probe","probe cannot execute effects")
            require(r["state"]=="claimed" and store["active_key"]==key,"invalid effect admission")
            r["state"]="effect_uncertain"
        elif op=="consume_rejected_upload_retry":
            require(b["operation"]=="clarification_staging","retry limited to clarification")
            require(r["state"]=="effect_uncertain" and store["active_key"]==key,"only original uncertain claim")
            require("rejected_upload_retry" not in r,"retry already consumed; reconcile only")
            from finance_rejected_upload_recovery import validate_recovery
            r["rejected_upload_retry"]=validate_recovery(b,token,config,inp["evidence"],inp["decision"],inp["trusted_recovery"])
        elif op=="confirm_effect":
            value=inp["output"]
            if r["state"] in {"effect_confirmed","closed"}:
                require(r["output"]==value,"receipt conflict")
                return {"record":r,"already_recorded":True,"action_key":key}
            require(r["state"]=="effect_uncertain" and store["active_key"]==key,"cannot infer an effect")
            r["state"]="effect_confirmed";r["output"]=value
        elif op=="close":
            value=inp["queue_receipt"]
            if r["state"]=="closed":
                require(r["queue_receipt"]==value,"terminal record immutable")
                return {"record":r,"already_recorded":True,"action_key":key}
            require(r["state"]=="effect_confirmed" and store["active_key"]==key,"unconfirmed effect remains held")
            r["state"]="closed";r["queue_receipt"]=value;updated["active_key"]=None
        elif op=="cancel_before_effect":
            require(r["state"]=="claimed" and store["active_key"]==key,"uncertain/confirmed effect cannot be cancelled")
            ident(inp["reason"]);r["state"]="cancelled_before_effect";r["cancel_reason"]=inp["reason"];updated["active_key"]=None
        else: raise Held("unsupported transition")
    validate_ledger(updated,config["ownerId"]);newtext=canonical(updated)+"\n"
    require(len(newtext)<=1000000,"capacity; no replacement store")
    return {"version":VERSION,"action_key":key,"record":r,"expected_text":newtext,"batch":{"document_id":config["documentId"],"write_control":{"requiredRevisionId":rev},"requests":[{"deleteContentRange":{"range":{"startIndex":1,"endIndex":end-1,"tabId":config["tabId"]}}},{"insertText":{"location":{"index":1,"tabId":config["tabId"]},"text":newtext[:-1]}}]}}
if __name__=="__main__":
    try: print(canonical(plan(strict_json_loads(sys.stdin.read()))))
    except Exception as e: print(canonical({"status":"HELD_OR_UNCERTAIN","error":str(e)}),file=sys.stderr);sys.exit(1)

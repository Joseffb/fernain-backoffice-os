"""Read-only validation for one frozen parent-admitted manual Legal invocation."""
from pathlib import Path
from datetime import datetime, timezone
import json,sys,base64,hashlib
from host.legal_docs_claim import canonical,sha,Held,require
R=Path(__file__).resolve().parent
FILES={'admission':'manual-admission.active.private.json','evidence':'evidence-reader.proposed.private.json','visibility':'manual-visibility.active.private.json','source_pins':'manual-source-pins.private.json','policy':'manual-policy.active.private.json'}
def load(kind,pins):
 p=R/FILES[kind];x=json.loads(p.read_text());require(sha(x)==pins[kind],'frozen manual '+kind+' changed');return x
def checks(x):
 kind=x['kind'];pins=x['pins']
 require(type(pins) is dict and set(pins)==set(FILES)|{'valid_until'},'exact manual pins required')
 until=datetime.fromisoformat(pins['valid_until'].replace('Z','+00:00'));require(datetime.now(timezone.utc)<until,'manual acceptance window expired')
 policy=load('policy',pins);require(policy['state']=='ADMITTED_ONE_MANUAL_ACCEPTANCE','manual policy not admitted')
 if kind=='load':
  value=load(x['file_kind'],pins)
  if x['file_kind']=='admission':
   a=value['admission'];require(a['policy_sha256']==pins['policy'],'manual admission/policy mismatch')
   require(a['permitted_source_ids']==policy['permitted_source_ids'],'manual admission source scope mismatch')
   sources=load('source_pins',pins);guide=sources.get('drive:'+policy['read_guidance_id'],{})
   require(a['guide_sha256']==policy['guide_raw_sha256']==guide.get('sha256'),'manual guide hash mismatch')
  if x['file_kind']=='source_pins':require(set(value)==set(policy['permitted_source_ids'])|{'drive:'+policy['read_guidance_id']},'manual source scope mismatch')
  return value
 if kind=='verify_sources':
  expected=load('source_pins',pins);actual=x['sources'];require(set(actual)==set(expected),'source observation set changed')
  for source_id,pin in expected.items():
   raw=actual[source_id];require(type(raw) is dict and not raw.get('isError') and type(raw.get('structuredContent')) is dict,'source read failed')
   d=raw['structuredContent']
   if pin['kind']=='gmail_raw':
    require(d.get('id')==source_id[6:],'Gmail evidence identity');b=base64.b64decode(d['raw']+'='*(-len(d['raw'])%4),altchars=b'-_',validate=True)
   elif pin['kind']=='github_comment':
    obj=json.loads(d['content']);require(obj['html_url']==source_id and obj['id']==pin['comment_id'] and obj['updated_at']==pin['updated_at'],'comment identity/version drift');b=obj['body'].encode()
   elif pin['kind']=='drive_readable':
    require(d.get('id')==source_id[6:] and d.get('drive_id')=='{{CONFIGURE_GOOGLE_ID_008}}','Drive evidence identity');b=d['content'].encode()
   elif pin['kind']=='guide_raw':
    require(d.get('id')==source_id[6:] and d.get('mime_type')=='text/markdown','Guide evidence identity');b=base64.b64decode(d['b64_string'],validate=True)
   else:raise Held('unrecognized exact source kind')
   require(hashlib.sha256(b).hexdigest()==pin['sha256'],'source evidence content drift: '+source_id)
  return {'sources_verified':True,'evidence':load('evidence',pins)}
 raise Held('unsupported manual reader operation')
if __name__=='__main__':
 try:print(json.dumps(checks(json.load(sys.stdin)),ensure_ascii=False))
 except Exception as e:print(json.dumps({'held':type(e).__name__,'reason':str(e)}));sys.exit(2)

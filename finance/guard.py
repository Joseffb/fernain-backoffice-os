"""Pure admission/claim/readback guards. No network, credentials or external writes."""
from urllib.parse import urlparse
import re,json,hashlib
TERMINAL={'READY_FOR_REVIEW','MISSING_DATA','EXCEPTION','REVIEWED'}
class Held(ValueError): pass
def file_id(url):
 p=urlparse(url)
 if p.scheme!='https' or p.hostname not in {'docs.google.com','drive.google.com'}: raise Held('unapproved source URL host')
 m=re.fullmatch(r'/(?:document/d|file/d)/([A-Za-z0-9_-]+)(?:/(?:edit|view))?/?',p.path)
 if not m: raise Held('unsupported or ambiguous source URL')
 return m.group(1)
def source_guard(c,m_before,m_after,body,request_id):
 a=c['authorized_acceptance']
 if c['real_invoice_admission_enabled'] or c['mode']!='exact_synthetic_connection_acceptance': raise Held('real admission not enabled by this acceptance runner')
 if request_id!=a['request_id']: raise Held('request not admitted')
 for m in (m_before,m_after):
  if m['id']!=a['source_file_id']: raise Held('source ID mismatch')
  if m['modified_time']!=a['source_modified_time']: raise Held('source version mismatch')
  if m['parent_ids']!=[c['input_folder_id']]: raise Held('source parent mismatch')
  if m['mime_type'] not in c['supported_read_paths']: raise Held('unsupported format')
 if not body or 'TEST ONLY' not in body or a['source_request_id'] not in body: raise Held('synthetic source identity not verified')
 return hashlib.sha256(body.encode()).hexdigest()
def plan(c,rows,request_id):
 if request_id!=c['authorized_acceptance']['request_id']:raise Held('request not admitted')
 matches=[(i+1,r) for i,r in enumerate(rows) if r and r[0]==request_id]
 if len(matches)>1: raise Held('duplicate request rows')
 if not matches:return {'action':'ADMIT_EXACT_ACCEPTANCE','request_id':request_id}
 i,r=matches[0];r=r+['']*(14-len(r))
 if file_id(r[1])!=c['authorized_acceptance']['source_file_id']:raise Held('queue source mismatch')
 if r[5]!=c['authorized_acceptance']['source_modified_time']:raise Held('queue version mismatch')
 if r[6] in TERMINAL:
  if r[6] in {'READY_FOR_REVIEW','MISSING_DATA','REVIEWED'} and not r[10]:raise Held('terminal output missing; reconcile')
  return {'action':'STOP_TERMINAL','row':i,'status':r[6],'output':r[10]}
 if r[6] in {'PROCESSING','UNCERTAIN'}:return {'action':'RECONCILE_ONLY','row':i,'status':r[6],'claim':r[13]}
 if r[6]!='STAGED' or r[2:4]!=['Executive','Finance'] or r[10] or str(r[11]) not in {'0','0.0'}:raise Held('row not eligible')
 return {'action':'CLAIM','row':i}
def verify_claim(c,rows,request_id,token,source_sha):
 matches=[r+['']*(14-len(r)) for r in rows if r and r[0]==request_id]
 if len(matches)!=1:raise Held('claim is not unique')
 r=matches[0]
 if file_id(r[1])!=c['authorized_acceptance']['source_file_id'] or r[5]!=c['authorized_acceptance']['source_modified_time'] or r[2:4]!=['Executive','Finance']:raise Held('claim source binding changed')
 if r[6]!='PROCESSING' or r[8]!=c['receiving_owner']:raise Held('claim state or owner changed')
 for exact in [f'consumer={c["consumer_id"]}',f'claim={token}',f'source_sha256={source_sha}']:
  if exact not in r[13].split('; '):raise Held('claim binding changed')
 if r[10]:raise Held('output already exists; reconcile')
 return True

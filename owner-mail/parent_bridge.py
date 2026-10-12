"""Parent-controlled Gmail MCP bridge; no Gmail import, credentials or live send.

arm performs revalidation and commits uncertain before releasing a one-use attempt.
Parent must invoke its connector immediately and record the real returned receipt.
"""
import argparse,hashlib,json,secrets,sys,time
from pathlib import Path
from boundary import Gateway,SQLiteState,Rendered,require,NoSend,strict_json_loads,PERSONAL_FOOTER_RECIPIENT,RECIPIENT

TOOL='mcp__codex_apps__gmail_send_email'

def gmail_arguments(payload: Rendered):
    require(type(payload) is Rendered,'validated immutable Rendered required')
    # No caller-controlled addresses, MIME, headers, sender or reply context.
    args={'to':payload.to,'reply_to':payload.reply_to,'subject':payload.subject,
            'payload':{'mime_type':'multipart/alternative','parts':[
                {'mime_type':'text/plain','charset':'UTF-8','body':{'content':payload.text}},
                {'mime_type':'text/html','charset':'UTF-8','body':{'content':payload.html}}]},
            'response_fields':['id','thread_id']}
    if payload.reply_message_id is not None:
        require(payload.observed_gmail_thread_id is not None and payload.reply_anchor_hash is not None,'incomplete validated reply context')
        args['reply_message_id']=payload.reply_message_id
    else:require(payload.observed_gmail_thread_id is None and payload.reply_anchor_hash is None,'conflicting validated reply context')
    if payload.owner_context_sha256 is not None:
        require(payload.to==RECIPIENT and payload.reply_to=='executive-team@example.com','BO-01 transport envelope mismatch')
        args['from_address']=RECIPIENT
    if payload.to==PERSONAL_FOOTER_RECIPIENT:
        args['from_address']=RECIPIENT  # fixed reviewed test sender, never caller input
    return args

def reply_context(payload):
    if payload.reply_message_id is None:return None
    return {'reply_message_id':payload.reply_message_id,'observed_gmail_thread_id':payload.observed_gmail_thread_id,'anchor_sha256':payload.reply_anchor_hash}

def canonical(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True)
def sha(value): return hashlib.sha256(canonical(value).encode()).hexdigest()

def ensure_sendable_request(request):
    require(type(request) is dict, 'structured request required')
    require(request.get('message_id')!='20261002-NEGATIVE'
            and not (type(request.get('paragraphs')) is list and 'Offline negative-test rendering only. No email was sent.' in request['paragraphs']),
            'negative fixture is render-only; never arm it for Gmail')

class ParentBridge:
    def __init__(self,gateway):
        self.g=gateway
        self.db=gateway.state.db
        self.db.execute('CREATE TABLE IF NOT EXISTS mcp_attempts (token TEXT PRIMARY KEY, message_id TEXT UNIQUE, request_hash TEXT, args_hash TEXT, args TEXT, armed_at REAL, result TEXT, owner_context_sha256 TEXT)')
        columns={r[1] for r in self.db.execute('PRAGMA table_info(mcp_attempts)')}
        if 'reply_context' not in columns:self.db.execute('ALTER TABLE mcp_attempts ADD COLUMN reply_context TEXT')
        if 'owner_context_sha256' not in columns:self.db.execute('ALTER TABLE mcp_attempts ADD COLUMN owner_context_sha256 TEXT')
        self.db.commit()
    def arm(self,request,*,authenticated_actor):
        # Parent calls immediately before MCP invocation. No producer receives this output.
        ensure_sendable_request(request)
        p=self.g.prepare_attempt(request,authenticated_actor=authenticated_actor)
        args=gmail_arguments(p); token=secrets.token_hex(32); armed_at=time.time()
        with self.db:
            self.db.execute('INSERT INTO mcp_attempts (token,message_id,request_hash,args_hash,args,armed_at,result,reply_context,owner_context_sha256) VALUES (?,?,?,?,?,?,NULL,?,?)',
                            (token,p.message_id,p.request_hash,sha(args),canonical(args),armed_at,canonical(reply_context(p)) if reply_context(p) else None,p.owner_context_sha256))
        return {'tool':TOOL,'arguments':args,'arguments_sha256':sha(args),'attempt_token':token,
                'message_id':p.message_id,'request_hash':p.request_hash,'armed_at':armed_at,
                'invoke_before':armed_at+10,'state':'uncertain','owner_context_sha256':p.owner_context_sha256}
    def revalidate(self,attempt,request,*,authenticated_actor):
        """Read-only pre-dispatch check; re-runs owner gate and exact rendering."""
        require(type(attempt) is dict and type(attempt.get('attempt_token')) is str,'parent attempt required')
        row=self.db.execute('SELECT message_id,request_hash,args_hash,args,armed_at,result,owner_context_sha256 FROM mcp_attempts WHERE token=?',(attempt['attempt_token'],)).fetchone()
        require(row is not None and row[5] is None and time.time()<=float(row[4])+10,'attempt missing, expired or completed')
        fresh=self.g.render(request,authenticated_actor=authenticated_actor)
        args=gmail_arguments(fresh)
        require(row[0]==fresh.message_id and row[1]==fresh.request_hash and row[2]==sha(args) and row[3]==canonical(args),'request or argument binding changed')
        require(row[6]==fresh.owner_context_sha256 and attempt.get('owner_context_sha256')==fresh.owner_context_sha256,'owner policy/source context changed; retain uncertain')
        require(self.g.state.status(fresh.message_id)==('uncertain',None),'durable effect claim changed')
        return {'authorized':True,'arguments_sha256':row[2],'owner_context_sha256':row[6]}
    def record_receipt(self,token,result):
        row=self.db.execute('SELECT message_id,request_hash,args_hash,result,reply_context FROM mcp_attempts WHERE token=?',(token,)).fetchone()
        require(row is not None,'unknown attempt')
        require(type(result) is dict and result.get('isError') is not True,'provider error; keep uncertain')
        data=result.get('structuredContent')
        if type(data) is dict and 'result' in data: data=data['result']
        require(type(data) is dict,'structured Gmail receipt missing; keep uncertain')
        if row[4] is not None:
            context=strict_json_loads(row[4])
            require(data.get('thread_id')==context['observed_gmail_thread_id'],'Gmail reply thread mismatch; retain uncertain')
        receipt=data.get('id')
        require(type(receipt) is str and bool(receipt.strip()) and len(receipt)<=500,'provider message id missing; keep uncertain')
        if row[3] is not None:
            require(row[3]==canonical(result),'conflicting provider result; original receipt immutable')
            state=self.db.execute('SELECT state,receipt FROM requests WHERE id=? AND digest=?',(row[0],row[1])).fetchone()
            require(state==('sent',receipt),'stored attempt/receipt state conflict')
            return {'state':'sent','message_id':row[0],'receipt':receipt,'arguments_sha256':row[2],'already_recorded':True}
        # Atomic receipt + request transition; a failed commit leaves uncertain.
        with self.db:
            c=self.db.execute("UPDATE requests SET state='sent',receipt=? WHERE id=? AND digest=? AND state='uncertain'",(receipt,row[0],row[1]))
            require(c.rowcount==1,'attempt state mismatch')
            c=self.db.execute('UPDATE mcp_attempts SET result=? WHERE token=? AND result IS NULL',(canonical(result),token))
            require(c.rowcount==1,'receipt race')
        return {'state':'sent','message_id':row[0],'receipt':receipt,'arguments_sha256':row[2]}
    def dispatch(self,request,*,authenticated_actor,parent_call):
        attempt=self.arm(request,authenticated_actor=authenticated_actor)
        require(time.time()<=attempt['invoke_before'],'attempt expired; keep uncertain')
        # Synchronous parent callback integration for supported hosts and fake tests.
        result=parent_call(attempt['tool'],attempt['arguments'])
        return self.record_receipt(attempt['attempt_token'],result)

class Unavailable:
    def send(self,payload): raise NoSend('use parent-controlled MCP bridge')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('operation',choices=['arm','receipt','status'])
    parser.add_argument('--db',required=True)
    parser.add_argument('--registry')
    parser.add_argument('--request')
    parser.add_argument('--actor')
    parser.add_argument('--message-id')
    args=parser.parse_args()
    state=SQLiteState(args.db)
    loader=lambda:strict_json_loads(Path(args.registry).read_text())
    gateway=Gateway(loader,state,Unavailable())
    bridge=ParentBridge(gateway)
    if args.operation=='arm':
        require(args.registry and args.request and args.actor,'parent registry/request/actor required')
        result=bridge.arm(strict_json_loads(Path(args.request).read_text()),authenticated_actor=args.actor)
    elif args.operation=='receipt':
        inp=json.load(sys.stdin); require(set(inp)=={'attempt_token','result'},'unexpected receipt input')
        result=bridge.record_receipt(inp['attempt_token'],inp['result'])
    else: result={'message_id':args.message_id,'status':state.status(args.message_id)}
    print(canonical(result)); state.db.close()

if __name__=='__main__':
    try: main()
    except Exception as e:
        print(canonical({'status':'NO_SEND_OR_UNCERTAIN','error':str(e)}),file=sys.stderr)
        sys.exit(1)

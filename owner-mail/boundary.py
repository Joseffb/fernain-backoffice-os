"""Parent-owned AGENTIC boundary. stdlib only; no network or Gmail implementation."""
from dataclasses import dataclass
from email.message import EmailMessage
from email import policy
from html import escape
from html.parser import HTMLParser
import copy, hashlib, json, math, re, sqlite3, time, secrets
from pathlib import Path
from typing import Protocol

PIN = '0000000000000000000000000000000000000000000000000000000000000000'
# v2 PIN is archival provenance only; all runtime rendering uses verified v3.
V3_PIN = '0000000000000000000000000000000000000000000000000000000000000000'
TEXT_PIN = '0000000000000000000000000000000000000000000000000000000000000000'
RECIPIENT = 'operator@example.com'
EXECUTIVE_RECIPIENT = 'executive-team@example.com'
EXECUTIVE_POLICY = 'executive-team-internal'
PERSONAL_FOOTER_POLICY = 'owner-personal-footer-test'
PERSONAL_FOOTER_RECIPIENT = 'operator-personal@example.net'
PERSONAL_FOOTER_SUBJECT = 'Backoffice external footer verification'
REPLY = {d: d.lower() + '-team@example.com' for d in ('Executive','Engineering','Finance','Sales','Fundraising','Marketing')}
FIELDS = frozenset(('message_id','producer_id','department','authority_id','recipient_policy_id','subject','title','paragraphs','matter_id','source_ids','thread_id'))
DISCLOSURE = "AI-Generated Communication"
LIMITS = 'Informational communication only. No external action, commitment, approval, or cross-department data access is authorized by this email.'

class NoSend(ValueError): pass

def require(ok, reason):
    if not ok: raise NoSend(reason)

def plain(s, maxlen=10000):
    require(type(s) is str and bool(s.strip()) and len(s)<=maxlen, 'missing/invalid plain text')
    require(not any(ord(c)<32 or ord(c)==127 for c in s), 'control/header injection')
    require(not re.search(r'<[^>]*>|https?://|\{\{|\}\}', s, re.I), 'raw markup/URL/token forbidden')
    return s

def ident(s):
    plain(s,200)
    require(bool(re.fullmatch(r'[A-Za-z0-9_.:@-]+',s)), 'invalid identifier')
    return s

# Exact registry schema: no coercion, substring membership, unknown fields or NaN.
REGISTRY_FIELDS = {'producers','authorities','matters','recipient_policies'}
PRODUCER_FIELDS = {'actor_id','agent_name','communication_class','enabled','expires_at',
                   'department','authority_ids','recipient_policy_id'}
AUTHORITY_FIELDS = {'enabled','expires_at','producer_id','department','recipient_policy_id',
                    'matter_ids','source_ids','actions'}
MATTER_FIELDS = {'enabled','department','producer_ids','thread_id','source_ids',
                 'required_action','approved_request_hashes'}
DEPARTMENTS = frozenset((*REPLY, 'Legal'))
CLASSES = frozenset(('AGENTIC','HUMAN_DIRECTED_AUTOMATION'))
ACTIONS = frozenset(('informational_reply',))

def exact_object(value, fields, label):
    require(type(value) is dict and set(value)==fields, 'registry '+label+' fields/types')

def exact_array(value, validate_element, label):
    require(type(value) is list and len(value)<=10000, 'registry '+label+' must be an array')
    for element in value: validate_element(element)
    require(len(set(value))==len(value),'registry '+label+' duplicate elements')

def expiry(value):
    # Reject bool (a Python int subclass), nonnumbers, nonfinite values and timestamps
    # outside the supported nonnegative Unix range through year 9999.
    require(type(value) in (int,float) and 0<=value<=253402300799
            and math.isfinite(value), 'registry expiry must be finite Unix seconds')

def enum(value, allowed, label):
    require(type(value) is str and value in allowed, 'registry unsupported '+label)

def request_hash(value):
    require(type(value) is str and re.fullmatch(r'[0-9a-f]{64}',value) is not None,
            'registry approved request hash must be exact lowercase SHA-256')

def strict_json_loads(text):
    def object_pairs(pairs):
        out={}
        for key,value in pairs:
            require(key not in out,'duplicate JSON object key')
            out[key]=value
        return out
    def constant(value):
        raise NoSend('nonfinite JSON numeric constant')
    return json.loads(text,object_pairs_hook=object_pairs,parse_constant=constant)

REPLY_ANCHOR_FIELDS={'reply_message_id','observed_gmail_thread_id','matter_id','original_thread_id','original_source_ids','department','producer_id','authority_id','recipient_policy_id','approved_request_hashes','verified_at','expires_at','enabled'}

def validate_reply_anchor(anchor):
    exact_object(anchor,REPLY_ANCHOR_FIELDS,'reply anchor')
    for key in REPLY_ANCHOR_FIELDS-{'original_source_ids','approved_request_hashes','verified_at','expires_at','enabled','department'}:ident(anchor[key])
    enum(anchor['department'],DEPARTMENTS,'reply-anchor department')
    exact_array(anchor['original_source_ids'],ident,'reply-anchor original sources')
    require(bool(anchor['original_source_ids']),'reply-anchor original sources missing')
    exact_array(anchor['approved_request_hashes'],request_hash,'reply-anchor request approvals')
    expiry(anchor['verified_at']);expiry(anchor['expires_at'])
    require(anchor['verified_at']<anchor['expires_at'],'reply-anchor verification/expiry conflict')
    require(type(anchor['enabled']) is bool,'reply-anchor enabled must be boolean')

def validate_registry(reg):
    exact_object(reg,REGISTRY_FIELDS,'root')
    for bucket in REGISTRY_FIELDS:
        require(type(reg[bucket]) is dict, 'registry '+bucket+' must be an object')
        for key in reg[bucket]: ident(key)
    for p in reg['producers'].values():
        require(type(p) is dict and set(p) in (PRODUCER_FIELDS,PRODUCER_FIELDS|{'owner_answer_policy_id'}),'registry producer fields/types')
        if 'owner_answer_policy_id' in p: ident(p['owner_answer_policy_id'])
        ident(p['actor_id']); plain(p['agent_name'],200)
        enum(p['communication_class'],CLASSES,'communication class')
        enum(p['department'],DEPARTMENTS,'department')
        require(p['communication_class']!='HUMAN_DIRECTED_AUTOMATION' or p['department']=='Sales',
                'human-directed class restricted to Sales; this gateway still refuses it')
        require(type(p['enabled']) is bool,'registry enabled must be boolean')
        expiry(p['expires_at']); ident(p['recipient_policy_id'])
        exact_array(p['authority_ids'],ident,'authority_ids')
    for a in reg['authorities'].values():
        exact_object(a,AUTHORITY_FIELDS,'authority')
        require(type(a['enabled']) is bool,'registry enabled must be boolean')
        expiry(a['expires_at']); ident(a['producer_id']); ident(a['recipient_policy_id'])
        enum(a['department'],DEPARTMENTS,'department')
        exact_array(a['matter_ids'],ident,'matter_ids')
        exact_array(a['source_ids'],ident,'source_ids')
        exact_array(a['actions'],lambda x:enum(x,ACTIONS,'action'),'actions')
    for m in reg['matters'].values():
        require(type(m) is dict and set(m) in (MATTER_FIELDS,MATTER_FIELDS|{'reply_required','reply_anchor'}),'registry matter fields/types')
        if 'reply_anchor' in m:
            require(m['reply_required'] is True,'reply-required mode must be exactly true')
            validate_reply_anchor(m['reply_anchor'])
        require(type(m['enabled']) is bool,'registry enabled must be boolean')
        enum(m['department'],DEPARTMENTS,'department'); ident(m['thread_id'])
        enum(m['required_action'],ACTIONS,'required action')
        exact_array(m['producer_ids'],ident,'producer_ids')
        exact_array(m['source_ids'],ident,'source_ids')
        exact_array(m['approved_request_hashes'],request_hash,'approved_request_hashes')
    for policy_id,recipients in reg['recipient_policies'].items():
        expected={EXECUTIVE_POLICY:EXECUTIVE_RECIPIENT,PERSONAL_FOOTER_POLICY:PERSONAL_FOOTER_RECIPIENT}.get(policy_id,RECIPIENT)
        exact_array(recipients,lambda x:enum(x,{expected},'recipient'),'recipients')
        require(recipients==[expected],'registry recipient policy must be one exact approved recipient')
    return reg

@dataclass(frozen=True)
class Rendered:
    message_id: str
    producer_id: str
    to: str
    reply_to: str
    subject: str
    text: str
    html: str
    mime: bytes
    request_hash: str
    reply_message_id: str | None = None
    observed_gmail_thread_id: str | None = None
    reply_anchor_hash: str | None = None
    owner_context_sha256: str | None = None

class Transport(Protocol):
    def send(self, payload: Rendered) -> str: ...

class StateStore(Protocol):
    def claim(self, key: str, digest: str, owner_id=None, context_sha256=None) -> None: ...
    def prepared(self, key: str, digest: str) -> None: ...
    def uncertain(self, key: str, digest: str) -> None: ...
    def sent(self, key: str, digest: str, receipt: str) -> None: ...

class SQLiteState:
    """Atomic shared-file claim, not distributed/provider exactly-once. No retry/reset API."""
    def __init__(self, path):
        self.db=sqlite3.connect(path, timeout=10)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, digest TEXT NOT NULL, state TEXT NOT NULL, receipt TEXT, claim_id TEXT, owner_id TEXT, context_sha256 TEXT)')
        columns={r[1] for r in self.db.execute('PRAGMA table_info(requests)')}
        for name,kind in (('claim_id','TEXT'),('owner_id','TEXT'),('context_sha256','TEXT')):
            if name not in columns:self.db.execute(f'ALTER TABLE requests ADD COLUMN {name} {kind}')
        self.db.execute('CREATE TABLE IF NOT EXISTS no_send_settlements (message_id TEXT PRIMARY KEY, request_hash TEXT NOT NULL, evidence_id TEXT NOT NULL UNIQUE, evidence_sha256 TEXT NOT NULL, evidence_json TEXT NOT NULL)')
        self.db.commit()
    def claim(self,key,digest,owner_id=None,context_sha256=None):
        claim_id=secrets.token_hex(32)
        try:
            with self.db: self.db.execute('INSERT INTO requests (id,digest,state,receipt,claim_id,owner_id,context_sha256) VALUES (?,?,?,NULL,?,?,?)',(key,digest,'claimed',claim_id,owner_id,context_sha256))
        except sqlite3.IntegrityError: raise NoSend('duplicate/conflicting request; operator reconciliation required')
        return claim_id
    def _transition(self,key,digest,before,after,receipt=None):
        with self.db:
            c=self.db.execute('UPDATE requests SET state=?,receipt=? WHERE id=? AND digest=? AND state=?',(after,receipt,key,digest,before))
            require(c.rowcount==1,'invalid durable transition')
    def prepared(self,key,digest): self._transition(key,digest,'claimed','prepared')
    def uncertain(self,key,digest): self._transition(key,digest,'prepared','uncertain')
    def sent(self,key,digest,receipt): self._transition(key,digest,'uncertain','sent',receipt)
    def status(self,key): return self.db.execute('SELECT state,receipt FROM requests WHERE id=?',(key,)).fetchone()
    def settle_no_send(self,key,digest,evidence):
        """Terminal pre-send settlement. Parent/operator owns evidence authenticity."""
        fields={'evidence_id','proof_sha256','message_id','request_hash','claim_id','effect_owner_id','owner_binding_sha256','claim_state','verified_by','verified_at','provider_reconciled','audit_window_complete','transport_invocation_count','source_refs'}
        require(type(evidence) is dict and set(evidence)==fields,'exact independent no-send evidence required')
        proof={k:v for k,v in evidence.items() if k!='proof_sha256'}
        encoded=json.dumps(evidence,sort_keys=True,separators=(',',':'),ensure_ascii=True)
        require(type(evidence['proof_sha256']) is str and evidence['proof_sha256']==hashlib.sha256(json.dumps(proof,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest(),'evidence digest mismatch')
        require(evidence['message_id']==key and evidence['request_hash']==digest and type(evidence['evidence_id']) is str and bool(evidence['evidence_id'].strip()),'evidence claim binding mismatch')
        require(type(evidence['claim_id']) is str and re.fullmatch(r'[0-9a-f]{64}',evidence['claim_id']) and type(evidence['effect_owner_id']) is str and evidence['effect_owner_id'],'claim token/effect owner binding missing')
        require(evidence['owner_binding_sha256'] is None or type(evidence['owner_binding_sha256']) is str and re.fullmatch(r'[0-9a-f]{64}',evidence['owner_binding_sha256']),'owner binding digest invalid')
        require(evidence['claim_state'] in ('claimed','prepared'),'only pre-send claim may be settled')
        require(evidence['provider_reconciled'] is True and evidence['audit_window_complete'] is True and type(evidence['transport_invocation_count']) is int and evidence['transport_invocation_count']==0,'positive no-dispatch proof incomplete')
        require(type(evidence['verified_by']) is str and bool(evidence['verified_by'].strip()) and type(evidence['verified_at']) in (int,float) and math.isfinite(evidence['verified_at']) and 0<=evidence['verified_at']<=253402300799,'independent verifier evidence missing')
        require(type(evidence['source_refs']) is list and bool(evidence['source_refs']) and all(type(x) is str and bool(x.strip()) for x in evidence['source_refs']),'proof source references required')
        old=self.db.execute('SELECT request_hash,evidence_sha256,evidence_json FROM no_send_settlements WHERE message_id=?',(key,)).fetchone()
        if old:
            require(old==(digest,evidence['proof_sha256'],encoded),'conflicting immutable no-send settlement')
            return {'state':'no_retry','already_settled':True}
        with self.db:
            row=self.db.execute('SELECT state,receipt,digest,claim_id,owner_id,context_sha256 FROM requests WHERE id=?',(key,)).fetchone()
            require(row is not None and row[0]==evidence['claim_state'] and row[1] is None and row[2]==digest and row[3]==evidence['claim_id'] and row[4]==evidence['effect_owner_id'] and row[5]==evidence['owner_binding_sha256'],'claim/owner/binding not exact pre-send state')
            c=self.db.execute('UPDATE requests SET state=?,receipt=NULL WHERE id=? AND digest=? AND state=?',('no_retry',key,digest,evidence['claim_state']))
            require(c.rowcount==1,'claim settlement race; reconcile')
            self.db.execute('INSERT INTO no_send_settlements VALUES(?,?,?,?,?)',(key,digest,evidence['evidence_id'],evidence['proof_sha256'],encoded))
        return {'state':'no_retry','already_settled':False}

class Visible(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self,data): self.parts.append(data)

def digest(request):
    return hashlib.sha256(json.dumps(request,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest()


AGENTIC_IMAGES = ('https://example.com/assets/email/agentic/v1/header.png',
                  'https://example.com/assets/email/agentic/v1/robot.png')

def validate_assets(html):
    images=re.findall(r'<img\b[^>]*\bsrc="([^"]+)"',html,re.I)
    require(not re.search(r'<[^>]+class="[^"]*\b(?:footer-pad|footer-copy|qr-cell)\b',html),
            'company footer not permitted in agentic template')
    require(images==list(AGENTIC_IMAGES),'missing/unapproved image or company-logo/QR footer')

class Gateway:
    """Registry loader and actor identity belong to trusted parent, never producer input.

    Every render reloads authority to observe revocation/expiry. In-process Python
    objects are not a sandbox against code executing with gateway privileges.
    """
    def __init__(self, registry_loader, state, transport, clock=time.time, template=None, owner_context_guard=None, effect_owner_id='sqlite-parent-bridge-v8'):
        self.registry_loader=registry_loader; self.state=state; self.transport=transport; self.clock=clock; self.owner_context_guard=owner_context_guard
        self.effect_owner_id=effect_owner_id
        self.template=template or Path(__file__).with_name('canonical')/'template-v3.html'
    def render(self, request, *, authenticated_actor):
        require(type(request) is dict and set(request)==FIELDS, 'unexpected/missing input fields')
        r=json.loads(json.dumps(request))
        approval_digest=digest(r)
        for k in FIELDS-{'paragraphs','source_ids'}: plain(r[k], 200 if k not in ('subject','title') else 500)
        for k in FIELDS-{'paragraphs','source_ids','subject','title','department'}: ident(r[k])
        require(type(r['paragraphs']) is list and 0<len(r['paragraphs'])<=30,'missing body')
        for p in r['paragraphs']: plain(p)
        require(type(r['source_ids']) is list and 0<len(r['source_ids'])<=30,'missing source provenance')
        for s in r['source_ids']: ident(s)
        require(len(set(r['source_ids']))==len(r['source_ids']), 'duplicate sources')
        ident(authenticated_actor)
        reg=validate_registry(copy.deepcopy(self.registry_loader()))
        try:
            p=reg['producers'][r['producer_id']]; a=reg['authorities'][r['authority_id']]
            m=reg['matters'][r['matter_id']]; rp=reg['recipient_policies'][r['recipient_policy_id']]
        except (KeyError,TypeError): raise NoSend('unregistered producer/authority/matter/recipient policy')
        require(p['actor_id']==authenticated_actor,'forged actor identity')
        owner_context=None
        if 'owner_answer_policy_id' in p:
            require(callable(self.owner_context_guard),'BO-01 producer requires trusted owner context gate')
            owner_context=self.owner_context_guard(r,authenticated_actor,p['owner_answer_policy_id'])
            require(type(owner_context) is dict and re.fullmatch(r'[0-9a-f]{64}',owner_context.get('binding_sha256','')),'owner context gate binding missing')
            require(owner_context.get('effect_owner_id')==self.effect_owner_id,'owner grant is bound to another durable effect owner')
            anchor=m.get('reply_anchor')
            require(m.get('reply_required') is True and type(anchor) is dict and type(owner_context.get('reply_anchor')) is dict,'BO-01 producer requires a reviewed provider-thread reply anchor')
            expected=owner_context['reply_anchor']
            require(anchor['reply_message_id']==expected['reply_message_id'] and anchor['observed_gmail_thread_id']==expected['observed_gmail_thread_id'] and anchor['verified_at']==expected['verified_at'] and anchor['expires_at']==expected['expires_at'],'registry reply anchor differs from latest admitted owner context')
        require(p['communication_class']=='AGENTIC','unsupported communication class')
        require(p['enabled'] is True and a['enabled'] is True and m['enabled'] is True,'disabled authority')
        require(a['expires_at']>self.clock() and p['expires_at']>self.clock(),'expired authority')
        require(r['department'] in REPLY and r['department']==p['department']==a['department']==m['department'],'department mismatch or Legal routing unverified')
        require(r['authority_id'] in p['authority_ids'] and a['producer_id']==r['producer_id'],'forged authority')
        require(r['recipient_policy_id']==p['recipient_policy_id']==a['recipient_policy_id'], 'recipient policy mismatch')
        require(rp==[RECIPIENT] or (r['department']=='Executive' and ((rp==[EXECUTIVE_RECIPIENT] and r['recipient_policy_id']==EXECUTIVE_POLICY) or (rp==[PERSONAL_FOOTER_RECIPIENT] and r['recipient_policy_id']==PERSONAL_FOOTER_POLICY))), 'recipient scope denied')
        if r['recipient_policy_id']==PERSONAL_FOOTER_POLICY:
            require(r['subject']==PERSONAL_FOOTER_SUBJECT and 'reply_anchor' not in m and 'reply_required' not in m,'personal footer test requires exact subject and new conversation')
        recipient=rp[0]
        if owner_context is not None:
            # Bind the actual message envelope to the approved private owner
            # destination and the authenticated account's registered Reply-To.
            # A registry recipient-policy edit must not redirect an already
            # standing-approved owner answer before a durable claim is made.
            require(recipient==owner_context.get('recipient') and recipient=='operator@example.com',
                    'rendered To differs from the owner grant')
            require(REPLY[r['department']]==owner_context.get('reply_to'),
                    'rendered Reply-To differs from the owner grant')
        # External presentation strips raw internal IDs from subject, title and
        # prose, including IDs injected inside ordinary paragraphs. Binding
        # hashes and private evidence remain unchanged.
        if not recipient.lower().endswith('@example.com'):
            external_presentation=True
            private_ids=[r[k] for k in ('message_id','producer_id','authority_id','recipient_policy_id','matter_id','thread_id')]
            private_ids.extend(r['source_ids']); private_ids.extend((authenticated_actor,p['actor_id']))
            def collect_private_ids(value,key=''):
                if type(value) is dict:
                    for k,v in value.items(): collect_private_ids(v,k)
                elif type(value) is list:
                    for v in value: collect_private_ids(v,key)
                elif type(value) is str and (key.endswith('_id') or key.endswith('_ids') or key in ('actor_id','claim_key','trace_id','source_id','thread_id','reply_message_id','original_message_id')):
                    private_ids.append(value)
            collect_private_ids(reg)
            def redact(value):
                for token in sorted(set(x for x in private_ids if type(x) is str and len(x)>=3),key=len,reverse=True):
                    value=re.sub(re.escape(token),'[redacted]',value,flags=re.I)
                return value
            r['subject']=redact(r['subject']); r['title']=redact(r['title']); r['paragraphs']=[redact(x) for x in r['paragraphs']]
        else: external_presentation=False
        require(r['matter_id'] in a['matter_ids'] and r['producer_id'] in m['producer_ids'],'matter actor authority')
        require(r['thread_id']==m['thread_id'] and r['source_ids']==m['source_ids'],'original thread/source mismatch')
        require(set(r['source_ids'])<=set(a['source_ids']), 'data authority denied')
        require(m['required_action']=='informational_reply' and m['required_action'] in a['actions'],'action authority denied')
        # Exact parent-approved content binding prevents a caller using legitimate IDs
        # to smuggle a different data/action request in arbitrary prose.
        require(approval_digest in m['approved_request_hashes'],'content lacks parent actor/data/action review')
        anchor=m.get('reply_anchor')
        reply_id=reply_thread=anchor_hash=None
        if anchor is not None:
            require(anchor['enabled'] is True and anchor['verified_at']<=self.clock()<anchor['expires_at'],'reply anchor disabled/unverified/expired')
            require(anchor['matter_id']==r['matter_id'] and anchor['original_thread_id']==r['thread_id']
                    and anchor['original_source_ids']==r['source_ids'],'reply anchor original matter/source/thread conflict')
            require(all(anchor[key]==r[key] for key in ('department','producer_id','authority_id','recipient_policy_id')),'reply anchor actor/department/authority/recipient conflict')
            require(approval_digest in anchor['approved_request_hashes'],'request not approved for this reply anchor')
            reply_id=anchor['reply_message_id'];reply_thread=anchor['observed_gmail_thread_id']
            anchor_hash=digest(anchor)
        name=plain(p['agent_name'],200)
        template=self.template.read_bytes()
        require(hashlib.sha256(template).hexdigest()==V3_PIN,'canonical template hash mismatch')
        h=template.decode('utf-8')
        validate_assets(h)
        h=h.replace('  <!-- TEMPLATE ONLY: replace all {{...}} tokens before sending. Public asset URLs require hosting verification. -->\n','')
        identity=(f'Agent: {redact(name)}. Department: {r["department"]}.' if external_presentation
                  else f'Agent: {name} ({r["producer_id"]}). Department: {r["department"]}.')
        provenance=('Source references retained in the private owner record.' if external_presentation
                    else f'Matter: {r["matter_id"]}. Sources: {", ".join(r["source_ids"])}. Thread: {r["thread_id"]}.')
        body=[identity, *r['paragraphs'], provenance, LIMITS, f'Human escalation: {RECIPIENT}.']
        slots={'PREHEADER_TEXT':escape(DISCLOSURE+' — '+identity),'MESSAGE_TITLE':escape(r['title']), 'MESSAGE_BODY_HTML':''.join('<p>'+escape(s)+'</p>' for s in body),'DEPARTMENT_NAME':escape(r['department'])}
        h=re.sub(r'\{\{([A-Z_]+)\}\}',lambda match:slots.get(match[1],match[0]),h)
        text_template=Path(__file__).with_name('canonical').joinpath('template.txt').read_bytes()
        require(hashlib.sha256(text_template).hexdigest()==TEXT_PIN,'plain text template hash mismatch')
        text_slots={'MESSAGE_TITLE':r['title'],'MESSAGE_BODY_TEXT':'\n\n'.join(body),'DEPARTMENT_NAME':r['department']}
        t=re.sub(r'\{\{([A-Z_]+)\}\}',lambda match:text_slots.get(match[1],match[0]),text_template.decode('utf-8'))
        require('{{' not in t and '}}' not in t,'unresolved plain text token')
        require('{{' not in h and '}}' not in h,'unresolved template token')
        v=Visible(); v.feed(h)
        visible=' '.join(v.parts)
        require(all(s in visible and s in t for s in (DISCLOSURE,identity,LIMITS,RECIPIENT,provenance)),'missing identity/disclosure')
        require(h.startswith('<!doctype html>') and h.rstrip().endswith('</html>'),'malformed representation')
        msg=EmailMessage(policy=policy.SMTP)
        msg['To']=recipient; msg['Reply-To']=REPLY[r['department']]; msg['Subject']=r['subject']
        msg['Message-ID']='<'+hashlib.sha256(r['message_id'].encode()).hexdigest()+'@agentic.example.com>'
        msg.set_content(t); msg.add_alternative(h,subtype='html')
        msg.set_boundary('agentic_'+approval_digest)
        return Rendered(r['message_id'],r['producer_id'],recipient,REPLY[r['department']],r['subject'],t,h,msg.as_bytes(),approval_digest,reply_id,reply_thread,anchor_hash,owner_context['binding_sha256'] if owner_context else None)
    def prepare_attempt(self, request, *, authenticated_actor):
        # Snapshot before any callback to prevent caller mutation during validation.
        r=json.loads(json.dumps(request))
        payload=self.render(r,authenticated_actor=authenticated_actor)
        self.state.claim(payload.message_id,payload.request_hash,self.effect_owner_id,payload.owner_context_sha256)
        self.state.prepared(payload.message_id,payload.request_hash)
        fresh=self.render(r,authenticated_actor=authenticated_actor)
        require(fresh==payload,'authority/render changed before transport')
        # Persist uncertain BEFORE side effect. Crash or exception cannot cause blind retry.
        self.state.uncertain(payload.message_id,payload.request_hash)
        return fresh
    def dispatch(self, request, *, authenticated_actor):
        fresh=self.prepare_attempt(request,authenticated_actor=authenticated_actor)
        payload=fresh
        receipt=self.transport.send(fresh)
        require(type(receipt) is str and bool(receipt.strip()),'missing provider receipt; uncertain')
        self.state.sent(payload.message_id,payload.request_hash,receipt)
        return receipt

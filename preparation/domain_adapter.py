"""BO05/06 constrained parent-host adapter. No network, credentials, new store or trigger.
Host-owned catalog/approval/readback callbacks are trusted inputs, never model text.
All visible output must exactly match a reviewed catalogue entry and source span.
"""
import copy, hashlib, json, time

def sha(x):
    return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

class Hold(ValueError): pass

def need(ok, reason):
    if not ok: raise Hold(reason)

DESTINATIONS={
 'Marketing':('{{CONFIGURE_GOOGLE_ID_073}}','{{CONFIGURE_GOOGLE_ID_010}}'),
 'Fundraising':('{{CONFIGURE_GOOGLE_ID_018}}','{{CONFIGURE_GOOGLE_ID_013}}')}

class DomainAdapter:
    def __init__(self, *, catalog_loader, source_loader, approval_loader, shared_state,
                 provider, clock=time.time):
        self.catalog_loader=catalog_loader; self.source_loader=source_loader
        self.approval_loader=approval_loader; self.state=shared_state
        self.provider=provider; self.clock=clock

    def prepare(self, request, admitted):
        request=copy.deepcopy(request); admitted=copy.deepcopy(admitted)
        # admitted comes from the parent admission adapter, never from source prose.
        need(set(request)=={'matter_id','packet_id','segments'},'unexpected unvalidated output fields')
        need(request['matter_id']==admitted['matter_id'],'wrong canonical matter')
        c=copy.deepcopy(self.catalog_loader(request['packet_id']))
        need(c['department']==admitted['department'],'wrong department')
        need(c['matter_id']==request['matter_id'],'catalogue belongs to another matter')
        need(set(request['segments'])==set(c['segments']),'missing or extra output segments')
        need(c['valid_from']<=self.clock()<c['expires_at'] and c['enabled'],'stale/revoked catalogue')
        need(tuple(c['destination'])==DESTINATIONS[c['department']],'wrong destination')
        sources={}
        for key,segment in c['segments'].items():
            need(request['segments'][key]==segment['text'],'uncatalogued claim or altered output')
            sid=segment['source_id']
            need(sid in admitted['source_ids'],'source outside admitted allowlist')
            src=self.source_loader(sid)
            need(src['id']==sid and sha(src['content'])==segment['source_sha256'],'wrong or changed source')
            need(segment['evidence'] in src['content'],'exact source evidence absent')
            need(segment['basis'] in {'identity','proposed_copy','current_actual','historical_target'},'unreviewed basis')
            if segment['use']=='current_claim':
                need(segment['basis']=='current_actual','target/test evidence cannot become current actual')
            need(segment['text'] in segment['evidence'],'catalogue output not extractive')
            sources[sid]=segment['source_sha256']
        payload={'matter_id':c['matter_id'],'department':c['department'],
                 'destination':c['destination'],'segments':request['segments'],
                 'action':c['action'],'recipient':c['recipient'],'classification':c['classification'],
                 'terms_hash':c['terms_hash'],'source_bindings':sources,'packet_id':request['packet_id']}
        return {'artifact':payload,'artifact_hash':sha(payload),
                'state':'WAITING_APPROVAL','missing_facts':[], 'external_effects':0}

    def continue_approval(self,request,admitted, *, revalidate_admission=None):
        request=copy.deepcopy(request); admitted=copy.deepcopy(admitted)
        p=self.prepare(request,admitted); a=p['artifact']; h=p['artifact_hash']; now=self.clock()
        # Stable logical key does not change on notification/version or restart.
        key='bo05-bo06:'+a['matter_id']+':'+a['action']
        prior=self.provider.lookup(key,copy.deepcopy(a))
        need(prior['state'] in {'absent','submitted','published','admission_approved','owner_reported_submitted','uncertain'},'unknown provider status')
        if prior['state']!='absent':
            need(prior.get('key')==key and prior.get('recipient')==a['recipient'],'prior effect identity mismatch')
            if prior['state'] in {'submitted','published','admission_approved'}:
                need(prior.get('artifact_hash')==h and isinstance(prior.get('receipt'),str) and prior['receipt'],'prior receipt/artifact not reconciled')
            return {**p,'state':prior['state'].upper(),'receipt':prior.get('receipt'),'external_effects':0}
        need(self.state.status(key) is None,'existing claim requires reconciliation; never replay')
        approval=copy.deepcopy(self.approval_loader(a['matter_id']))
        if approval is None: return p
        for field,expected in {'matter_id':a['matter_id'],'artifact_hash':h,'recipient':a['recipient'],
                               'action':a['action'],'classification':a['classification'],
                               'terms_hash':a['terms_hash']}.items():
            need(approval.get(field)==expected,'approval binding changed: '+field)
        need(approval.get('verified_owner') is True and approval.get('active') is True,'owner authority missing/revoked')
        need(approval['valid_from']<=now<approval['expires_at'],'approval expired/not yet effective')
        need(approval.get('confirmation_complete') is True,'action-time confirmation pending')
        if a['classification']=='HUMAN_DIRECTED_AUTOMATION':
            need(approval.get('human_adoption') is True,'exact human adoption missing')
        need(prior.get('source_current') is True and prior.get('history_current') is True,'fresh source/history check required')
        self.state.claim(key,h,owner_id='bo05-bo06-parent',context_sha256=sha(admitted))
        self.state.prepared(key,h)
        # Re-read approvals and sources immediately before injected provider invocation.
        need(self.prepare(request,admitted)['artifact_hash']==h,'source changed before dispatch')
        need(self.approval_loader(a['matter_id'])==approval,'approval changed before dispatch')
        need(self.clock()<approval['expires_at'],'approval expired before dispatch')
        if revalidate_admission is not None:
            need(revalidate_admission()==admitted,'admission/source grant changed before dispatch')
        need(sha(a)==h,'artifact mutated before dispatch')
        self.state.uncertain(key,h)  # durable immediately before external invocation
        receipt=self.provider.execute(key,copy.deepcopy(a))
        actual=self.provider.readback(receipt)
        need(actual.get('key')==key and actual.get('artifact_hash')==h and actual.get('recipient')==a['recipient'],'wrong receipt readback')
        terminal='published' if a['action']=='publish' else 'submitted'
        need(actual.get('state')==terminal and isinstance(actual.get('receipt'),str) and actual['receipt'],'nonterminal receipt')
        self.state.sent(key,h,actual['receipt'])
        return {**p,'state':terminal.upper(),'receipt':actual['receipt'],'external_effects':1}

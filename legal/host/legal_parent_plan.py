"""Pure JSON adapter for the reviewed Legal planners; never performs provider IO."""
from __future__ import annotations
import json, sys
from types import SimpleNamespace
from . import legal_docs_claim as c
from . import legal_successor_writer as w
from . import legal_successor_runtime as r


def dispatch(x):
    mode=x['mode'];cfg=c.validate_config(x['config']);c.require(c.successor_mode(cfg),'successor config required')
    if mode=='validate':return {'valid':True}
    if mode=='visibility':
        return {'sha256':w._check_private_visibility(SimpleNamespace(get_private_file_visibility=lambda **_:x['visibility']),cfg,x['file_id'])}
    if mode=='profile':
        profile=r._structured(x['profile'],'owner profile');c.require(profile.get('email')==x['owner_email'],'authenticated owner mailbox mismatch');return {'valid':True}
    if mode=='source':
        t=SimpleNamespace(get_profile=lambda:x['profile'],read_email=lambda **_:x['email']);return r._gmail_source(t,x['message_id'],x['owner_email'])
    if mode=='admit':
        t=SimpleNamespace(get_profile=lambda:x['profile'],read_email=lambda **_:x['email'],get_owner_admission=lambda **_:x['admission']);a,b,s=r._admit(t,cfg,owner_email=x['owner_email'],message_id=x['message_id']);return {'admission':a,'binding':b,'source':s}
    if mode=='legacy_metadata':return c.provider_metadata(x['metadata'],cfg,'application/json')
    if mode=='fingerprint':
        t=SimpleNamespace(get_profile=lambda:x['profile'],read_email=lambda **_:x['email'],get_owner_admission=lambda **_:x['admission'],read_review_evidence=lambda **_:x['evidence'])
        a,b,s,p,f=r._fingerprint(t,cfg,x['owner_email'],x['message_id']);key=c.action_key(b,cfg)
        return {'admission':a,'binding':b,'source':s,'payload':p,'fingerprint':f,'action_key':key,'token':c.sha({'action_key':key,'authorization_reference':b['authorization_reference'],'owner_id':cfg['ownerId'],'canonical_record_id':cfg['canonicalRecordId']})}
    if mode=='classify':return r._review_payload(x['payload'],cfg,x['binding'])
    if mode=='hash':return {'sha256':c.sha(x['value'])}
    if mode=='transition':
        before=x['before'];res,succ,legacy=before['reservation'],before['successor'],before['legacy'];c.successor_snapshot(succ,cfg,legacy)
        return c.plan(w._transition_input(cfg,x['operation'],res,succ,legacy,x.get('binding'),x.get('token'),x.get('expected_result_sha256'),x.get('reason')))
    if mode=='verify_transition':
        b,a=x['before'],x['after'];p=x['proposed'];op=x['operation']
        c.plan({'config':cfg,'metadata':a['reservation']['metadata'],'document':a['reservation']['document'],'operation':'verify','expected_text':p['expected_text']})
        _,bt,_,_=c.successor_snapshot(b['successor'],cfg,b['legacy']);_,at,_,_=c.successor_snapshot(a['successor'],cfg,a['legacy'])
        if op in {'claim','mark_uncertain','cancel_before_effect'}:c.require(at==bt,'successor changed during reservation CAS')
        else:
            receipt=c.runtime_entry(a['successor'],cfg,x['binding'],p['action_key'],p['record']['output']['result_sha256'],p['record']['manual_base_sha256'])
            c.require(receipt==p['record']['output'],'successor receipt changed during settlement')
        c.require(c.legacy_reference(a['legacy'],cfg)==c.legacy_reference(b['legacy'],cfg),'legacy drift during reservation CAS')
        return {**p,'readback_verified':True}
    if mode=='write':
        b=x['before'];return w.plan_result_write({'config':cfg,'binding':x['binding'],'token':x['token'],'classification':x['classification'],'reservation_metadata':b['reservation']['metadata'],'reservation_document':b['reservation']['document'],'successor_readback':b['successor'],'legacy_readback':b['legacy']})
    if mode=='verify_write':
        a,p=x['after'],x['proposed'];_,text,_,record=c.successor_snapshot(a['successor'],cfg,a['legacy'])
        c.require(text==p['expected_text'] and c.sha(record)==p['expected_content_sha256'],'successor exact write readback mismatch')
        c.require(c.legacy_reference(a['legacy'],cfg)['content_sha256']==p['legacy_content_sha256'],'legacy drift during effect')
        _,_,_,ledger=c.snapshot(a['reservation']['document'],a['reservation']['metadata'],cfg);entry=ledger['entries'].get(p['action_key'])
        c.require(entry is not None and entry['binding']==x['binding'] and entry['token']==x['token'] and entry['state']=='effect_uncertain' and ledger['active_key']==p['action_key'],'reservation changed during effect')
        return {**p,'readback_verified':True}
    if mode=='current':
        b=x['before'];_,_,_,record=c.successor_snapshot(b['successor'],cfg,b['legacy']);item=record['runtime_results'].get(c.action_key(x['binding'],cfg));c.require(type(item) is dict and item['binding']==x['binding'],'canonical result unavailable');return item['classification']
    if mode=='seed':return w.plan_seed({'config':cfg,'successor_readback':x['before']['successor'],'legacy_readback':x['before']['legacy']})
    if mode=='verify_seed':
        a,p=x['after'],x['proposed'];_,text,_,record=c.successor_snapshot(a['successor'],cfg,a['legacy']);c.require(text==p['expected_text'] and record['legacy_ref']['content_sha256']==p['legacy_content_sha256'],'seed readback mismatch');return {**p,'readback_verified':True}
    raise c.Held('unsupported parent planner operation')

if __name__=='__main__':
    try:print(json.dumps(dispatch(json.load(sys.stdin)),ensure_ascii=False,allow_nan=False))
    except Exception as e:print(json.dumps({'held':type(e).__name__,'reason':str(e)}));sys.exit(2)

"""Parent-invoked BO-01 owner gate over the existing ParentBridge effect route."""
import json, sys, time
from pathlib import Path
from boundary import Gateway, SQLiteState, strict_json_loads, require, NoSend
from parent_bridge import ParentBridge, Unavailable, canonical
from owner_intake import OwnerIntake, validate_owner_factual_answer


def run(inp):
    op=inp.get('operation')
    if op=='receipt':
        require(type(inp) is dict and set(inp)=={'operation','db','attempt_token','result'},'exact receipt reconciliation input required')
        state=SQLiteState(inp['db']);bridge=ParentBridge(Gateway(lambda:{},state,Unavailable()))
        return bridge.record_receipt(inp['attempt_token'],inp['result'])
    common={'operation','db','intake_db','registry','request','actor','grant','runtime_identity','readbacks','effect_owner_id','connector_identity'}
    allowed=common|({'attempt'} if op=='revalidate' else set())
    require(type(inp) is dict and set(inp)==allowed,'exact BO-01 parent context required')
    def read(name): return strict_json_loads(Path(inp[name]).read_text())
    request=read('request'); grant=read('grant'); runtime=read('runtime_identity'); source=read('readbacks')
    connector=inp['connector_identity']
    require(type(connector) is dict and set(connector)=={'provider','account_id','principal_id','from_address','verified_at','identity_evidence_sha256'},'trusted active Gmail connector identity required')
    require(connector['provider']=='gmail' and connector['account_id']==runtime['account_id'] and connector['principal_id']==runtime['principal_id'] and connector['from_address']==runtime['from_address'] and connector['identity_evidence_sha256']==runtime['identity_evidence_sha256'] and type(connector['verified_at']) in (int,float) and 0<=time.time()-connector['verified_at']<=10 and connector['verified_at']<=time.time()+1,'active Gmail connector account differs from the standing grant')
    require(type(inp['effect_owner_id']) is str and inp['effect_owner_id']==grant['effect_owner_id'] and grant['backend_kind']=='sqlite' and grant['backend_key']=='sqlite:'+str(Path(inp['db']).resolve()),'owner grant names another effect backend/store')
    require(type(source) is dict and set(source)=={'observed_at','sources'} and type(source['observed_at']) in (int,float) and time.time()-source['observed_at']<=10 and source['observed_at']<=time.time()+1,'current factual-source readback is stale')
    intake=OwnerIntake(inp['intake_db'],owner_address=runtime['from_address'])
    state=SQLiteState(inp['db'])
    registry_path=Path(inp['registry'])
    def guard(r,actor,policy_id):
        require(grant['policy_id']==policy_id,'owner producer policy mismatch')
        return validate_owner_factual_answer(intake,None,r,authenticated_actor=actor,grant=grant,runtime_identity=runtime,current_readbacks=source['sources'])
    gateway=Gateway(lambda:strict_json_loads(registry_path.read_text()),state,Unavailable(),owner_context_guard=guard,effect_owner_id=inp['effect_owner_id'])
    bridge=ParentBridge(gateway)
    if op=='arm':
        attempt=bridge.arm(request,authenticated_actor=inp['actor'])
        require(type(attempt['owner_context_sha256']) is str,'owner producer did not pass contextual authority gate')
        return attempt
    if op=='revalidate':
        return bridge.revalidate(inp['attempt'],request,authenticated_actor=inp['actor'])
    if op=='receipt':
        return bridge.record_receipt(inp['attempt_token'],inp['result'])
    raise NoSend('unsupported operation')


if __name__=='__main__':
    try:
        print(canonical(run(strict_json_loads(sys.stdin.read()))))
    except Exception as exc:
        print(canonical({'status':'NO_SEND_OR_UNCERTAIN','error':str(exc)}),file=sys.stderr)
        sys.exit(1)

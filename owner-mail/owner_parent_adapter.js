// Trusted V8 parent path for BO-01 owner factual answers. The Python gate
// supplies the existing v8 ParentBridge attempt; this file owns the only send.
function createOwnerParentAdapter(operatorRoot) {
  if(typeof operatorRoot!=='string'||!operatorRoot.startsWith('/')||/[\x00-\x1f\x7f]/.test(operatorRoot))throw new Error('Trusted absolute root required');
  const root=operatorRoot.replace(/\/$/,'');
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  async function run(tools,input) {
    const raw=JSON.stringify(input);
    if(raw.includes('\nBO01_PARENT_INPUT\n'))throw new Error('Invalid parent input');
    const r=await tools.exec_command({cmd:`python3 ${q(root+'/owner_bridge.py')} <<'BO01_PARENT_INPUT'\n${raw}\nBO01_PARENT_INPUT`,max_output_tokens:20000});
    if(r.exit_code!==0)throw new Error('BO-01 authority denied; no connector call; reconcile existing attempt if armed');
    return JSON.parse(r.output);
  }
  return async function sendOwnerFactualAnswer(tools,ctx) {
    const fields='actor,connector_identity,db,effect_owner_id,grant,intake_db,readbacks,registry,request,runtime_identity';
    if(Object.keys(ctx).sort().join(',')!==fields)throw new Error('Exact trusted BO-01 parent context required');
    const base={operation:'arm',...ctx};
    const attempt=await run(tools,base);
    if(attempt.state!=='uncertain'||attempt.tool!=='mcp__codex_apps__gmail_send_email'||typeof attempt.owner_context_sha256!=='string'||Date.now()/1000>attempt.invoke_before)
      throw new Error('Invalid or expired BO-01 attempt; retain uncertain and reconcile');
    const checked=await run(tools,{...ctx,operation:'revalidate',attempt});
    if(checked.authorized!==true||checked.owner_context_sha256!==attempt.owner_context_sha256||checked.arguments_sha256!==attempt.arguments_sha256)
      throw new Error('BO-01 policy/source context changed; retain uncertain; no send');
    if(Date.now()/1000>attempt.invoke_before)throw new Error('BO-01 attempt expired after revalidation; retain uncertain; no send');
    if(ctx.connector_identity.provider!=='gmail'||typeof ctx.connector_identity.account_id!=='string'||typeof ctx.connector_identity.principal_id!=='string'||typeof ctx.connector_identity.from_address!=='string'||typeof ctx.connector_identity.identity_evidence_sha256!=='string'||Date.now()/1000-ctx.connector_identity.verified_at>10||ctx.connector_identity.verified_at>Date.now()/1000+1)
      throw new Error('Active Gmail connector identity changed or expired; retain uncertain; no send');
    // One call only, through the pre-existing parent Gmail connector route.
    const result=await tools.mcp__codex_apps__gmail_send_email(attempt.arguments);
    const saved=await run(tools,{operation:'receipt',db:ctx.db,attempt_token:attempt.attempt_token,result});
    return saved;
  };
}

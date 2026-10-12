// Optional Docs-backed parent adapter. Plain V8; trusted root and Doc config only.
// No local SQLite claim, fallback, automatic retries, credentials or live setup.
function createDocsParentAdapter(operatorRoot, config) {
  if(typeof operatorRoot!=='string'||!operatorRoot.startsWith('/')||/[\x00-\x1f\x7f]/.test(operatorRoot))throw new Error('Trusted absolute root required');
  if(Object.keys(config).sort().join(',')!=='documentId,ownerId,tabId')throw new Error('Exact trusted Docs config required');
  config=JSON.parse(JSON.stringify(config));
  const root=operatorRoot.replace(/\/$/,'');
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  async function run(tools,input) {
    const r=await tools.exec_command({cmd:`python3 ${q(root+'/docs_claim.py')} plan <<'DOCS_CLAIM_JSON'\n${JSON.stringify(input)}\nDOCS_CLAIM_JSON`,max_output_tokens:300000});
    if(r.exit_code!==0)throw new Error('Durable ledger denied/invalid; no send or retry');
    return JSON.parse(r.output);
  }
  async function read(tools) {return tools.mcp__codex_apps__google_drive_get_document({document_id:config.documentId});}
  function casError(request,batch,original,isThrown) {
    const detail=isThrown ? String(original?.message ?? original) : JSON.stringify(original);
    const error=new Error(`Docs CAS ${request.operation} unconfirmed; stop and reconcile; ${detail}`);
    error.name='DocsCASUnconfirmedError';
    error.operation=request.operation;
    error.messageId=request.message_id;
    error.documentId=config.documentId;
    error.requiredRevisionId=batch.write_control.requiredRevisionId;
    error.retryPermitted=false;
    error.writeOutcome='unconfirmed';
    if(isThrown){error.cause=original;error.toolException=original;}
    else{error.toolResult=original;}
    // Keep the exact original tool return/exception; do not include the batch body.
    return error;
  }
  async function commit(tools,request) {
    const document=await read(tools);
    const p=await run(tools,{...request,config,document});
    if(!p.batch)return p.record;
    // requiredRevisionId ONLY. Conflict, timeout or unknown outcome aborts, never fallback.
    let result;
    try {result=await tools.mcp__codex_apps__google_drive_batch_update_document(p.batch);}
    catch(original){throw casError(request,p.batch,original,true);}
    if(result?.isError)throw casError(request,p.batch,result,false);
    await run(tools,{operation:'verify',config,document:await read(tools),expected_text:p.expected_text});
    return p.record;
  }
  async function update(tools,operation,candidate,provider_result) {
    return commit(tools,{operation,candidate,message_id:candidate.binding.message_id,provider_result});
  }
  async function candidate(tools,ctx) {
    const keys=Object.keys(ctx).sort().join(',');
    if(keys!=='authenticatedActor,registry,request'&&keys!=='authenticatedActor,authenticatedConnectorIdentity,ownerContextPath,registry,request')throw new Error('Exact trusted parent context required');
    if(ctx.ownerContextPath&&(typeof ctx.ownerContextPath!=='string'||!ctx.ownerContextPath.startsWith('/')||/[\x00-\x1f\x7f]/.test(ctx.ownerContextPath)))throw new Error('Trusted absolute owner-context file required');
    const owner=ctx.ownerContextPath ? ` --owner-context ${q(ctx.ownerContextPath)} --owner-backend-json ${q(JSON.stringify({kind:'google_docs',...config}))} --active-connector-json ${q(JSON.stringify(ctx.authenticatedConnectorIdentity))}` : '';
    const r=await tools.exec_command({cmd:`python3 ${q(root+'/docs_claim.py')} candidate --registry ${q(ctx.registry)} --request ${q(ctx.request)} --actor ${q(ctx.authenticatedActor)}${owner}`,max_output_tokens:16000});
    if(r.exit_code!==0)throw new Error('Boundary validation denied; no send');
    return JSON.parse(r.output);
  }
  async function authorizeDispatch(tools,original,fresh) {
    const candidate={...fresh,attempt_token:original.attempt_token};
    return run(tools,{operation:'authorize_dispatch',config,document:await read(tools),message_id:original.binding.message_id,candidate});
  }
  return {
    async send(tools,ctx) {
      const c=await candidate(tools,ctx);
      await update(tools,'claim',c);
      await update(tools,'prepared',c);
      await update(tools,'uncertain',c); // confirmed durable BEFORE invoking Gmail
      const fresh=await candidate(tools,ctx); // revalidate actor/data/action/current registry now
      if(JSON.stringify(fresh.binding)!==JSON.stringify(c.binding)||JSON.stringify(fresh.arguments)!==JSON.stringify(c.arguments)||Date.now()/1000>fresh.invoke_before)throw new Error('Authority/source/registry changed; retain uncertain');
      if(ctx.ownerContextPath) {
        const late=await authorizeDispatch(tools,c,fresh);
        if(late.authorized!==true||late.attempt_token!==c.attempt_token||late.arguments_sha256!==fresh.arguments_sha256||late.owner_context_sha256!==c.binding.owner_context_sha256||Date.now()/1000>fresh.invoke_before)throw new Error('Late BO-01 policy/source/claim check failed; retain uncertain');
        const ci=ctx.authenticatedConnectorIdentity;
        if(ci.provider!=='gmail'||typeof ci.account_id!=='string'||typeof ci.principal_id!=='string'||typeof ci.from_address!=='string'||typeof ci.identity_evidence_sha256!=='string'||Date.now()/1000-ci.verified_at>10)throw new Error('Active Gmail connector identity changed or expired; retain uncertain');
      }
      const receipt=await tools.mcp__codex_apps__gmail_send_email(fresh.arguments);
      return update(tools,'receipt',c,receipt);
    },
    async inspect(tools,messageId) {
      return run(tools,{operation:'inspect',config,document:await read(tools),message_id:messageId});
    },
    async installLegacyTombstone(tools,tombstone) {
      // Reviewed parent migration only: never infer actor/registry from current state.
      return commit(tools,{operation:'legacy_tombstone',message_id:tombstone.message_id,tombstone});
    },
    async reconcileReceipt(tools,originalAttempt,providerResult) {
      // Parent supplies original durable token+binding and verified actual provider result.
      // This method NEVER invokes Gmail. Revoked current authority does not erase a receipt.
      return update(tools,'receipt',originalAttempt,providerResult);
    },
    async settleNoSend(tools,originalAttempt,evidence) {
      // Parent supplies exact independently verified pre-send evidence. CAS is
      // idempotent; uncertain/sent records are structurally refused by Python.
      return commit(tools,{operation:'settle_no_send',message_id:originalAttempt.binding.message_id,candidate:originalAttempt,evidence});
    }
  };
}

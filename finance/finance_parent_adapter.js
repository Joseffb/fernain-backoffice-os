// Finance-only CAS host. It has no Gmail, source retrieval or business-effect API.
// A checked coordinator must derive bindings/receipts from authoritative readbacks.
// Claim ownership is demonstrated by provider CAS + exact readback, never a boolean.
function createFinanceReservationAdapter(operatorRoot, config) {
  if (typeof operatorRoot !== 'string' || !operatorRoot.startsWith('/') || /[\x00-\x1f\x7f]/.test(operatorRoot)) throw new Error('Trusted root required');
  if (Object.keys(config).sort().join(',') !== 'documentId,ownerId,tabId') throw new Error('Exact trusted reservation config required');
  config = JSON.parse(JSON.stringify(config));
  const root = operatorRoot.replace(/\/$/, '');
  const q = s => "'" + String(s).replaceAll("'", "'\\''") + "'";
  async function plan(tools, input) {
    const r = await tools.exec_command({cmd:`python3 ${q(root + '/finance_docs_claim.py')} <<'FINANCE_CAS_JSON'\n${JSON.stringify(input)}\nFINANCE_CAS_JSON`,max_output_tokens:16000});
    if (r.exit_code !== 0) throw new Error('Finance reservation held: ' + r.output);
    return JSON.parse(r.output);
  }
  async function read(tools) {return tools.mcp__codex_apps__google_drive_get_document({document_id:config.documentId});}
  async function prepare(tools, request) {return plan(tools,{...request,config,document:await read(tools)});}
  async function commitPrepared(tools, prepared) {
    if (!prepared.batch) return prepared;
    if (prepared.batch.document_id !== config.documentId || Object.keys(prepared.batch.write_control).join(',') !== 'requiredRevisionId') throw new Error('Invalid CAS target');
    // Never retry automatically, merge a stale revision, choose another store or reset.
    let result;
    try {result = await tools.mcp__codex_apps__google_drive_batch_update_document(prepared.batch);}
    catch (e) {throw Object.assign(new Error('Finance CAS outcome unconfirmed; reconcile'),{cause:e,retryPermitted:false,writeOutcome:'unconfirmed'});}
    if (result?.isError) throw Object.assign(new Error('Finance CAS rejected/unconfirmed; reconcile'),{toolResult:result,retryPermitted:false,writeOutcome:'unconfirmed'});
    const verification = await plan(tools,{operation:'verify',config,document:await read(tools),expected_text:prepared.expected_text});
    return {action_key:prepared.action_key,record:prepared.record,verification,document_id:config.documentId};
  }
  return {
    async inspect(tools) {return prepare(tools,{operation:'inspect'});},
    async transition(tools, request) {return commitPrepared(tools,await prepare(tools,request));}
  };
}

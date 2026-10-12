// Host-compatible trusted parent factory: no imports, URL, import.meta, Node
// globals or implicit root. Evaluate only the reviewed source, then construct
// with an explicit parent-owned absolute operator root. Never use producer data.
function createParentAdapter(operatorRoot) {
  if (typeof operatorRoot !== 'string' || !operatorRoot.startsWith('/') || /[\x00-\x1f\x7f]/.test(operatorRoot))
    throw new Error('Trusted operator root must be an absolute path');
  const root = operatorRoot.replace(/\/$/, '');
  const q = s => "'" + String(s).replaceAll("'", "'\\''") + "'";
  return async function sendVerifiedAgentic(tools, parentContext) {
    const keys = Object.keys(parentContext).sort().join(',');
    if (keys !== 'authenticatedActor,db,registry,request')
      throw new Error('Unexpected parent context field; operator root is constructor-owned');
    const {db, registry, request, authenticatedActor} = parentContext;
    const exec = await tools.exec_command({
      cmd: `python3 ${q(root+'/parent_bridge.py')} arm --db ${q(db)} --registry ${q(registry)} --request ${q(request)} --actor ${q(authenticatedActor)}`,
      max_output_tokens: 16000
    });
    if (exec.exit_code !== 0) throw new Error('Gateway denied or failed; no transport call');
    const attempt = JSON.parse(exec.output);
    if (attempt.tool !== 'mcp__codex_apps__gmail_send_email' || Date.now()/1000 > attempt.invoke_before)
      throw new Error('Invalid/expired attempt; retain uncertain and reconcile; do not retry');
    // Exactly one parent connector invocation, with no edits or extra fields.
    // A thrown error/interruption leaves durable uncertain; NEVER retry blindly.
    const result = await tools.mcp__codex_apps__gmail_send_email(attempt.arguments);
    const receipt = JSON.stringify({attempt_token:attempt.attempt_token,result});
    const saved = await tools.exec_command({
      cmd: `python3 ${q(root+'/parent_bridge.py')} receipt --db ${q(db)} <<'AGENTIC_RECEIPT_JSON'\n${receipt}\nAGENTIC_RECEIPT_JSON`,
      max_output_tokens: 1000
    });
    if (saved.exit_code !== 0) throw new Error('Receipt not committed; reconcile provider outcome, never resend');
    return JSON.parse(saved.output);
  };
}

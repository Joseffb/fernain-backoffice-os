// Minimal bootstrap for the existing authenticated parent cloud wake. All
// durable code remains the Library artifact; business config remains its
// existing canonical file. No independent registration store or scheduler.
function createFinanceCloudCaller(bundleRoot, workspaceRoot, installationPins) {
  if(typeof bundleRoot!=='string'||!bundleRoot.startsWith('/')||typeof workspaceRoot!=='string'||!workspaceRoot.startsWith('/')||/[\x00-\x1f\x7f]/.test(bundleRoot+workspaceRoot))throw Error('Actual parent cloud paths required');
  if(!installationPins||Object.keys(installationPins).sort().join(',')!=='config_sha256,config_version,guide_sha256,guide_version,trigger_id'||!['config_sha256','guide_sha256'].every(k=>/^[0-9a-f]{64}$/.test(installationPins[k]||''))||!['config_version','guide_version'].every(k=>typeof installationPins[k]==='string'&&installationPins[k].length>0)||(installationPins.trigger_id!==null&&(typeof installationPins.trigger_id!=='string'||!installationPins.trigger_id)))throw Error('Independently read-back parent config/guide pins and actual trigger binding required');
  const pins=JSON.parse(JSON.stringify(installationPins));
  const bindings={consumer_id:'{{CONFIGURE_GOOGLE_ID_093}}',principal_id:'{{CONFIGURE_GOOGLE_ID_017}}',principal_email:'operator@example.com',queue_id:'{{CONFIGURE_GOOGLE_ID_024}}',sheet_id:901,tab:'Queue',inbox_id:'{{CONFIGURE_GOOGLE_ID_083}}',drive_id:'{{CONFIGURE_GOOGLE_ID_011}}',staging_id:'{{CONFIGURE_GOOGLE_ID_035}}',reservation:{documentId:'{{CONFIGURE_GOOGLE_ID_074}}',tabId:'t.0',ownerId:'{{CONFIGURE_GOOGLE_ID_093}}'},business_policy_version:'0.3.0',approval_reference:'EXAMPLE_AUTHORITY_REFERENCE',config:{id:'{{CONFIGURE_GOOGLE_ID_025}}',parent_ids:['{{CONFIGURE_GOOGLE_ID_072}}'],drive_id:'{{CONFIGURE_GOOGLE_ID_007}}',mime_type:'application/json'},guide:{id:'{{CONFIGURE_GOOGLE_ID_022}}',parent_ids:['{{CONFIGURE_GOOGLE_ID_011}}'],drive_id:'{{CONFIGURE_GOOGLE_ID_011}}',mime_type:'text/markdown',sha256:'0000000000000000000000000000000000000000000000000000000000000000'},excluded_fixture_ids:['{{CONFIGURE_GOOGLE_ID_023}}','{{CONFIGURE_GOOGLE_ID_084}}','{{CONFIGURE_GOOGLE_ID_070}}','{{CONFIGURE_GOOGLE_ID_046}}','{{CONFIGURE_GOOGLE_ID_043}}','{{CONFIGURE_GOOGLE_ID_044}}','{{CONFIGURE_GOOGLE_ID_028}}','{{CONFIGURE_GOOGLE_ID_041}}']};
  const root=bundleRoot.replace(/\/$/,'')+'/finance-bridge',q=s=>"'"+String(s).replaceAll("'","'\\''")+"'",stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const unwrap=r=>{if(r?.isError||!r?.structuredContent)throw Error('CONNECTED_READ_UNAVAILABLE');return r.structuredContent;};
  const metadata=(tools,id)=>tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:id,fields:'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',supportsAllDrives:true});
  async function bind(tools,continuationContext=null){
    const wake_started_at=Date.now()/1000;
    const [profile,cm,gm]=await Promise.all([tools.mcp__codex_apps__google_drive_get_profile({}),metadata(tools,bindings.config.id),metadata(tools,bindings.guide.id)]);
    const c=unwrap(cm),g=unwrap(gm);
    if(c.id!==bindings.config.id||g.id!==bindings.guide.id)throw Error('FIXED_POLICY_SOURCE_CHANGED');
    const [config,guide]=await Promise.all([tools.mcp__codex_apps__google_drive_fetch({url:c.url}),tools.mcp__codex_apps__google_drive_fetch({url:g.url})]);
    const [ca,ga]=await Promise.all([metadata(tools,c.id),metadata(tools,g.id)]);
    if(stable(unwrap(ca))!==stable(c)||stable(unwrap(ga))!==stable(g))throw Error('POLICY_SOURCE_DRIFT');
    const reservation=await createFinanceReservationAdapter(root,bindings.reservation).inspect(tools);
    const input={operation:'bind_current',bindings,installation_pins:pins,workspace_root:workspaceRoot,wake_started_at,profile,config_metadata:cm,guide_metadata:gm,config,guide,reservation};
    const result=await tools.exec_command({cmd:`python3 ${q(root+'/connected_plan.py')} <<'FINANCE_CLOUD_BINDING'\n${JSON.stringify(input)}\nFINANCE_CLOUD_BINDING`,max_output_tokens:16000});
    if(result.exit_code!==0)throw Error('FINANCE_CANONICAL_BINDING_FAILED');
    const bound=JSON.parse(result.output);
    if(bound.status!=='BOUND_CURRENT_CANONICAL_CONFIG')throw Object.assign(Error(bound.code||bound.status),{blocked:true});
    return {bound,finance:createFinanceConnectedHost(bundleRoot,bound.registration,continuationContext)};
  }
  return {
    async inspect(tools){const {bound,finance}=await bind(tools);return {binding:bound,scan:await finance.scan(tools,{dispatch:false})};},
    async wake(tools){const {bound,finance}=await bind(tools);return {installation:bound.installation,window_kind:bound.window_kind,scan:await finance.scan(tools,{dispatch:true})};},
    async resumePreEffect(tools,context){if(context==null)throw Error('EXPLICIT_CONTINUATION_CONTEXT_REQUIRED');const {bound,finance}=await bind(tools,context);return {installation:bound.installation,window_kind:bound.window_kind,result:await finance.resumePreEffect(tools)};},
    async inspectHistorical(tools,key){const {finance}=await bind(tools);return finance.inspectHistorical(tools,key);}
  };
}

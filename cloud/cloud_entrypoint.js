// Portable functions.exec entrypoint. Installation supplies trusted config/readers;
// wake data supplies references only. Existing department adapters own all effects.
function createCloudBackOffice(root, configuration, host) {
  const cfg=JSON.parse(JSON.stringify(configuration));
  const routes=['bo01','finance','legal','marketing','fundraising'];
  const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const copy=x=>JSON.parse(JSON.stringify(x));
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  if(typeof root!=='string'||!root.startsWith('/')||/[\x00-\x1f\x7f]/.test(root))throw Error('Trusted cloud bundle root required');
  root=root.replace(/\/$/,'');
  if(!cfg.consumerId||!cfg.triggerId||!cfg.principalId||cfg.maxItems<1||cfg.maxItems>10||!Number.isInteger(cfg.maxItems))throw Error('Bounded existing consumer binding required');
  const roots={bo01:root+'/bo01-integration/resume-candidate/source',finance:root+'/finance-bridge',legal:root+'/bo04-legal-integration',departments:root+'/bo05-bo06/integration'};
  function blocked(code,details={}) {return {status:'BLOCKED_SOURCE',code,effect_state:'NOT_ATTEMPTED',readback_state:'NOT_APPLICABLE',...details};}
  function need(ok,code){if(!ok){const e=Error(code);e.blocked=true;throw e;}}
  function capability(name){if(typeof host[name]!=='function'){const e=Error(name);e.missing=true;throw e;}return host[name];}
  function validate(a,event){
    const now=Date.now()/1000;
    need(a&&a.status==='ACTIVE'&&a.revoked===false,'AUTHORITY_INACTIVE');
    need(Number.isFinite(a.valid_from)&&Number.isFinite(a.expires_at)&&a.valid_from<=now&&now<a.expires_at,'AUTHORITY_EXPIRED');
    need(Number.isFinite(a.observed_at)&&a.observed_at<=now+1&&now-a.observed_at<=10,'AUTHORITY_NOT_FRESH');
    need(a.consumer_id===cfg.consumerId&&a.trigger_id===cfg.triggerId&&a.principal_id===cfg.principalId&&a.single_writer===true,'CONSUMER_BINDING_CHANGED');
    need(a.admission_id===event.admission_id&&routes.includes(a.route)&&typeof a.revision==='string'&&a.revision.length>0,'ADMISSION_BINDING_CHANGED');
    need(a.source?.id===event.source_id&&a.source?.version===event.source_version&&/^[a-f0-9]{64}$/.test(a.source?.sha256||''),'SOURCE_BINDING_CHANGED');
    need(a.operation===(['marketing','fundraising'].includes(a.route)?'private_preparation':a.route==='finance'?'invoice_review':a.route==='legal'?'legal_review':'owner_reply'),'OPERATION_NOT_ADMITTED');
    need(typeof a.effect_key==='string'&&a.effect_key.length>0,'EXISTING_EFFECT_ID_REQUIRED');
    return a;
  }
  async function invoke(tools,event,continuationContext=null){
    let attempted=false,route=null;
    try {
      need(event&&Object.keys(event).sort().join(',')==='admission_id,source_id,source_version'&&Object.values(event).every(x=>typeof x==='string'&&x.length>0&&x.length<512),'REFERENCE_ONLY_WAKE_REQUIRED');
      let a=copy(validate(await capability('readAuthority')(tools,copy(event)),event));route=a.route;
      if(continuationContext!==null){
        need(continuationContext&&Object.keys(continuationContext).sort().join(',')==='approved_authority_ref,expected_token,grant','EXACT_CONTINUATION_CONTEXT_REQUIRED');
        const g=continuationContext.grant,now=Date.now()/1000;
        need(g&&Object.keys(g).sort().join(',')==='action_key,approval_ref,evidence_sha256,expected_token,expires_at,policy_sha256,source_id,source_sha256,source_version,valid_from'&&/^Sentinel_[a-f0-9]{32}$/.test(continuationContext.approved_authority_ref)&&g.approval_ref===continuationContext.approved_authority_ref&&g.expected_token===continuationContext.expected_token&&['action_key','source_sha256','policy_sha256','expected_token','evidence_sha256'].every(k=>/^[a-f0-9]{64}$/.test(g[k]||'')),'EXACT_INDEPENDENT_CONTINUATION_GRANT_REQUIRED');
        need(Number.isFinite(g.valid_from)&&g.valid_from>0&&Number.isFinite(g.expires_at)&&g.expires_at===g.valid_from+600&&g.expires_at-g.valid_from===600&&g.valid_from<=now&&now<g.expires_at,'CONTINUATION_GRANT_INACTIVE');
        need(route==='finance'&&stable(a.continuation_context)===stable(continuationContext),'CONTINUATION_AUTHORITY_CONTEXT_CHANGED');
        need(a.effect_key===continuationContext.grant?.action_key&&a.source.id===continuationContext.grant?.source_id&&a.source.version===continuationContext.grant?.source_version&&a.source.sha256===continuationContext.grant?.source_sha256,'CONTINUATION_SOURCE_BINDING_CHANGED');
      }else need(a.continuation_context==null,'EXPLICIT_CONTINUATION_ENTRYPOINT_REQUIRED');
      const authority=stable({...a,observed_at:0});
      async function fresh(){
        const b=validate(await capability('readAuthority')(tools,copy(event)),event);
        need(stable({...b,observed_at:0})===authority,'AUTHORITY_OR_CONTEXT_DRIFT');
        const s=await capability('readSourceBinding')(tools,copy(a));
        need(s&&s.complete===true&&s.id===a.source.id&&s.version===a.source.version&&s.sha256===a.source.sha256,'SOURCE_DRIFT');
      }
      await fresh();
      // Persisted department state is authoritative. No in-memory retry counter or reset.
      const prior=await capability('readContinuation')(tools,copy(a));
      need(prior&&prior.effect_key===a.effect_key&&prior.verified===true,'CONTINUATION_UNVERIFIED');
      if(continuationContext!==null){
        need(prior.state==='claimed'&&prior.result?.state==='claimed'&&prior.result.token===continuationContext.expected_token&&prior.result.output===null&&prior.result.queue_receipt===null,'CONTINUATION_PRE_EFFECT_CLAIM_CHANGED');
        need(['source_id','source_version','source_sha256','policy_sha256'].every(k=>prior.result.binding?.[k]===continuationContext.grant[k]),'CONTINUATION_PRIOR_BINDING_CHANGED');
      }else{
        if(prior.state==='TERMINAL')return {status:'DUPLICATE_SUPPRESSED',route,effect_key:a.effect_key,effect_state:prior.effect_state,readback_state:'VERIFIED',result:prior.result};
        if(prior.state!=='UNCLAIMED')return {status:'RECONCILIATION_REQUIRED',route,effect_key:a.effect_key,effect_state:prior.state,readback_state:'VERIFIED',result:prior.result};
      }
      // Only reviewed departmental effects are reachable, with current authority at every write.
      const writes=new Set(['mcp__codex_apps__gmail_send_email','mcp__codex_apps__google_drive_batch_update_document','mcp__codex_apps__google_drive_batch_update_spreadsheet','mcp__codex_apps__google_drive_upload_file']);
      const allowed={bo01:['mcp__codex_apps__google_drive_get_document','mcp__codex_apps__google_drive_batch_update_document','mcp__codex_apps__gmail_send_email'],finance:['download_file','mcp__codex_apps__google_drive_get_file_metadata','mcp__codex_apps__google_drive_fetch','mcp__codex_apps__google_drive_get_document','mcp__codex_apps__google_drive_batch_update_document','mcp__codex_apps__google_drive_get_spreadsheet_metadata','mcp__codex_apps__google_drive_get_spreadsheet_range','mcp__codex_apps__google_drive_get_spreadsheet_cells','mcp__codex_apps__google_drive_batch_update_spreadsheet','mcp__codex_apps__google_drive_upload_file'],legal:['mcp__codex_apps__gmail_get_profile','mcp__codex_apps__gmail_read_email','mcp__codex_apps__google_drive_get_file_metadata','mcp__codex_apps__google_drive_get_document','mcp__codex_apps__google_drive_fetch','mcp__codex_apps__google_drive_batch_update_document'],marketing:['mcp__codex_apps__google_drive_fetch'],fundraising:['mcp__codex_apps__google_drive_fetch']};
      const facade={exec_command:args=>tools.exec_command(args)};
      for(const name of allowed[route])facade[name]=async args=>{
        if(writes.has(name)){await fresh();attempted=true;}
        if(typeof tools[name]!=='function'){const e=Error(name);e.missing=true;throw e;}
        return tools[name](args);
      };
      let result;
      if(route==='bo01'){
        // Durable Docs backend is the accepted cloud owner-context path; never renew a retired grant.
        const adapter=createDocsParentAdapter(roots.bo01,cfg.bo01);
        const record=await adapter.inspect(facade,a.effect_key);
        if(record.record!==null)return {status:'RECONCILIATION_REQUIRED',route,effect_key:a.effect_key,effect_state:record.record.state,readback_state:'VERIFIED'};
        const candidate=await adapter.inspectCandidate(facade,a.payload.context);
        need(candidate.binding?.message_id===a.effect_key&&candidate.binding?.reply_context?.reply_message_id===a.source.id&&typeof candidate.binding?.owner_context_sha256==='string','BO01_PROCESSOR_BINDING_CHANGED');
        result=await adapter.send(facade,a.payload.context);
      }else if(route==='finance'){
        const input=copy(a.payload.class_input);
        need(input.source.source_before.id===a.source.id&&input.source.source_before.version===a.source.version&&input.source.source_read.sha256===a.source.sha256,'FINANCE_ADMISSION_SOURCE_MISMATCH');
        const p=await tools.exec_command({cmd:`python3 ${q(roots.finance+'/class_admission.py')} <<'FINANCE_CLASS_INPUT'\n${JSON.stringify(input)}\nFINANCE_CLASS_INPUT`,max_output_tokens:30000});
        if(p.exit_code!==0)throw Error('Finance admission planner failed');
        const admitted=JSON.parse(p.output);
        if(admitted.status!=='ADMITTED')return blocked('FINANCE_CLASS_HELD',{route,reason:admitted.reason});
        need(admitted.candidate.action_key===a.effect_key,'FINANCE_EFFECT_ID_CHANGED');
        const ids=[...new Set([admitted.case.admission.original_source.id,admitted.case.admission.current_source.id])];
        const fcfg={...cfg.finance,allowedSourceIds:ids};
        const formats=[admitted.case.source_before.mime_type,admitted.case.admission.original_source.mime_type];
        const mime=formats.join(',');
        let readers;
        if(formats.every(x=>['text/plain','text/markdown'].includes(x)))readers=createFinanceTextReader;
        else if(formats.every(x=>['text/plain','text/markdown','application/pdf','application/vnd.google-apps.document'].includes(x))&&formats.every(x=>x!=='application/pdf'||cfg.finance.enablePdf===true)&&formats.every(x=>x!=='application/vnd.google-apps.document'||cfg.finance.enableNativeDocs===true))readers=c=>createFinancePracticalSourceReader(c,roots.finance,{pdf:cfg.finance.enablePdf===true,nativeDocs:cfg.finance.enableNativeDocs===true});
        else if(formats.every(x=>['text/plain','text/markdown','application/pdf'].includes(x))&&cfg.finance.enablePdf===true)readers=c=>createFinanceMimeDispatchReader(c,roots.finance,createFinanceTextReader);
        else {const e=Error('complete Finance reader for '+mime);e.missing=true;throw e;}
        const coordinator=createFinanceCoordinator(roots.finance,fcfg,createFinanceReservationAdapter,readers);
        const recovery=continuationContext===null?null:{expected_token:continuationContext.expected_token,evidence_sha256:continuationContext.grant.evidence_sha256};
        await fresh();result=await coordinator.reviewAdmittedCase(facade,admitted.case,recovery);
        if(result.action==='RECONCILE_EXISTING_RESERVATION')return {status:'RECONCILIATION_REQUIRED',route,effect_key:a.effect_key,effect_state:result.record?.state||'WRITER_BUSY',readback_state:'VERIFIED',result};
      }else if(route==='legal'){
        for(const name of ['getOwnerAdmission','readReviewEvidence','getPrivateFileVisibility'])if(typeof host.legalReaders?.[name]!=='function'){const e=Error('legalReaders.'+name);e.missing=true;throw e;}
        need(a.payload.messageId===a.source.id,'LEGAL_SOURCE_ID_CHANGED');
        const adapter=createLegalParentAdapter(roots.legal,cfg.legal,host.legalReaders);
        const preview=await adapter.preview(facade,a.payload);
        need(preview.action_key===a.effect_key&&preview.binding?.source_sha256===a.source.sha256,'LEGAL_PROCESSOR_BINDING_CHANGED');
        result=await adapter.execute(facade,a.payload);
      }else{
        need(a.source.id===({marketing:'{{CONFIGURE_GOOGLE_ID_039}}',fundraising:'{{CONFIGURE_GOOGLE_ID_068}}'})[route],'PRIVATE_PACKET_SOURCE_CHANGED');
        capability('savePreparation');
        result=await createDepartmentPreparationAdapter(roots.departments)(facade,route);
        await fresh();
        // Parent bridges this CAS to the existing owned private record; never a new store.
        attempted=true;
        const saved=await host.savePreparation(tools,{admission:copy(a),expected:copy(prior),result:copy(result)});
        need(saved?.verified===true&&saved.effect_key===a.effect_key&&saved.artifact_hash===result.artifact_hash,'PREPARATION_SAVE_UNCONFIRMED');
      }
      const terminal=await host.readContinuation(tools,copy(a));
      if(terminal?.verified!==true||terminal.effect_key!==a.effect_key||terminal.state!=='TERMINAL')return {status:'RECONCILIATION_REQUIRED',route,effect_key:a.effect_key,effect_state:'RETURNED_BUT_TERMINAL_UNCONFIRMED',readback_state:'UNCONFIRMED',result};
      const provenance=a.intake_provenance;
      if(provenance)need(route==='finance'&&stable(provenance)===stable(terminal.result?.intake_provenance),'TERMINAL_INTAKE_PROVENANCE_CHANGED');
      if(a.native_gemini_review)need(stable(a.native_gemini_review)===stable(terminal.result?.native_gemini_review),'TERMINAL_NATIVE_GEMINI_PROVENANCE_CHANGED');
      return {status:'COMPLETED',route,effect_key:a.effect_key,effect_state:terminal.effect_state,readback_state:'VERIFIED',...(provenance?{synthetic:provenance.mode==='SYNTHETIC',intake_provenance:copy(provenance)}:{}),...(a.native_gemini_review?{native_gemini_review:copy(a.native_gemini_review)}:{}),result};
    }catch(e){
      if(attempted)return {status:'RECONCILIATION_REQUIRED',route,effect_state:'MAY_HAVE_CHANGED',readback_state:'UNCONFIRMED',code:e.message};
      if(e.missing)return {status:'MISSING_CAPABILITY',route,capability:e.message,effect_state:'NOT_ATTEMPTED',readback_state:'NOT_APPLICABLE'};
      if(e.blocked)return blocked(e.message,{route});
      return {status:'SERVICE_FAILURE',route,effect_state:'NOT_ATTEMPTED',readback_state:'UNCONFIRMED',code:String(e.message||e)};
    }
  }
  return {invoke:(tools,event)=>invoke(tools,event),resumeFinancePreEffect:(tools,event,context)=>context==null?Promise.resolve(blocked('EXPLICIT_CONTINUATION_CONTEXT_REQUIRED')):invoke(tools,event,copy(context)),async wake(tools,events){
    if(!Array.isArray(events)||events.length>cfg.maxItems)throw Error('Wake exceeds admitted batch limit');
    const results=[];for(const event of events)results.push(await invoke(tools,event));return results;
  }};
}

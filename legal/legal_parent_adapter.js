// New thin manual host binding. Direct MCP IO only; Python is a pure planner.
// Reviewed candidate source remains unchanged. No creation, sharing, mail or schedules.
function createLegalParentAdapter(root, config, readers) {
  if(typeof root!=='string'||!root.startsWith('/')||/[\x00-\x1f\x7f]/.test(root))throw Error('Trusted root required');
  const cfg=JSON.parse(JSON.stringify(config));
  if(cfg.parentId!=='{{CONFIGURE_GOOGLE_ID_078}}'||cfg.legacyRecordId!=='{{CONFIGURE_GOOGLE_ID_034}}')throw Error('Fixed Legal targets required');
  for(const n of ['getOwnerAdmission','readReviewEvidence','getPrivateFileVisibility'])if(typeof readers?.[n]!=='function')throw Error('Trusted parent reader missing');
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const unwrap=r=>{if(r?.isError||!r?.structuredContent)throw Error('Connected read unavailable');return r.structuredContent};
  async function py(tools,mode,input={}) {
    const data={...input,mode,config:cfg};
    const out=await tools.exec_command({cmd:`cd ${q(root)} && python3 -B -m host.legal_parent_plan <<'LEGAL_PARENT_JSON'\n${JSON.stringify(data)}\nLEGAL_PARENT_JSON`,max_output_tokens:300000});
    if(out.exit_code!==0)throw Error('Legal planner held: '+out.output);
    return JSON.parse(out.output);
  }
  async function visibility(tools,id){return py(tools,'visibility',{file_id:id,visibility:await readers.getPrivateFileVisibility(tools,{file_id:id})});}
  async function native(tools,id){return {metadata:await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:id}),document:await tools.mcp__codex_apps__google_drive_get_document({document_id:id})};}
  async function readAll(tools){
    await visibility(tools,cfg.documentId);await visibility(tools,cfg.canonicalRecordId);await visibility(tools,cfg.legacyRecordId);
    const reservation=await native(tools,cfg.documentId),successor=await native(tools,cfg.canonicalRecordId);
    const metadata=await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:cfg.legacyRecordId});
    const meta=await py(tools,'legacy_metadata',{metadata});
    const url=meta.url||meta.display_url;
    if(typeof url!=='string'||!url.startsWith('https://drive.google.com/file/d/'+cfg.legacyRecordId+'/'))throw Error('Trusted legacy URL unavailable');
    // Existing reviewed parser is a bounded inline-base64 caller; preserve exact raw bytes.
    const legacy=await tools.mcp__codex_apps__google_drive_fetch({url,download_raw_file:true,include_base64:true});
    return {reservation,successor,legacy};
  }
  async function fingerprint(tools,ownerEmail,messageId){
    const profile=await tools.mcp__codex_apps__gmail_get_profile({});
    await py(tools,'profile',{profile,owner_email:ownerEmail});
    const email=await tools.mcp__codex_apps__gmail_read_email({message_id:messageId,format:'raw'});
    const source=await py(tools,'source',{profile,email,owner_email:ownerEmail,message_id:messageId});
    const admission=await readers.getOwnerAdmission(tools,{matter_id:cfg.matterId,source_id:'gmail:'+messageId,consumer_id:cfg.ownerId});
    const admitted=await py(tools,'admit',{profile,email,admission,owner_email:ownerEmail,message_id:messageId});
    const evidence=await readers.readReviewEvidence(tools,{matter_id:cfg.matterId,source_id:source.source_id,source_version:source.source_version});
    return py(tools,'fingerprint',{profile,email,admission,evidence,owner_email:ownerEmail,message_id:messageId});
  }
  const denialPath=root+'/legal-parent-explicit-denial.json';
  async function denialGuard(tools,receipt=null){
    const script="import json,pathlib,sys\np=pathlib.Path("+JSON.stringify(denialPath)+")\n"+
      (receipt===null ? "sys.exit(2 if p.exists() else 0)\n" :
      "x=json.loads("+JSON.stringify(JSON.stringify(receipt))+");\ntry:\n f=p.open('x');f.write(json.dumps(x));f.close();p.chmod(0o600)\nexcept FileExistsError: pass\n");
    const out=await tools.exec_command({cmd:"python3 - <<'LEGAL_DENIAL_GUARD'\n"+script+"LEGAL_DENIAL_GUARD",max_output_tokens:500});
    if(out.exit_code!==0)throw Error('Legal effect blocked by durable explicit denial or unavailable guard; parent resolution required');
  }
  function explicitDenial(value){
    const text=typeof value==='string'?value:JSON.stringify(value);
    return /FORBIDDEN|PERMISSION_DENIED|UNAUTHORIZED|APPROVAL_REQUIRED|ACTION_DENIED|unacceptable risk|permission request.{0,80}dismissed|denied|rejected|cancelled|canceled|not authorized|requires? (?:user )?approval/i.test(text||'');
  }
  async function attempt(tools,batch){
    // Exactly one native required-revision call. Explicit denials stop and latch.
    if(![cfg.documentId,cfg.canonicalRecordId].includes(batch.document_id)||Object.keys(batch.write_control||{}).join(',')!=='requiredRevisionId')throw Error('Unapproved Legal CAS batch');
    await denialGuard(tools);
    let write;
    try {const result=await tools.mcp__codex_apps__google_drive_batch_update_document(batch);write={error:result?.isError===true,result};}
    catch(e){write={error:true,exception:String(e?.message||e)};}
    if(write.error&&explicitDenial(write)){
      await denialGuard(tools,{schema_version:1,state:'EXPLICIT_DENIAL_HOLD',document_id:batch.document_id,required_revision:batch.write_control.requiredRevisionId,reason:'Connected tool explicitly denied effect; no automatic retry or reconciliation dispatch',provider:write});
      const e=Error('Legal effect explicitly denied; stop; parent authorization resolution required');e.explicitDenial=true;e.provider=write;throw e;
    }
    return write;
  }
  async function transition(tools,operation,extra={}){
    const before=await readAll(tools);const proposed=await py(tools,'transition',{operation,before,...extra});
    if(!proposed.batch)return proposed;
    const write=await attempt(tools,proposed.batch);
    try{return {...await py(tools,'verify_transition',{operation,before,after:await readAll(tools),proposed,...extra}),write_returned_error:write.error};}
    catch(e){const err=Error('Legal reservation CAS uncertain; reconcile before effect');err.cause=e;err.provider=write;throw err;}
  }
  async function writeResult(tools,extra,allowNew=true){
    const before=await readAll(tools);const proposed=await py(tools,'write',{before,...extra});
    if(!proposed.batch)return proposed;
    if(!allowNew)throw Error('Prior Legal effect uncertain; no exact result; never replay');
    const write=await attempt(tools,proposed.batch);
    try{return {...await py(tools,'verify_write',{after:await readAll(tools),proposed,...extra}),write_returned_error:write.error};}
    catch(e){const err=Error('Legal canonical write uncertain; reconcile exact state');err.cause=e;err.provider=write;throw err;}
  }
  async function current(tools,binding){return py(tools,'current',{before:await readAll(tools),binding});}
  async function seed(tools){
    await py(tools,'validate');const before=await readAll(tools);const proposed=await py(tools,'seed',{before});
    if(!proposed.batch)return proposed;
    const write=await attempt(tools,proposed.batch);
    try{return {...await py(tools,'verify_seed',{after:await readAll(tools),proposed}),write_returned_error:write.error};}
    catch(e){const err=Error('Legal seed uncertain; inspect before registration');err.cause=e;err.provider=write;throw err;}
  }
  async function execute(tools,{ownerEmail,messageId}){
    await py(tools,'validate');
    if(!cfg.privateAllowedEmails.includes(ownerEmail)||!/^[0-9a-f]{12,32}$/.test(messageId))throw Error('Unregistered Legal source owner');
    const f=await fingerprint(tools,ownerEmail,messageId),extra={binding:f.binding,token:f.token};
    const claim=await transition(tools,'claim',extra);
    if(claim.already_recorded)return {state:'CLOSED',classification:await current(tools,f.binding),action_key:f.action_key,replayed:false,host_binding:'legal-parent-js-v1'};
    const classification=await py(tools,'classify',{payload:f.payload,binding:f.binding});
    const fresh=await fingerprint(tools,ownerEmail,messageId);
    if(fresh.fingerprint!==f.fingerprint||stable(fresh.binding)!==stable(f.binding))throw Error('Legal source/admission/evidence drift');
    const state=claim.record.state;
    if(state==='effect_confirmed'){
      if(stable(await current(tools,f.binding))!==stable(classification))throw Error('Confirmed result drift');
    }else if(state==='effect_uncertain'){
      await writeResult(tools,{...extra,classification},false);
      await transition(tools,'confirm_effect',{...extra,expected_result_sha256:(await py(tools,'hash',{value:classification})).sha256});
    }else{
      if(state!=='claimed')throw Error('Unsupported Legal recovery state');
      await transition(tools,'mark_uncertain',extra);
      const late=await fingerprint(tools,ownerEmail,messageId);
      if(late.fingerprint!==f.fingerprint||stable(late.binding)!==stable(f.binding))throw Error('Legal prewrite drift');
      await writeResult(tools,{...extra,classification});
      await transition(tools,'confirm_effect',{...extra,expected_result_sha256:(await py(tools,'hash',{value:classification})).sha256});
    }
    await transition(tools,'close',extra);
    if(stable(await current(tools,f.binding))!==stable(classification))throw Error('Closed result drift');
    return {state:'CLOSED',classification,action_key:f.action_key,replayed:false,host_binding:'legal-parent-js-v1'};
  }
  return {seed,execute,preview:async(tools,{ownerEmail,messageId})=>{await py(tools,'validate');return fingerprint(tools,ownerEmail,messageId);},inspect:tools=>transition(tools,'inspect')};
}
if(typeof module!=='undefined')module.exports={createLegalParentAdapter};

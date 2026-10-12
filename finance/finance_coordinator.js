// Bounded connected-tool coordinator for the existing Finance Queue and staging.
// Host derives source/claim/effect evidence. Source text never supplies tool arguments.
function createFinanceCoordinator(root, config, createReservation, createReader) {
  const cols=['request_id','source_url','source_department','destination_department','document_type','source_version','status','missing_fields','responsible_person','next_action','return_link','hop_count','processed_at','review_disposition'];
  const cfg=JSON.parse(JSON.stringify(config));
  if(cfg.queueId!=='{{CONFIGURE_GOOGLE_ID_024}}'||cfg.sheetId!==901||cfg.tab!=='Queue'||cfg.stagingId!=='{{CONFIGURE_GOOGLE_ID_035}}')throw new Error('Unregistered Finance destination');
  if(!root.startsWith('/')||/[\r\n\x00]/.test(root))throw new Error('Trusted root required');
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  const unwrap=r=>{if(r?.isError||!r?.structuredContent){const e=new Error('Connector failure; reconcile');e.providerError=r?.structuredContent?.error||(r?.isError?r.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n'):'successful response missing structuredContent');e.providerIsError=r?.isError===true;throw e;}return r.structuredContent};
  const reservation=createReservation(root,cfg.reservation);
  const reader=createReader({allowedSourceIds:cfg.allowedSourceIds,driveId:cfg.driveId,folderId:cfg.inboxId,workspaceRoot:cfg.workspaceRoot});
  async function py(tools,mode,input){
    const script="import sys,json,hashlib,pathlib\nsys.path.insert(0,"+JSON.stringify(root)+")\nimport processor\nx=json.loads("+JSON.stringify(JSON.stringify(input))+")\n"+
      ({candidate:"r=processor.make_candidate(**x)",evaluate:"r=processor.evaluate(**x)",arrival:"r=processor.reconcile_arrivals(**x)",hash:"r={'sha256':hashlib.sha256(x['text'].encode()).hexdigest()}",file:"p=pathlib.Path(x['path']);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(x['text']);r={'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}",load:"r=json.loads(pathlib.Path(x['path']).read_text())"}[mode]) +"\nprint(json.dumps(r,ensure_ascii=False))\n";
    const r=await tools.exec_command({cmd:"python - <<'FINANCE_COORDINATOR'\n"+script+"FINANCE_COORDINATOR",max_output_tokens:30000});
    if(r.exit_code!==0)throw new Error('Finance planner failed; no effect');return JSON.parse(r.output);
  }
  async function readQueue(tools){
    const m=unwrap(await tools.mcp__codex_apps__google_drive_get_spreadsheet_metadata({spreadsheet_id:cfg.queueId}));
    const s=m.sheets.find(x=>x.properties.title===cfg.tab);
    if(!s||s.properties.sheetId!==cfg.sheetId||s.properties.gridProperties.rowCount>3000)throw new Error('Queue shape/capacity changed');
    const r=unwrap(await tools.mcp__codex_apps__google_drive_get_spreadsheet_range({spreadsheet_id:cfg.queueId,sheet_name:cfg.tab,range:'A1:N'+s.properties.gridProperties.rowCount,value_render_option:'FORMATTED_VALUE'}));
    if(r.values?.[0]?.join('|')!==['Request ID','Document link','Source department','Destination department','Document type','Source version','Status','Missing fields','Responsible person','Next action','Return link','Hop count','Processed at','Review disposition'].join('|'))throw new Error('Queue header changed');
    return r.values;
  }
  async function claimEvidence(tools,attempt){
    const s=await reservation.inspect(tools),r=s.store.entries[attempt.action_key];
    if(!r||r.token!==attempt.token||Object.keys(r.binding).sort().join(',')!==Object.keys(attempt.binding).sort().join(',')||Object.keys(attempt.binding).some(k=>r.binding[k]!==attempt.binding[k]))throw new Error('Durable claim changed');
    return {method:'google_docs_requiredRevisionId_cas',cas_result:'UPDATED',readback_verified:true,action_key:attempt.action_key,binding:r.binding,token:r.token,state:r.state,output:r.output,record_id:cfg.reservation.documentId,prior_revision_id:attempt.prior_revision,committed_revision_id:s.revision,readback:{action_key:attempt.action_key,binding:r.binding,token:r.token,state:r.state,output:r.output,record_id:cfg.reservation.documentId,committed_revision_id:s.revision,active_key:s.store.active_key}};
  }
  async function requireActive(tools,attempt,state){const e=await claimEvidence(tools,attempt);if(e.state!==state||e.readback.active_key!==attempt.action_key)throw new Error('Writer lane unavailable');return e;}
  function equalRow(a,b){return JSON.stringify((a||[]).concat(Array(14).fill('')).slice(0,14))===JSON.stringify((b||[]).concat(Array(14).fill('')).slice(0,14));}
  async function patchQueue(tools,attempt,before,plan){
    await requireActive(tools,attempt,plan.expected_cas_state||'claimed');
    const live=await readQueue(tools);if(JSON.stringify(live)!==JSON.stringify(before))throw new Error('Queue changed before write; re-evaluate');
    let index,values,requests=[];
    if(plan.append_row_values){
      if(plan.expected_row_count!==live.length||plan.append_row_values.length!==14)throw new Error('Append bounds changed');
      index=live.length;values=plan.append_row_values;
    }else{
      index=plan.row_number-1;values=(live[index]||[]).concat(Array(14).fill('')).slice(0,14);
      if(values[6]!==plan.expected_status)throw new Error('Queue state changed');
      for(const [k,v]of Object.entries(plan.updates)){if(!cols.includes(k)||typeof v!=='string')throw new Error('Unapproved cell update');values[cols.indexOf(k)]=v;}
    }
    // Live target metadata rejects formulas/chips/validation that need separate handling.
    const cells=unwrap(await tools.mcp__codex_apps__google_drive_get_spreadsheet_cells({spreadsheet_id:cfg.queueId,ranges:[cfg.tab+'!A'+(index+1)+':N'+(index+1)],cell_fields:'userEnteredValue,dataValidation,chipRuns,userEnteredFormat'}));
    for(const s of cells.sheets||[])for(const d of s.data||[])for(const r of d.rowData||[])for(const c of r.values||[])if(c.dataValidation||c.chipRuns?.length||c.userEnteredValue?.formulaValue)throw new Error('Structured cell needs reviewed preservation');
    if(plan.append_row_values){
      requests.push({appendCells:{sheetId:cfg.sheetId,rows:[{values:values.map((v,i)=>({userEnteredValue:{stringValue:String(v)},userEnteredFormat:i===1?{textFormat:{link:{uri:String(v)}}}:{}}))}],fields:'userEnteredValue,userEnteredFormat'}});
    }else{
      for(const k of Object.keys(plan.updates)){const col=cols.indexOf(k);requests.push({updateCells:{range:{sheetId:cfg.sheetId,startRowIndex:index,endRowIndex:index+1,startColumnIndex:col,endColumnIndex:col+1},rows:[{values:[{userEnteredValue:{stringValue:values[col]}}]}],fields:'userEnteredValue'}});}
    }
    unwrap(await tools.mcp__codex_apps__google_drive_batch_update_spreadsheet({spreadsheet_id:cfg.queueId,requests}));
    const after=await readQueue(tools);
    if(plan.append_row_values){
      const hits=after.map((r,i)=>({r,i})).filter(x=>x.r[0]===values[0]);
      if(hits.length!==1||!equalRow(hits[0].r,values)||after.length<before.length+1)throw new Error('Appended Queue identity/readback mismatch; reconcile');
      index=hits[0].i;
      for(let i=0;i<before.length;i++)if(!equalRow(before[i],after[i]))throw new Error('Existing row changed during append; reconcile');
    }else{
      if(!equalRow(after[index],values)||after.length<before.length)throw new Error('Queue write readback mismatch; reconcile');
      for(let i=0;i<before.length;i++)if(i!==index&&!equalRow(before[i],after[i]))throw new Error('Unexpected neighboring row change; reconcile');
    }
    return after;
  }
  function rowSourceId(row){
    for(const value of [row?.[1],row?.[0]]){
      if(typeof value!=='string')continue;
      const direct=value.match(/^https:\/\/(?:drive\.google\.com\/file\/d|docs\.google\.com\/document\/d)\/([A-Za-z0-9_-]+)\/(?:view|edit)(?:[?#].*)?$/);
      const open=value.match(/^https:\/\/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)(?:&.*)?$/);
      if(direct||open)return (direct||open)[1];
    }
    return null;
  }
  function verifyClarificationObservation(queue,c,outputUrl){
    const cur=c.admission.current_source;
    const hits=queue.filter(row=>rowSourceId(row)===cur.id||row[0]===cur.id);
    if(hits.length!==1||hits[0][6]!=='REVIEWED'||hits[0][10]!==outputUrl||!String(hits[0][13]).includes('linked_matter='+c.admission.matter_id)||!String(hits[0][13]).includes('current_source_version='+cur.version))throw new Error('Clarification observation identity/readback mismatch; reconcile before close');
    return queue;
  }
  async function linkClarificationObservation(tools,attempt,queue,c,outputUrl){
    if(c.admission.current_source.role!=='clarification')return queue;
    const cur=c.admission.current_source,orig=c.admission.original_source;
    const hits=queue.map((r,i)=>({r,i})).filter(x=>rowSourceId(x.r)===cur.id||x.r[0]===cur.id);
    if(hits.length>1)throw new Error('Duplicate clarification observations require reconciliation');
    const disposition='observation_only=true; linked_matter='+c.admission.matter_id+'; original_request_id='+c.admission.request_id+'; original_source_id='+orig.id+'; current_source_id='+cur.id+'; current_source_version='+cur.version+'; consumer='+cfg.reservation.ownerId+'; outcome_link='+outputUrl;
    const next='Clarification consumed in the original invoice matter; do not create another invoice review';
    if(hits.length===0){
      const values=[cur.id,cur.url,'Finance Inbox','Finance','CLARIFICATION OBSERVATION',cur.version,'REVIEWED','','Charlie',next,outputUrl,'0',c.observed_at,disposition];
      return verifyClarificationObservation(await patchQueue(tools,attempt,queue,{append_row_values:values,expected_row_count:queue.length,expected_cas_state:'effect_confirmed'}),c,outputUrl);
    }
    const {r,i}=hits[0];
    if(r[6]==='REVIEWED'&&r[10]===outputUrl&&String(r[13]).includes('linked_matter='+c.admission.matter_id))return verifyClarificationObservation(queue,c,outputUrl);
    if(r[6]!=='NEEDS_OPERATOR_REVIEW'||r[10]||String(r[13]||'').includes('claim_token='))throw new Error('Clarification observation has another active disposition');
    return verifyClarificationObservation(await patchQueue(tools,attempt,queue,{row_number:i+1,expected_status:'NEEDS_OPERATOR_REVIEW',expected_cas_state:'effect_confirmed',updates:{document_type:'CLARIFICATION OBSERVATION',source_version:cur.version,status:'REVIEWED',responsible_person:'Charlie',next_action:next,return_link:outputUrl,processed_at:c.observed_at,review_disposition:String(r[13]||'')+'; '+disposition}}),c,outputUrl);
  }
  async function sourceCurrent(tools,c){
    const s=await reader.read(tools,c.admission.current_source.id);
    if(s.source_read.sha256!==c.source_read.sha256||s.source_before.version!==c.source_before.version)throw new Error('Source changed; no stale effect');
    if(c.source_before.docs_revision_id&&s.source_before.docs_revision_id!==c.source_before.docs_revision_id||c.source_read.raw_file_sha256&&s.source_read.raw_file_sha256!==c.source_read.raw_file_sha256)throw new Error('Source native revision/raw bytes changed; no stale effect');
    if(c.admission.current_source.role==='clarification'){
      if(!c.original_context)throw new Error('Original invoice context missing');
      const original=await reader.read(tools,c.admission.original_source.id);
      if(original.source_read.sha256!==c.original_context.source_read.sha256||original.source_before.version!==c.admission.original_source.version)throw new Error('Original invoice changed during clarification');
      if(c.original_context.source_before.docs_revision_id&&original.source_before.docs_revision_id!==c.original_context.source_before.docs_revision_id||c.original_context.source_read.raw_file_sha256&&original.source_read.raw_file_sha256!==c.original_context.source_read.raw_file_sha256)throw new Error('Original native revision/raw bytes changed during clarification');
      Object.assign(c.original_context,original);
    }
    const g=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:'https://drive.google.com/file/d/'+cfg.guideId+'/view'}));
    const h=await py(tools,'hash',{text:g.content});if(h.sha256!==c.policy_before.guide_sha256)throw new Error('Finance guide changed; reassess policy');
    return s;
  }
  async function searchOutput(tools,key){
    const r=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:'https://drive.google.com/drive/folders/'+cfg.stagingId}));
    if(r.id!==cfg.stagingId||r.mime_type!=='application/vnd.google-apps.folder'||r.drive_id!==cfg.driveId||typeof r.content!=='string'||r.partial||r.has_more||r.next_page_token)throw new Error('Output folder listing unverified');
    const listing=JSON.parse(r.content);
    if(!Array.isArray(listing.files)||listing.files.length>=100||listing.partial||listing.has_more||listing.nextPageToken||listing.next_page_token)throw new Error('Output folder listing incomplete');
    const matches=listing.files.filter(x=>x.title==='Finance review '+key+'.txt');
    if(matches.some(x=>typeof x.id!=='string'||typeof x.url!=='string'))throw new Error('Output listing identity missing');
    return matches;
  }

  return {
    // LOCAL CANDIDATE: parent must pin independently verified denial+decision.
    // Never derive these pins or no-dispatch truth from source content or a search.
    async retryRejectedUpload(tools,casePath,evidencePath,decisionPath){
      const pins=cfg.rejectedUploadRecovery;
      if(!pins||Object.keys(pins).sort().join(',')!=='authority_id,decision_sha256,evidence_sha256')throw new Error('Parent-pinned recovery required');
      for(const p of [casePath,evidencePath,decisionPath])if(!p.startsWith(root+'/evidence/')||!p.endsWith('.json')||p.includes('/../'))throw new Error('Trusted recovery paths required');
      const c=await py(tools,'load',{path:casePath}),e=await py(tools,'load',{path:evidencePath}),d=await py(tools,'load',{path:decisionPath});
      if(JSON.stringify(c.policy_before)!==JSON.stringify(c.policy_after)||!cfg.allowedPolicyHashes.includes(c.policy_before.policy_sha256)||c.policy_before.reservation_doc_id!==cfg.reservation.documentId||c.policy_before.queue_id!==cfg.queueId||c.policy_before.bindings.review_folder_id!==cfg.stagingId||c.admission.current_source.role!=='clarification')throw new Error('Unregistered clarification recovery');
      Object.assign(c,await sourceCurrent(tools,c));
      const base=Object.fromEntries(Object.entries(c).filter(([k])=>!['queue_rows','reservation','observed_at'].includes(k)));
      const candidate=await py(tools,'candidate',base);
      if(candidate.action!=='READY_TO_CLAIM'||candidate.binding.queue_id!==cfg.queueId||candidate.binding.output_parent_id!==cfg.stagingId||candidate.binding.consumer_id!==cfg.reservation.ownerId)throw new Error('Recovery candidate held');
      const prior=await reservation.inspect(tools),r=prior.store.entries[candidate.action_key];
      if(!r||r.state!=='effect_uncertain'||r.rejected_upload_retry||prior.store.active_key!==candidate.action_key||Object.keys(candidate.binding).some(k=>r.binding[k]!==candidate.binding[k]))throw new Error('Original uncertain claim unavailable or retry consumed');
      const filePath=root+'/bo03-sources/output-'+candidate.action_key+'.txt';
      if(e.upload?.file_uri!==filePath||e.payload_sha256!==candidate.artifact_sha256)throw new Error('Original rejected payload/path changed');
      const check="import pathlib,hashlib,json\np=pathlib.Path("+JSON.stringify(filePath)+");assert p.is_file() and not p.is_symlink();b=p.read_bytes();print(json.dumps({'sha256':hashlib.sha256(b).hexdigest()}))\n";
      async function verifyBytes(){const x=await tools.exec_command({cmd:"python - <<'CHECK_RETRY_BYTES'\n"+check+"CHECK_RETRY_BYTES",max_output_tokens:200});if(x.exit_code!==0||JSON.parse(x.output).sha256!==e.payload_sha256)throw new Error('Original upload bytes changed');}
      await verifyBytes();
      const queue=await readQueue(tools),rows=queue.filter(x=>x[0]===r.binding.request_id);
      if(rows.length!==1||rows[0][6]!=='PROCESSING'||rows[0][1]!==c.admission.original_source.url||rows[0][5]!==c.admission.original_source.version||rows[0][2]!=='Finance Inbox'||rows[0][3]!=='Finance')throw new Error('Original processing row changed');
      const tail=String(rows[0][13]).split(' || NEXT_ATTEMPT || ').pop();
      const parts=tail.split('; ').map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]);
      const markerKeys=['consumer','claim_token','action_key','matter','original_source_id','original_source_version','current_source_id','current_source_version','source_sha256','policy_version','output_state','attempt_count','prior_output_url'];
      if(parts.length!==markerKeys.length||new Set(parts.map(x=>x[0])).size!==parts.length||parts.some(x=>!markerKeys.includes(x[0])))throw new Error('Contradictory Queue markers');
      const markers=Object.fromEntries(parts);
      if(markers.claim_token!==r.token||markers.action_key!==candidate.action_key||markers.current_source_id!==r.binding.source_id||markers.source_sha256!==r.binding.source_sha256||markers.consumer!==cfg.reservation.ownerId||markers.matter!==r.binding.matter_id||markers.current_source_version!==r.binding.source_version||markers.policy_version!==c.policy_before.version||markers.original_source_id!==c.admission.original_source.id||markers.original_source_version!==c.admission.original_source.version||markers.output_state!=='NOT_ATTEMPTED'||markers.attempt_count!=='0'||markers.output_id||markers.output_sha256||markers.outcome)throw new Error('Queue original attempt mismatch');
      if(queue.filter(x=>String(x[13]).includes('claim_token='+r.token)).length!==1||tail.split('claim_token='+r.token).length!==2)throw new Error('Duplicate Queue attempt');
      const priorOutcomes=Object.values(prior.store.entries).filter(x=>x.state==='closed'&&x.binding.source_id===c.admission.original_source.id&&x.binding.source_version===c.admission.original_source.version&&x.binding.matter_id===r.binding.matter_id&&x.binding.operation==='review_staging');
      if(priorOutcomes.length!==1||priorOutcomes[0].output?.parent_id!==cfg.stagingId||markers.prior_output_url!==rows[0][10]||rowSourceId([null,rows[0][10]])!==priorOutcomes[0].output.id)throw new Error('Prior result/history changed');
      if((await searchOutput(tools,candidate.action_key)).length)throw new Error('Existing output; reconcile only');
      const attempt={action_key:candidate.action_key,binding:r.binding,token:r.token,prior_revision:prior.revision};
      // Exactly this invocation must win/read back the CAS. Failure never uploads.
      await reservation.transition(tools,{operation:'consume_rejected_upload_retry',binding:r.binding,token:r.token,evidence:e,decision:d,trusted_recovery:pins});
      const fresh=await reservation.inspect(tools),receipt=fresh.store.entries[candidate.action_key]?.rejected_upload_retry;
      if(fresh.store.active_key!==candidate.action_key||fresh.store.entries[candidate.action_key]?.state!=='effect_uncertain'||receipt?.decision_sha256!==pins.decision_sha256||receipt?.retry_invocation_id!==d.retry_invocation_id)throw new Error('Retry consumption readback changed; hold');
      await sourceCurrent(tools,c);await verifyBytes();
      if((await searchOutput(tools,candidate.action_key)).length)throw new Error('Output appeared after consumption; reconcile only');
      const beforeUpload=await reservation.inspect(tools),live=beforeUpload.store.entries[candidate.action_key];
      if(beforeUpload.store.active_key!==candidate.action_key||live?.state!=='effect_uncertain'||live.token!==r.token||JSON.stringify(live.binding)!==JSON.stringify(r.binding)||JSON.stringify(live.rejected_upload_retry)!==JSON.stringify(receipt))throw new Error('Retry receipt/claim changed before upload');
      const created=unwrap(await tools.mcp__codex_apps__google_drive_upload_file(e.upload));
      if(!created.id)throw new Error('Retry result uncertain; no replay');
      // Existing reconciliation verifies complete bytes, then links/settles once.
      return this.reconcileCreatedOutput(tools,casePath,created.id);
    },
    async reconcileCreatedOutput(tools,casePath,providerOutputId){
      if(!casePath.startsWith(root+'/evidence/')||!casePath.endsWith('.json')||!/^[A-Za-z0-9_-]+$/.test(providerOutputId))throw new Error('Exact reviewed case/provider ID required');
      const c=await py(tools,'load',{path:casePath});
      if(!cfg.allowedPolicyHashes.includes(c.policy_before.policy_sha256)||c.policy_before.reservation_doc_id!==cfg.reservation.documentId)throw new Error('Unregistered recovery policy');
      Object.assign(c,await sourceCurrent(tools,c));
      const base=Object.fromEntries(Object.entries(c).filter(([k])=>!['queue_rows','reservation','observed_at'].includes(k)));
      const candidate=await py(tools,'candidate',base);if(candidate.action!=='READY_TO_CLAIM')throw new Error('Recovery source/policy held: '+candidate.reason);
      const prior=await reservation.inspect(tools),r=prior.store.entries[candidate.action_key];
      if(!r||!['effect_uncertain','effect_confirmed','closed'].includes(r.state)||Object.keys(candidate.binding).some(k=>r.binding[k]!==candidate.binding[k]))throw new Error('No matching effect reservation');
      const attempt={action_key:candidate.action_key,binding:r.binding,token:r.token,prior_revision:prior.revision};
      const found=await searchOutput(tools,attempt.action_key);
      if(found.length!==1||found[0].id!==providerOutputId)throw new Error('Expected single provider output not yet reconciled');
      const meta=unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:providerOutputId,fields:'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',supportsAllDrives:true}));
      if(meta.id!==providerOutputId||JSON.stringify(meta.parent_ids)!==JSON.stringify([cfg.stagingId])||meta.mime_type!=='text/plain')throw new Error('Recovery output scope mismatch');
      const raw=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:meta.url,download_raw_file:true,include_base64:false}));
      if(raw.id!==providerOutputId||!Number.isSafeInteger(raw.file_size_bytes)||raw.file_size_bytes<1||raw.file_size_bytes>2097152)throw new Error('Complete output stream unavailable');
      const fileId=raw.file_uri?.file_id?.replace(/^sediment:\/\//,'');if(!/^file_[A-Za-z0-9_-]+$/.test(fileId||''))throw new Error('Invalid output stream');
      const local=await tools.download_file({file_id:fileId});if(local.size_bytes!==raw.file_size_bytes)throw new Error('Output byte mismatch');
      const code="import pathlib,hashlib,json\np=pathlib.Path("+JSON.stringify(local.path)+").resolve();assert p.is_relative_to(pathlib.Path("+JSON.stringify(cfg.workspaceRoot)+").resolve())\nb=p.read_bytes();b.decode('utf-8');print(json.dumps({'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}))\n";
      const hr=await tools.exec_command({cmd:"python - <<'FINANCE_OUTPUT_READ'\n"+code+"FINANCE_OUTPUT_READ",max_output_tokens:300});if(hr.exit_code!==0)throw new Error('Unreadable complete output');
      const hash=JSON.parse(hr.output);if(hash.sha256!==candidate.artifact_sha256||hash.bytes!==raw.file_size_bytes)throw new Error('Output is not exact reviewed payload');
      const out={id:providerOutputId,parent_id:cfg.stagingId,content_sha256:hash.sha256};
      if(r.state==='effect_uncertain')await reservation.transition(tools,{operation:'confirm_effect',binding:r.binding,token:r.token,output:out});
      else if(JSON.stringify(r.output)!==JSON.stringify(out)&&Object.keys(out).some(k=>r.output?.[k]!==out[k]))throw new Error('Durable output receipt conflict');
      let queue=await readQueue(tools),res=await claimEvidence(tools,attempt);
      if(r.state==='closed'){
        const hits=queue.filter(x=>x[0]===r.binding.request_id);if(hits.length!==1||!['READY_FOR_REVIEW','MISSING_DATA','EXCEPTION'].includes(hits[0][6])||!String(hits[0][10]).includes(providerOutputId))throw new Error('Closed Queue outcome mismatch');
        if(c.admission.current_source.role==='clarification')verifyClarificationObservation(queue,c,meta.url);
        return {action:'VERIFIED_EXISTING_OUTCOME',action_key:attempt.action_key,status:hits[0][6],output_id:out.id,output_url:meta.url,claim_state:'closed'};
      }
      const matches=queue.filter(x=>String(x[13]||'').includes('claim_token='+attempt.token));if(matches.length!==1)throw new Error('Recovery claim is not unique');
      const terminalRows=queue.map((row,i)=>({row,i})).filter(x=>x.row[0]===r.binding.request_id);
      if(r.state==='effect_confirmed'&&terminalRows.length===1&&terminalRows[0].row[6]===candidate.review.status&&String(terminalRows[0].row[10]).includes(providerOutputId)&&String(terminalRows[0].row[13]).includes('output_sha256='+hash.sha256)){
        c.observed_at=new Date().toISOString();
        queue=await linkClarificationObservation(tools,attempt,queue,c,meta.url);
        const row=queue[terminalRows[0].i],qh=await py(tools,'hash',{text:JSON.stringify(row)});
        await reservation.transition(tools,{operation:'close',binding:r.binding,token:r.token,queue_receipt:{row_key:r.binding.request_id,output_id:out.id,values_sha256:qh.sha256}});
        const settled=await reservation.inspect(tools);if(settled.store.active_key!==null||settled.store.entries[attempt.action_key].state!=='closed')throw new Error('Completed Queue claim closure unverified');
        return {action:'VERIFIED_EXISTING_QUEUE_OUTCOME_SETTLED',status:row[6],row_number:terminalRows[0].i+1,source_id:r.binding.source_id,matter_id:r.binding.matter_id,action_key:attempt.action_key,output_id:out.id,output_url:meta.url,output_sha256:hash.sha256,claim_state:'closed',observed_at:new Date().toISOString()};
      }
      c.queue_rows=queue;c.reservation=res;c.observed_at=new Date().toISOString();c.effects={known_invoice_keys:[],claim:{unique:true,token:attempt.token,action_key:attempt.action_key,source_id:r.binding.source_id,source_version:r.binding.source_version,policy_version:c.policy_before.version,consumer_id:cfg.reservation.ownerId,matter_id:r.binding.matter_id},output:{state:'CREATED',search_state:'ONE',candidates:[{id:out.id,url:meta.url,parent_ids:meta.parent_ids,action_key:attempt.action_key,content_sha256:hash.sha256}]},output_readback:{complete:true,id:out.id,parent_id:cfg.stagingId,action_key:attempt.action_key,content_sha256:hash.sha256}};
      const decision=await py(tools,'evaluate',c);if(decision.action!=='FINALIZE_AFTER_OUTPUT_READBACK')throw new Error('Recovery finalization held: '+JSON.stringify(decision));
      decision.patch_plan.expected_cas_state='effect_confirmed';queue=await patchQueue(tools,attempt,queue,decision.patch_plan);
      queue=await linkClarificationObservation(tools,attempt,queue,c,meta.url);
      const qh=await py(tools,'hash',{text:JSON.stringify(queue[decision.row_number-1])});
      await reservation.transition(tools,{operation:'close',binding:r.binding,token:r.token,queue_receipt:{row_key:r.binding.request_id,output_id:out.id,values_sha256:qh.sha256}});
      const settled=await reservation.inspect(tools);if(settled.store.active_key!==null||settled.store.entries[attempt.action_key].state!=='closed')throw new Error('Recovery closure unreadable');
      return {action:'VERIFIED_REVIEW_COMPLETE_AFTER_RECONCILIATION',status:decision.status,row_number:decision.row_number,source_id:r.binding.source_id,matter_id:r.binding.matter_id,request_id:r.binding.request_id,action_key:attempt.action_key,output_id:out.id,output_url:meta.url,output_sha256:hash.sha256,source_sha256:r.binding.source_sha256,claim_state:'closed',observed_at:c.observed_at};
    },
    // Exact reviewed case only; the background sweep must construct admissions through
    // its approved source policy, then call this same path. No external communication.
    async reviewCase(tools,casePath,recovery=null){
      if(!casePath.startsWith(root+'/evidence/')||!casePath.endsWith('.json'))throw new Error('Trusted admitted case path required');
      return this.reviewAdmittedCase(tools,await py(tools,'load',{path:casePath}),recovery);
    },
    // Current cloud admissions enter in memory; historical file callers retain their contract.
    async reviewAdmittedCase(tools,admittedCase,recovery=null){
      let c=JSON.parse(JSON.stringify(admittedCase));
      if(JSON.stringify(c.policy_before)!==JSON.stringify(c.policy_after)||!cfg.allowedPolicyHashes.includes(c.policy_before.policy_sha256)||c.policy_before.queue_id!==cfg.queueId||c.policy_before.bindings.review_folder_id!==cfg.stagingId)throw new Error('Unregistered current policy');
      if(c.policy_before.consumer_id!==cfg.reservation.ownerId||c.policy_before.reservation_doc_id!==cfg.reservation.documentId||c.policy_before.bindings.finance_inbox_id!==cfg.inboxId||c.policy_before.bindings.finance_drive_id!==cfg.driveId||c.policy_before.bindings.guide_file_id!==cfg.guideId)throw new Error('Finance current consumer/record bindings changed');
      const fresh=await sourceCurrent(tools,c);Object.assign(c,fresh);
      const base=Object.fromEntries(Object.entries(c).filter(([k])=>!['queue_rows','reservation','observed_at','original_context'].includes(k)));
      if(c.original_context)base.original_context=c.original_context;
      const candidate=await py(tools,'candidate',base);if(candidate.action!=='READY_TO_CLAIM')throw new Error('Candidate held: '+candidate.reason);
      const prior=await reservation.inspect(tools);
      const existingClaim=prior.store.entries[candidate.action_key];let processingRecovery=false;
      if((prior.store.active_key!==null||existingClaim)&&!recovery)return {action:'RECONCILE_EXISTING_RESERVATION',action_key:candidate.action_key,record:existingClaim||null};
      const rand=await tools.exec_command({cmd:'python -c "import secrets;print(secrets.token_hex(32))"',max_output_tokens:100});if(rand.exit_code!==0)throw new Error('Token unavailable');
      const attempt={action_key:candidate.action_key,binding:candidate.binding,token:rand.output.trim(),prior_revision:prior.revision};
      if(recovery){
        if(Object.keys(recovery).sort().join(',')!=='evidence_sha256,expected_token'||!/^[0-9a-f]{64}$/.test(recovery.evidence_sha256)||!existingClaim||existingClaim.state!=='claimed'||prior.store.active_key!==candidate.action_key||existingClaim.token!==recovery.expected_token)throw new Error('Recovery evidence/claim mismatch');
        const rq=await readQueue(tools),hits=rq.filter(r=>r[0]===candidate.binding.request_id);
        if(hits.length!==1||!['STAGED','PROCESSING'].includes(hits[0][6])||hits[0][10]||hits[0][5]!==candidate.binding.source_version)throw new Error('Only verified pre-effect admission/claim may resume here');
        processingRecovery=hits[0][6]==='PROCESSING';
        if(processingRecovery){
          const markers=Object.fromEntries(String(hits[0][13]||'').split(' || NEXT_ATTEMPT || ').pop().split('; ').filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
          if(markers.claim_token!==existingClaim.token||markers.action_key!==candidate.action_key||markers.source_sha256!==candidate.binding.source_sha256||markers.consumer!==cfg.reservation.ownerId||markers.current_source_id!==candidate.binding.source_id||markers.current_source_version!==candidate.binding.source_version||markers.output_state!=='NOT_ATTEMPTED'||markers.attempt_count!=='0')throw new Error('Pre-effect Queue claim does not match old fenced attempt');
        }
        await reservation.transition(tools,{operation:'resume_claimed',binding:attempt.binding,token:existingClaim.token,new_token:attempt.token,recovery:{reason:'completed_invocation_admission_readback',evidence_sha256:recovery.evidence_sha256}});
      }else await reservation.transition(tools,{operation:'claim',binding:attempt.binding,token:attempt.token});
      let res=await requireActive(tools,attempt,'claimed'),queue=await readQueue(tools);
      if(processingRecovery){
        const index=queue.findIndex(x=>x[0]===candidate.binding.request_id),row=queue[index];
        if(index<0||row[6]!=='PROCESSING'||row[10])throw new Error('Processing row changed during token fencing');
        const pieces=String(row[13]).split('; '),old='claim_token='+recovery.expected_token;
        if(pieces.filter(x=>x===old).length!==1)throw new Error('Old Queue token is ambiguous');
        const disposition=pieces.map(x=>x===old?'claim_token='+attempt.token:x).join('; ')+'; resumed_from_token='+recovery.expected_token+'; recovery_evidence_sha256='+recovery.evidence_sha256;
        queue=await patchQueue(tools,attempt,queue,{row_number:index+1,expected_status:'PROCESSING',updates:{responsible_person:'Charlie',review_disposition:disposition}});
      }
      if(c.admission.current_source.role==='original'){
        const md={...fresh.source_before,web_view_link:fresh.source_before.url,source_sha256:fresh.source_read.sha256};
        const reg=await py(tools,'arrival',{policy:c.policy_before,queue_rows:queue,metadata:md,reservation:res});
        if(!['ADMIT_EXISTING_ROW','APPEND_ADMITTED_ROW','ALREADY_REGISTERED'].includes(reg.action))throw new Error('Queue admission held: '+JSON.stringify(reg));
        if(reg.action!=='ALREADY_REGISTERED')queue=await patchQueue(tools,attempt,queue,reg.patch_plan);
      }
      c.queue_rows=queue;c.reservation=res;c.observed_at=new Date().toISOString();
      let decision;
      if(!processingRecovery){
        decision=await py(tools,'evaluate',c);if(decision.action!=='CLAIM_PATCH_ONLY')throw new Error('Queue claim held: '+JSON.stringify(decision));
        queue=await patchQueue(tools,attempt,queue,decision.patch_plan);
      }
      const matches=queue.filter(r=>String(r[13]||'').includes('claim_token='+attempt.token));if(matches.length!==1)throw new Error('Claim not unique');
      const effects={known_invoice_keys:c.effects.known_invoice_keys||[],claim:{unique:true,token:attempt.token,action_key:attempt.action_key,source_id:attempt.binding.source_id,source_version:attempt.binding.source_version,policy_version:c.policy_before.version,consumer_id:cfg.reservation.ownerId,matter_id:attempt.binding.matter_id},output:{state:'NOT_ATTEMPTED',search_state:'ZERO',candidates:[]}};
      const existing=await searchOutput(tools,attempt.action_key);if(existing.length)throw new Error('Existing output requires reconciliation, never another create');
      c.queue_rows=queue;c.reservation=await requireActive(tools,attempt,'claimed');c.effects=effects;
      decision=await py(tools,'evaluate',c);if(decision.action!=='CREATE_REVIEW_OUTPUT')throw new Error('Output held: '+JSON.stringify(decision));
      await sourceCurrent(tools,c);
      const file=await py(tools,'file',{path:root+'/bo03-sources/output-'+attempt.action_key+'.txt',text:decision.artifact_text});if(file.sha256!==decision.artifact_sha256)throw new Error('Rendered artifact changed');
      await reservation.transition(tools,{operation:'mark_uncertain',binding:attempt.binding,token:attempt.token});
      await requireActive(tools,attempt,'effect_uncertain');
      const created=unwrap(await tools.mcp__codex_apps__google_drive_upload_file({file_name:'Finance review '+attempt.action_key+'.txt',file_uri:file.path,mime_type:'text/plain',parent_folder_id:cfg.stagingId}));
      if(!created.id)throw new Error('Uncertain create: no provider ID; do not retry');
      const meta=unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:created.id,fields:'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',supportsAllDrives:true}));
      if(JSON.stringify(meta.parent_ids)!==JSON.stringify([cfg.stagingId])||meta.mime_type!=='text/plain')throw new Error('Output destination/type mismatch');
      const content=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:meta.url}));
      const h=await py(tools,'hash',{text:content.content});if(h.sha256!==decision.artifact_sha256)throw new Error('Output full-text readback mismatch');
      const out={id:created.id,parent_id:cfg.stagingId,content_sha256:h.sha256};
      await reservation.transition(tools,{operation:'confirm_effect',binding:attempt.binding,token:attempt.token,output:out});
      await sourceCurrent(tools,c);
      queue=await readQueue(tools);res=await requireActive(tools,attempt,'effect_confirmed');
      c.queue_rows=queue;c.reservation=res;c.observed_at=new Date().toISOString();c.effects={...effects,output:{state:'CREATED',search_state:'ONE',candidates:[{id:out.id,url:meta.url,parent_ids:meta.parent_ids,action_key:attempt.action_key,content_sha256:h.sha256}]},output_readback:{complete:true,id:out.id,parent_id:cfg.stagingId,action_key:attempt.action_key,content_sha256:h.sha256}};
      decision=await py(tools,'evaluate',c);if(decision.action!=='FINALIZE_AFTER_OUTPUT_READBACK')throw new Error('Finalization held: '+JSON.stringify(decision));
      decision.patch_plan.expected_cas_state='effect_confirmed';queue=await patchQueue(tools,attempt,queue,decision.patch_plan);
      queue=await linkClarificationObservation(tools,attempt,queue,c,meta.url);
      const row=queue[decision.row_number-1],qh=await py(tools,'hash',{text:JSON.stringify(row)});
      await reservation.transition(tools,{operation:'close',binding:attempt.binding,token:attempt.token,queue_receipt:{row_key:attempt.binding.request_id,output_id:out.id,values_sha256:qh.sha256}});
      const terminal=await reservation.inspect(tools);if(terminal.store.active_key!==null||terminal.store.entries[attempt.action_key].state!=='closed')throw new Error('Claim closure unverified');
      return {action:'VERIFIED_REVIEW_COMPLETE',status:decision.status,source_id:attempt.binding.source_id,matter_id:attempt.binding.matter_id,request_id:attempt.binding.request_id,action_key:attempt.action_key,row_number:decision.row_number,output_id:out.id,output_url:meta.url,output_sha256:h.sha256,source_sha256:attempt.binding.source_sha256,claim_state:'closed',observed_at:c.observed_at};
    }
  };
}

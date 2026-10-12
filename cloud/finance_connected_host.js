// Concrete Finance provider composition, using current normalized Google connector
// responses and the accepted CAS/coordinator. No watcher, credentials or new store.
function createFinanceConnectedHost(bundleRoot, registration, continuationContext=null) {
  const reg=JSON.parse(JSON.stringify(registration)),root=bundleRoot.replace(/\/$/,'')+'/finance-bridge';
  const clone=x=>JSON.parse(JSON.stringify(x)),stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
  const continuation=continuationContext===null?null:clone(continuationContext);
  if(continuation!==null){
    const fields='action_key,approval_ref,evidence_sha256,expected_token,expires_at,policy_sha256,source_id,source_sha256,source_version,valid_from';
    if(!continuation||Object.keys(continuation).sort().join(',')!=='approved_authority_ref,expected_token,grant'||!continuation.grant||Object.keys(continuation.grant).sort().join(',')!==fields||!/^Sentinel_[a-f0-9]{32}$/.test(continuation.approved_authority_ref)||continuation.grant.approval_ref!==continuation.approved_authority_ref||continuation.grant.expected_token!==continuation.expected_token||!['action_key','source_sha256','policy_sha256','expected_token','evidence_sha256'].every(k=>/^[a-f0-9]{64}$/.test(continuation.grant[k]||'')))throw Error('EXACT_INDEPENDENT_CONTINUATION_CONTEXT_REQUIRED');
  }
  const required=['consumer_id','principal_id','principal_email','queue_id','sheet_id','tab','inbox_id','drive_id','staging_id','config','guide','reservation','workspace_root','excluded_fixture_ids','max_items','trigger_id','installation'];
  if(!bundleRoot.startsWith('/')||/[\x00-\x1f\x7f]/.test(bundleRoot)||required.some(k=>!(k in reg))||!Array.isArray(reg.excluded_fixture_ids)||!Number.isInteger(reg.max_items)||reg.max_items<1||reg.max_items>10)throw Error('Exact bounded Finance registration required');
  const unwrap=r=>{if(r?.isError||!r?.structuredContent)throw Error('CONNECTED_READ_UNAVAILABLE');return r.structuredContent;};
  const sourceUrlId=v=>typeof v==='string'?(v.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)\/(?:view|preview)(?:\?[^#\s]*)?(?:#[^\s]*)?$/)||v.match(/^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)\/(?:edit|view|preview)(?:\?[^#\s]*)?(?:#[^\s]*)?$/))?.[1]||null:null;
  const reservation=createFinanceReservationAdapter(root,reg.reservation);
  async function plan(tools,operation,input){
    const result=await tools.exec_command({cmd:`python3 ${q(root+'/connected_plan.py')} <<'FINANCE_CONNECTED_PLAN'\n${JSON.stringify({operation,...input})}\nFINANCE_CONNECTED_PLAN`,max_output_tokens:30000});
    if(result.exit_code!==0)throw Error('FINANCE_CONNECTED_PLANNER_FAILED');return JSON.parse(result.output);
  }
  const metadata=(tools,id)=>tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:id,fields:'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',supportsAllDrives:true});
  async function currentPolicy(tools){
    const [profile,cm,gm]=await Promise.all([tools.mcp__codex_apps__google_drive_get_profile({}),metadata(tools,reg.config.id),metadata(tools,reg.guide.id)]);
    const configMetadata=unwrap(cm),guideMetadata=unwrap(gm);
    if(configMetadata.id!==reg.config.id||guideMetadata.id!==reg.guide.id)throw Error('POLICY_SOURCE_ID_CHANGED');
    const [config,guide]=await Promise.all([tools.mcp__codex_apps__google_drive_fetch({url:configMetadata.url}),tools.mcp__codex_apps__google_drive_fetch({url:guideMetadata.url})]);
    const [ca,ga]=await Promise.all([metadata(tools,reg.config.id),metadata(tools,reg.guide.id)]);
    if(stable(unwrap(ca))!==stable(configMetadata)||stable(unwrap(ga))!==stable(guideMetadata))throw Error('POLICY_SOURCE_DRIFT');
    const result=await plan(tools,'normalize',{registration:reg,profile,config_metadata:cm,guide_metadata:gm,config,guide});
    return result;
  }
  async function readQueue(tools){
    const m=unwrap(await tools.mcp__codex_apps__google_drive_get_spreadsheet_metadata({spreadsheet_id:reg.queue_id}));
    if(m.spreadsheetId!==reg.queue_id)throw Error('QUEUE_ID_CHANGED');
    const sheet=m.sheets?.find(s=>s.properties?.title===reg.tab),count=sheet?.properties?.gridProperties?.rowCount;
    if(sheet?.properties?.sheetId!==reg.sheet_id||!Number.isInteger(count)||count<1||count>3000)throw Error('QUEUE_SHAPE_OR_CAPACITY_CHANGED');
    const values=unwrap(await tools.mcp__codex_apps__google_drive_get_spreadsheet_range({spreadsheet_id:reg.queue_id,sheet_name:reg.tab,range:'A1:N'+count,value_render_option:'FORMATTED_VALUE'})).values;
    const header=['Request ID','Document link','Source department','Destination department','Document type','Source version','Status','Missing fields','Responsible person','Next action','Return link','Hop count','Processed at','Review disposition'];
    if(!Array.isArray(values)||stable(values[0])!==stable(header))throw Error('QUEUE_HEADER_CHANGED');return values;
  }
  function sourceReader(id,folder=reg.inbox_id){const c={allowedSourceIds:[id],driveId:reg.drive_id,folderId:folder,workspaceRoot:reg.workspace_root},formats=reg.processor_policy?.supported_mime_types||[];if(folder!==reg.inbox_id||formats.every(x=>['text/plain','text/markdown'].includes(x)))return createFinanceTextReader(c);return createFinancePracticalSourceReader(c,root,{pdf:formats.includes('application/pdf'),nativeDocs:formats.includes('application/vnd.google-apps.document')});}
  async function completeSource(tools,id,version){
    const m=unwrap(await metadata(tools,id));
    if(m.id!==id||m.modified_time!==version||m.drive_id!==reg.drive_id||stable(m.parent_ids)!==stable([reg.inbox_id])){const e=Error('SOURCE_ID_PARENT_DRIVE_VERSION_CHANGED');e.blocked=true;throw e;}
    if(!(reg.processor_policy?.supported_mime_types||[]).includes(m.mime_type)){const e=Error('SOURCE_FORMAT_UNSUPPORTED:'+m.mime_type);e.blocked=true;throw e;}
    let source;
    try{source=await sourceReader(id).read(tools,id);}catch(e){if(/changed|drift|mismatch|wrong format|incomplete|unreadable|bounded complete|binary content|source held/i.test(e.message||''))e.blocked=true;throw e;}
    if(source.source_before.version!==version){const e=Error('SOURCE_CHANGED_DURING_ADMISSION');e.blocked=true;throw e;}
    return {metadata:m,source};
  }
  async function readOutput(tools,record){
    const out=record.output;if(!out||out.parent_id!==reg.staging_id)throw Error('STAGING_OUTPUT_BINDING_MISSING');
    const source=await sourceReader(out.id,reg.staging_id).read(tools,out.id);
    if(source.source_read.sha256!==out.content_sha256)throw Error('STAGING_OUTPUT_HASH_CHANGED');
    return {id:out.id,sha256:out.content_sha256,url:source.source_before.url,text:source.source_text};
  }
  function intakeProvenance(output,record){
    const b=record.binding;
    if(reg.excluded_fixture_ids.includes(b.source_id))return {mode:'SYNTHETIC',historical_fixture:true,source_id:b.source_id,source_version:b.source_version,source_sha256:b.source_sha256};
    const lines=output.text.match(/^Intake provenance: (.+)$/gm)||[];
    if(lines.length!==1)throw Error('HISTORICAL_INTAKE_PROVENANCE_UNVERIFIED');
    let p;try{p=JSON.parse(lines[0].slice('Intake provenance: '.length));}catch(e){throw Error('INTAKE_PROVENANCE_UNREADABLE');}
    if(!p||typeof p!=='object'||Array.isArray(p))throw Error('INTAKE_PROVENANCE_UNREADABLE');
    const expected=['mode','source_id','source_version','source_sha256','authority_ref'].concat(p.mode==='SYNTHETIC'?['test_id','valid_from','expires_at']:[]).sort().join(',');
    if(!p||Object.keys(p).sort().join(',')!==expected||!['LIVE','SYNTHETIC'].includes(p.mode)||p.source_id!==b.source_id||p.source_version!==b.source_version||p.source_sha256!==b.source_sha256||typeof p.authority_ref!=='string'||!p.authority_ref||!output.text.includes('\nIntake mode: '+p.mode+'\n'))throw Error('INTAKE_PROVENANCE_BINDING_CHANGED');
    if(p.mode==='SYNTHETIC'&&(p.authority_ref!=='EXAMPLE_AUTHORITY_REFERENCE'||typeof p.test_id!=='string'||!p.test_id||!Number.isFinite(p.valid_from)||!Number.isFinite(p.expires_at)||p.expires_at!==p.valid_from+600||!output.text.includes('TEST ONLY / NOT A REAL PAYABLE')))throw Error('SYNTHETIC_PROVENANCE_UNVERIFIED');
    if(p.mode==='LIVE'&&p.authority_ref!==reg.approval_reference)throw Error('LIVE_PROVENANCE_AUTHORITY_CHANGED');
    // A past execution grant may expire. Immutable output/Queue receipts keep
    // its mode; expiry never converts a completed synthetic result into live.
    return p;
  }
  async function readContinuation(tools,a){
    if(a.route!=='finance')throw Object.assign(Error('APPROVED_'+String(a.route).toUpperCase()+'_CONTINUATION_RECORD_BINDING'),{missing:true});
    const ledger=await reservation.inspect(tools),entries=ledger.store.entries,r=entries[a.effect_key];
    if(!r){
      const related=Object.entries(entries).filter(([,r])=>r.binding.source_id===a.source.id);
      if(related.length||ledger.store.active_key!==null)return {effect_key:a.effect_key,verified:true,state:'EXISTING_RECORD_REQUIRES_RECONCILIATION',effect_state:'RETAINED',result:{keys:related.map(([k])=>k),active_key:ledger.store.active_key}};
      const rows=await readQueue(tools);
      const currentMetadata=unwrap(await metadata(tools,a.source.id));
      if(currentMetadata.id!==a.source.id||currentMetadata.modified_time!==a.source.version)throw Object.assign(Error('CONTINUATION_SOURCE_VERSION_CHANGED'),{blocked:true});
      const assessed=await plan(tools,'assess',{metadata:currentMetadata,queue_rows:rows,reservation:ledger.store,registration:reg});
      if(assessed.status!=='ELIGIBLE_METADATA_ONLY')return {effect_key:a.effect_key,verified:true,state:'EXISTING_QUEUE_REQUIRES_RECONCILIATION',effect_state:'RETAINED',result:assessed};
      return {effect_key:a.effect_key,verified:true,state:'UNCLAIMED',effect_state:'NOT_ATTEMPTED',revision:ledger.revision,result:null};
    }
    if(r.binding.source_id!==a.source.id||r.binding.source_version!==a.source.version||r.binding.source_sha256!==a.source.sha256)throw Error('CONTINUATION_SOURCE_BINDING_CHANGED');
    if(r.state!=='closed')return {effect_key:a.effect_key,verified:true,state:r.state,effect_state:r.state,result:clone(r)};
    const rows=await readQueue(tools),hits=rows.filter(row=>row[0]===r.queue_receipt.row_key);
    if(hits.length!==1)throw Error('TERMINAL_QUEUE_IDENTITY_AMBIGUOUS');
    const row=hits[0].concat(Array(14).fill('')).slice(0,14);
    // Later clarification may supersede the original outcome. Verify current canonical
    // result and retain earlier closure, without reopening either effect.
    const terminalEntries=Object.entries(entries).filter(([,e])=>e.state==='closed'&&e.binding.matter_id===r.binding.matter_id&&e.queue_receipt?.row_key===row[0]&&row[10]?.includes('/'+e.output.id+'/'));
    if(terminalEntries.length!==1||!['READY_FOR_REVIEW','MISSING_DATA','REVIEWED'].includes(row[6]))throw Error('TERMINAL_CANONICAL_OUTCOME_UNVERIFIED');
    const [key,current]=terminalEntries[0],hash=(await plan(tools,'hash',{text:JSON.stringify(row)})).sha256;
    if(hash!==current.queue_receipt.values_sha256||!String(row[13]).includes('action_key='+key)||!String(row[13]).includes('output_readback=verified'))throw Error('TERMINAL_QUEUE_RECEIPT_CHANGED');
    const output=await readOutput(tools,current),provenance=intakeProvenance(output,current),after=await reservation.inspect(tools),afterRows=await readQueue(tools);
    if(stable(after.store.entries[a.effect_key])!==stable(r)||stable(after.store.entries[key])!==stable(current)||stable(afterRows)!==stable(rows))throw Error('TERMINAL_READBACK_DRIFT');
    if(!provenance.historical_fixture){const digest=(await plan(tools,'hash',{text:stable(provenance)})).sha256;if(!String(row[13]).split('; ').includes('intake_provenance_sha256='+digest)||!String(row[13]).split('; ').includes('intake_mode='+provenance.mode)||row[4]!== (provenance.mode==='SYNTHETIC'?'SYNTHETIC TEST INVOICE':'INVOICE'))throw Error('TERMINAL_INTAKE_PROVENANCE_CHANGED');}
    const nativeLines=output.text.match(/^Native Gemini draft: (.+)$/gm)||[];
    if(nativeLines.length>1)throw Error('TERMINAL_NATIVE_GEMINI_PROVENANCE_AMBIGUOUS');
    let native=null;
    if(nativeLines.length){native=JSON.parse(nativeLines[0].slice('Native Gemini draft: '.length));if(native.source_sha256!==current.binding.source_sha256||native.guide_sha256!==current.binding.guide_sha256||native.mode!==provenance.mode||!String(row[13]).split('; ').includes('native_gemini_response_sha256='+native.response_sha256))throw Error('TERMINAL_NATIVE_GEMINI_PROVENANCE_CHANGED');}
    return {effect_key:a.effect_key,verified:true,state:'TERMINAL',effect_state:'CLOSED_VERIFIED',result:{status:row[6],matter_id:r.binding.matter_id,retained_effect_key:a.effect_key,canonical_effect_key:key,output_id:output.id,output_sha256:output.sha256,output_url:output.url,business_output:output.text,synthetic:provenance.mode==='SYNTHETIC',intake_provenance:provenance,native_gemini_review:native}};
  }
  async function knownInvoiceKeys(tools,store,currentId){
    const entries=Object.values(store.entries).filter(e=>e.state==='closed'&&e.binding.source_id!==currentId);
    if(entries.length>50)throw Error('DUPLICATE_HISTORY_EXCEEDS_REGISTERED_READ_BOUND');
    const mode=(reg.synthetic_invoice_admissions||[]).some(r=>r.source_id===currentId)?'SYNTHETIC':'LIVE';
    const result=new Set(),seen=new Set();
    for(const record of entries){if(seen.has(record.output.id))continue;seen.add(record.output.id);
      if(reg.excluded_fixture_ids.includes(record.binding.source_id)&&mode==='LIVE')continue;
      const out=await readOutput(tools,record),provenance=intakeProvenance(out,record);
      if(provenance.mode!==mode)continue;
      const block=out.text.split('INVOICE FACTS (source-cited extraction; human verification remains required)\n')[1]?.split('\nFINANCE SCOPE CHECKS')[0];
      if(!block)throw Error('DUPLICATE_HISTORY_FORMAT_UNVERIFIED');
      const pick=field=>block.match(new RegExp('^- '+field+': ([^\\r\\n]+)$','m'))?.[1];
      const vendor=pick('vendor'),invoice=pick('invoice_number'),currency=pick('currency');
      if(vendor&&invoice&&/^[A-Z]{3}$/.test(currency||'')&&![vendor,invoice].includes('Unavailable / not established'))result.add([vendor.toLowerCase(),invoice.toLowerCase(),currency].join('|'));
    }return [...result].sort();
  }
  async function prepareSource(tools,event,normalized){
    const {metadata:m,source}=await completeSource(tools,event.source_id,event.source_version),rows=await readQueue(tools),ledger=await reservation.inspect(tools);
    return plan(tools,'prepare',{registration:reg,metadata:m,source,queue_rows:rows,reservation:ledger.store,policy:normalized.policy,known_invoice_keys:await knownInvoiceKeys(tools,ledger.store,event.source_id),...(continuation===null?{}:{continuation_context:continuation})});
  }
  async function readAuthority(tools,event){
    if(!event||Object.keys(event).sort().join(',')!=='admission_id,source_id,source_version')throw Object.assign(Error('REFERENCE_ONLY_WAKE_REQUIRED'),{blocked:true});
    if(continuation!==null&&(event.admission_id!==continuation.grant.action_key||event.source_id!==continuation.grant.source_id||event.source_version!==continuation.grant.source_version))throw Object.assign(Error('CONTINUATION_EVENT_BINDING_CHANGED'),{blocked:true});
    const current=await currentPolicy(tools);
    if(current.status!=='NORMALIZED_CURRENT_POLICY')throw Object.assign(Error(current.code),{blocked:true});
    const now=Date.now()/1000;
    if(!reg.trigger_id||reg.installation!=='INSTALLED'||!current.business_review_live||!current.hourly_wake_created)throw Object.assign(Error('FINANCE_REVIEW_NOT_INSTALLED'),{blocked:true});
    if(reg.single_writer!==true)throw Object.assign(Error('SINGLE_WRITER_BINDING_NOT_REGISTERED'),{blocked:true});
    if(!Number.isFinite(reg.valid_from)||!Number.isFinite(reg.expires_at)||now<reg.valid_from||now>=reg.expires_at)throw Object.assign(Error('REGISTERED_AUTHORITY_WINDOW_INACTIVE'),{blocked:true});
    const prepared=await prepareSource(tools,event,current);
    if(prepared.status!=='PREPARED_CURRENT_SOURCE')throw Object.assign(Error(prepared.code),{blocked:true});
    if(continuation!==null&&(stable(prepared.continuation_context)!==stable(continuation)||current.policy?.native_gemini_review?.required!==true))throw Object.assign(Error('CONTINUATION_OR_NATIVE_REQUIREMENT_CHANGED'),{blocked:true});
    const late=await currentPolicy(tools);
    if(stable(late)!==stable(current))throw Object.assign(Error('LATE_POLICY_OR_PRINCIPAL_CHANGED'),{blocked:true});
    const candidate=prepared.candidate;
    if(event.admission_id!==candidate.action_key)throw Object.assign(Error('CANONICAL_ADMISSION_ID_CHANGED'),{blocked:true});
    const provenance=prepared.intake_provenance;
    if(!provenance||!['LIVE','SYNTHETIC'].includes(provenance.mode))throw Object.assign(Error('CURRENT_INTAKE_PROVENANCE_REQUIRED'),{blocked:true});
    const nativeReview=candidate.review?.native_gemini_review||null;
    if(continuation!==null&&!nativeReview)throw Object.assign(Error('CONTINUATION_NATIVE_REVIEW_REQUIRED'),{blocked:true});
    if(nativeReview){
      if(typeof validateStudioControlInput!=='function')throw Object.assign(Error('SHARED_FINANCE_CONTROL_VALIDATOR_REQUIRED'),{missing:true});
      const validated=validateStudioControlInput({workflow:{actionInvocation:{inputs:{purpose:{stringValues:['FINANCE_DRAFT_REVIEW']},controls_json:{stringValues:[JSON.stringify(nativeReview.controls)]}}}}});
      if(validated.input_valid!==true||validated.record_authorized!==false)throw Object.assign(Error('NATIVE_CONTROL_VALIDATION_FAILED'),{blocked:true});
    }
    const validFrom=continuation!==null?Math.max(reg.valid_from,continuation.grant.valid_from):provenance.mode==='SYNTHETIC'?Math.max(reg.valid_from,provenance.valid_from):reg.valid_from,expiresAt=continuation!==null?Math.min(reg.expires_at,continuation.grant.expires_at):provenance.mode==='SYNTHETIC'?Math.min(reg.expires_at,provenance.expires_at):reg.expires_at;
    if(now<validFrom||now>=expiresAt)throw Object.assign(Error('REGISTERED_SYNTHETIC_GRANT_INACTIVE'),{blocked:true});
    return {status:'ACTIVE',revoked:false,valid_from:validFrom,expires_at:expiresAt,observed_at:Date.now()/1000,consumer_id:reg.consumer_id,trigger_id:reg.trigger_id,principal_id:reg.principal_id,single_writer:true,admission_id:event.admission_id,revision:reg.config.version+'|'+reg.guide.version+'|'+reg.config.sha256+'|'+reg.guide.sha256,route:'finance',operation:'invoice_review',source:prepared.source_binding,effect_key:candidate.action_key,intake_provenance:provenance,native_gemini_review:candidate.review?.native_gemini_review||null,...(continuation===null?{}:{continuation_context:clone(prepared.continuation_context)}),payload:{class_input:prepared.class_input}};
  }
  async function readSourceBinding(tools,a){
    if(a.route!=='finance')throw Object.assign(Error('APPROVED_SOURCE_READER_FOR_'+a.route),{missing:true});
    const {source}=await completeSource(tools,a.source.id,a.source.version),expected=a.payload?.class_input?.source;
    if(expected?.source_before?.docs_revision_id&&source.source_before.docs_revision_id!==expected.source_before.docs_revision_id||expected?.source_read?.raw_file_sha256&&source.source_read.raw_file_sha256!==expected.source_read.raw_file_sha256)throw Object.assign(Error('SOURCE_FORMAT_PROVENANCE_DRIFT'),{blocked:true});
    for(const representation of a.native_gemini_review?.representations||[]){
      const c={allowedSourceIds:[representation.native_id],driveId:reg.drive_id,folderId:reg.staging_id,workspaceRoot:reg.workspace_root};
      const reader=createFinancePracticalSourceReader(c,root,{pdf:false,nativeDocs:true});
      const observed=await reader.read(tools,representation.native_id);
      if(observed.source_before.version!==representation.native_version||observed.source_before.docs_revision_id!==representation.native_revision||observed.source_read.complete!==true||observed.source_read.sha256!==representation.text_sha256)throw Object.assign(Error('NATIVE_GEMINI_REPRESENTATION_DRIFT'),{blocked:true});
    }
    return {complete:source.source_read.complete,id:source.source_before.id,version:source.source_before.version,sha256:source.source_read.sha256};
  }
  async function scan(tools,{dispatch=false}={}){
    if(continuation!==null)throw Object.assign(Error('EXPLICIT_CONTINUATION_ENTRYPOINT_REQUIRED'),{blocked:true});
    // Null trigger is truthful and supports a read-only cloud inspection. Dispatch
    // still requires the independently installed binding and saved live config.
    const normalized=await currentPolicy(tools),rows=await readQueue(tools),ledger=await reservation.inspect(tools);
    const folder=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:'https://drive.google.com/drive/folders/'+reg.inbox_id}));
    if(folder.id!==reg.inbox_id||folder.drive_id!==reg.drive_id||folder.mime_type!=='application/vnd.google-apps.folder'||folder.partial||folder.has_more||folder.next_page_token)throw Error('INBOX_LISTING_ID_OR_COMPLETENESS_UNVERIFIED');
    const listing=JSON.parse(folder.content);
    if(!Array.isArray(listing.files)||listing.files.length>=100||listing.partial||listing.has_more||listing.nextPageToken||listing.next_page_token)throw Error('INBOX_LISTING_INCOMPLETE');
    if(new Set(listing.files.map(f=>f.id)).size!==listing.files.length)throw Error('INBOX_LISTING_DUPLICATE_IDS');
    const results=[];let eligible=0;
    for(const item of listing.files){
      try{
      const m=unwrap(await metadata(tools,item.id));
      const assessed=await plan(tools,'assess',{metadata:m,queue_rows:rows,reservation:ledger.store,registration:reg});
      if(assessed.status!=='ELIGIBLE_METADATA_ONLY'){results.push({...assessed,source_id:item.id});continue;}
      if(++eligible>reg.max_items){results.push({status:'DEFERRED_BATCH_BOUND',source_id:item.id});continue;}
      if(normalized.status!=='NORMALIZED_CURRENT_POLICY'){results.push({status:'BLOCKED_SOURCE',source_id:item.id,code:normalized.code});continue;}
      if(!Number.isFinite(reg.valid_from)||!Number.isFinite(reg.expires_at)||Date.now()/1000<reg.valid_from||Date.now()/1000>=reg.expires_at){results.push({status:'BLOCKED_SOURCE',source_id:item.id,code:'REGISTERED_SOURCE_ADMISSION_WINDOW_INACTIVE'});continue;}
      const event={admission_id:'',source_id:item.id,source_version:m.modified_time},prepared=await prepareSource(tools,event,normalized);
      if(prepared.status!=='PREPARED_CURRENT_SOURCE'){results.push({...prepared,source_id:item.id});continue;}
      if(!dispatch){results.push({status:'PREVIEW_PREPARED',source_id:item.id,source_version:m.modified_time,synthetic:prepared.intake_provenance?.mode==='SYNTHETIC',intake_provenance:prepared.intake_provenance,installed:reg.installation==='INSTALLED',candidate:prepared.candidate});continue;}
      if(!reg.trigger_id||reg.installation!=='INSTALLED'||!normalized.business_review_live||!normalized.hourly_wake_created){results.push({status:'BLOCKED_SOURCE',source_id:item.id,code:'FINANCE_REVIEW_NOT_INSTALLED'});continue;}
      event.admission_id=prepared.candidate.action_key;
      const finance={queueId:reg.queue_id,sheetId:reg.sheet_id,tab:reg.tab,stagingId:reg.staging_id,inboxId:reg.inbox_id,driveId:reg.drive_id,guideId:reg.guide.id,workspaceRoot:reg.workspace_root,allowedPolicyHashes:[normalized.policy.policy_sha256],reservation:reg.reservation,enablePdf:reg.processor_policy.supported_mime_types.includes('application/pdf'),enableNativeDocs:reg.processor_policy.supported_mime_types.includes('application/vnd.google-apps.document')};
      const caller=createCloudBackOffice(bundleRoot,{consumerId:reg.consumer_id,triggerId:reg.trigger_id,principalId:reg.principal_id,maxItems:reg.max_items,finance},host);
      results.push(await caller.invoke(tools,event));
      }catch(e){results.push({status:e.blocked?'BLOCKED_SOURCE':'SERVICE_FAILURE',source_id:item.id,code:String(e.message||e),effect_state:'NOT_ATTEMPTED'});}
    }
    return {status:'FINANCE_SCAN_COMPLETE',processor:normalized.policy?.native_gemini_review?.required?'native Gemini draft required; deterministic validation and recording':'deterministic Finance consumer; no Gemini inference',installation:reg.installation,trigger_id:reg.trigger_id,policy_status:normalized.status,policy_gap:normalized.code||null,inbox_items:listing.files.length,real_invoice_processed:results.some(r=>r.status==='COMPLETED'&&r.synthetic===false&&r.intake_provenance?.mode==='LIVE'),synthetic_invoice_processed:results.some(r=>r.status==='COMPLETED'&&r.synthetic===true&&r.intake_provenance?.mode==='SYNTHETIC'),native_gemini_draft_used:results.some(r=>r.status==='COMPLETED'&&Boolean(r.native_gemini_review)),business_effects_permitted:dispatch&&reg.installation==='INSTALLED'&&Boolean(reg.trigger_id)&&reg.single_writer===true&&normalized.business_review_live===true&&normalized.hourly_wake_created===true&&Number.isFinite(reg.valid_from)&&Number.isFinite(reg.expires_at)&&reg.valid_from<=Date.now()/1000&&Date.now()/1000<reg.expires_at,results};
  }
  async function resumePreEffect(tools){
    if(continuation===null)throw Object.assign(Error('EXPLICIT_CONTINUATION_CONTEXT_REQUIRED'),{blocked:true});
    const g=continuation.grant,event={admission_id:g.action_key,source_id:g.source_id,source_version:g.source_version};
    const authority=await readAuthority(tools,event),ledger=await reservation.inspect(tools),r=ledger.store.entries[g.action_key];
    const hold=code=>{throw Object.assign(Error(code),{blocked:true});};
    if(ledger.store.active_key!==g.action_key||!r||r.state!=='claimed'||r.token!==continuation.expected_token||r.output!==null||r.queue_receipt!==null||['source_id','source_version','source_sha256','policy_sha256'].some(k=>r.binding[k]!==g[k]))hold('CONTINUATION_PRE_EFFECT_CLAIM_CHANGED');
    const rows=await readQueue(tools),hits=rows.slice(1).filter(row=>row[0]===r.binding.request_id);
    if(hits.length!==1)hold('CONTINUATION_QUEUE_IDENTITY_AMBIGUOUS');
    const row=hits[0].concat(Array(14).fill('')).slice(0,14),parts=String(row[13]).split('; ');
    if(parts.some(p=>p.indexOf('=')<1)||new Set(parts.map(p=>p.slice(0,p.indexOf('=')))).size!==parts.length)hold('CONTINUATION_QUEUE_MARKERS_AMBIGUOUS');
    const markers=Object.fromEntries(parts.map(p=>[p.slice(0,p.indexOf('=')),p.slice(p.indexOf('=')+1)]));
    const original=authority.payload.class_input.identity.original_source;
    if(row[4]!=='SYNTHETIC TEST INVOICE'||row[6]!=='PROCESSING'||String(row[11])!=='0'||row[10]||row[5]!==g.source_version||sourceUrlId(row[1])!==original.id||sourceUrlId(original.url)!==original.id||row[2]!=='Finance Inbox'||row[3]!=='Finance'||markers.consumer!==reg.consumer_id||markers.claim_token!==continuation.expected_token||markers.action_key!==g.action_key||markers.matter!==r.binding.matter_id||markers.original_source_id!==original.id||markers.original_source_version!==original.version||markers.current_source_id!==g.source_id||markers.current_source_version!==g.source_version||markers.source_sha256!==g.source_sha256||markers.policy_version!==authority.payload.class_input.policy_before.version||markers.output_state!=='NOT_ATTEMPTED'||markers.attempt_count!=='0'||markers.output_id||markers.output_sha256||markers.outcome||markers.prior_output_url||rows.slice(1).filter(x=>String(x[13]).split('; ').includes('claim_token='+continuation.expected_token)).length!==1)hold('CONTINUATION_QUEUE_PRE_EFFECT_CHANGED');
    const provenanceHash=(await plan(tools,'hash',{text:stable(authority.intake_provenance)})).sha256;
    if(markers.intake_mode!==authority.intake_provenance.mode||markers.intake_provenance_sha256!==provenanceHash||markers.native_gemini_response_sha256!==authority.native_gemini_review.response_sha256)hold('CONTINUATION_QUEUE_PROVENANCE_CHANGED');
    const folder=unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:'https://drive.google.com/drive/folders/'+reg.staging_id}));
    if(folder.id!==reg.staging_id||folder.drive_id!==reg.drive_id||folder.mime_type!=='application/vnd.google-apps.folder'||typeof folder.content!=='string'||folder.partial||folder.has_more||folder.next_page_token||folder.nextPageToken)hold('CONTINUATION_STAGING_LISTING_UNVERIFIED');
    const listing=JSON.parse(folder.content);
    if(!Array.isArray(listing.files)||listing.files.length>=100||listing.partial||listing.has_more||listing.nextPageToken||listing.next_page_token||listing.files.some(f=>typeof f.id!=='string'||typeof f.title!=='string')||new Set(listing.files.map(f=>f.id)).size!==listing.files.length)hold('CONTINUATION_STAGING_LISTING_INCOMPLETE');
    if(listing.files.some(f=>f.title==='Finance review '+g.action_key+'.txt'||f.title.includes(g.action_key)))hold('CONTINUATION_EXISTING_OUTPUT_REQUIRES_RECONCILIATION');
    const after=await reservation.inspect(tools);
    if(after.store.active_key!==g.action_key||stable(after.store.entries[g.action_key])!==stable(r)||stable(await readQueue(tools))!==stable(rows))hold('CONTINUATION_PREFLIGHT_DRIFT');
    const finance={queueId:reg.queue_id,sheetId:reg.sheet_id,tab:reg.tab,stagingId:reg.staging_id,inboxId:reg.inbox_id,driveId:reg.drive_id,guideId:reg.guide.id,workspaceRoot:reg.workspace_root,allowedPolicyHashes:[g.policy_sha256],reservation:reg.reservation,enablePdf:reg.processor_policy.supported_mime_types.includes('application/pdf'),enableNativeDocs:reg.processor_policy.supported_mime_types.includes('application/vnd.google-apps.document')};
    const caller=createCloudBackOffice(bundleRoot,{consumerId:reg.consumer_id,triggerId:reg.trigger_id,principalId:reg.principal_id,maxItems:reg.max_items,finance},host);
    return caller.resumeFinancePreEffect(tools,event,clone(continuation));
  }
  async function savePreparation(){throw Object.assign(Error('APPROVED_MARKETING_FUNDRAISING_CONTINUATION_RECORD_BINDING'),{missing:true});}
  const host={readAuthority,readSourceBinding,readContinuation,savePreparation,scan,resumePreEffect,currentPolicy,inspectHistorical:async(tools,effectKey)=>{
    const ledger=await reservation.inspect(tools),r=ledger.store.entries[effectKey];if(!r)throw Error('HISTORICAL_EFFECT_NOT_FOUND');
    return readContinuation(tools,{route:'finance',effect_key:effectKey,source:{id:r.binding.source_id,version:r.binding.source_version,sha256:r.binding.source_sha256}});
  }};
  return host;
}

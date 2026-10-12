// One bounded manual host: immutable parent-pinned inputs + fresh exact connected reads.
// No permission updates, source discovery, credentials, registration or effects.
function createLegalManualReaders(root,pins){
 if(typeof root!=='string'||!root.startsWith('/')||/[\x00-\x1f\x7f]/.test(root))throw Error('Trusted manual root required');
 pins=JSON.parse(JSON.stringify(pins));const q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
 async function check(tools,input){
  const encoded=JSON.stringify({...input,pins});let cmd;
  if(encoded.length>20000){
   const allocation=await tools.exec_command({cmd:'mktemp -d '+q(root+'/evidence-refresh/manual-transport-XXXXXXXX'),max_output_tokens:500});
   const directory=allocation.output?.trim();
   if(allocation.exit_code!==0||typeof directory!=='string'||!directory.startsWith(root+'/evidence-refresh/manual-transport-')||!/^[-A-Za-z0-9_/]+$/.test(directory))throw Error('Private manual input allocation failed');
   const path=directory+'/input.json';
   const patch=await tools.apply_patch('*** Begin Patch\n*** Add File: '+path+'\n+'+encoded+'\n*** End Patch');
   if(patch?.isError)throw Error('Private manual input staging failed');
   const points=Array.from(encoded); // Python string offsets use Unicode code points.
   for(let offset=0;offset<points.length;offset+=10000){
    const chunk=points.slice(offset,offset+10000).join('');
    const script="import pathlib,json\np=pathlib.Path("+JSON.stringify(path)+");p.chmod(0o600);s=p.read_text()\nexpected=json.loads("+JSON.stringify(JSON.stringify(chunk))+")\nassert len(s)=="+(points.length+1)+" and s.endswith('\\n')\nassert s["+offset+":"+(offset+Array.from(chunk).length)+"]==expected\n";
    const checked=await tools.exec_command({cmd:"python3 - <<'LEGAL_INPUT_CHECK'\n"+script+"LEGAL_INPUT_CHECK",max_output_tokens:500});
    if(checked.exit_code!==0)throw Error('Exact manual input readback failed');
   }
   cmd=`cd ${q(root)} && python3 -B manual_reader_checks.py < ${q(path)}`;
  }else cmd=`cd ${q(root)} && python3 -B manual_reader_checks.py <<'LEGAL_MANUAL_INPUT'\n${encoded}\nLEGAL_MANUAL_INPUT`;
  const r=await tools.exec_command({cmd,max_output_tokens:200000});if(r.exit_code!==0)throw Error('Manual reader held: '+r.output);return JSON.parse(r.output);
 }
 const load=(tools,file_kind)=>check(tools,{kind:'load',file_kind});
 const unwrap=r=>{if(r?.isError||!r?.structuredContent)throw Error('Connected manual read unavailable');return r.structuredContent;};
 return {
  async getOwnerAdmission(tools,req){
   const a=await load(tools,'admission');if(a.matter_id!==req.matter_id||a.consumer_id!==req.consumer_id||a.admission.source_id!==req.source_id)throw Error('Manual admission request outside exact scope');return {structuredContent:a,isError:false};
  },
  async readReviewEvidence(tools,req){
   const e=await load(tools,'evidence');if(e.matter_id!==req.matter_id||e.source_id!==req.source_id||e.source_version!==req.source_version)throw Error('Manual evidence request outside exact scope');
   const bindings=await load(tools,'source_pins'),sources={};
   for(const [id,p]of Object.entries(bindings)){
    if(p.kind==='gmail_raw')sources[id]=await tools.mcp__codex_apps__gmail_read_email({message_id:id.slice(6),format:'raw'});
    else if(p.kind==='github_comment')sources[id]=await tools.mcp__codex_apps__github_fetch({url:p.fetch_url});
    else if(p.kind==='drive_readable')sources[id]=await tools.mcp__codex_apps__google_drive_fetch({url:p.fetch_url});
    else if(p.kind==='guide_raw')sources[id]=await tools.mcp__codex_apps__google_drive_fetch({url:p.fetch_url,download_raw_file:true,include_base64:true});
    else throw Error('Unrecognized approved source kind');
   }
   const verified=await check(tools,{kind:'verify_sources',sources});return {structuredContent:verified.evidence,isError:false};
  },
  async getPrivateFileVisibility(tools,{file_id}){
   const v=await load(tools,'visibility'),item=v.files[file_id];if(!item||v.mode!=='COMPLETE_MANUAL_UI_SNAPSHOT')throw Error('Exact manual visibility missing');
   const m=unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:file_id}));
   if(m.id!==file_id||m.drive_id!==v.drive_id||JSON.stringify(m.parent_ids)!==JSON.stringify([v.parent_id])||m.has_augmented_permissions!==false)throw Error('Visibility target/inheritance drift');
   if(item.general_access!=='Restricted'||item.list_count!==item.permissions.length||!item.complete_list_observed)throw Error('Manual sharing observation incomplete');
   // Normalized exhaustion means the directly observed UI list is complete; no API pagination claim.
   return {isError:false,structuredContent:{file_id,parent_id:v.parent_id,permissions:item.permissions,next_page_token:null,pages_exhausted:true}};
  }
 };
}
if(typeof module!=='undefined')module.exports={createLegalManualReaders};

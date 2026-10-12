// Read-only exact-source reader for the first accepted plain-text arrival path.
// Other supported formats require their complete native/PDF/DOCX reader, not coercion.
function createFinanceTextReader(config) {
  const required = ['allowedSourceIds','driveId','folderId','workspaceRoot'];
  if (Object.keys(config).sort().join(',') !== required.sort().join(',')) throw new Error('Exact trusted reader configuration required');
  if (!Array.isArray(config.allowedSourceIds) || config.allowedSourceIds.length === 0) throw new Error('Explicit admitted IDs required');
  config = JSON.parse(JSON.stringify(config));
  const unwrap = r => { if (r?.isError || !r?.structuredContent) throw new Error('Source read failed'); return r.structuredContent; };
  const check = (m,id) => {
    if (m.id !== id || m.drive_id !== config.driveId || JSON.stringify(m.parent_ids) !== JSON.stringify([config.folderId])) throw new Error('Source identity/parent/drive mismatch');
    if (!['text/plain','text/markdown'].includes(m.mime_type) || !m.modified_time) throw new Error('Wrong format or missing source version');
    return {id:m.id,version:m.modified_time,version_kind:'observed_modified_time_not_revision_pin',mime_type:m.mime_type,parent_ids:m.parent_ids,drive_id:m.drive_id,url:m.url};
  };
  async function metadata(tools,id) {
    return check(unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({fileId:id,fields:'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',supportsAllDrives:true})),id);
  }
  return {
    async read(tools,id) {
      if (!config.allowedSourceIds.includes(id) || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Source not independently admitted');
      const before = await metadata(tools,id);
      const raw = unwrap(await tools.mcp__codex_apps__google_drive_fetch({url:'https://drive.google.com/file/d/'+id+'/view',download_raw_file:true,include_base64:false}));
      if (raw.id !== id || raw.modified_time !== before.version || raw.mime_type !== before.mime_type || raw.drive_id !== before.drive_id || JSON.stringify(raw.parent_ids) !== JSON.stringify(before.parent_ids)) throw new Error('Raw source metadata drift');
      const uri = raw.file_uri, fileId = uri?.file_id?.replace(/^sediment:\/\//,'');
      if (!/^file_[A-Za-z0-9_-]+$/.test(fileId || '') || !Number.isSafeInteger(raw.file_size_bytes) || raw.file_size_bytes < 1 || raw.file_size_bytes > 2097152) throw new Error('No bounded complete source stream');
      const materialized = await tools.download_file({file_id:fileId});
      if (materialized?.size_bytes !== raw.file_size_bytes || typeof materialized.path !== 'string') throw new Error('Materialization byte count mismatch');
      const input = {path:materialized.path,root:config.workspaceRoot,size:raw.file_size_bytes};
      const r = await tools.exec_command({cmd:"python - <<'FINANCE_READ_JSON'\nimport json,pathlib,hashlib\nx=json.loads("+JSON.stringify(JSON.stringify(input))+")\np=pathlib.Path(x['path']).resolve();root=pathlib.Path(x['root']).resolve()\nassert p.is_relative_to(root), 'outside task workspace'\nb=p.read_bytes();assert len(b)==x['size'], 'size mismatch'\ns=b.decode('utf-8');assert '\\x00' not in s, 'binary content'\nprint(json.dumps({'text':s,'source_read':{'complete':True,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'format':'UTF-8'}}))\nFINANCE_READ_JSON",max_output_tokens:20000});
      if (r.exit_code !== 0) throw new Error('Incomplete or unreadable source');
      const content = JSON.parse(r.output), after = await metadata(tools,id);
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during complete read');
      return {source_before:before,source_after:after,source_text:content.text,source_read:content.source_read};
    }
  };
}

// Proposed complete-byte PDF reader. Kept separate from the accepted text-only
// reader until the Finance owner chooses to integrate and activate it.
// Evaluator-compatible source: no Node require/__dirname/module dependency.
// The caller supplies the trusted directory containing pdf_source_extract.py.
function createFinancePdfSourceReader(config, extractorRoot) {
  const required = ['allowedSourceIds', 'driveId', 'folderId', 'workspaceRoot'];
  if (Object.keys(config).sort().join(',') !== required.sort().join(',')) {
    throw new Error('Exact trusted PDF reader configuration required');
  }
  if (!Array.isArray(config.allowedSourceIds) || config.allowedSourceIds.length === 0) {
    throw new Error('Explicit admitted PDF source IDs required');
  }
  if (typeof config.workspaceRoot !== 'string' || !config.workspaceRoot.startsWith('/') ||
      /[\x00-\x1f\x7f]/.test(config.workspaceRoot)) {
    throw new Error('Absolute trusted workspace root required');
  }
  if (typeof extractorRoot !== 'string' || !extractorRoot.startsWith('/') ||
      /[\x00-\x1f\x7f]/.test(extractorRoot)) {
    throw new Error('Absolute trusted PDF extractor root required');
  }
  config = JSON.parse(JSON.stringify(config));
  const python = 'python3';
  const extractor = extractorRoot.replace(/\/+$/, '') + '/pdf_source_extract.py';
  const q = value => "'" + String(value).replaceAll("'", "'\\''") + "'";
  const unwrap = result => {
    if (result?.isError || !result?.structuredContent) throw new Error('PDF source read failed');
    return result.structuredContent;
  };
  const check = (metadata, id) => {
    if (metadata.id !== id || metadata.drive_id !== config.driveId ||
        JSON.stringify(metadata.parent_ids) !== JSON.stringify([config.folderId])) {
      throw new Error('PDF source identity/parent/drive mismatch');
    }
    if (metadata.mime_type !== 'application/pdf' || !metadata.modified_time) {
      throw new Error('Wrong format or missing PDF source version');
    }
    return {
      id: metadata.id,
      version: metadata.modified_time,
      version_kind: 'observed_modified_time_not_revision_pin',
      mime_type: metadata.mime_type,
      parent_ids: metadata.parent_ids,
      drive_id: metadata.drive_id,
      url: metadata.url,
    };
  };
  async function metadata(tools, id) {
    return check(unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({
      fileId: id,
      fields: 'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',
      supportsAllDrives: true,
    })), id);
  }
  async function runExtractor(tools, operation, input) {
    const command = `${q(python)} ${q(extractor)} ${q(operation)} <<'FINANCE_PDF_JSON'\n${JSON.stringify(input)}\nFINANCE_PDF_JSON`;
    const result = await tools.exec_command({cmd: command, max_output_tokens: 30000});
    let payload;
    try {
      payload = JSON.parse(result.output);
    } catch (_error) {
      throw new Error('PDF extraction returned invalid output');
    }
    if (result.exit_code !== 0 || !payload?.source_read?.complete && operation === 'extract') {
      throw new Error(`PDF source held: ${payload?.hold?.code || 'extractor_failed'}`);
    }
    if (result.exit_code !== 0 || payload?.complete !== true && operation === 'digest') {
      throw new Error(`PDF source held: ${payload?.hold?.code || 'digest_failed'}`);
    }
    return payload;
  }

  return {
    async read(tools, id) {
      if (!config.allowedSourceIds.includes(id) || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error('PDF source not independently admitted');
      }
      const sourceBefore = await metadata(tools, id);
      const raw = unwrap(await tools.mcp__codex_apps__google_drive_fetch({
        url: 'https://drive.google.com/file/d/' + id + '/view',
        download_raw_file: true,
        include_base64: false,
      }));
      if (raw.id !== id || raw.modified_time !== sourceBefore.version ||
          raw.mime_type !== sourceBefore.mime_type || raw.drive_id !== sourceBefore.drive_id ||
          JSON.stringify(raw.parent_ids) !== JSON.stringify(sourceBefore.parent_ids)) {
        throw new Error('Raw PDF source metadata drift');
      }
      const fileId = raw.file_uri?.file_id?.replace(/^sediment:\/\//, '');
      if (!/^file_[A-Za-z0-9_-]+$/.test(fileId || '') ||
          !Number.isSafeInteger(raw.file_size_bytes) || raw.file_size_bytes < 1 ||
          raw.file_size_bytes > 2_097_152) {
        throw new Error('No bounded complete PDF source stream');
      }
      const materialized = await tools.download_file({file_id: fileId});
      if (materialized?.size_bytes !== raw.file_size_bytes || typeof materialized.path !== 'string') {
        throw new Error('PDF materialization byte count mismatch');
      }
      const commonInput = {
        path: materialized.path,
        expected_byte_length: raw.file_size_bytes,
        workspace_root: config.workspaceRoot,
      };
      const digest = await runExtractor(tools, 'digest', commonInput);
      const extracted = await runExtractor(tools, 'extract', {
        ...commonInput,
        expected_sha256: digest.sha256,
      });
      if (extracted.source_read.raw_file_sha256 !== digest.sha256 ||
          extracted.source_read.raw_file_byte_length !== raw.file_size_bytes) {
        throw new Error('PDF complete-byte evidence mismatch');
      }
      const sourceAfter = await metadata(tools, id);
      if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter)) {
        throw new Error('PDF source changed during complete read');
      }
      return {
        source_before: sourceBefore,
        source_after: sourceAfter,
        source_text: extracted.source_text,
        source_read: extracted.source_read,
      };
    },
  };
}

// Inert MIME dispatcher. Pass the existing createFinanceTextReader factory so
// both readers are built from this exact four-field, admitted-source config:
//   createFinanceMimeDispatchReader(config, trustedExtractorRoot, createFinanceTextReader)
// It reads metadata to select only text/plain, text/markdown, or application/pdf;
// the selected reader then repeats its own identity/version checks around content.
function createFinanceMimeDispatchReader(config, extractorRoot, textReaderFactory) {
  const required = ['allowedSourceIds', 'driveId', 'folderId', 'workspaceRoot'];
  if (Object.keys(config).sort().join(',') !== required.sort().join(',')) {
    throw new Error('Exact trusted Finance reader configuration required');
  }
  if (!Array.isArray(config.allowedSourceIds) || config.allowedSourceIds.length === 0) {
    throw new Error('Explicit admitted Finance source IDs required');
  }
  if (typeof textReaderFactory !== 'function') throw new Error('Trusted text-reader factory required');
  config = JSON.parse(JSON.stringify(config));
  const textReader = textReaderFactory(JSON.parse(JSON.stringify(config)));
  const pdfReader = createFinancePdfSourceReader(JSON.parse(JSON.stringify(config)), extractorRoot);
  const unwrap = result => {
    if (result?.isError || !result?.structuredContent) throw new Error('Finance source metadata read failed');
    return result.structuredContent;
  };
  async function mimeType(tools, id) {
    const metadata = unwrap(await tools.mcp__codex_apps__google_drive_get_file_metadata({
      fileId: id,
      fields: 'id,name,mimeType,parents,driveId,modifiedTime,webViewLink',
      supportsAllDrives: true,
    }));
    if (metadata.id !== id || metadata.drive_id !== config.driveId ||
        JSON.stringify(metadata.parent_ids) !== JSON.stringify([config.folderId]) ||
        !metadata.modified_time) {
      throw new Error('Finance source identity/parent/drive/version mismatch at MIME dispatch');
    }
    if (!['text/plain', 'text/markdown', 'application/pdf'].includes(metadata.mime_type)) {
      throw new Error('Finance source format is not supported by the fixed reader dispatch');
    }
    return metadata.mime_type;
  }
  return {
    async read(tools, id) {
      if (!config.allowedSourceIds.includes(id) || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error('Finance source not independently admitted');
      }
      const format = await mimeType(tools, id);
      if (format === 'application/pdf') return pdfReader.read(tools, id);
      return textReader.read(tools, id);
    },
  };
}

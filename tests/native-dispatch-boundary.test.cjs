'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const pureSource = fs.readFileSync(path.join(root, 'sales/PureSalesGuardsV1.gs'), 'utf8');
const runtimePath = process.env.NATIVE_DISPATCH_RUNTIME_SOURCE || path.join(root, 'sales/NativeRuntimeIntegrationV1.gs');
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');
const now = Date.parse('2026-10-13T13:00:00.000Z');

function sha(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function typedRow(width, values = {}) {
  return Array.from({ length: width }, (_, index) => {
    const value = values[index];
    return typeof value === 'string' ? { stringValue: value } : {};
  });
}

function blankRow(width) {
  return Array.from({ length: width }, () => ({}));
}

function textCell(cell) {
  if (cell.stringValue !== undefined) return cell.stringValue;
  if (cell.formulaValue !== undefined) return cell.formulaValue;
  if (cell.numberValue !== undefined) return cell.numberValue;
  if (cell.boolValue !== undefined) return cell.boolValue;
  return '';
}

function displayRow(row) {
  return row.map(textCell).map(String);
}

function evidenceRow(id, kind, document) {
  return typedRow(26, {
    0: id,
    2: kind,
    3: JSON.stringify(document),
    4: 'Synthetic offline native dispatcher fixture',
    6: new Date(now).toISOString()
  });
}

function manualUnknownReceipt() {
  const completedAtUtc = new Date(now - 60_000).toISOString();
  return {
    schema: 'BackofficeManualUncertainSend/v1',
    roundId: 'synthetic-other-contact-round',
    writerId: 'synthetic-manual-writer',
    contactId: 'SYNTHETIC-LEAD-001',
    prospectRow: 6,
    recipient: 'person@example.com',
    claimRow: 20,
    completedAtUtc,
    literalOutcome: 'Synthetic unresolved outcome; no retry.',
    dispatchPhase: 'UNKNOWN',
    sendVerified: false,
    noRetry: true,
    noAlternateRoute: true,
    gmailReceiptFound: false,
    reservedUnknownSlot: true,
    exactArgs: {
      from_address: 'Backoffice Backoffice Owner <operator@example.com>',
      to: 'person@example.com',
      subject: 'Synthetic quota hold',
      payload: { body: { content: 'Synthetic manual message body.' } }
    }
  };
}

function makeHarness(scenario) {
  const context = vm.createContext({ console, Logger: { log() {} } });
  vm.runInContext(pureSource, context, { filename: 'PureSalesGuardsV1.gs' });
  vm.runInContext(runtimeSource, context, { filename: 'NativeRuntimeIntegrationV1.gs' });
  const parseInContext = vm.runInContext('JSON.parse', context);
  const realm = value => parseInContext(JSON.stringify(value));
  const sheetId = vm.runInContext('FERN_SALES_ID', context);
  const prospectsSheetId = vm.runInContext('FERN_PROSPECTS_SHEET', context);
  const evidenceSheetId = vm.runInContext('FERN_EVIDENCE_SHEET', context);
  const leadId = 'SYNTHETIC-LEAD-001';
  const organization = 'Synthetic Example Association';
  const person = 'Synthetic Person';
  const role = 'Career Services Manager';
  const recipient = 'person@example.com';
  const staffUrl = 'https://example.com/about/synthetic-person';
  const workflowUrl = 'https://example.com/careers/synthetic-board';
  const sourceId = 'NATIVE-SOURCE-SYNTHETIC-001';
  const authorityRef = 'synthetic-owner-authority';
  const effectScopeRef = 'synthetic-owner-effect-scope';
  const stamp = new Date(now).toISOString();
  const otherPersonRow = typedRow(27, {
    1: 'Independent Example Group',
    3: 'Other Person\nMembership Coordinator\nother.person@example.net',
    11: 'Qualified - not contacted',
    14: 'SYNTHETIC-LEAD-002',
    26: 'Jobs'
  });
  const targetRow = typedRow(27, {
    1: organization,
    3: `${person}\n${role}\n${recipient}`,
    11: 'Qualified - not contacted',
    14: leadId,
    26: 'Jobs'
  });
  const binding = realm({
    row: 6,
    leadId,
    product: 'Jobs',
    to: recipient,
    name: person,
    first: 'Synthetic',
    company: organization,
    role,
    organizationKey: 'synthetic-example-association',
    subject: `${organization} — Could you share your experience?`,
    observation: 'I noticed Synthetic Prospect Label’s website provides a public Job Search page.',
    sourceRefs: [staffUrl, workflowUrl],
    recipientKind: 'named-individual',
    copyRevision: 'first-introduction-20261013T193329Z',
    verifiedWorkflowHeading: 'Job Search'
  });
  const body = context.renderCurrentSalesBody(binding);
  const exactBinding = realm(context.fernBinding(binding));
  const owner = realm({
    effectScopeRef,
    standing: true,
    authorityRef,
    approvedAt: stamp,
    binding: exactBinding,
    body,
    allowedEffects: ['send-one-initial', 'message-Label_5', 'canonical-L-R:Y-EvidenceA:G']
  });
  const sourceProofManifest = realm({
    schema: 'BackofficeNativeChunkManifest/v1',
    chunks: [],
    retainedJsonSha256: sha('synthetic-source-version'),
    targetCellsSha256: sha(JSON.stringify(targetRow)),
    registryContentSha256: sha('synthetic-registry'),
    capturedAtUtc: stamp,
    expiresAtUtc: new Date(now + 120_000).toISOString()
  });
  const sourceEntry = realm({
    schema: 'BackofficeNativeSource/v1',
    sourceId,
    packet: {
      schema: 'BackofficeCurrentSalesPreflight/v1',
      packetId: 'NATIVE-PACKET-SYNTHETIC-001',
      ref: 'synthetic-native-source:001',
      checkedAt: stamp,
      provenance: { kind: 'parent-provider-readback', modelAuthority: false, ref: 'synthetic-source-proof' },
      binding,
      owner,
      canonical: {
        spreadsheetId: sheetId,
        prospectsSheetId,
        evidenceSheetId,
        evidenceRow: 6,
        rowRenderOption: 'FORMULA',
        rowAtoAA: targetRow.map(textCell),
        contactCell: textCell(targetRow[3])
      },
      claim: { id: 'UNCLAIMED-SYNTHETIC-SOURCE', writerId: 'synthetic-native-writer' }
    },
    targetCells: targetRow,
    owner,
    sourceProof: sourceProofManifest
  });

  const propsState = Object.create(null);
  const evidence = Array.from({ length: 400 }, () => blankRow(26));
  const archiveSummaries = Array.from({ length: 400 }, () => null);
  evidence[5] = evidenceRow(sourceId, 'source-metadata', sourceEntry);
  const preparedUsageBasisRef = {
    schema: 'BackofficeNativeUsageBasisManifest/v1',
    basisId: 'USAGE-SYNTHETIC-PREPARE',
    sha256: sha('synthetic-prepared-usage-basis'),
    manifestRow: 8,
    manifestRowSha256: '',
    checkedAt: stamp
  };
  evidence[6] = evidenceRow('synthetic-preparation-trace', 'action-trace', {
    schema: 'BackofficeNativeJournal/v1',
    kind: 'action-trace',
    checkedAt: stamp,
    value: {
      noSend: true,
      trace: {
        schema: 'BackofficeNativeActionTrace/v1',
        traceId: 'NATIVE-TRACE-synthetic-prep-000001',
        operation: 'PREPARE_SOURCE',
        outcome: 'SOURCE_READY',
        projectId: 'SYNTHETIC-PROJECT',
        writerId: 'synthetic-native-writer',
        humanAuthorityRef: authorityRef,
        noSend: true,
        modelAuthority: false,
        captureId: 'syntheticcapture000001',
        sourceId,
        sourceVersionSha256: sha(JSON.stringify(evidence[5])),
        bodySha256: sha(body),
        beforeTypedRowSha256: sha(JSON.stringify(targetRow)),
        handle: { row: 6, leadId },
        preparedUsageBasisRef,
        finishedAt: stamp
      }
    }
  });
  evidence[7] = evidenceRow('synthetic-prepared-usage-manifest', 'usage-basis-manifest', {
    schema: 'BackofficeNativeUsageBasisManifest/v1',
    basisId: preparedUsageBasisRef.basisId,
    sha256: preparedUsageBasisRef.sha256,
    checkedAt: stamp
  });
  preparedUsageBasisRef.manifestRowSha256 = sha(JSON.stringify(evidence[7]));
  // The trace contains the same exact manifest reference after the row preimage is known.
  const traceDoc = JSON.parse(evidence[6][3].stringValue);
  traceDoc.value.trace.preparedUsageBasisRef = preparedUsageBasisRef;
  evidence[6][3] = { stringValue: JSON.stringify(traceDoc) };
  const traceRowSha256 = sha(JSON.stringify(evidence[6]));
  const sourceHash = sha(JSON.stringify(evidence[5]));

  const prospects = Array.from({ length: 7 }, () => blankRow(27));
  prospects[5] = targetRow;
  prospects[6] = otherPersonRow;
  const db = { Prospects: prospects, Evidence: evidence };
  let snapshotCalls = 0;
  let newIdCounter = 0;
  let sendCalls = 0;
  let storedMessage = null;
  let interruptedReceiptRead = false;
  let interruptedMinimalRead = false;
  let interruptedCanonicalWrite = false;
  let interruptedClaimClosure = false;
  let interruptedFinalMarkerWrite = false;
  let semanticReviewCalls = 0;
  let mutationApplied = false;

  const config = {
    schema: 'BackofficeNativeConfig/v1',
    enabled: true,
    mode: 'SEND',
    minimumBatch: 0,
    catchUp: false,
    projectId: 'SYNTHETIC-PROJECT',
    spreadsheetId: sheetId,
    writerId: 'synthetic-native-writer',
    ownerAuthority: { standing: true, ref: authorityRef, effectScopeRef, approvedAt: stamp },
    soleWriter: { cutoverRef: 'synthetic-cutover-reference', externalWritersDisabled: true, writerId: 'synthetic-native-writer' },
    sourceProducerAdapter: 'fernainSyntheticSourceProducer',
    sourceProofAdapter: 'fernainSyntheticSourceProof',
    semanticReviewAdapter: 'fernainNativeSemanticReview',
    providerPolicyAdapter: 'fernainSyntheticProviderPolicy',
    cutoverAdapter: 'fernainSyntheticCutover'
  };
  propsState[context.BackofficeNativeRuntimeV1.configProperty] = JSON.stringify(config);

  function saveRows(writes) {
    for (const write of writes) {
      const sheet = write.sheet;
      const previous = db[sheet][write.row - 1];
      assert.deepEqual(plain(previous), plain(write.expected), `whole-row ${sheet} CAS preimage must match`);
      db[sheet][write.row - 1] = plain(write.after);
    }
  }

  function toSnapshot() {
    snapshotCalls += 1;
    const safetyColumns = [1, 3, 11, 14, 17, 18, 19, 20, 21, 22, 26];
    const snapshot = {
      schema: 'BackofficeNativeSemanticSnapshot/v2',
      spreadsheetId: sheetId,
      checkedAt: new Date(now).toISOString(),
      ref: `synthetic-canonical-snapshot-${snapshotCalls}`,
      Prospects: {
        sheetId: prospectsSheetId,
        rowCount: db.Prospects.length,
        width: 27,
        columns: safetyColumns,
        safetyRows: db.Prospects.map(row => safetyColumns.map(index => row[index])),
        organizationDisplay: db.Prospects.map(row => textCell(row[1])),
        headers: typedRow(27),
        target: { row: 6, leadId, typedRow27: plain(db.Prospects[5]), displayRow27: displayRow(db.Prospects[5]) }
      },
      Evidence: {
        sheetId: evidenceSheetId,
        rowCount: db.Evidence.length,
        width: 26,
        rows: plain(db.Evidence),
        displayRows: db.Evidence.map(displayRow),
        archiveSummaries: archiveSummaries.slice(0, db.Evidence.length)
      }
    };
    return realm(snapshot);
  }

  const props = {
    getProperty: key => Object.prototype.hasOwnProperty.call(propsState, key) ? propsState[key] : null,
    getProperties: () => realm(propsState),
    setProperty: (key, value) => {
      if (scenario === 'legacy-closed-claim-marker-interruption' && !interruptedFinalMarkerWrite) {
        let document;
        try {
          document = JSON.parse(String(value));
        } catch (_) {}
        if (document && document.state === 'CONFIRMED_NO_RESEND') {
          interruptedFinalMarkerWrite = true;
          throw new Error('Synthetic interrupted final marker write after claim closure.');
        }
      }
      propsState[key] = String(value);
    },
    deleteProperty: key => { delete propsState[key]; }
  };
  const services = {
    projectId: config.projectId,
    now: () => now,
    sha: value => sha(typeof value === 'string' ? value : JSON.stringify(value)),
    byteLength: value => Buffer.byteLength(String(value), 'utf8'),
    newId: () => `syntheticid${String(++newIdCounter).padStart(10, '0')}`,
    startBudget: () => ({ deadline: now + 110_000 }),
    checkBudget: () => true,
    lock: { tryLock: () => true, hasLock: () => true, releaseLock() {} },
    props,
    archiveMutationFence() {},
    snapshot: () => toSnapshot(),
    withReadOnlyBundle: (_config, _selection, callback) => callback(),
    readRow: (sheet, row, width) => realm(db[sheet][row - 1].slice(0, width)),
    readEvidenceLogicalRow: row => realm(db.Evidence[row - 1]),
    validateArchiveSummary: (row, summary) => summary && summary.schema === 'BackofficeNativeArchiveSummary/v2' &&
      summary.logicalRow >= 6 && summary.logicalRow <= db.Evidence.length &&
      summary.modelAuthority === false && summary.originalTypedRowSha256 === sha(JSON.stringify(row)) &&
      summary.originalDisplayRowSha256 === sha(JSON.stringify(displayRow(row))),
    readRowCapture: (sheet, row, width) => realm({
      sheetId: sheet === 'Prospects' ? prospectsSheetId : evidenceSheetId,
      sheetName: sheet,
      row,
      width,
      typedRow: db[sheet][row - 1].slice(0, width),
      displayRow: displayRow(db[sheet][row - 1].slice(0, width)),
      ref: `synthetic-${sheet}-${row}`,
      checkedAt: stamp
    }),
    casWrites: writes => {
      const checkedWrites = writes.map(plain);
      const writesCanonicalSales = checkedWrites.some(write => write.sheet === 'Prospects' && write.after[11].stringValue === 'Sent');
      const closesClaim = checkedWrites.some(write => {
        try {
          const document = JSON.parse(write.after[3].stringValue);
          return document.schema === 'BackofficeNativeClaim/v1' && document.status === 'CLOSED';
        } catch (_) { return false; }
      });
      if (scenario === 'legacy-repeat-recovery-lifecycle' && writesCanonicalSales && !interruptedCanonicalWrite) {
        interruptedCanonicalWrite = true;
        throw new Error('Synthetic interrupted final canonical write.');
      }
      if (scenario === 'legacy-repeat-recovery-lifecycle' && closesClaim && !interruptedClaimClosure) {
        interruptedClaimClosure = true;
        throw new Error('Synthetic interrupted claim closure.');
      }
      saveRows(checkedWrites);
      return realm({ acknowledged: true, verified: true });
    },
    persistArchiveEligibleRow: write => {
      saveRows([plain(write)]);
      const row = write.row;
      if (scenario === 'tampered-boundary' && write.after[2].stringValue === 'attempt-boundary') {
        const changed = plain(db.Evidence[row - 1]);
        changed[3] = { stringValue: changed[3].stringValue.replace('"noResend":true', '"noResend":false') };
        db.Evidence[row - 1] = changed;
        mutationApplied = true;
      } else if (scenario === 'missing-boundary' && write.after[2].stringValue === 'attempt-boundary') {
        db.Evidence[row - 1] = blankRow(26);
        mutationApplied = true;
      } else if (scenario === 'duplicate-own-marker-conflicting-body' && write.after[2].stringValue === 'attempt-boundary') {
        const markerKey = `FERNAIN_NATIVE_NO_RESEND_V1:${sha(leadId)}`;
        const duplicate = JSON.parse(propsState[markerKey]);
        duplicate.state = 'SEND_ATTEMPTED_NO_RESEND';
        duplicate.attemptRow = row;
        duplicate.attemptRowSha256 = sha(JSON.stringify(write.after));
        duplicate.bodySha256 = sha('unapproved conflicting body');
        propsState['FERNAIN_NATIVE_NO_RESEND_V1:SYNTHETIC-DUPLICATE-MARKER-KEY'] = JSON.stringify(duplicate);
        mutationApplied = true;
      } else if ((scenario === 'changed-manual-usage' || scenario === 'foreign-boundary' || scenario === 'duplicate-own-pending-boundary' || scenario === 'duplicate-own-pending-wrong-content') && write.after[2].stringValue === 'attempt-boundary') {
        const extraRow = db.Evidence.findIndex((candidate, index) => index >= 8 && index !== row - 1 && candidate.every(cell => Object.keys(cell).length === 0));
        assert.notEqual(extraRow, -1, 'synthetic follow-up evidence row is available');
        if (scenario === 'changed-manual-usage') {
          db.Evidence[extraRow] = evidenceRow('synthetic-manual-unknown-001', 'Uncertain send attempt / synthetic quota hold', manualUnknownReceipt());
        } else if (scenario === 'foreign-boundary') {
          db.Evidence[extraRow] = evidenceRow(leadId, 'attempt-boundary', {
            schema: 'BackofficeNativeJournal/v1',
            kind: 'attempt-boundary',
            checkedAt: stamp,
            value: { leadId, attemptId: 'NATIVE-FOREIGN-ATTEMPT-000001', noResend: true }
          });
        } else {
          const boundary = JSON.parse(write.after[3].stringValue);
          const pendingRow = db.Evidence[boundary.value.pendingRow - 1];
          const duplicate = plain(pendingRow);
          if (scenario === 'duplicate-own-pending-wrong-content') {
            const pending = JSON.parse(duplicate[3].stringValue);
            pending.value.sourceVersionSha256 = 'f'.repeat(64);
            pending.value.pending.sourceVersionSha256 = 'f'.repeat(64);
            pending.value.pending.prepared.body += ' tampered';
            duplicate[3] = { stringValue: JSON.stringify(pending) };
          }
          db.Evidence[extraRow] = duplicate;
        }
        mutationApplied = true;
      } else if (scenario === 'duplicate-own-pending-preboundary' && write.after[2].stringValue === 'pending') {
        const extraRow = db.Evidence.findIndex((candidate, index) => index >= 8 && index !== row - 1 && candidate.every(cell => Object.keys(cell).length === 0));
        assert.notEqual(extraRow, -1, 'synthetic follow-up evidence row is available');
        db.Evidence[extraRow] = plain(write.after);
        mutationApplied = true;
      } else if (scenario === 'tampered-own-pending-after-boundary' && write.after[2].stringValue === 'attempt-boundary') {
        const boundary = JSON.parse(write.after[3].stringValue);
        const pendingRow = boundary.value.pendingRow - 1;
        const pending = JSON.parse(db.Evidence[pendingRow][3].stringValue);
        pending.value.pending.sourceVersionSha256 = 'e'.repeat(64);
        db.Evidence[pendingRow][3] = { stringValue: JSON.stringify(pending) };
        mutationApplied = true;
      }
      const logical = plain(write.after);
      const acknowledgement = {
        acknowledged: true,
        verified: true,
        physicalAfter26: logical,
        physicalDisplay26: displayRow(logical),
        archiveSummary: null,
        logicalOriginal26Sha256: sha(JSON.stringify(logical))
      };
      return realm(acknowledgement);
    },
    persistArchiveEligibleRows: writes => {
      const rows = [];
      for (const rawWrite of writes) {
        const write = plain(rawWrite);
        saveRows([write]);
        const summary = {
          schema: 'BackofficeNativeArchiveSummary/v2',
          logicalRow: write.row,
          kind: write.after[2].stringValue,
          modelAuthority: false,
          originalTypedRowSha256: sha(JSON.stringify(write.after)),
          originalDisplayRowSha256: sha(JSON.stringify(displayRow(write.after))),
          noResend: false,
          claim: false,
          incoming: false,
          matchedEmails: []
        };
        archiveSummaries[write.row - 1] = summary;
        rows.push({
          row: write.row,
          physicalAfter26: write.after,
          physicalDisplay26: displayRow(write.after),
          archiveSummary: summary,
          logicalOriginal26Sha256: sha(JSON.stringify(write.after))
        });
      }
      return realm({ acknowledged: true, verified: true, rows });
    },
    registry: () => realm({ SYNTHETIC_ROLE: definition }),
    family: () => realm({
      schema: 'BackofficeNativeReviewedFamily/v1',
      organizationKey: 'synthetic-example-association',
      domains: ['example.com'],
      organizations: [organization],
      sourceRefs: [staffUrl, workflowUrl],
      reviewRef: 'synthetic-family-review',
      historicalBindings: 'UNKNOWN'
    }),
    boundSource: () => realm(sourceFixture),
    properties: () => props.getProperties(),
    accountUsage: (_binding, input) => {
      const unknowns = input.manualUsage.unknownReservations;
      const confirmed = input.manualUsage.confirmedReceipts;
      const reserve = input.reservations;
      const checkedAt = new Date(now).toISOString();
      const historyCheck = {
        ref: 'synthetic-gmail-history-check', checkedAt, complete: true, clear: true,
        binding: exactBinding, ids: []
      };
      const usage = {
        ref: 'synthetic-account-usage', checkedAt, accountAddress: 'operator@example.com',
        complete: true, unknownUsage: false,
        campaign60: 0, totalAccount24: 0, automation24: 0, unknownAutomation24: 0,
        reservedCampaign60: reserve.campaign60, reservedAccount24: reserve.account24,
        reservedAutomation24: reserve.automation24, accountSentIds: [],
        recipientCount24: 0, externalRecipientCount24: 0, uniqueRecipientCount24: 0,
        externalUniqueRecipientCount24: 0
      };
      const dimensions = {
        messages24: [500, 0], externalUnique24: [500, 0], apiRecipientsPerMessage: [500, 0],
        recipients24: [10000, 0], externalRecipients24: [3000, 0], uniqueRecipients24: [3000, 0]
      };
      const provider = {
        ref: 'synthetic-provider-limits', checkedAt, accountAddress: 'operator@example.com',
        complete: true, tier: 'trial-or-conservative',
        dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, [limit, used]]) => [key, {
          applicable: true, complete: true, limit, used, reserved: 0, increment: 1, nativeMetric: key
        }]))
      };
      return realm({
        account: { ref: 'synthetic-account', checkedAt, address: 'operator@example.com', labelId: 'Label_5', complete: true },
        usage,
        provider,
        historyCheck,
        nativeUsageBasis: {
          schema: 'BackofficeNativeAccountUsageBasis/v1',
          accountAddress: 'operator@example.com',
          checkedAt,
          manualUnknownReservations24: unknowns.map(value => ({
            schema: value.schema, roundId: value.roundId, claimRow: value.claimRow,
            contactId: value.contactId, recipient: value.recipient,
            completedAtUtc: value.completedAtUtc, sourceRow: value.sourceRow,
            sourceSha256: value.sourceSha256
          })),
          manualConfirmedReceipts24: confirmed.map(value => value.messageId)
        }
      });
    },
    invoke: (name, input) => {
      if (name === config.cutoverAdapter) return realm({
        complete: true, exclusive: true, externalWritersDisabled: true,
        projectId: config.projectId, writerId: config.writerId,
        cutoverRef: config.soleWriter.cutoverRef, ref: 'synthetic-cutover', checkedAt: stamp
      });
      if (name === config.sourceProducerAdapter) return realm({
        complete: true, ref: 'synthetic-source-registry', checkedAt: stamp,
        entries: [{ row: 6, leadId, id: sourceId, evidenceRow: 6 }]
      });
      if (name === config.providerPolicyAdapter) return realm(providerPolicy);
      if (name === config.sourceProofAdapter) return realm({
        ref: 'synthetic-source-proof', checkedAt: stamp, complete: true, clear: true,
        sourceVerificationPassed: true, modelAuthority: false,
        sourceId: input.sourceId, evidenceHash: input.evidenceHash,
        binding: exactBinding, bodySha256: input.bodySha256
      });
      if (name === config.semanticReviewAdapter) {
        semanticReviewCalls += 1;
        const runtimeContext = context.BackofficeNativeRuntimeV1.nativeContext();
        const canonical = runtimeContext.resolvePreflightCanonical(input, name);
        const reviewInput = realm(input);
        delete reviewInput.nativeCanonicalRef;
        delete reviewInput.runtimeDeadlineUtc;
        reviewInput.canonical = canonical;
        return policy.review(reviewInput, 'SEND');
      }
      throw new Error(`Unexpected offline adapter invocation: ${name}`);
    },
    send: (args, rfcMessageId) => {
      sendCalls += 1;
      const checkedArgs = plain(args);
      assert.equal(checkedArgs.to, recipient);
      assert.equal(checkedArgs.subject, binding.subject);
      assert.equal(checkedArgs.payload.mime_type, 'text/plain');
      assert.equal(checkedArgs.payload.body.content, body, 'the synthetic Gmail send receives the exact reviewed body');
      const sentBody = checkedArgs.payload.body.content;
      storedMessage = realm({
        id: 'synthetic-gmail-message-000001',
        thread_id: 'synthetic-gmail-thread-000001',
        internal_date: String(now),
        label_ids: ['SENT', 'Label_5'],
        payload: {
          mime_type: 'text/plain',
          body: { content: sentBody },
          headers: [
            { name: 'to', value: recipient },
            { name: 'from', value: 'Backoffice Backoffice Owner <operator@example.com>' },
            { name: 'subject', value: checkedArgs.subject },
            { name: 'message-id', value: `<${rfcMessageId}>` }
          ]
        }
      });
      return realm({ id: 'synthetic-gmail-message-000001', thread_id: 'synthetic-gmail-thread-000001' });
    },
    full: () => {
      if (scenario === 'lost-receipt-read' && !interruptedReceiptRead) {
        interruptedReceiptRead = true;
        throw new Error('Synthetic interrupted receipt read after one fake send.');
      }
      return realm({ structuredContent: storedMessage });
    },
    minimal: () => {
      if (scenario === 'legacy-repeat-recovery-lifecycle' && !interruptedMinimalRead) {
        interruptedMinimalRead = true;
        throw new Error('Synthetic interrupted label readback.');
      }
      return realm({ structuredContent: {
        id: 'synthetic-gmail-message-000001',
        thread_id: 'synthetic-gmail-thread-000001',
        label_ids: ['SENT', 'Label_5']
      } });
    },
    label: () => { throw new Error('Synthetic message already has the requested label.'); }
  };

  const definition = realm({
    row: 6,
    leadId,
    organization,
    person,
    role,
    email: recipient,
    organizationKey: 'synthetic-example-association',
    organizationType: 'membership association',
    staffUrl,
    workflowUrl
  });
  const sourceRawCells = targetRow.map(cell => Object.keys(cell).length ? { userEnteredValue: cell } : {});
  const sourceFixture = realm({
    sourceVerificationPassed: true,
    source_context: {
      liveCaptureVerified: true,
      candidate: {
        person, current_role: role, email: recipient, organization,
        first: 'Synthetic', lead_id: leadId, product: 'Jobs',
        organization_key: 'synthetic-example-association', organization_type: 'membership association',
        workflow: 'PUBLIC_JOB_BOARD', observation: binding.observation
      },
      sourceRefs: [staffUrl, workflowUrl]
    },
    evidence: {
      bindingSha256: sha('synthetic-source-binding'),
      binding: { registrySha256: sha(JSON.stringify(definition)) },
      workflow: { facts: { heading: 'Job Search' } },
      fullCanonicalPreimage: { result: { structuredContent: { sheets: [{ data: [{ rowData: [{ values: sourceRawCells }] }] }] } } }
    }
  });
  const providerBasis = realm({
    schema: 'BackofficeNativeProviderPolicyBasis/v1',
    accountAddress: 'operator@example.com',
    checkedAt: stamp,
    syntheticOfflineEvidence: true
  });
  const providerPolicy = realm({
    schema: 'BackofficeNativeProviderPolicy/v1',
    ref: 'synthetic-provider-policy',
    checkedAt: stamp,
    complete: true,
    captureKind: 'FRESH_NATIVE_POLICY_READ_V1',
    laggedChangeDetectionOnly: false,
    accountAddress: 'operator@example.com',
    sentSearchCoversAllUsage: true,
    unknownUsage: false,
    aliases: { complete: true, ref: 'synthetic-aliases', checkedAt: stamp },
    delegation: { complete: true, ref: 'synthetic-delegation', checkedAt: stamp },
    vacation: { complete: true, ref: 'synthetic-vacation', checkedAt: stamp },
    nativePolicyBasis: providerBasis,
    nativePolicyBasisSha256: sha(JSON.stringify(providerBasis))
  });
  const policy = context.BackofficeNativeLedgerPolicyV1.create({
    now: () => now,
    sha: value => sha(typeof value === 'string' ? value : JSON.stringify(value)),
    snapshotHash: value => sha(typeof value === 'string' ? value : JSON.stringify(value)),
    projectId: config.projectId,
    authorityRef,
    registry: () => realm({ SYNTHETIC_ROLE: definition }),
    properties: () => props.getProperties(),
    validateArchiveSummary: services.validateArchiveSummary,
    family: () => realm({
      schema: 'BackofficeNativeReviewedFamily/v1',
      organizationKey: 'synthetic-example-association',
      domains: ['example.com'],
      organizations: [organization],
      sourceRefs: [staffUrl, workflowUrl],
      reviewRef: 'synthetic-family-review',
      historicalBindings: 'UNKNOWN'
    }),
    boundSource: () => sourceFixture,
    nativeClaimKnown: claim => {
      claim.expectedBinding = binding;
      return context.fernainNativeClaimKnown(claim, context.BackofficeNativeRuntimeV1.nativeContext());
    }
  });

  const captureId = 'syntheticcapture000001';
  const initialSnapshot = toSnapshot();
  const typedTarget = realm(context.BackofficeNativeSemanticSnapshotV2.target(initialSnapshot, 6));
  const capture = realm({
    schema: 'BackofficeNativeCapture/v1',
    id: captureId,
    sourceId,
    sourceRow: 6,
    sourceHash,
    handle: { row: 6, leadId },
    bindingHash: sha(JSON.stringify(exactBinding)),
    bodySha256: sha(body),
    typedHash: sha(JSON.stringify(typedTarget)),
    preparedUsageBasisRef,
    traceId: 'NATIVE-TRACE-synthetic-prep-000001',
    traceRow: 7,
    traceRowSha256,
    expiresAt: new Date(now + 120_000).toISOString(),
    consumed: false
  });
  propsState[context.BackofficeNativeRuntimeV1.capturePrefix + captureId] = JSON.stringify(capture);

  const runtime = context.BackofficeNativeRuntimeV1.create(services);
  const model = JSON.stringify({ decision: 'SEND', capture_id: captureId, proposal: { ...plain(exactBinding), body } });
  return {
    context,
    runtime,
    propsState,
    db,
    sendCalls: () => sendCalls,
    semanticReviewCalls: () => semanticReviewCalls,
    mutationApplied: () => mutationApplied,
    model,
    leadId,
    sourceId,
    binding,
    evidenceRow: evidence => plain(evidence),
    gmailMessage: () => plain(storedMessage),
    scenario
  };
}

function prepareInterruptedReceiptRecovery(variant = 'legacy', scenario = 'lost-receipt-read') {
  const h = makeHarness(scenario);
  const interrupted = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));
  assert.equal(interrupted.status, 'PENDING_NO_RESEND');
  assert.equal(interrupted.sendAttempted, true);
  assert.equal(h.sendCalls(), 1, 'the recovery fixture begins after exactly one fake send');

  const markerKey = `FERNAIN_NATIVE_NO_RESEND_V1:${sha(h.leadId)}`;
  const marker = JSON.parse(h.propsState[markerKey]);
  const expectedState = scenario === 'lost-receipt-read' ? 'SENT_RECEIPT_PENDING_NO_RESEND' :
    scenario === 'legacy-closed-claim-marker-interruption' ? 'CONFIRMED_CLAIM_PENDING_NO_RESEND' : 'RECEIPT_PERSISTED_NO_RESEND';
  assert.equal(marker.state, expectedState);
  assert.ok(Number.isInteger(marker.pendingRow));
  assert.ok(Number.isInteger(marker.attemptRow));
  const boundaryRow = h.db.Evidence[marker.attemptRow - 1];
  const boundaryDocument = JSON.parse(boundaryRow[3].stringValue);

  if (variant === 'legacy') {
    delete marker.pendingRowSha256;
    delete boundaryDocument.value.pendingRowSha256;
    delete boundaryDocument.value.pendingRow;
  } else if (variant === 'marker-hash-missing') {
    delete marker.pendingRowSha256;
  } else if (variant === 'boundary-hash-missing') {
    delete boundaryDocument.value.pendingRowSha256;
  } else if (variant === 'marker-hash-malformed') {
    marker.pendingRowSha256 = 'not-a-sha256';
  } else if (variant === 'boundary-hash-malformed') {
    boundaryDocument.value.pendingRowSha256 = 'not-a-sha256';
  } else if (variant === 'pending-hash-mismatch') {
    boundaryDocument.value.pendingRowSha256 = 'a'.repeat(64);
  } else if (variant !== 'exact') {
    throw new Error(`Unknown recovery fixture variant: ${variant}`);
  }

  boundaryRow[3] = { stringValue: JSON.stringify(boundaryDocument) };
  marker.attemptRowSha256 = sha(JSON.stringify(boundaryRow));
  h.propsState[markerKey] = JSON.stringify(marker);
  return { h, markerKey, marker, boundaryRow, boundaryDocument, interrupted };
}

test('historical V1 receipt recovery validates the receipt without sending again or backfilling new hashes', () => {
  const { h, markerKey, boundaryRow } = prepareInterruptedReceiptRecovery('legacy');
  const result = plain(h.runtime.reconcilePending());

  assert.equal(result.status, 'RECONCILED');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].status, 'CONFIRMED_NO_RESEND');
  assert.equal(result.results[0].sendAttempted, false);
  assert.equal(h.sendCalls(), 1, 'recovery verifies the one existing native receipt and never sends');
  const marker = JSON.parse(h.propsState[markerKey]);
  const boundary = JSON.parse(boundaryRow[3].stringValue);
  assert.equal(Object.hasOwn(marker, 'pendingRowSha256'), false, 'historical marker stays unmodified with respect to the new hash');
  assert.equal(Object.hasOwn(boundary.value, 'pendingRowSha256'), false, 'historical attempt boundary is not backfilled');
  assert.equal(Object.hasOwn(boundary.value, 'pendingRow'), false, 'the legacy boundary remains its original V1 shape');
  const claim = JSON.parse(h.db.Evidence[marker.claimRow - 1][3].stringValue);
  assert.equal(claim.status, 'CLOSED');
});

test('hashless receipt recovery resumes repeated historical receipt, canonical, and claim-close phases without sending', () => {
  const { h, markerKey, boundaryRow } = prepareInterruptedReceiptRecovery('legacy', 'legacy-repeat-recovery-lifecycle');
  let marker = JSON.parse(h.propsState[markerKey]);
  assert.equal(marker.state, 'RECEIPT_PERSISTED_NO_RESEND', 'the original send stopped after durable receipt persistence');

  const firstRecovery = plain(h.runtime.reconcilePending());
  assert.equal(firstRecovery.results[0].status, 'PENDING_NO_RESEND', 'the first retry reaches the injected canonical write interruption');
  marker = JSON.parse(h.propsState[markerKey]);
  assert.equal(marker.state, 'RECEIPT_PERSISTED_NO_RESEND');

  const secondRecovery = plain(h.runtime.reconcilePending());
  assert.equal(secondRecovery.results[0].status, 'PENDING_NO_RESEND', 'the second retry commits canonical state and reaches claim-close interruption');
  marker = JSON.parse(h.propsState[markerKey]);
  assert.equal(marker.state, 'CONFIRMED_CLAIM_PENDING_NO_RESEND');

  const thirdRecovery = plain(h.runtime.reconcilePending());
  assert.equal(thirdRecovery.results[0].status, 'CONFIRMED_NO_RESEND');
  assert.equal(thirdRecovery.results[0].claimClosed, true);
  assert.equal(h.sendCalls(), 1, 'all recovery rounds reuse the single earlier fake send');
  marker = JSON.parse(h.propsState[markerKey]);
  assert.equal(marker.state, 'CONFIRMED_NO_RESEND');
  assert.equal(Object.hasOwn(marker, 'pendingRowSha256'), false, 'the recovered legacy marker remains without a new hash');
  const boundary = JSON.parse(boundaryRow[3].stringValue);
  assert.equal(Object.hasOwn(boundary.value, 'pendingRowSha256'), false, 'the recovered legacy boundary remains without a new hash');
  const claim = JSON.parse(h.db.Evidence[marker.claimRow - 1][3].stringValue);
  assert.equal(claim.status, 'CLOSED');

  const settledAgain = plain(h.runtime.reconcilePending());
  assert.deepEqual(settledAgain.results, [], 'a completed historical recovery is stable on the next reconciliation');
  assert.equal(h.sendCalls(), 1);
});

test('hashless later-phase recovery rejects a changed persisted native receipt', () => {
  const { h, markerKey } = prepareInterruptedReceiptRecovery('legacy', 'legacy-repeat-recovery-lifecycle');
  const marker = JSON.parse(h.propsState[markerKey]);
  const receiptRow = h.db.Evidence[marker.receiptRow - 1];
  const receiptDocument = JSON.parse(receiptRow[3].stringValue);
  receiptDocument.value.receipt.structuredContent.payload.body.content += ' synthetic tamper';
  receiptRow[3] = { stringValue: JSON.stringify(receiptDocument) };

  const result = plain(h.runtime.reconcilePending());
  assert.equal(result.results[0].status, 'PENDING_NO_RESEND');
  assert.equal(result.results[0].reasonCode, 'NATIVE_RECOVERY_HOLD');
  assert.equal(h.sendCalls(), 1, 'corrupt persisted receipt evidence cannot resume or resend');
});

test('hashless claim-pending recovery revalidates receipt and canonical state after closure before marker write interruption', () => {
  const { h, markerKey } = prepareInterruptedReceiptRecovery('legacy', 'legacy-closed-claim-marker-interruption');
  const pendingMarker = JSON.parse(h.propsState[markerKey]);
  assert.equal(pendingMarker.state, 'CONFIRMED_CLAIM_PENDING_NO_RESEND');
  const alreadyClosedClaim = JSON.parse(h.db.Evidence[pendingMarker.claimRow - 1][3].stringValue);
  assert.equal(alreadyClosedClaim.status, 'CLOSED', 'the interrupted final marker follows a durable claim close');

  const result = plain(h.runtime.reconcilePending());
  assert.equal(result.results[0].status, 'CONFIRMED_NO_RESEND');
  assert.equal(h.sendCalls(), 1);
  const marker = JSON.parse(h.propsState[markerKey]);
  assert.equal(marker.state, 'CONFIRMED_NO_RESEND');
  assert.equal(Object.hasOwn(marker, 'pendingRowSha256'), false);
});

test('exact current pending and boundary hashes still allow receipt-only recovery', () => {
  const { h, markerKey, boundaryRow } = prepareInterruptedReceiptRecovery('exact');
  const result = plain(h.runtime.reconcilePending());

  assert.equal(result.results[0].status, 'CONFIRMED_NO_RESEND');
  assert.equal(h.sendCalls(), 1);
  const marker = JSON.parse(h.propsState[markerKey]);
  const boundary = JSON.parse(boundaryRow[3].stringValue);
  assert.equal(boundary.value.pendingRowSha256, marker.pendingRowSha256);
  assert.equal(sha(JSON.stringify(h.db.Evidence[marker.pendingRow - 1])), marker.pendingRowSha256);
});

for (const variant of [
  'marker-hash-missing',
  'boundary-hash-missing',
  'marker-hash-malformed',
  'boundary-hash-malformed',
  'pending-hash-mismatch'
]) {
  test(`${variant} holds during receipt recovery without another send`, () => {
    const { h } = prepareInterruptedReceiptRecovery(variant);
    const result = plain(h.runtime.reconcilePending());

    assert.equal(result.status, 'RECONCILED');
    assert.equal(result.results[0].status, 'PENDING_NO_RESEND');
    assert.equal(result.results[0].reasonCode, 'NATIVE_RECOVERY_HOLD');
    assert.equal(h.sendCalls(), 1, 'a malformed or one-sided hash never authorizes retry');
  });
}

test('actual public consume path admits only the exact own attempt boundary and sends once', () => {
  const h = makeHarness('normal');
  const result = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));
  assert.equal(result.status, 'CONFIRMED_NO_RESEND');
  assert.equal(result.noResend, true);
  assert.equal(result.sendAttempted, true);
  assert.equal(h.sendCalls(), 1);
  assert.equal(h.semanticReviewCalls(), 3, 'initial, pending reservation, and exact attempt-boundary ledger reviews ran');
  const sentBody = h.gmailMessage().payload.body.content;
  assert.equal(sentBody, h.context.renderCurrentSalesBody(h.binding), 'the actual synthetic Gmail payload preserves the exact reviewed body');
  assert.match(sentBody, /^Hi Synthetic,\n\nI'm Fernáin, founder of Fernain\./);
  assert.match(sentBody, /\n\nThanks,\nFernáin Joseff Betancourt\nFounder, Fernain LLC\nhttps:\/\/fernain\.com$/);
  const marker = Object.values(h.propsState).map(value => {
    try { return JSON.parse(value); } catch { return null; }
  }).find(value => value && value.schema === 'BackofficeNativeNoResend/v1');
  assert.equal(marker.state, 'CONFIRMED_NO_RESEND');
  const claim = JSON.parse(h.db.Evidence[marker.claimRow - 1][3].stringValue);
  assert.equal(claim.status, 'CLOSED');
});

test('new unresolved manual usage for the target after the attempt boundary holds before send', () => {
  const h = makeHarness('changed-manual-usage');
  const result = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));

  assert.equal(h.mutationApplied(), true);
  assert.equal(result.status, 'PENDING_NO_RESEND');
  assert.equal(result.sendAttempted, false);
  assert.equal(result.noResend, true);
  assert.equal(h.sendCalls(), 0);
  assert.equal(h.semanticReviewCalls(), 3, 'the changed manual quota was independently reviewed at dispatch');
});

test('a foreign no-resend attempt-boundary journal remains a conflict', () => {
  const h = makeHarness('foreign-boundary');
  const result = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));

  assert.equal(h.mutationApplied(), true);
  assert.equal(result.status, 'PENDING_NO_RESEND');
  assert.equal(result.sendAttempted, false);
  assert.equal(result.noResend, true);
  assert.equal(h.sendCalls(), 0);
  assert.equal(h.semanticReviewCalls(), 3, 'the actual ledger saw the foreign journal at dispatch');
});

for (const scenario of ['duplicate-own-pending-boundary', 'duplicate-own-pending-wrong-content', 'duplicate-own-pending-preboundary', 'tampered-own-pending-after-boundary', 'duplicate-own-marker-conflicting-body']) {
test(`${scenario} remains a conflict`, () => {
  const h = makeHarness(scenario);
  const result = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));

  assert.equal(h.mutationApplied(), true);
  assert.equal(result.status, 'PENDING_NO_RESEND');
  assert.equal(result.sendAttempted, false);
  assert.equal(result.noResend, true);
  assert.equal(h.sendCalls(), 0);
  assert.ok(h.semanticReviewCalls() >= 2, 'the actual ledger reviewed the pending journal before any send');
});
}

for (const scenario of ['tampered-boundary', 'missing-boundary']) {
  test(`${scenario} fails closed without a retryable send`, () => {
    const h = makeHarness(scenario);
    const result = plain(h.runtime.consumeGemini('syntheticcapture000001', h.model));

    assert.equal(h.mutationApplied(), true);
    assert.equal(result.status, 'PENDING_NO_RESEND');
    assert.equal(result.sendAttempted, false);
    assert.equal(result.noResend, true);
    assert.equal(h.sendCalls(), 0);
    assert.equal(h.semanticReviewCalls(), 2, 'the altered boundary was rejected by the runtime fence before semantic admission');
  });
}

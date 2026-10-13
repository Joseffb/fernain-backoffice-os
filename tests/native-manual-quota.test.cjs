'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const pureGuards = fs.readFileSync(path.join(__dirname, '../sales/PureSalesGuardsV1.gs'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(__dirname, '../sales/NativeRuntimeIntegrationV1.gs'), 'utf8');
const servicesSource = fs.readFileSync(path.join(__dirname, '../sales/NativeServicesV1.gs'), 'utf8');
const now = Date.parse('2026-10-13T12:00:00.000Z');
const leadId = 'SYNTHETIC-LEAD-001';
const contactId = 'SYNTHETIC-CONTACT-001';
const recipient = 'person@example.com';
const contact = 'Synthetic Person\nCareer Services Manager\nperson@example.com';

function sha(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadActualGs() {
  const context = vm.createContext({ console });
  vm.runInContext(pureGuards, context, { filename: 'PureSalesGuardsV1.gs' });
  vm.runInContext(runtimeSource, context, { filename: 'NativeRuntimeIntegrationV1.gs' });
  const policy = context.BackofficeNativeLedgerPolicyV1.create({
    now: () => now,
    sha,
    snapshotHash: value => sha(typeof value === 'string' ? value : JSON.stringify(value))
  });
  return { context, policy };
}

function loadActualServices() {
  const calls = { profile: 0, labels: 0, searches: 0 };
  const context = vm.createContext({
    console,
    LockService: { getScriptLock: () => ({ tryLock: () => true, hasLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, getProperties: () => ({}), setProperty: () => {}, deleteProperty: () => {} }) },
    ScriptApp: { getScriptId: () => 'SYNTHETIC-PROJECT' },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
      newBlob: value => ({ getBytes: () => Array.from(Buffer.from(value, 'utf8')) }),
      computeDigest: (_algorithm, value) => Array.from(crypto.createHash('sha256').update(value, 'utf8').digest()),
      getUuid: () => 'synthetic-id'
    },
    Gmail: { Users: {
      getProfile: () => { calls.profile++; return { emailAddress: 'operator@example.com' }; },
      Labels: { list: () => { calls.labels++; return { labels: [{ id: 'Label_5', name: 'Outreach/Sent/Jobs' }] }; } },
      Messages: { list: () => { calls.searches++; return {}; } }
    } }
  });
  vm.runInContext(servicesSource, context, { filename: 'NativeServicesV1.gs' });
  const services = context.fernainNativeServices();
  services.startBudget(10000);
  return { context, services, calls };
}

function typedRow(width, values = {}) {
  return Array.from({ length: width }, (_, index) => {
    const value = values[index];
    return typeof value === 'string' ? { stringValue: value } : {};
  });
}

function prospectRow() {
  return typedRow(27, {
    1: 'Example Organization',
    3: contact,
    11: 'Qualified - not contacted',
    14: contactId,
    26: 'Jobs'
  });
}

function unknownReceipt(schema, index, completedAtUtc = new Date(now - 60_000).toISOString()) {
  const common = {
    schema,
    roundId: `synthetic-round-${index}`,
    writerId: 'synthetic-writer',
    contactId,
    prospectRow: 6,
    recipient,
    claimRow: 6 + index,
    completedAtUtc
  };
  if (schema.endsWith('UncertainSend/v1')) {
    return {
      ...common,
      literalOutcome: 'Synthetic dispatch outcome is unresolved',
      dispatchPhase: 'UNKNOWN',
      sendVerified: false,
      noRetry: true,
      noAlternateRoute: true,
      gmailReceiptFound: false,
      reservedUnknownSlot: true,
      exactArgs: {
        from_address: 'Backoffice Backoffice Owner <operator@example.com>',
        to: recipient,
        subject: 'Synthetic quota-boundary test',
        payload: { body: { content: 'Synthetic body only.' } }
      }
    };
  }
  return {
    ...common,
    sendAttemptCompletedAtUtc: completedAtUtc,
    providerReached: true,
    actualOutcome: 'UNKNOWN; no Gmail ID returned',
    gmailMessageId: null,
    gmailThreadId: null,
    noRetryOrAlternate: true,
    recipientAndOrganizationRouteHeld: true,
    unknownRolling60And24AccountRecipientSlotReserved: true,
    dispatchNonacceptanceNotInferred: true,
    emptySearchNotNonEffectProof: true,
    retryableAsReturned: false,
    exactAttemptedArguments: {
      from_address: 'Backoffice Backoffice Owner <operator@example.com>',
      to: recipient,
      subject: 'Synthetic quota-boundary test',
      payload: { body: { content: 'Synthetic body only.' } }
    }
  };
}

function confirmedReceipt(index, completedAtUtc = new Date(now - 60_000).toISOString()) {
  return {
    schema: 'FernainManualSendReceipt/v1',
    roundId: `synthetic-round-${index}`,
    writerId: 'synthetic-writer',
    contactId,
    prospectRow: 6,
    recipient,
    claimRow: 6 + index,
    sendCompletedAtUtc: completedAtUtc,
    gmailMessageId: `synthetic-message-${index}`,
    gmailThreadId: `synthetic-thread-${index}`,
    sender: 'operator@example.com',
    nativeBodyHeadersSentAndLabel5Verified: true,
    subject: 'Synthetic confirmed receipt',
    body: 'Synthetic body only.',
    sourceRefs: ['https://example.com/synthetic-source']
  };
}

function evidenceRow(type, serialized, rowId = 'synthetic-evidence') {
  return typedRow(26, { 0: rowId, 2: type, 3: serialized });
}

function snapshotWith(entries) {
  const blankProspects = Array.from({ length: 5 }, () => typedRow(27));
  const blankEvidence = Array.from({ length: 5 }, () => typedRow(26));
  const rows = blankEvidence.concat(entries.map((entry, index) =>
    evidenceRow(entry.type || 'Manual uncertain send / synthetic round quota', entry.serialized, `synthetic-evidence-${index + 1}`)));
  return {
    Prospects: { rowCount: 6, rows: blankProspects.concat([prospectRow()]) },
    Evidence: { rowCount: rows.length, rows }
  };
}

function review(entries) {
  const { policy } = loadActualGs();
  const snapshot = snapshotWith(entries);
  return { snapshot, result: policy.reviewManualQuota(snapshot, { row: 6, leadId }) };
}

function serialization(doc, mode) {
  const compact = JSON.stringify(doc);
  if (mode === 'compact') return compact;
  if (mode === 'pretty') return JSON.stringify(doc, null, 2);
  if (mode === 'escaped') {
    return compact
      .replace('"schema":', '"\\u0073chema":')
      .replace('FernainManualUncertainSend/v1', 'FernainManualUncertainSend\\u002fv1')
      .replace('BackofficeManualUncertainSend/v1', 'BackofficeManualUncertainSend\\u002fv1');
  }
  throw new Error(`Unknown synthetic serialization: ${mode}`);
}

test('compact, pretty, and escaped manual JSON preserve semantics and raw-cell SHA lineage', () => {
  const doc = unknownReceipt('FernainManualUncertainSend/v1', 1);
  const outputs = ['compact', 'pretty', 'escaped'].map(mode => {
    const serialized = serialization(doc, mode);
    const { result } = review([{ serialized }]);
    return { serialized, result };
  });

  for (const { serialized, result } of outputs) {
    assert.deepEqual(plain(result.reservations), { campaign60: 1, account24: 1, automation24: 1 });
    assert.equal(result.summary.unknownReservations.length, 1);
    assert.equal(result.summary.unknownReservations[0].schema, 'BackofficeManualUncertainSend/v1');
    assert.equal(result.summary.unknownReservations[0].sourceSha256, sha(serialized));
    assert.equal(result.targetUnknown, true);
  }
  assert.notEqual(outputs[0].result.summary.unknownReservations[0].sourceSha256,
    outputs[1].result.summary.unknownReservations[0].sourceSha256);
  assert.notEqual(outputs[0].result.summary.unknownReservations[0].sourceSha256,
    outputs[2].result.summary.unknownReservations[0].sourceSha256);
});

test('all three receipt schemas are recognized through the public aliases', () => {
  const docs = [
    unknownReceipt('FernainManualUncertainSend/v1', 1),
    unknownReceipt('BackofficeManualUncertainSend/v1', 2),
    unknownReceipt('FernainManualUnknownSendReceipt/v1', 3),
    unknownReceipt('BackofficeManualUnknownSendReceipt/v1', 4),
    confirmedReceipt(5),
    { ...confirmedReceipt(6), schema: 'BackofficeManualSendReceipt/v1' }
  ];
  const entries = docs.map((doc, index) => ({
    type: index >= 4 ? 'Manual send receipt / synthetic round' : 'Uncertain send attempt / synthetic quota hold',
    serialized: JSON.stringify(doc)
  }));
  const { result } = review(entries);

  assert.deepEqual(plain(result.reservations), { campaign60: 4, account24: 4, automation24: 4 });
  assert.deepEqual(plain(result.summary.unknownReservations.map(item => item.schema)), [
    'BackofficeManualUncertainSend/v1', 'BackofficeManualUncertainSend/v1',
    'BackofficeManualUnknownSendReceipt/v1', 'BackofficeManualUnknownSendReceipt/v1'
  ]);
  assert.equal(result.summary.confirmedReceipts.length, 2);
  assert.deepEqual(plain(result.summary.confirmedReceipts.map(item => item.schema)), [
    'BackofficeManualSendReceipt/v1', 'BackofficeManualSendReceipt/v1'
  ]);
  assert.equal(result.summary.confirmedReceipts[0].sourceSha256, sha(entries[4].serialized));
  assert.equal(result.targetUnknown, true);
  assert.equal(result.targetConfirmed, true);
});

test('recognizable manual row labels fail closed for malformed, blank, missing, and unsupported receipts', () => {
  const samples = [
    '{"\\u0073chema":"BackofficeManualUncertainSend/v1"',
    '',
    '{}',
    '{"schema":"BackofficeManualUnknownSendReceipt/v2"}',
    '{"schema":"BackofficeManualFutureReceipt/v1"}'
  ];
  for (const serialized of samples) {
    assert.throws(() => review([{
      type: 'Uncertain send attempt / synthetic quota hold',
      serialized
    }]), /LEDGER_MANUAL_RECEIPT_(?:MALFORMED|SCHEMA)_HOLD/);
  }
});

test('a valid unrelated wrapper mentioning a manual schema in its body is not misclassified', () => {
  const serialized = JSON.stringify({
    schema: 'BackofficeNativeSource/v1',
    notes: 'FernainManualSendReceipt/v1 is only a plain text mention.'
  });
  const { result } = review([{ type: 'Primary source qualification', serialized }]);
  assert.deepEqual(plain(result.reservations), { campaign60: 0, account24: 0, automation24: 0 });
  assert.equal(result.summary.unknownReservations.length, 0);
  assert.equal(result.summary.confirmedReceipts.length, 0);
});

test('manual receipts cannot transfer canonical route or public sender identity', () => {
  const wrongContact = unknownReceipt('FernainManualUncertainSend/v1', 21);
  wrongContact.contactId = 'SYNTHETIC-OTHER-CONTACT';
  assert.throws(() => review([{ serialized: JSON.stringify(wrongContact) }]),
    /LEDGER_MANUAL_RECEIPT_CANONICAL_IDENTITY_HOLD/);

  const wrongSender = unknownReceipt('BackofficeManualUncertainSend/v1', 22);
  wrongSender.exactArgs.from_address = 'Synthetic Other Sender <other@example.com>';
  assert.throws(() => review([{ serialized: JSON.stringify(wrongSender) }]),
    /LEDGER_MANUAL_UNKNOWN_RESERVATION_INVALID/);

  const wrongConfirmedSender = confirmedReceipt(23);
  wrongConfirmedSender.sender = 'other@example.com';
  assert.throws(() => review([{ serialized: JSON.stringify(wrongConfirmedSender) }]),
    /LEDGER_MANUAL_CONFIRMED_RECEIPT_INVALID/);
});

function preflightPacket(reservations) {
  const checkedAt = new Date(now).toISOString();
  const candidate = {
    row: 6,
    leadId,
    product: 'Jobs',
    recipientKind: 'named-individual',
    to: recipient,
    name: 'Synthetic Person',
    first: 'Synthetic',
    company: 'Example Organization',
    role: 'Career Services Manager',
    organizationKey: 'example-organization',
    subject: 'A synthetic question',
    observation: 'We saw the public careers page.',
    sourceRefs: ['https://example.com/careers']
  };
  const binding = {
    row: candidate.row,
    leadId: candidate.leadId,
    product: candidate.product,
    to: candidate.to,
    name: candidate.name,
    first: candidate.first,
    company: candidate.company,
    role: candidate.role,
    organizationKey: candidate.organizationKey,
    subject: candidate.subject,
    observation: candidate.observation,
    sourceRefs: candidate.sourceRefs
  };
  const body = 'Hi Synthetic,\n\nI’m Backoffice, founder of Backoffice. We’re building Jobs, a career-board product for membership organizations, associations and publishers.\n\n' +
    candidate.observation + ' How is that service working for your team and members? I’d be interested in what you’d keep and what you’d change.\n\n' +
    'Would you be open to a brief conversation? If someone else handles the board, I’d appreciate a pointer to the right person.\n\n' +
    'Thanks,\nBackoffice Backoffice Owner\nFounder, Example Organization\nhttps://example.com';
  const row = Array(27).fill('');
  row[1] = candidate.company;
  row[3] = contact;
  row[11] = 'Qualified - not contacted';
  row[14] = leadId;
  row[26] = 'Jobs';
  const coverage = [
    'canonicalProspects', 'canonicalEvidence', 'gmailHistory', 'accountSent',
    'suppression', 'organizationHistory', 'familyHistory', 'reservations'
  ];
  const checks = Object.fromEntries(coverage.map(key => [key, {
    ref: `synthetic:${key}`, checkedAt, complete: true, clear: true, binding
  }]));
  checks.gmailHistory.ids = [];
  checks.accountSent.ids = [];
  const usage = {
    accountAddress: 'operator@example.com', complete: true, unknownUsage: false,
    campaign60: reservations, totalAccount24: reservations, automation24: 0,
    unknownAutomation24: reservations, reservedCampaign60: reservations,
    reservedAccount24: reservations, reservedAutomation24: reservations,
    accountSentIds: [], recipientCount24: reservations,
    externalRecipientCount24: reservations, uniqueRecipientCount24: reservations,
    externalUniqueRecipientCount24: reservations, checkedAt, ref: 'synthetic:usage'
  };
  const limits = {
    messages24: 500, externalUnique24: 500, apiRecipientsPerMessage: 500,
    recipients24: 10000, externalRecipients24: 3000, uniqueRecipients24: 3000
  };
  const dimensions = Object.fromEntries(Object.entries(limits).map(([name, limit]) => [name, {
    applicable: true, limit, complete: true, reserved: 0,
    used: name === 'messages24' ? reservations : 0, increment: 1, nativeMetric: name
  }]));
  return {
    schema: 'BackofficeCurrentSalesPreflight/v1',
    provenance: { kind: 'parent-provider-readback', modelAuthority: false, ref: 'synthetic:trust' },
    packetId: 'synthetic-packet', checkedAt, ref: 'synthetic:preflight',
    account: { address: 'operator@example.com', labelId: 'Label_5', complete: true, checkedAt, ref: 'synthetic:account' },
    binding: candidate,
    source: { ref: 'synthetic:source', checkedAt, complete: true, clear: true, binding },
    owner: {
      effectScopeRef: 'synthetic:owner-scope', binding, body,
      allowedEffects: ['send-one-initial', 'message-Label_5', 'canonical-L-R:Y-EvidenceA:G']
    },
    mode: 'SEND', scheduleActivation: false, catchUp: false,
    canonical: {
      spreadsheetId: '{{CONFIGURE_GOOGLE_ID_030}}', prospectsSheetId: 901,
      evidenceSheetId: 903, rowRenderOption: 'FORMULA', evidenceRow: 6,
      rowAtoAA: row, contactCell: contact
    },
    checks,
    usage,
    provider: {
      accountAddress: 'operator@example.com', complete: true, tier: 'trial-or-conservative',
      checkedAt, ref: 'synthetic:provider', dimensions
    }
  };
}

test('ten unresolved attempts reach the rolling-20 cap and cannot admit another send', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    type: 'Uncertain send attempt / synthetic quota hold',
    serialized: JSON.stringify(unknownReceipt('FernainManualUnknownSendReceipt/v1', index + 1))
  }));
  const { result } = review(entries);
  assert.deepEqual(plain(result.reservations), { campaign60: 10, account24: 10, automation24: 10 });
  const { context } = loadActualGs();

  assert.doesNotThrow(() => context.validateCurrentSalesPreflight(preflightPacket(9), now));
  assert.throws(() => context.validateCurrentSalesPreflight(preflightPacket(10), now),
    /campaign\/account\/automation rolling quota/);
});

test('actual Services accountUsage carries synthetic manual reservations into usage and provider metrics', () => {
  const doc = unknownReceipt('FernainManualUncertainSend/v1', 41, new Date(Date.now() - 60_000).toISOString());
  const { result } = review([{ serialized: JSON.stringify(doc) }]);
  const manualUsage = plain(result.summary);
  const evidenceSha256 = manualUsage.evidenceSha256;
  const { services, calls } = loadActualServices();
  const limits = {
    messages24: 500, externalUnique24: 500, apiRecipientsPerMessage: 500,
    recipients24: 10000, externalRecipients24: 3000, uniqueRecipients24: 3000
  };
  const dimensions = Object.fromEntries(Object.entries(limits).map(([name, limit]) => [name, {
    applicable: true, complete: true, limit, reserved: 0, nativeMetric: name
  }]));
  const usage = services.accountUsage({ row: 6, leadId, to: recipient, name: 'Synthetic Person', company: 'Example Organization' }, {
    provider: { senderAddresses: ['operator@example.com'], internalDomains: ['example.org'], dimensions, tier: 'trial-or-conservative' },
    reservations: plain(result.reservations), manualUsage, evidenceSha256, familyTerms: ['example.org', 'Example Organization']
  });

  assert.equal(calls.profile, 1);
  assert.equal(calls.labels, 1);
  assert.equal(calls.searches, 2);
  assert.equal(usage.usage.campaign60, 1);
  assert.equal(usage.usage.totalAccount24, 1);
  assert.equal(usage.usage.unknownAutomation24, 1);
  assert.equal(usage.usage.reservedCampaign60, 1);
  assert.equal(usage.usage.reservedAccount24, 1);
  assert.equal(usage.usage.reservedAutomation24, 1);
  assert.equal(usage.provider.dimensions.messages24.used, 1);
  assert.equal(usage.nativeUsageBasis.manualUnknownReservations24[0].sourceSha256,
    manualUsage.unknownReservations[0].sourceSha256);
  assert.equal(usage.nativeUsageBasisSha256, sha(JSON.stringify(usage.nativeUsageBasis)));
});

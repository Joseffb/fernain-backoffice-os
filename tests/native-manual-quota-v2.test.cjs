'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sourceDir = process.env.MANUAL_QUOTA_SOURCE_DIR || path.resolve(__dirname, '../sales');
const now = Date.parse('2026-10-13T12:00:00.000Z');
const targetLeadId = 'SYNTHETIC-LEAD-TARGET';
const targetContactId = 'SYNTHETIC-CONTACT-TARGET';
const otherContactId = 'SYNTHETIC-CONTACT-OTHER';
const otherRecipient = 'other@example.com';
const otherContactCell = 'Other Synthetic Person\nCareer Services Manager\nother@example.com';
const safetyColumns = [1, 3, 11, 14, 17, 18, 19, 20, 21, 22, 26];

function sha(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value), 'utf8').digest('hex');
}

function realm(context, value) {
  return vm.runInContext(`(${JSON.stringify(value)})`, context);
}

function typedRow(width, values = {}) {
  return Array.from({ length: width }, (_, index) => {
    const value = values[index];
    return typeof value === 'string' && value ? { stringValue: value } : {};
  });
}

function displayRow(row) {
  return row.map(cell => {
    if (!Object.keys(cell).length) return '';
    const value = Object.values(cell)[0];
    return String(value);
  });
}

function prospectRow({ company, contact, leadId, contactId }) {
  return typedRow(27, {
    1: company,
    3: contact,
    11: 'Qualified - not contacted',
    14: leadId,
    26: 'Jobs'
  });
}

function evidenceRow(type, serialized, rowId) {
  return typedRow(26, { 0: rowId, 2: type, 3: serialized });
}

function unknownReceipt(index, senderAddress) {
  return {
    schema: 'BackofficeManualUnknownSendReceipt/v1',
    roundId: `synthetic-other-round-${index}`,
    writerId: 'synthetic-writer',
    contactId: otherContactId,
    prospectRow: 7,
    recipient: otherRecipient,
    claimRow: 5 + index,
    sendAttemptCompletedAtUtc: new Date(now - 60_000).toISOString(),
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
      from_address: senderAddress,
      to: otherRecipient,
      subject: 'Synthetic quota receipt',
      payload: { body: { content: 'Synthetic body only.' } }
    }
  };
}

function confirmedReceipt(sender) {
  return {
    schema: 'BackofficeManualSendReceipt/v1',
    roundId: 'synthetic-other-confirmed-round',
    writerId: 'synthetic-writer',
    contactId: otherContactId,
    prospectRow: 7,
    recipient: otherRecipient,
    claimRow: 6,
    sendCompletedAtUtc: new Date(now - 60_000).toISOString(),
    gmailMessageId: 'synthetic-other-message-id',
    gmailThreadId: 'synthetic-other-thread-id',
    sender,
    nativeBodyHeadersSentAndLabel5Verified: true,
    subject: 'Synthetic confirmed receipt',
    body: 'Synthetic body only.',
    sourceRefs: ['https://example.com/synthetic-source']
  };
}

function semanticSnapshot(entries) {
  const selected = prospectRow({
    company: 'Target Example Organization',
    contact: 'Target Synthetic Person\nCareer Services Manager\ntarget@example.com',
    leadId: targetLeadId,
    contactId: targetContactId
  });
  const other = prospectRow({
    company: 'Other Example Organization',
    contact: otherContactCell,
    leadId: otherContactId,
    contactId: otherContactId
  });
  const prospects = Array.from({ length: 7 }, () => typedRow(27));
  prospects[5] = selected;
  prospects[6] = other;

  const evidence = Array.from({ length: Math.max(6, 5 + entries.length) }, (_, index) =>
    index < 5 ? typedRow(26) : evidenceRow(entries[index - 5].type, entries[index - 5].serialized, `synthetic-evidence-${index - 4}`));
  return {
    schema: 'BackofficeNativeSemanticSnapshot/v2',
    spreadsheetId: '{{CONFIGURE_GOOGLE_ID_030}}',
    checkedAt: new Date(now).toISOString(),
    ref: 'synthetic-semantic-snapshot-v2',
    Prospects: {
      sheetId: 901,
      rowCount: prospects.length,
      width: 27,
      columns: safetyColumns,
      safetyRows: prospects.map(row => safetyColumns.map(index => row[index])),
      organizationDisplay: prospects.map(row => displayRow(row)[1]),
      headers: typedRow(27),
      target: { row: 6, leadId: targetLeadId, typedRow27: selected, displayRow27: displayRow(selected) }
    },
    Evidence: {
      sheetId: 903,
      rowCount: evidence.length,
      width: 26,
      rows: evidence,
      displayRows: evidence.map(displayRow),
      archiveSummaries: evidence.map(() => null)
    }
  };
}

function setup() {
  const context = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(sourceDir, 'PureSalesGuardsV1.gs'), 'utf8'), context,
    { filename: 'PureSalesGuardsV1.gs' });
  vm.runInContext(fs.readFileSync(path.join(sourceDir, 'NativeRuntimeIntegrationV1.gs'), 'utf8'), context,
    { filename: 'NativeRuntimeIntegrationV1.gs' });
  const senderAddress = vm.runInContext('FERN_FROM', context);
  const accountAddress = context.fernSingleHeaderEmail(senderAddress);
  const policy = context.BackofficeNativeLedgerPolicyV1.create({
    now: () => now,
    sha,
    snapshotHash: value => sha(value)
  });
  return { context, policy, senderAddress, accountAddress };
}

function review(context, policy, entries) {
  const snapshot = realm(context, semanticSnapshot(entries));
  context.BackofficeNativeSemanticSnapshotV2.validate(snapshot, { now: () => now });
  return policy.reviewManualQuota(snapshot, { row: 6, leadId: targetLeadId });
}

test('V2 semantic safety projection accepts a valid manual receipt for another contact', () => {
  const { context, policy, accountAddress } = setup();
  const entry = {
    type: 'Manual uncertain send / synthetic quota receipt',
    serialized: JSON.stringify(unknownReceipt(1, accountAddress))
  };
  const result = review(context, policy, [entry]);

  assert.equal(result.summary.unknownReservations.length, 1);
  assert.equal(result.reservations.campaign60, 1);
  assert.equal(result.reservations.account24, 1);
  assert.equal(result.reservations.automation24, 1);
  assert.equal(result.targetUnknown, false);
  assert.equal(result.targetConfirmed, false);
});

test('V2 receipts for another contact still reserve every rolling quota slot', () => {
  const { context, policy, accountAddress } = setup();
  const entries = Array.from({ length: 10 }, (_, index) => ({
    type: 'Manual unknown send receipt / synthetic quota reservation',
    serialized: JSON.stringify(unknownReceipt(index + 1, accountAddress))
  }));
  const result = review(context, policy, entries);

  assert.equal(result.summary.unknownReservations.length, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(result.reservations)), {
    campaign60: 10,
    account24: 10,
    automation24: 10
  });
  assert.equal(result.targetUnknown, false);
});

test('V2 confirmed receipts for another contact are retained without transferring target status', () => {
  const { context, policy, accountAddress } = setup();
  const entry = {
    type: 'Manual send receipt / synthetic confirmed round',
    serialized: JSON.stringify(confirmedReceipt(accountAddress))
  };
  const result = review(context, policy, [entry]);

  assert.equal(result.summary.confirmedReceipts.length, 1);
  assert.equal(result.summary.confirmedReceipts[0].contactId, otherContactId);
  assert.equal(result.summary.confirmedReceipts[0].prospectRow, 7);
  assert.equal(result.targetConfirmed, false);
});

test('V2 safety projection keeps strict canonical contact and recipient checks', () => {
  const { context, policy, accountAddress } = setup();
  const receipt = unknownReceipt(1, accountAddress);
  receipt.contactId = 'SYNTHETIC-WRONG-CONTACT';
  const entry = {
    type: 'Manual unknown send receipt / synthetic invalid identity',
    serialized: JSON.stringify(receipt)
  };

  assert.throws(() => review(context, policy, [entry]), /LEDGER_MANUAL_RECEIPT_CANONICAL_IDENTITY_HOLD/);
});

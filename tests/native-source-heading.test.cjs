'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sourceText = fs.readFileSync(path.join(root, 'sales/NativePublicSourceV1.gs'), 'utf8');
const guardsText = fs.readFileSync(path.join(root, 'sales/PureSalesGuardsV1.gs'), 'utf8');
const archiveText = fs.readFileSync(path.join(root, 'sales/NativeArchiveV2.gs'), 'utf8');
const now = '2026-10-13T13:00:00.000Z';
const currentRevision = 'first-introduction-neutral-example-20261015';
const sheetId = '{{CONFIGURE_GOOGLE_ID_030}}';
const headings = ['Job Search', 'Jobs Board', 'Opportunities'];

function prospectsHeaders() {
  const headers = Array.from({ length: 27 }, (_, index) => `Synthetic column ${index}`);
  Object.assign(headers, {
    1: 'Organization',
    3: 'Published contact route',
    5: 'Contacted date',
    7: 'Sent from',
    8: 'Sent to',
    9: 'Sent at (UTC)',
    11: 'Status',
    12: 'Message ID',
    13: 'Thread ID',
    14: 'Lead ID',
    26: 'Product'
  });
  return headers;
}

function sha(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function makeDefinition(heading, index) {
  const slug = heading.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const organization = `Example ${heading.replace(/ /g, '')} Association`;
  return {
    row: 20 + index,
    leadId: `EXAMPLE-HEADING-${slug.toUpperCase().replace(/-/g, '_')}`,
    product: 'Jobs',
    person: 'Casey Example',
    role: 'President/CEO',
    email: `casey.${slug}@example.net`,
    organization,
    organizationType: 'ASSOCIATION',
    organizationKey: `example-${slug}-association`,
    staffUrl: `https://staff-${slug}.example.org/about/`,
    workflowUrl: `https://jobs-${slug}.example.net/jobs/`,
    staffSection: 'Leadership',
    personHeadingLevel: 3,
    workflowHeading: heading,
    observation: `I noticed ${organization}’s website provides a public ${heading} page.`
  };
}

function response(body, contentType, realm) {
  const bytes = Array.from(Buffer.from(body, 'utf8'));
  return {
    getResponseCode: () => 200,
    getAllHeaders: () => realm(JSON.stringify({ 'Content-Type': contentType })),
    getContent: () => realm(JSON.stringify(bytes))
  };
}

function htmlFor(definition, actualHeading = definition.workflowHeading) {
  if (definition.kind === 'staff') {
    return `<h2>Leadership</h2><h3>${definition.person}</h3><p>${definition.role}</p><a href="mailto:${definition.email}">${definition.email}</a>`;
  }
  return `<h1>${actualHeading}</h1><div class="gzns"><select id="category-select" aria-label="Search by Category"></select><select id="employer-select" aria-label="Search by Employer"></select><button>Search</button></div>`;
}

function makeHarness(definitions, headingOverride) {
  const snapshot = {
    schema: 'FERNAIN_SCRIPT_OWNED_PRIMARY_SOURCE_REGISTRY_V1',
    capturedAtUtc: now,
    sourceRef: 'synthetic-public-registry-snapshot',
    version: 'SYNTHETIC_V1',
    entries: definitions.map((definition, index) => ({
      handle: `SYNTHETIC_HEADING_${index + 1}`,
      definitionJson: JSON.stringify(definition)
    }))
  };
  const proof = {
    schema: 'FERNAIN_TRUSTED_NATIVE_REGISTRY_READ_V1',
    checkedAtUtc: now,
    fullRegistryReadSha256: sha(JSON.stringify(snapshot))
  };
  const context = vm.createContext({
    console,
    BackofficeSalesEvidenceV1: {
      sha256: sha,
      strictJSON: value => JSON.parse(value),
      headers: prospectsHeaders()
    }
  });
  const realm = vm.runInContext('JSON.parse', context);
  context.BackofficeSalesEvidenceV1.strictJSON = value => realm(value);
  vm.runInContext(sourceText, context, { filename: 'NativePublicSourceV1.gs' });
  vm.runInContext(guardsText, context, { filename: 'PureSalesGuardsV1.gs' });
  vm.runInContext(archiveText, context, { filename: 'NativeArchiveV2.gs' });
  const producer = context.BackofficeNativePublicSourceV1.createWithScriptOwnedRegistry(
    () => realm(JSON.stringify(snapshot)),
    realm(JSON.stringify(proof))
  );
  assert.equal(typeof producer.capture, 'function', JSON.stringify(producer));
  const byHandle = new Map(definitions.map((definition, index) => [
    `SYNTHETIC_HEADING_${index + 1}`, definition
  ]));
  const services = {
    clock: () => now,
    hashBytes: bytes => sha(Buffer.from(bytes.map(value => value < 0 ? value + 256 : value))),
    fetch(url) {
      if (url.startsWith('https://dns.google/resolve?')) {
        const match = /\?name=([^&]+)&type=(1|28)&/.exec(url);
        assert.ok(match, `unexpected DNS URL ${url}`);
        const host = decodeURIComponent(match[1]);
        const type = Number(match[2]);
        const answer = type === 1 ? '8.8.8.8' : '2001:4860:4860::8888';
        return response(JSON.stringify({
          Status: 0,
          TC: false,
          RD: true,
          RA: true,
          AD: false,
          CD: false,
          Question: [{ name: host, type }],
          Answer: [{ name: host, type, TTL: 300, data: answer }]
        }), 'application/dns-json', realm);
      }
      const entry = [...byHandle].find(([, definition]) =>
        url === definition.staffUrl || url === definition.workflowUrl);
      assert.ok(entry, `unexpected source URL ${url}`);
      const [handle, definition] = entry;
      const kind = url === definition.staffUrl ? 'staff' : 'workflow';
      return response(htmlFor({ ...definition, kind },
        headingOverride && headingOverride.handle === handle ? headingOverride.value : definition.workflowHeading),
      'text/html; charset=utf-8', realm);
    }
  };
  return { context, producer, services, realm };
}

function canonicalPreimage(definition) {
  const headers = prospectsHeaders();
  const values = Array.from({ length: 27 }, () => ({}));
  const cells = {
    'Lead ID': definition.leadId,
    'Organization': definition.organization,
    'Product': definition.product,
    'Published contact route': `${definition.person}\n${definition.role}\n${definition.email}`,
    'Status': 'Qualified - not contacted'
  };
  for (const header of headers) {
    const value = cells[header] || '';
    values[headers.indexOf(header)] = value === '' ? {} : {
      userEnteredValue: { stringValue: value },
      formattedValue: value
    };
  }
  return {
    capturedAtUtc: now,
    result: {
      isError: false,
      structuredContent: {
        spreadsheetId: sheetId,
        sheets: [{
          properties: { title: 'Prospects' },
          data: [{ startRow: definition.row - 1, startColumn: 0, rowData: [{ values }] }]
        }]
      }
    }
  };
}

function policyPacket(definition, canonical) {
  return {
    schema: 'FERNAIN_NATIVE_FULL_POLICY_PACKET_V1',
    checkedAtUtc: now,
    target: {
      row: definition.row,
      leadId: definition.leadId,
      product: definition.product,
      email: definition.email
    },
    canonicalRawSha256: sha(JSON.stringify(canonical)),
    ledgerPreimage: { schema: 'SYNTHETIC_OFFLINE_LEDGER_PREIMAGE' },
    nativeProviderPolicy: { schema: 'SYNTHETIC_OFFLINE_PROVIDER_POLICY' }
  };
}

function currentCandidate(bound, definition) {
  const heading = bound.evidence.workflow.facts.heading;
  return {
    row: definition.row,
    leadId: definition.leadId,
    product: definition.product,
    to: definition.email,
    name: definition.person,
    first: definition.person.split(' ')[0],
    company: definition.organization,
    role: definition.role,
    organizationKey: definition.organizationKey,
    subject: `${definition.organization} — Could you share your experience?`,
    observation: bound.source_context.candidate.observation,
    sourceRefs: [definition.staffUrl, definition.workflowUrl],
    copyRevision: currentRevision,
    verifiedWorkflowHeading: heading
  };
}

function archiveClassifies(context, realm, definition, binding, body) {
  const sourceId = `NATIVE-SOURCE-SYNTHETIC-${definition.leadId}`;
  const authorityRef = 'synthetic-owner-authority';
  const reference = 'synthetic-native-preflight-reference';
  const rowAtoAA = Array.from({ length: 27 }, () => '');
  rowAtoAA[1] = definition.organization;
  rowAtoAA[3] = `${definition.person}\n${definition.role}\n${definition.email}`;
  rowAtoAA[11] = 'Qualified - not contacted';
  rowAtoAA[14] = definition.leadId;
  rowAtoAA[26] = definition.product;
  const targetCells = rowAtoAA.map(value => value === '' ? {} : { stringValue: value });
  const typedBinding = { ...binding, recipientKind: 'named-individual' };
  const owner = {
    effectScopeRef: 'synthetic-owner-effect-scope',
    authorityRef,
    standing: true,
    approvedAt: now
  };
  const sourceBinding = { ...binding };
  const packet = {
    schema: 'BackofficeCurrentSalesPreflight/v1',
    packetId: `NATIVE-PACKET-${sourceId}`,
    ref: reference,
    checkedAt: now,
    provenance: { kind: 'parent-provider-readback', modelAuthority: false, ref: reference },
    binding: typedBinding,
    source: { ref: reference, checkedAt: now, clear: true, complete: true, binding: sourceBinding },
    owner: {
      effectScopeRef: owner.effectScopeRef,
      binding: sourceBinding,
      body,
      allowedEffects: ['send-one-initial', 'message-Label_5', 'canonical-L-R:Y-EvidenceA:G']
    },
    mode: 'SEND',
    scheduleActivation: false,
    catchUp: false,
    canonical: {
      spreadsheetId: sheetId,
      prospectsSheetId: 901,
      evidenceSheetId: 903,
      evidenceRow: definition.row,
      rowRenderOption: 'FORMULA',
      rowAtoAA,
      contactCell: rowAtoAA[3]
    },
    claim: { id: 'UNCLAIMED_NATIVE_SOURCE', writerId: 'synthetic-native-writer' }
  };
  const expires = new Date(Date.parse(now) + 60_000).toISOString();
  const sourceProof = {
    schema: 'BackofficeNativeChunkManifest/v1',
    profile: 'GOOGLE_URLFETCH_PUBLIC_PRIMARY_DNS_PREFLIGHT_V1',
    capturedAtUtc: now,
    expiresAtUtc: expires,
    registryContentSha256: sha('synthetic-registry-content'),
    targetCellsSha256: sha(JSON.stringify(targetCells)),
    retainedJsonSha256: sha('synthetic-retained-source-json'),
    encodedSha256: sha('synthetic-encoded-source-json'),
    chunkCount: 1,
    chunks: [{ row: 8, rowSha256: sha('synthetic-chunk-row'), index: 0, chunkSha256: sha('synthetic-source-chunk') }]
  };
  const sourceEntry = {
    schema: 'BackofficeNativeSource/v1',
    sourceId,
    packet,
    targetCells,
    sourceProof,
    owner
  };
  const journalValue = {
    recordId: sourceId,
    sourceId,
    sourceEntry,
    sourceVersionSha256: sourceProof.retainedJsonSha256,
    humanAuthorityRef: authorityRef,
    noSend: true
  };
  const raw = JSON.stringify({
    schema: 'BackofficeNativeJournal/v1', kind: 'source-metadata', checkedAt: now, value: journalValue
  });
  const typedRow = Array.from({ length: 26 }, () => ({}));
  [sourceId, '', 'source-metadata', raw, 'Native acknowledged write + exact typed readback', '', now]
    .forEach((value, index) => { typedRow[index] = { stringValue: value }; });
  const displayRow = typedRow.map(cell => cell.stringValue || '');
  const universe = { emails: [definition.email], registrySha256: sha('synthetic-recipient-registry') };
  universe.sha256 = sha(JSON.stringify(universe));
  return context.BackofficeNativeArchiveV2.classify(
    realm(JSON.stringify(typedRow)),
    realm(JSON.stringify(displayRow)),
    20,
    realm(JSON.stringify(universe)),
    sha,
    value => Buffer.byteLength(value, 'utf8')
  );
}

test('actual public capture, full source bind, current copy and archive agree on the three witnessed headings', async t => {
  for (const [index, heading] of headings.entries()) {
    await t.test(heading, () => {
      const definition = makeDefinition(heading, index);
      const { context, producer, services, realm } = makeHarness([definition]);
      const capture = producer.capture('SYNTHETIC_HEADING_1', services);
      assert.equal(capture.outcome, 'NATIVE_SOURCE_CAPTURED_PREPARATION_ONLY', capture.reason_code);
      assert.equal(capture.workflow.facts.heading, heading);
      assert.equal(capture.workflow.facts.selectionText.split('\n')[0], heading);

      const canonical = realm(JSON.stringify(canonicalPreimage(definition)));
      const bound = producer.bind(capture, canonical, realm(JSON.stringify(policyPacket(definition, canonical))), now);
      assert.equal(bound.outcome, 'BOUND_NATIVE_SOURCE_CONTEXT_POLICY_PENDING', bound.reason_code);
      assert.equal(bound.source_context.candidate.observation,
        `I noticed ${definition.organization}’s website provides a public ${heading} page.`);
      assert.equal(bound.evidence.workflow.facts.heading, heading);

      const candidate = currentCandidate(bound, definition);
      const body = context.renderCurrentSalesBody(candidate);
      assert.ok(body.includes(`I noticed ${definition.organization}’s website provides a public ${heading} page.`));
      const binding = context.fernBinding(candidate);
      assert.equal(binding.verifiedWorkflowHeading, heading);
      assert.equal(binding.copyRevision, currentRevision);
      const archiveSummary = archiveClassifies(context, realm, definition, binding, body);
      assert.equal(archiveSummary.kind, 'source-metadata');
      assert.equal(archiveSummary.sourceMetadata.leadId, definition.leadId);

      const legacyCandidate = { ...candidate };
      delete legacyCandidate.copyRevision;
      delete legacyCandidate.verifiedWorkflowHeading;
      legacyCandidate.observation = 'The sample source announces open opportunities.';
      const legacyBinding = context.fernBinding(legacyCandidate);
      assert.equal(Object.hasOwn(legacyBinding, 'copyRevision'), false);
      assert.equal(Object.hasOwn(legacyBinding, 'verifiedWorkflowHeading'), false);
      const legacyBody = context.renderCurrentSalesBody(legacyCandidate);
      assert.ok(legacyBody.startsWith(`Hi ${definition.person.split(' ')[0]},\n\nI’m Backoffice, founder of Backoffice.`));
      assert.equal(legacyBody.includes('[Your Name]'), false);
      assert.equal(archiveClassifies(context, realm, definition, legacyBinding, legacyBody)?.kind,
        'source-metadata');
    });
  }
});

test('unverified primary heading, fabricated feature, and altered heading binding hold', () => {
  const definition = makeDefinition('Jobs Board', 0);
  const { context, producer, services } = makeHarness([definition], {
    handle: 'SYNTHETIC_HEADING_1', value: 'Executive Leadership'
  });
  const mismatchedCapture = producer.capture('SYNTHETIC_HEADING_1', services);
  assert.equal(mismatchedCapture.outcome, 'HOLD');
  assert.match(mismatchedCapture.reason_code, /EXACT_WORKFLOW_HEADING_HOLD/);

  const validHarness = makeHarness([definition]);
  const capture = validHarness.producer.capture('SYNTHETIC_HEADING_1', validHarness.services);
  assert.equal(capture.outcome, 'NATIVE_SOURCE_CAPTURED_PREPARATION_ONLY');
  const canonical = validHarness.realm(JSON.stringify(canonicalPreimage(definition)));
  const bound = validHarness.producer.bind(capture, canonical,
    validHarness.realm(JSON.stringify(policyPacket(definition, canonical))), now);
  assert.equal(bound.outcome, 'BOUND_NATIVE_SOURCE_CONTEXT_POLICY_PENDING');
  const valid = currentCandidate(bound, definition);

  assert.throws(() => validHarness.context.renderCurrentSalesBody({
    ...valid,
    observation: `I noticed ${definition.organization}’s website provides a public Opportunities page.`
  }), /observed feature does not match/);
  assert.throws(() => validHarness.context.renderCurrentSalesBody({
    ...valid,
    observation: `I noticed ${definition.organization}’s website provides a public Executive Leadership page.`,
    verifiedWorkflowHeading: 'Executive Leadership'
  }), /observed feature does not match/);
  assert.throws(() => validHarness.context.fernBinding({
    ...valid,
    verifiedWorkflowHeading: 'Executive Leadership'
  }), /independently verified workflow heading required/);
  const altered = { ...validHarness.context.fernBinding(valid), verifiedWorkflowHeading: 'Executive Leadership' };
  assert.equal(archiveClassifies(validHarness.context, validHarness.realm, definition, altered,
    'Synthetic current body fixture.'), null);
});

test('historical source copy shape remains unchanged when no current revision is present', () => {
  assert.match(sourceText, /observation:'I noticed Example Community Association’s website provides a public Opportunities page\.'/);
  assert.match(guardsText, /if \(Object\.prototype\.hasOwnProperty\.call\(candidate, "copyRevision"\)\)/);
  assert.match(archiveText, /var current=own\(b\|\|\{\},'copyRevision'\),keys=\['row','leadId','product','to','name','first','company','role','organizationKey','subject','observation','sourceRefs'\]/);
});

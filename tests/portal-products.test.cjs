'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const portalSource = fs.readFileSync(path.join(__dirname, '../portal/Code.gs'), 'utf8');
const departmentsSource = fs.readFileSync(path.join(__dirname, '../portal/Departments.gs'), 'utf8');
const email = 'owner@example.com';
const executiveHeaders = [
  'ActionID', 'State', 'RequestedAction', 'FounderReason', 'Owner', 'Workstream', 'Urgency',
  'NeededByUTC', 'EvidenceURL', 'EvidenceSummary', 'EvidenceUTC', 'AuthoritySource', 'SubmittedBy',
  'EnteredUTC', 'ReconciledUTC', 'LifecycleReason', 'RelatedActionID', 'ExitUTC', 'ExitEvidence'
];
const productHeaders = [
  'Project', 'Product / beneficiary', 'Bounded outcome', 'Baseline / EVM state', 'BAC', 'PV', 'EV',
  'AC', 'Missing to enable EVM', 'Source record', 'DeliveryStatus', 'EvidenceURL', 'EvidenceUTC',
  'SourceCheckedUTC'
];
const productRows = [
  productHeaders,
  ['Project Atlas', 'Fernain Jobs', 'Hiring workflow delivered', 'Not measured', 0, 0, 0, 0,
    'Evidence missing', 'OPS-01', 'Implemented',
    'https://github.com/example/engineering-evidence', '2026-10-13T10:00:00Z',
    '2026-10-13T10:05:00Z'],
  ['Project Cedar', 'Cedar', '', '', '', '', '', '', '', '', ''],
  ['Project Ember', 'Project Ember', '', '', '', '', '', '', '', '', '']
];

function snapshotWith(options = {}) {
  const config = {
    domain: 'example.com',
    audience: [email],
    pollMs: 30_000,
    staleAfterMs: 120_000,
    departmentAudience: {
      executive: [email],
      sales: [],
      finance: [],
      operations: [],
      products: [email]
    },
    executive: {
      spreadsheetId: 'executive-sheet-test',
      sheetId: 900,
      range: 'Actions!A1:S1000',
      capacity: 1000
    },
    products: { spreadsheetId: 'products-sheet-test', sheetId: 907 }
  };
  if (options.departmentAudience) config.departmentAudience = options.departmentAudience;
  if (Object.hasOwn(options, 'products')) config.products = options.products;

  const counts = { executiveReads: 0, productReads: 0 };
  const executiveRows = options.executiveRows || [executiveHeaders];
  const sheets = {
    Spreadsheets: {
      get(spreadsheetId) {
        if (spreadsheetId === config.executive.spreadsheetId) {
          return {
            properties: { timeZone: 'Etc/UTC' },
            sheets: [{ properties: { sheetId: 900, title: 'Actions' } }]
          };
        }
        if (config.products && spreadsheetId === config.products.spreadsheetId) {
          return {
            properties: { timeZone: 'Etc/UTC' },
            sheets: [{ properties: { sheetId: 907, title: 'Project Portfolio' } }]
          };
        }
        throw new Error('Unexpected test spreadsheet');
      },
      Values: {
        batchGet(spreadsheetId) {
          if (spreadsheetId === config.executive.spreadsheetId) {
            counts.executiveReads += 1;
            return { valueRanges: [{ values: executiveRows }] };
          }
          if (config.products && spreadsheetId === config.products.spreadsheetId) {
            counts.productReads += 1;
            return { valueRanges: [{ values: productRows }] };
          }
          throw new Error('Unexpected test spreadsheet read');
        }
      }
    }
  };
  const context = {
    Session: {
      getActiveUser: () => ({ getEmail: () => email }),
      getEffectiveUser: () => ({ getEmail: () => email })
    },
    ScriptApp: {
      AuthMode: { FULL: 'FULL' },
      AuthorizationStatus: { REQUIRED: 'REQUIRED' },
      getAuthorizationInfo: () => ({ getAuthorizationStatus: () => 'NOT_REQUIRED' })
    },
    Sheets: sheets,
    portalConfig_: () => config
  };
  vm.runInNewContext(portalSource + '\n' + departmentsSource, context, {
    filename: 'portal-sources.gs'
  });

  return { snapshot: context.getPortalSnapshot(), counts };
}

test('configured products are read by the full portal snapshot using the actual report reader', () => {
  const { snapshot, counts } = snapshotWith();

  assert.equal(snapshot.state, 'ok');
  assert.equal(snapshot.sources.executive.state, 'verified');
  assert.equal(snapshot.sources.products.state, 'verified');
  assert.equal(typeof snapshot.checkedAt, 'string');
  assert.equal(snapshot.sources.products.checkedAt, snapshot.checkedAt);
  assert.equal(snapshot.sources.products.title, 'Products & Engineering');
  assert.equal(snapshot.sources.products.metrics[0].state, 'reported');
  assert.equal(snapshot.sources.products.metrics[0].value, 'Implemented');
  assert.equal(snapshot.sources.products.metrics[0].evidenceUrl,
    'https://github.com/example/engineering-evidence');
  assert.equal(counts.productReads, 1);
});

test('products denied by department audience are not read', () => {
  const { snapshot, counts } = snapshotWith({
    departmentAudience: {
      executive: [email], sales: [], finance: [], operations: [], products: []
    }
  });

  assert.equal(snapshot.sources.executive.state, 'verified');
  assert.equal(snapshot.sources.products.state, 'denied');
  assert.equal(counts.productReads, 0);
});

test('products are denied when executive access is denied', () => {
  const { snapshot, counts } = snapshotWith({
    departmentAudience: {
      executive: [], sales: [], finance: [], operations: [], products: [email]
    }
  });

  assert.equal(snapshot.sources.executive.state, 'denied');
  assert.equal(snapshot.sources.products.state, 'denied');
  assert.equal(counts.executiveReads, 0);
  assert.equal(counts.productReads, 0);
});

test('products report verification failure without reading when executive verification fails', () => {
  const { snapshot, counts } = snapshotWith({ executiveRows: [['unexpected header']] });

  assert.equal(snapshot.sources.executive.state, 'verification_failed');
  assert.equal(snapshot.sources.products.state, 'verification_failed');
  assert.equal(counts.productReads, 0);
});

test('unconfigured products stay unavailable without a spreadsheet read', () => {
  const { snapshot, counts } = snapshotWith({ products: undefined });

  assert.equal(snapshot.sources.executive.state, 'verified');
  assert.equal(snapshot.sources.products.state, 'not_configured');
  assert.equal(counts.productReads, 0);
});

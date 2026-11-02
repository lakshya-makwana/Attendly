/**
 * Regression test: Site Labour Report PDF showed Rs. 0 for every worker's
 * Total Cost because it read a non-existent `labour_cost` field instead of the
 * `labour_expense` field returned by GET /api/sites/analytics.
 *
 * Run with: npm test   (uses Node's built-in test runner, no extra deps)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSiteReportPdf } from './pdfExport.js';

// Capture the raw (uncompressed) PDF source that exportSiteReportPdf produces,
// via the Blob that deliverPdf hands to URL.createObjectURL.
const capturePdfSource = async (args) => {
  let blob = null;
  // Minimal browser stubs so deliverPdf's download path completes in Node.
  const prevDocument = globalThis.document;
  const prevCreate = URL.createObjectURL;
  const prevRevoke = URL.revokeObjectURL;
  globalThis.document = {
    createElement: () => ({ click() {} }),
    body: { appendChild() {}, removeChild() {} }
  };
  URL.createObjectURL = (b) => { blob = b; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  try {
    await exportSiteReportPdf(args);
  } finally {
    globalThis.document = prevDocument;
    URL.createObjectURL = prevCreate;
    URL.revokeObjectURL = prevRevoke;
  }
  assert.ok(blob, 'PDF blob was not produced');
  return blob.text();
};

test('site labour report PDF shows each worker labour_expense and reconciles with site total', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  // Shape mirrors SiteAnalyticsItem / SiteWorkerDetail from the backend.
  // Worker A had a mid-month wage change (10 units @ 700 + 20 units @ 800),
  // so labour_expense (23,000) differs from units x display rate (24,000).
  const site = {
    site_name: 'Regression Site',
    unique_worker_count: 2,
    total_work_units: '64.75',
    total_labour_expense: '50800.00',
    workers: [
      { worker_id: 1, worker_name: 'Worker A', daily_wage: '800.00', work_units: '30.0', labour_expense: '23000.00' },
      { worker_id: 2, worker_name: 'Worker B', daily_wage: '800.00', work_units: '34.75', labour_expense: '27800.00' }
    ]
  };

  const pdf = await capturePdfSource({ site, monthName: 'October', year: 2026 });

  // Individual worker costs come from backend labour_expense, not Rs. 0.
  assert.match(pdf, /\(Rs\. 23,000\)/);
  assert.match(pdf, /\(Rs\. 27,800\)/);
  // Must not re-derive cost as units x month-end rate (ignores wage history).
  assert.doesNotMatch(pdf, /\(Rs\. 24,000\)/);

  // Sum of worker costs reconciles with the site's Total Labour Expense.
  const workerSum = site.workers.reduce((acc, w) => acc + parseFloat(w.labour_expense), 0);
  assert.equal(workerSum, parseFloat(site.total_labour_expense));
  assert.match(pdf, /\(Rs\. 50,800\)/);
});

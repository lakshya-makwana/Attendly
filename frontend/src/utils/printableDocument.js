/**
 * printableDocument.js
 * Standalone A4 Printable Document Generator & Mobile Fallback for Attendly.
 *
 * Provides:
 * - Clean, self-contained HTML document generators for:
 *   1. Salary Slip (Worker details, Sites Worked, earnings, advances, net payable)
 *   2. Site Labour Report (Site details, worker table, totals)
 *   3. Monthly Payroll Summary (Totals, worker breakdown table)
 * - Mobile / PWA share & standalone window opener
 * - Zero external dependencies; uses native DOM, Blob, and Web Share APIs
 */

const formatCurrency = (val) => {
  const num = parseFloat(val || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getCommonStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  :root {
    --text-primary: #09090b;
    --text-secondary: #71717a;
    --border-color: #e4e4e7;
    --bg-muted: #f4f4f5;
    --accent-orange: #ea580c;
    --danger-red: #dc2626;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: var(--text-primary);
    background-color: #ffffff;
    line-height: 1.45;
    font-size: 13px;
  }

  .screen-bar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #09090b;
    color: #ffffff;
    padding: 12px 16px;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .screen-bar-title {
    font-weight: 700;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .screen-bar-badge {
    background: #ea580c;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .screen-bar-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.1s ease;
  }

  .btn:active {
    transform: scale(0.97);
  }

  .btn-primary {
    background: #ffffff;
    color: #09090b;
  }

  .btn-accent {
    background: #ea580c;
    color: #ffffff;
  }

  .btn-close {
    background: rgba(255,255,255,0.2);
    color: #ffffff;
  }

  .screen-tip {
    background: #fff7ed;
    color: #c2410c;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    padding: 8px 12px;
    border-bottom: 1px solid #fed7aa;
  }

  .document-container {
    max-width: 800px;
    margin: 24px auto;
    background: #ffffff;
    padding: 32px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  }

  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--text-primary);
    margin-bottom: 20px;
  }

  .doc-brand {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .doc-type {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 2px;
  }

  .doc-meta {
    text-align: right;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .doc-meta strong {
    color: var(--text-primary);
  }

  .info-box {
    background: var(--bg-muted);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .info-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .info-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 16px 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  th {
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    text-align: left;
    padding: 8px 12px;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    text-transform: uppercase;
  }

  th.num, td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  th.center, td.center {
    text-align: center;
  }

  td {
    padding: 10px 12px;
    border-bottom: 1px solid #f4f4f5;
    font-size: 12.5px;
  }

  tr:last-child td {
    border-bottom: 1px solid var(--border-color);
  }

  .totals-panel {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px 16px;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .totals-row.danger {
    color: var(--danger-red);
    font-weight: 600;
  }

  .totals-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 0;
  }

  .net-payable-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 4px;
  }

  .net-payable-label {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .net-payable-value {
    font-size: 20px;
    font-weight: 800;
    color: var(--accent-orange);
    font-variant-numeric: tabular-nums;
  }

  .doc-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-secondary);
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }

    body {
      background: #ffffff !important;
      padding: 0 !important;
    }

    .no-print,
    .screen-bar,
    .screen-tip {
      display: none !important;
    }

    .document-container {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }

    tr, .info-box, .totals-panel {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`;

/**
 * Generates standalone HTML for a worker's Salary Slip.
 */
export const generateSalarySlipHtml = ({
  worker,
  sitesWorked = [],
  monthName,
  year
}) => {
  const workerName = worker?.worker_name || 'Worker';
  const dailyWage = formatCurrency(worker?.daily_wage);
  const totalUnits = parseFloat(worker?.total_work_units || 0).toFixed(1);
  const grossWages = formatCurrency(worker?.gross_earnings);
  const advances = formatCurrency(worker?.total_advances);
  const netPayable = formatCurrency(worker?.net_payable);
  const generatedDate = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const sitesRows = sitesWorked.length > 0
    ? sitesWorked.map((site) => `
        <tr>
          <td style="font-weight: 600; color: ${site.site_id ? '#09090b' : '#71717a'};">
            ${site.site_name || 'No site assigned'}
          </td>
          <td class="num" style="font-weight: 600;">
            ${parseFloat(site.work_units || 0).toFixed(1)} units
          </td>
          <td class="num" style="font-weight: 700;">
            ${formatCurrency(site.earnings)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="text-align: center; color: #71717a; padding: 16px;">No sites worked this month</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Salary Slip — ${workerName} (${monthName} ${year})</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="screen-bar no-print">
    <div class="screen-bar-title">
      <span>Salary Slip — ${workerName}</span>
      <span class="screen-bar-badge">Attendly</span>
    </div>
    <div class="screen-bar-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
      <button class="btn btn-accent" id="btn-share" onclick="handleShare()">📤 Share / Save PDF</button>
      <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="screen-tip no-print">
    Tip: On iPhone/iPad, tap <strong>Share</strong> or <strong>Print</strong> to open AirPrint, or choose <em>Save to Files</em> for PDF.
  </div>

  <div class="document-container">
    <div class="doc-header">
      <div>
        <div class="doc-brand">Attendly</div>
        <div class="doc-type">Salary Slip</div>
      </div>
      <div class="doc-meta">
        <div>Period: <strong>${monthName} ${year}</strong></div>
        <div>Generated: ${generatedDate}</div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-title">${workerName}</div>
      <div class="info-subtitle">Daily Wage: <strong>${dailyWage} / day</strong></div>
    </div>

    <div class="section-title">Sites Worked</div>
    <table>
      <thead>
        <tr>
          <th>Site</th>
          <th class="num">Work Units</th>
          <th class="num">Earnings</th>
        </tr>
      </thead>
      <tbody>
        ${sitesRows}
      </tbody>
    </table>

    <div class="section-title">Pay Summary</div>
    <div class="totals-panel">
      <div class="totals-row">
        <span style="color: var(--text-secondary);">Total Work Units</span>
        <span style="font-weight: 700;">${totalUnits} days</span>
      </div>
      <div class="totals-row">
        <span style="color: var(--text-secondary);">Calculation</span>
        <span style="color: var(--text-secondary);">${totalUnits} × ${dailyWage}</span>
      </div>
      <div class="totals-divider"></div>
      <div class="totals-row">
        <span style="font-weight: 700;">Gross Wages</span>
        <span style="font-weight: 700;">${grossWages}</span>
      </div>
      <div class="totals-row danger">
        <span>Less Advances</span>
        <span style="font-weight: 700;">−${advances}</span>
      </div>
      <div class="totals-divider"></div>
      <div class="net-payable-row">
        <span class="net-payable-label">Net Payable</span>
        <span class="net-payable-value">${netPayable}</span>
      </div>
    </div>

    <div class="doc-footer">
      <div>Attendly Attendance & Payroll Management</div>
      <div>Confidential — For Employee Records</div>
    </div>
  </div>

  <script>
    function handleShare() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        }).catch(() => {});
      } else {
        window.print();
      }
    }
  </script>
</body>
</html>`;
};

/**
 * Generates standalone HTML for a Site Labour Report.
 */
export const generateSiteReportHtml = ({
  site,
  monthName,
  year
}) => {
  const siteName = site?.site_name || 'Site';
  const workerCount = site?.unique_worker_count || (site?.workers ? site.workers.length : 0);
  const totalUnits = parseFloat(site?.total_work_units || 0).toFixed(1);
  const totalCost = formatCurrency(site?.total_labour_expense);
  const workers = site?.workers || [];
  const generatedDate = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const workerRows = workers.length > 0
    ? workers.map((w) => `
        <tr>
          <td style="font-weight: 600;">${w.worker_name}</td>
          <td class="center" style="font-weight: 600;">${parseFloat(w.work_units || 0).toFixed(1)}</td>
          <td class="num">${formatCurrency(w.daily_wage)}</td>
          <td class="num" style="font-weight: 700;">${formatCurrency(w.labour_cost)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="text-align: center; color: #71717a; padding: 20px;">No workers logged attendance at this site.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site Labour Report — ${siteName} (${monthName} ${year})</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="screen-bar no-print">
    <div class="screen-bar-title">
      <span>Site Labour Report — ${siteName}</span>
      <span class="screen-bar-badge">Attendly</span>
    </div>
    <div class="screen-bar-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
      <button class="btn btn-accent" id="btn-share" onclick="handleShare()">📤 Share / Save PDF</button>
      <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="screen-tip no-print">
    Tip: On iPhone/iPad, tap <strong>Share</strong> or <strong>Print</strong> to open AirPrint, or choose <em>Save to Files</em> for PDF.
  </div>

  <div class="document-container">
    <div class="doc-header">
      <div>
        <div class="doc-brand">Attendly</div>
        <div class="doc-type">Site Labour Report</div>
      </div>
      <div class="doc-meta">
        <div>Billing Month: <strong>${monthName} ${year}</strong></div>
        <div>Generated: ${generatedDate}</div>
      </div>
    </div>

    <div class="info-box" style="background: #fff7ed; border-color: #fed7aa;">
      <div class="info-title" style="color: #c2410c;">${siteName}</div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; flex-wrap: wrap; gap: 8px; font-size: 13px;">
        <div>Workers: <strong>${workerCount}</strong></div>
        <div>Work Units: <strong>${totalUnits}</strong></div>
        <div>Total Labour Cost: <strong style="color: #ea580c; font-size: 15px;">${totalCost}</strong></div>
      </div>
    </div>

    <div class="section-title">Worker Deployment (${workers.length})</div>
    <table>
      <thead>
        <tr>
          <th>Worker</th>
          <th class="center">Units</th>
          <th class="num">Daily Rate</th>
          <th class="num">Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${workerRows}
      </tbody>
    </table>

    <div class="doc-footer">
      <div>Attendly Attendance & Payroll Management</div>
      <div>Site Analytics Record</div>
    </div>
  </div>

  <script>
    function handleShare() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        }).catch(() => {});
      } else {
        window.print();
      }
    }
  </script>
</body>
</html>`;
};

/**
 * Generates standalone HTML for the Monthly Payroll summary.
 */
export const generateMonthlyPayrollHtml = ({
  payrollData,
  monthName,
  year
}) => {
  const totals = payrollData?.totals || {};
  const workers = payrollData?.worker_summaries || [];
  const generatedDate = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const workerRows = workers.length > 0
    ? workers.map((w) => `
        <tr>
          <td style="font-weight: 600;">${w.worker_name}</td>
          <td class="num">${formatCurrency(w.daily_wage)}</td>
          <td class="center" style="font-weight: 600;">${parseFloat(w.total_work_units || 0).toFixed(1)}</td>
          <td class="num">${formatCurrency(w.gross_earnings)}</td>
          <td class="num" style="color: var(--danger-red);">−${formatCurrency(w.total_advances)}</td>
          <td class="num" style="font-weight: 800; color: #09090b;">${formatCurrency(w.net_payable)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align: center; color: #71717a; padding: 20px;">No payroll records found for this month.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Monthly Payroll — ${monthName} ${year}</title>
  <style>${getCommonStyles()}</style>
</head>
<body>
  <div class="screen-bar no-print">
    <div class="screen-bar-title">
      <span>Monthly Payroll — ${monthName} ${year}</span>
      <span class="screen-bar-badge">Attendly</span>
    </div>
    <div class="screen-bar-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
      <button class="btn btn-accent" id="btn-share" onclick="handleShare()">📤 Share / Save PDF</button>
      <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="screen-tip no-print">
    Tip: On iPhone/iPad, tap <strong>Share</strong> or <strong>Print</strong> to open AirPrint, or choose <em>Save to Files</em> for PDF.
  </div>

  <div class="document-container">
    <div class="doc-header">
      <div>
        <div class="doc-brand">Attendly</div>
        <div class="doc-type">Monthly Payroll Summary</div>
      </div>
      <div class="doc-meta">
        <div>Month: <strong>${monthName} ${year}</strong></div>
        <div>Generated: ${generatedDate}</div>
      </div>
    </div>

    <div class="info-box">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Workers</div>
          <div style="font-size: 18px; font-weight: 800;">${totals.total_workers || workers.length}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Days Worked</div>
          <div style="font-size: 18px; font-weight: 800;">${parseFloat(totals.total_work_units || 0).toFixed(1)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Advances</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--danger-red);">−${formatCurrency(totals.total_advances)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Net Payable</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--accent-orange);">${formatCurrency(totals.total_net_payable)}</div>
        </div>
      </div>
    </div>

    <div class="section-title">Worker Breakdown (${workers.length})</div>
    <table>
      <thead>
        <tr>
          <th>Worker</th>
          <th class="num">Daily Wage</th>
          <th class="center">Days</th>
          <th class="num">Gross</th>
          <th class="num">Advances</th>
          <th class="num">Net Payable</th>
        </tr>
      </thead>
      <tbody>
        ${workerRows}
      </tbody>
    </table>

    <div class="doc-footer">
      <div>Attendly Attendance & Payroll Management</div>
      <div>Monthly Financial Summary</div>
    </div>
  </div>

  <script>
    function handleShare() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        }).catch(() => {});
      } else {
        window.print();
      }
    }
  </script>
</body>
</html>`;
};

/**
 * Detects if the current environment is iOS (iPhone/iPad/iPod).
 */
export const isIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

/**
 * Detects if the app is running in iOS Standalone PWA mode (added to Home Screen).
 * In this mode, Apple WebKit strips the AirPrint controller and window.print() is a silent no-op.
 */
export const isIOSStandalone = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const isStandaloneProp = window.navigator.standalone === true;
  const isDisplayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return isIOS() && (isStandaloneProp || isDisplayStandalone);
};

/**
 * Opens or shares a clean, standalone printable document.
 * Handles iOS Standalone PWA, mobile WebKit, and desktop browsers gracefully.
 */
export const openPrintableDocument = async ({
  title = 'Attendly Document',
  contentHtml,
  filename = 'document.html',
  preferShare = false
}) => {
  if (typeof window === 'undefined' || !contentHtml) return { success: false };

  // 1. Check if native Web Share with file is preferred or available on mobile
  if ((preferShare || isIOSStandalone()) && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const blob = new Blob([contentHtml], { type: 'text/html;charset=utf-8' });
      const file = new File([blob], filename, { type: 'text/html' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          files: [file]
        });
        return { success: true, mode: 'share' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: true, mode: 'cancelled' };
      }
      console.warn('Web Share file failed, falling back to window opener:', err);
    }
  }

  // 2. Open via Blob URL in new window/tab
  try {
    const blob = new Blob([contentHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      // If popup blocker intervened, simulate anchor click
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 1000);
    }

    // Revoke URL after a safe interval
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);

    return { success: true, mode: 'window' };
  } catch (winErr) {
    console.error('Failed to open standalone document:', winErr);
    return { success: false, error: winErr };
  }
};

/**
 * excelExport.js
 * Generates genuine binary .xlsx workbooks for Attendly using xlsx (SheetJS).
 *
 * Provides:
 * 1. exportSalarySlipExcel({ worker, sitesWorked, monthName, year })
 * 2. exportSiteReportExcel({ site, monthName, year })
 * 3. exportMonthlyPayrollExcel({ payrollData, monthName, year })
 *
 * Requirements:
 * - True .xlsx OpenXML format (not CSV or fake file).
 * - Numeric cells contain real numeric numbers (type: 'n'), not stringified text.
 * - Meaningful worksheet names and generous column widths so data is never truncated.
 * - Supports iOS native Web Share and desktop browser download.
 */

import * as XLSX from 'xlsx';
import { formatIndianDate, formatIndianDateTime } from './pdfExport';

/**
 * Dispatches a generated Excel Blob via iOS Web Share or direct browser download.
 */
export const deliverExcel = async ({ workbook, filename, title }) => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isIOS && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'Attendly Report',
          files: [file]
        });
        return { success: true, method: 'share' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('iOS Excel share failed, falling back to download:', err);
    }
  }

  // Desktop or fallback download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
    return { success: true, method: 'download' };
  } catch (err) {
    console.error('Excel download failed:', err);
    throw err;
  }
};

/**
 * 1. Export Salary Slip as .xlsx
 */
export const exportSalarySlipExcel = async ({
  worker,
  sitesWorked = [],
  monthName,
  year
}) => {
  const wb = XLSX.utils.book_new();

  const workerName = worker?.worker_name || 'Worker';
  const dailyWage = parseFloat(worker?.daily_wage || 0);
  const totalUnits = parseFloat(worker?.total_work_units || 0);
  const grossWages = parseFloat(worker?.gross_earnings || 0);
  const advances = parseFloat(worker?.total_advances || 0);
  const netPayable = parseFloat(worker?.net_payable || 0);
  const generatedDate = formatIndianDateTime();

  // Build AOA (Array of Arrays)
  const sheetData = [
    ['Attendly — Salary Slip'],
    ['Billing Month', `${monthName} ${year}`],
    ['Generated On', generatedDate],
    ['Worker Name', workerName],
    ['Daily Wage Rate (INR)', dailyWage],
    ['Total Days Worked', totalUnits],
    [],
    ['SITES WORKED & DEPLOYMENTS'],
    ['Site Location', 'Work Units', 'Earnings (INR)']
  ];

  if (sitesWorked.length > 0) {
    sitesWorked.forEach((s) => {
      sheetData.push([
        s.site_name || 'No site assigned',
        parseFloat(s.work_units || 0),
        parseFloat(s.earnings || 0)
      ]);
    });
  } else {
    sheetData.push(['No sites worked this month', 0, 0]);
  }

  sheetData.push(
    [],
    ['PAY CALCULATION SUMMARY'],
    ['Gross Wages (INR)', grossWages],
    ['Less Advances (INR)', advances],
    ['Net Payable (INR)', netPayable]
  );

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set readable column widths
  ws['!cols'] = [
    { wch: 32 }, // Site / Label
    { wch: 18 }, // Units
    { wch: 22 }  // Earnings / Values
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Salary Slip');

  const safeWorkerName = workerName.replace(/\s+/g, '_');
  const filename = `Salary_Slip_${safeWorkerName}_${monthName}_${year}.xlsx`;
  return deliverExcel({ workbook: wb, filename, title: `Salary Slip — ${workerName}` });
};

/**
 * 2. Export Site Labour Report as .xlsx
 */
export const exportSiteReportExcel = async ({
  site,
  monthName,
  year
}) => {
  const wb = XLSX.utils.book_new();

  const siteName = site?.site_name || 'Site';
  const workerCount = site?.unique_worker_count || (site?.workers ? site.workers.length : 0);
  const totalUnits = parseFloat(site?.total_work_units || 0);
  const totalCost = parseFloat(site?.total_labour_expense || 0);
  const workers = site?.workers || [];
  const generatedDate = formatIndianDateTime();

  const sheetData = [
    ['Attendly — Site Labour Report'],
    ['Site Name', siteName],
    ['Billing Month', `${monthName} ${year}`],
    ['Generated On', generatedDate],
    ['Total Workers Deployed', workerCount],
    ['Total Work Units', totalUnits],
    ['Total Labour Expense (INR)', totalCost],
    [],
    ['WORKER DEPLOYMENT BREAKDOWN'],
    ['S.No', 'Worker Name', 'Work Units', 'Daily Wage (INR)', 'Total Cost (INR)']
  ];

  if (workers.length > 0) {
    workers.forEach((w, idx) => {
      sheetData.push([
        idx + 1,
        w.worker_name,
        parseFloat(w.work_units || 0),
        parseFloat(w.daily_wage || 0),
        parseFloat(w.labour_cost || 0)
      ]);
    });
  } else {
    sheetData.push(['-', 'No workers logged attendance', 0, 0, 0]);
  }

  // Add summary totals row
  sheetData.push(
    [],
    ['Total', '', totalUnits, '', totalCost]
  );

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 30 }, // Worker Name
    { wch: 16 }, // Work Units
    { wch: 20 }, // Daily Wage
    { wch: 22 }  // Total Cost
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Labour Report');

  const safeSiteName = siteName.replace(/\s+/g, '_');
  const filename = `Site_Report_${safeSiteName}_${monthName}_${year}.xlsx`;
  return deliverExcel({ workbook: wb, filename, title: `Site Labour Report — ${siteName}` });
};

/**
 * 3. Export Monthly Payroll as .xlsx (with Summary and Worker Details sheets)
 */
export const exportMonthlyPayrollExcel = async ({
  payrollData,
  monthName,
  year
}) => {
  const wb = XLSX.utils.book_new();

  const totals = payrollData?.totals || {};
  const workers = payrollData?.worker_summaries || [];
  const generatedDate = formatIndianDateTime();

  // Sheet 1: Summary Overview
  const summaryData = [
    ['Attendly — Monthly Payroll Summary'],
    ['Billing Month', `${monthName} ${year}`],
    ['Generated On', generatedDate],
    [],
    ['FINANCIAL KPI TOTALS'],
    ['Total Workers', parseInt(totals.total_workers || workers.length, 10)],
    ['Total Work Days', parseFloat(totals.total_work_units || 0)],
    ['Total Gross Wages (INR)', parseFloat(totals.total_gross_wages || 0)],
    ['Total Cash Advances (INR)', parseFloat(totals.total_advances || 0)],
    ['Total Net Payable (INR)', parseFloat(totals.total_net_payable || 0)]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Worker Details
  const detailsData = [
    ['Attendly — Worker Payroll Details'],
    ['Billing Month', `${monthName} ${year}`],
    ['Generated On', generatedDate],
    [],
    ['S.No', 'Worker Name', 'Daily Wage (INR)', 'Days Worked', 'Gross Wages (INR)', 'Advances (INR)', 'Net Payable (INR)']
  ];

  if (workers.length > 0) {
    workers.forEach((w, idx) => {
      detailsData.push([
        idx + 1,
        w.worker_name,
        parseFloat(w.daily_wage || 0),
        parseFloat(w.total_work_units || 0),
        parseFloat(w.gross_earnings || 0),
        parseFloat(w.total_advances || 0),
        parseFloat(w.net_payable || 0)
      ]);
    });
  } else {
    detailsData.push(['-', 'No worker payroll records', 0, 0, 0, 0, 0]);
  }

  // Totals row
  detailsData.push([
    'Total',
    '',
    '',
    parseFloat(totals.total_work_units || 0),
    parseFloat(totals.total_gross_wages || 0),
    parseFloat(totals.total_advances || 0),
    parseFloat(totals.total_net_payable || 0)
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
  wsDetails['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 28 }, // Worker Name
    { wch: 18 }, // Daily Wage
    { wch: 16 }, // Days Worked
    { wch: 20 }, // Gross Wages
    { wch: 18 }, // Advances
    { wch: 20 }  // Net Payable
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Worker Details');

  const filename = `Payroll_${monthName}_${year}.xlsx`;
  return deliverExcel({ workbook: wb, filename, title: `Monthly Payroll — ${monthName} ${year}` });
};

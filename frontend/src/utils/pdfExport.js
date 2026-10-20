/**
 * pdfExport.js
 * Generates genuine binary A4 PDF documents for Attendly using jsPDF and jspdf-autotable.
 *
 * Provides:
 * 1. exportSalarySlipPdf({ worker, sitesWorked, monthName, year })
 * 2. exportSiteReportPdf({ site, monthName, year })
 * 3. exportMonthlyPayrollPdf({ payrollData, monthName, year })
 *
 * Supports native iOS Web Share (AirPrint / Save to Files) and browser download fallback.
 */

import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export const formatIndianDate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatIndianDateTime = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = formatIndianDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr}, ${hours}:${minutes}`;
};

export const formatINR = (val) => {
  const num = parseFloat(val || 0);
  return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Dispatches a generated PDF Blob via iOS Web Share or direct browser download.
 */
export const deliverPdf = async ({ doc, filename, title }) => {
  const blob = doc.output('blob');

  // Check if iOS Web Share with files is supported
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isIOS && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'Attendly Document',
          files: [file]
        });
        return { success: true, method: 'share' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('iOS PDF share failed, falling back to download:', err);
    }
  }

  // Desktop or fallback browser download
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
    console.error('PDF download failed:', err);
    throw err;
  }
};

/**
 * Helper to add standard Attendly brand header & footer to PDF documents
 */
const addPageDecoration = (doc, titleText, periodText) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Header bar line
    doc.setDrawColor(234, 88, 12); // #ea580c burnt orange
    doc.setLineWidth(1.2);
    doc.line(14, 10, pageWidth - 14, 10);

    // Footer divider line
    doc.setDrawColor(228, 228, 231); // #e4e4e7
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // #71717a
    doc.text('Attendly • Workforce & Payroll Management', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
};

/**
 * 1. Export Salary Slip as a real PDF
 */
export const exportSalarySlipPdf = async ({
  worker,
  sitesWorked = [],
  monthName,
  year
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const workerName = worker?.worker_name || 'Worker';
  const dailyWage = formatINR(worker?.daily_wage);
  const totalUnits = parseFloat(worker?.total_work_units || 0).toFixed(1);
  const grossWages = formatINR(worker?.gross_earnings);
  const advances = formatINR(worker?.total_advances);
  const netPayable = formatINR(worker?.net_payable);
  const generatedTime = formatIndianDateTime();

  // Attendly Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text('Attendly', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(234, 88, 12);
  doc.text('SALARY SLIP', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`Billing Month: ${monthName} ${year}`, 196, 20, { align: 'right' });
  doc.text(`Generated: ${generatedTime}`, 196, 25, { align: 'right' });

  // Worker Detail Card
  doc.setDrawColor(228, 228, 231);
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(14, 32, 182, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(9, 9, 11);
  doc.text(workerName, 18, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Daily Wage Rate: `, 18, 46);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text(`${dailyWage} / day`, 45, 46);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text(`Total Days Worked: `, 120, 46);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text(`${totalUnits} days`, 152, 46);

  // Sites Worked Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(9, 9, 11);
  doc.text('Sites Worked & Deployments', 14, 58);

  // Sites Worked Table
  const sitesBody = sitesWorked.length > 0
    ? sitesWorked.map((site) => [
        site.site_name || 'No site assigned',
        `${parseFloat(site.work_units || 0).toFixed(1)} units`,
        formatINR(site.earnings)
      ])
    : [['No site assignments recorded this month', '0.0 units', 'Rs. 0']];

  autoTable(doc, {
    startY: 61,
    margin: { left: 14, right: 14 },
    head: [['Site Location', 'Work Units', 'Earnings']],
    body: sitesBody,
    theme: 'plain',
    headStyles: {
      fillColor: [244, 244, 245],
      textColor: [113, 113, 122],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [9, 9, 11]
    },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      // Light bottom border on rows
      if (data.section === 'body') {
        doc.setDrawColor(244, 244, 245);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // Pay Summary Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(9, 9, 11);
  doc.text('Monthly Pay Calculation', 14, finalY);

  const hasMultipleRates = Boolean(worker?.wage_breakdown && worker.wage_breakdown.length > 1);
  const paySummaryBody = [
    ['Total Work Units', `${totalUnits} days`]
  ];

  if (hasMultipleRates) {
    worker.wage_breakdown.forEach((wb) => {
      paySummaryBody.push([
        `Rate Breakdown (${parseFloat(wb.work_units).toFixed(1)} units @ ${formatINR(wb.rate)}/day)`,
        formatINR(wb.earnings)
      ]);
    });
  } else {
    paySummaryBody.push(['Formula', `${totalUnits} days × ${dailyWage}`]);
  }

  paySummaryBody.push(
    ['Gross Wages', grossWages],
    ['Less Total Advances', `− ${advances}`],
    ['Net Payable', netPayable]
  );

  autoTable(doc, {
    startY: finalY + 3,
    margin: { left: 14, right: 14 },
    body: paySummaryBody,
    theme: 'plain',
    bodyStyles: {
      fontSize: 9.5,
      textColor: [9, 9, 11]
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 62, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === paySummaryBody.length - 2) {
        data.cell.styles.textColor = [220, 38, 38]; // red for advances
      }
      if (data.row.index === paySummaryBody.length - 1) {
        data.cell.styles.textColor = [234, 88, 12]; // orange for net payable
        data.cell.styles.fontSize = 11;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.3);
      doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
    }
  });

  // Footer / decorations
  addPageDecoration(doc, 'Salary Slip', `${monthName} ${year}`);

  const safeWorkerName = workerName.replace(/\s+/g, '_');
  const filename = `Salary_Slip_${safeWorkerName}_${monthName}_${year}.pdf`;
  return deliverPdf({ doc, filename, title: `Salary Slip — ${workerName}` });
};

/**
 * 2. Export Site Labour Report as a real PDF
 */
export const exportSiteReportPdf = async ({
  site,
  monthName,
  year
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const siteName = site?.site_name || 'Site';
  const workerCount = site?.unique_worker_count || (site?.workers ? site.workers.length : 0);
  const totalUnits = parseFloat(site?.total_work_units || 0).toFixed(1);
  const totalCost = formatINR(site?.total_labour_expense);
  const workers = site?.workers || [];
  const generatedTime = formatIndianDateTime();

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text('Attendly', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(234, 88, 12);
  doc.text('SITE LABOUR REPORT', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`Billing Month: ${monthName} ${year}`, 196, 20, { align: 'right' });
  doc.text(`Generated: ${generatedTime}`, 196, 25, { align: 'right' });

  // Site Overview Card
  doc.setDrawColor(254, 215, 170); // #fed7aa
  doc.setFillColor(255, 247, 237); // #fff7ed
  doc.roundedRect(14, 32, 182, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(194, 65, 12);
  doc.text(siteName, 18, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text('Workers: ', 18, 47);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text(`${workerCount}`, 33, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text('Work Units: ', 65, 47);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text(`${totalUnits}`, 84, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text('Total Labour Expense: ', 125, 47);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text(`${totalCost}`, 160, 47);

  // Worker Deployment Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(9, 9, 11);
  doc.text(`Worker Deployment Breakdown (${workers.length})`, 14, 60);

  const tableBody = workers.length > 0
    ? workers.map((w, idx) => [
        String(idx + 1),
        w.worker_name,
        parseFloat(w.work_units || 0).toFixed(1),
        formatINR(w.daily_wage),
        formatINR(w.labour_cost)
      ])
    : [['-', 'No workers logged attendance at this site', '0.0', 'Rs. 0', 'Rs. 0']];

  autoTable(doc, {
    startY: 63,
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['#', 'Worker Name', 'Units', 'Daily Rate', 'Total Cost']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [9, 9, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [9, 9, 11]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80, fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        doc.setDrawColor(244, 244, 245);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // Footer / decorations
  addPageDecoration(doc, 'Site Labour Report', `${monthName} ${year}`);

  const safeSiteName = siteName.replace(/\s+/g, '_');
  const filename = `Site_Report_${safeSiteName}_${monthName}_${year}.pdf`;
  return deliverPdf({ doc, filename, title: `Site Labour Report — ${siteName}` });
};

/**
 * 3. Export Monthly Payroll Summary as a real PDF
 */
export const exportMonthlyPayrollPdf = async ({
  payrollData,
  monthName,
  year
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totals = payrollData?.totals || {};
  const workers = payrollData?.worker_summaries || [];
  const generatedTime = formatIndianDateTime();

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text('Attendly', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(234, 88, 12);
  doc.text('MONTHLY PAYROLL SUMMARY', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`Billing Month: ${monthName} ${year}`, 196, 20, { align: 'right' });
  doc.text(`Generated: ${generatedTime}`, 196, 25, { align: 'right' });

  // Summary Metrics Card
  doc.setDrawColor(228, 228, 231);
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(14, 32, 182, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('TOTAL WORKERS', 18, 38);
  doc.text('TOTAL DAYS', 58, 38);
  doc.text('GROSS WAGES', 95, 38);
  doc.text('ADVANCES', 135, 38);
  doc.text('NET PAYABLE', 168, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(9, 9, 11);
  doc.text(String(totals.total_workers || workers.length), 18, 45);
  doc.text(`${parseFloat(totals.total_work_units || 0).toFixed(1)}`, 58, 45);
  doc.text(formatINR(totals.total_gross_wages), 95, 45);

  doc.setTextColor(220, 38, 38);
  doc.text(`−${formatINR(totals.total_advances)}`, 135, 45);

  doc.setTextColor(234, 88, 12);
  doc.text(formatINR(totals.total_net_payable), 168, 45);

  // Worker Payroll Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(9, 9, 11);
  doc.text(`Worker Payroll Breakdown (${workers.length})`, 14, 58);

  const tableBody = workers.length > 0
    ? workers.map((w, idx) => [
        String(idx + 1),
        w.worker_name,
        formatINR(w.daily_wage),
        parseFloat(w.total_work_units || 0).toFixed(1),
        formatINR(w.gross_earnings),
        formatINR(w.total_advances),
        formatINR(w.net_payable)
      ])
    : [['-', 'No worker payroll records found for this month', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: 61,
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['#', 'Worker Name', 'Daily Rate', 'Days', 'Gross Wages', 'Advances', 'Net Payable']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [9, 9, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [9, 9, 11]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 26, halign: 'right', textColor: [220, 38, 38] },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [9, 9, 11] }
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        doc.setDrawColor(244, 244, 245);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // Footer / decorations
  addPageDecoration(doc, 'Monthly Payroll', `${monthName} ${year}`);

  const filename = `Payroll_${monthName}_${year}.pdf`;
  return deliverPdf({ doc, filename, title: `Monthly Payroll — ${monthName} ${year}` });
};

import ExcelJS from 'exceljs';
import type { TuitionRowSummary } from '../services/tuition.service.js';

export interface TuitionExcelMetadata {
  teacherName?: string;
  month?: string;
  className?: string;
}

export async function generateTuitionExcelReport(
  items: TuitionRowSummary[],
  meta: TuitionExcelMetadata,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QuizMaster Education System';
  workbook.lastModifiedBy = meta.teacherName || 'Giáo viên';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Báo Cáo Học Phí', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  // Education Color Palette
  const THEME = {
    navyDark: '1E3A8A',     // Primary Header Deep Navy Blue
    blueAccent: '2563EB',   // Blue Accent
    blueSoft: 'EFF6FF',     // Light Blue Accent
    headerBg: '1E40AF',     // Table Header Blue
    zebraRow: 'F8FAFC',     // Light slate alternating row
    borderLight: 'E2E8F0',  // Table Border
    textDark: '0F172A',     // Main text
    textMuted: '475569',    // Secondary text
    paidGreen: '059669',    // Soft Green for Paid
    unpaidRed: 'DC2626',    // Soft Red for Unpaid
    partialAmber: 'D97706', // Soft Amber for Partial
    white: 'FFFFFF',
  };

  // Define Columns
  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'studentName', width: 26 },
    { key: 'studentEmail', width: 28 },
    { key: 'className', width: 24 },
    { key: 'month', width: 12 },
    { key: 'lessonCount', width: 12 },
    { key: 'totalHours', width: 14 },
    { key: 'baseAmount', width: 18 },
    { key: 'surcharge', width: 14 },
    { key: 'discount', width: 14 },
    { key: 'totalAmount', width: 18 },
    { key: 'paidAmount', width: 18 },
    { key: 'remainingAmount', width: 18 },
    { key: 'status', width: 18 },
  ];

  // 1. Title Banner
  sheet.mergeCells('A1:N1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'HỆ THỐNG GIÁO DỤC QUIZMASTER - BÁO CÁO TỔNG HỢP HỌC PHÍ';
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: THEME.white } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyDark } };
  sheet.getRow(1).height = 36;

  // 2. Subtitle & Metadata
  sheet.mergeCells('A2:N2');
  const subTitleCell = sheet.getCell('A2');
  const monthDisplay = meta.month ? `Tháng ${meta.month.substring(5, 7)}/${meta.month.substring(0, 4)}` : 'Toàn bộ thời gian';
  const classDisplay = meta.className ? `Lớp: ${meta.className}` : 'Tất cả các lớp';
  const teacherDisplay = meta.teacherName ? `Giáo viên: ${meta.teacherName}` : 'Giáo viên phụ trách';
  subTitleCell.value = `${teacherDisplay}   |   ${classDisplay}   |   Kỳ thu: ${monthDisplay}   |   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`;
  subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: THEME.textMuted } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blueSoft } };
  sheet.getRow(2).height = 22;

  // 3. Compact KPI Summary Strip (Row 4)
  const totalStudents = items.length;
  const totalLessons = items.reduce((acc, cur) => acc + cur.lessonCount, 0);
  const totalHours = Number(items.reduce((acc, cur) => acc + cur.totalHours, 0).toFixed(1));
  const totalTuition = items.reduce((acc, cur) => acc + cur.totalAmount, 0);
  const totalPaid = items.reduce((acc, cur) => acc + cur.paidAmount, 0);
  const totalRemaining = items.reduce((acc, cur) => acc + cur.remainingAmount, 0);
  const collectionRate = totalTuition > 0 ? ((totalPaid / totalTuition) * 100).toFixed(1) + '%' : '100%';

  sheet.mergeCells('A4:B4');
  sheet.getCell('A4').value = `Tổng học sinh: ${totalStudents}`;
  sheet.getCell('A4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.navyDark } };
  sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blueSoft } };

  sheet.mergeCells('C4:D4');
  sheet.getCell('C4').value = `Tổng buổi dạy: ${totalLessons} (${totalHours}h)`;
  sheet.getCell('C4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.navyDark } };
  sheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blueSoft } };

  sheet.mergeCells('E4:G4');
  sheet.getCell('E4').value = `Tổng học phí: ${totalTuition.toLocaleString('vi-VN')} ₫`;
  sheet.getCell('E4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.navyDark } };
  sheet.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('E4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blueSoft } };

  sheet.mergeCells('H4:I4');
  sheet.getCell('H4').value = `Đã thu: ${totalPaid.toLocaleString('vi-VN')} ₫`;
  sheet.getCell('H4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.paidGreen } };
  sheet.getCell('H4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('H4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };

  sheet.mergeCells('J4:L4');
  sheet.getCell('J4').value = `Còn lại: ${totalRemaining.toLocaleString('vi-VN')} ₫`;
  sheet.getCell('J4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.unpaidRed } };
  sheet.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } };

  sheet.mergeCells('M4:N4');
  sheet.getCell('M4').value = `Tỷ lệ thu: ${collectionRate}`;
  sheet.getCell('M4').font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.blueAccent } };
  sheet.getCell('M4').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('M4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blueSoft } };

  sheet.getRow(4).height = 24;

  // 4. Table Headers (Row 6)
  const headerRow = sheet.getRow(6);
  headerRow.height = 30;
  const headers = [
    'STT',
    'HỌC SINH',
    'EMAIL',
    'LỚP HỌC',
    'THÁNG',
    'SỐ BUỔI',
    'SỐ GIỜ',
    'HỌC PHÍ GỐC',
    'PHỤ THU',
    'GIẢM TRỪ',
    'TỔNG CỘNG',
    'ĐÃ NỘP',
    'CÒN LẠI',
    'TRẠNG THÁI',
  ];

  headers.forEach((text, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: THEME.borderLight } },
      bottom: { style: 'medium', color: { argb: THEME.navyDark } },
      left: { style: 'thin', color: { argb: THEME.borderLight } },
      right: { style: 'thin', color: { argb: THEME.borderLight } },
    };
  });

  // Enable AutoFilter on Table Headers
  sheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: 14 },
  };

  // 5. Populate Data Rows
  let currentRowIndex = 7;
  items.forEach((item, index) => {
    const row = sheet.getRow(currentRowIndex);
    row.height = 24;

    const isEven = index % 2 === 1;
    const bgRowColor = isEven ? THEME.zebraRow : THEME.white;

    const statusText =
      item.status === 'PAID'
        ? 'Đã hoàn thành'
        : item.status === 'PARTIALLY_PAID'
          ? 'Một phần'
          : 'Chưa thanh toán';

    const statusColor =
      item.status === 'PAID'
        ? THEME.paidGreen
        : item.status === 'PARTIALLY_PAID'
          ? THEME.partialAmber
          : THEME.unpaidRed;

    row.values = [
      index + 1,
      item.studentName,
      item.studentEmail,
      item.className,
      item.month,
      item.lessonCount,
      item.totalHours,
      item.baseAmount,
      item.surcharge,
      item.discount,
      item.totalAmount,
      item.paidAmount,
      item.remainingAmount,
      statusText,
    ];

    // Format individual cells
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9, color: { argb: THEME.textDark } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderLight } },
        bottom: { style: 'thin', color: { argb: THEME.borderLight } },
        left: { style: 'thin', color: { argb: THEME.borderLight } },
        right: { style: 'thin', color: { argb: THEME.borderLight } },
      };

      // Alignment & Number Formats
      if (c === 1 || c === 5) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 6 || c === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = c === 6 ? '#,##0' : '#,##0.0"h"';
      } else if (c >= 8 && c <= 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0" ₫"';
        if (c === 11) cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.navyDark } };
        if (c === 12) cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.paidGreen } };
        if (c === 13) cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.unpaidRed } };
      } else if (c === 14) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: statusColor } };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }

    currentRowIndex++;
  });

  // 6. Summary Row at the bottom
  const summaryRow = sheet.getRow(currentRowIndex);
  summaryRow.height = 28;
  sheet.mergeCells(`A${currentRowIndex}:E${currentRowIndex}`);
  const summaryLabel = summaryRow.getCell(1);
  summaryLabel.value = 'TỔNG CỘNG HỆ THỐNG:';
  summaryLabel.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.white } };
  summaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
  summaryLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyDark } };

  // Set formulas for totals
  const startRow = 7;
  const endRow = Math.max(7, currentRowIndex - 1);

  const colFormulas = [
    { col: 6, formula: `SUM(F${startRow}:F${endRow})`, fmt: '#,##0' },
    { col: 7, formula: `SUM(G${startRow}:G${endRow})`, fmt: '#,##0.0"h"' },
    { col: 8, formula: `SUM(H${startRow}:H${endRow})`, fmt: '#,##0" ₫"' },
    { col: 9, formula: `SUM(I${startRow}:I${endRow})`, fmt: '#,##0" ₫"' },
    { col: 10, formula: `SUM(J${startRow}:J${endRow})`, fmt: '#,##0" ₫"' },
    { col: 11, formula: `SUM(K${startRow}:K${endRow})`, fmt: '#,##0" ₫"' },
    { col: 12, formula: `SUM(L${startRow}:L${endRow})`, fmt: '#,##0" ₫"' },
    { col: 13, formula: `SUM(M${startRow}:M${endRow})`, fmt: '#,##0" ₫"' },
  ];

  colFormulas.forEach(({ col, formula, fmt }) => {
    const cell = summaryRow.getCell(col);
    cell.value = { formula, result: 0 };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: THEME.white } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = fmt;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyDark } };
  });

  const lastCell = summaryRow.getCell(14);
  lastCell.value = '';
  lastCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyDark } };

  // Freeze Header (Row 6)
  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 6, topLeftCell: 'A7', activeCell: 'A7' },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

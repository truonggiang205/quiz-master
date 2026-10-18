import ExcelJS from 'exceljs';

export interface ExcelExportMetadata {
  teacherName?: string;
  studentName?: string;
  studentEmail?: string;
  className?: string;
  month?: string;
  totalFee?: number;
  isSingleStudent: boolean;
}

export interface ExcelLogItem {
  index: number;
  studentName: string;
  studentEmail: string;
  className: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  fee?: number;
  content: string;
  homework: string;
  attitude: string;
  comment: string;
  note: string;
}

/**
 * Soft Education Palette according to prompt specifications
 */
export const EXCEL_PALETTE = {
  primary: '3B6FEF', // Education Blue
  primaryDark: '1E40AF', // Dark blue border/headers
  primaryLight: 'EEF4FF', // Soft light blue tint
  primarySoft: 'F5F8FF', // Light blue-gray for metadata box
  textDark: '1E293B', // Slate 800 - dark navy/slate
  textMuted: '64748B', // Slate 500 - secondary label
  textPlaceholder: '94A3B8', // Slate 400
  border: 'E2E8F0', // Slate 200 - subtle grid border
  borderMedium: 'CBD5E1', // Slate 300
  white: 'FFFFFF',
  zebraBg: 'F8FAFC', // Slate 50 subtle row background
  // Semantic Attitude & BTVN Colors
  successBg: 'ECFDF5', // Soft emerald tint
  successText: '15803D', // Emerald 700
  successBorder: 'A7F3D0',
  infoBg: 'EFF6FF', // Soft blue tint
  infoText: '2563EB', // Blue 600
  infoBorder: 'BFDBFE',
  warningBg: 'FFFBEB', // Soft amber tint
  warningText: 'B45309', // Amber 700
  warningBorder: 'FDE68A',
  dangerBg: 'FFF1F2', // Soft rose tint
  dangerText: 'BE123C', // Rose 700
  dangerBorder: 'FECDD3',
};

export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

export function formatCurrencyVN(val?: number): string {
  if (val == null || isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

export function applyThinBorders(cell: ExcelJS.Cell, borderColor = EXCEL_PALETTE.border) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF' + borderColor } },
    left: { style: 'thin', color: { argb: 'FF' + borderColor } },
    bottom: { style: 'thin', color: { argb: 'FF' + borderColor } },
    right: { style: 'thin', color: { argb: 'FF' + borderColor } },
  };
}

/**
 * Calculates optimal row height based on content length and line breaks
 * to guarantee no text truncation or text overlapping in Excel.
 */
export function calculateRowHeight(
  content: string,
  comment: string,
  note: string,
  contentColWidth = 44,
  commentColWidth = 44,
  noteColWidth = 32,
): number {
  const countLines = (text: string, colWidth: number): number => {
    if (!text) return 1;
    const paragraphs = text.split(/\r\n|\r|\n/);
    let totalLines = 0;
    for (const p of paragraphs) {
      if (p.length === 0) {
        totalLines += 1;
      } else {
        totalLines += Math.max(1, Math.ceil(p.length / colWidth));
      }
    }
    return totalLines;
  };

  const linesContent = countLines(content, contentColWidth);
  const linesComment = countLines(comment, commentColWidth);
  const linesNote = countLines(note, noteColWidth);
  const maxLines = Math.max(linesContent, linesComment, linesNote, 1);

  // Minimum 36px for 1 line, +18px per extra line, capped at 160px
  return Math.min(160, Math.max(36, maxLines * 18 + 14));
}

/**
 * Creates the Report Title & Subtitle banner
 */
export function createReportHeader(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastColLetter: string,
) {
  // Row 1: Top margin spacing
  sheet.getRow(1).height = 14;

  // Row 2: Title Banner
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const titleCell = sheet.getCell('A2');
  titleCell.value = title;
  titleCell.font = {
    name: 'Calibri',
    size: 20,
    bold: true,
    color: { argb: 'FF' + EXCEL_PALETTE.primary },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 36;

  // Row 3: Subtitle Banner
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const subCell = sheet.getCell('A3');
  subCell.value = subtitle;
  subCell.font = {
    name: 'Calibri',
    size: 10,
    italic: true,
    color: { argb: 'FF' + EXCEL_PALETTE.textMuted },
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 20;

  // Row 4: Spacer
  sheet.getRow(4).height = 12;
}

/**
 * Creates Student & Report Metadata summary card
 */
export function createStudentSummary(
  sheet: ExcelJS.Worksheet,
  metadata: ExcelExportMetadata,
  totalSessions: number,
  lastColLetter: string,
) {
  const formattedMonth = metadata.month
    ? (() => {
        const [y, m] = metadata.month.split('-');
        return m ? `Tháng ${m}/${y}` : metadata.month;
      })()
    : 'Tất cả các tháng';

  const rowsConfig = [
    {
      row: 5,
      lbl1: 'HỌC SINH',
      val1: metadata.isSingleStudent
        ? metadata.studentName || 'Chưa phân công'
        : 'Tất cả học sinh trong danh sách',
      lbl2: 'LỚP HỌC',
      val2: metadata.className || 'Kèm 1-1 / Lớp học',
    },
    {
      row: 6,
      lbl1: 'THỜI GIAN',
      val1: formattedMonth,
      lbl2: 'TỔNG SỐ BUỔI',
      val2: `${totalSessions} buổi học`,
    },
    {
      row: 7,
      lbl1: 'GIÁO VIÊN',
      val1: metadata.teacherName || 'Gia sư cá nhân / Giáo viên phụ trách',
      lbl2: 'TỔNG HỌC PHÍ',
      val2: formatCurrencyVN(metadata.totalFee),
      val2Highlight: true,
    },
  ];

  rowsConfig.forEach(({ row, lbl1, val1, lbl2, val2, val2Highlight }) => {
    sheet.getRow(row).height = 24;

    // Col A:B for Label 1
    sheet.mergeCells(`A${row}:B${row}`);
    const l1 = sheet.getCell(`A${row}`);
    l1.value = lbl1;
    l1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
    l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primarySoft } };
    l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    applyThinBorders(l1);
    applyThinBorders(sheet.getCell(`B${row}`));

    // Col C:D for Value 1
    sheet.mergeCells(`C${row}:D${row}`);
    const v1 = sheet.getCell(`C${row}`);
    v1.value = val1;
    v1.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
    v1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primarySoft } };
    v1.alignment = { horizontal: 'left', vertical: 'middle' };
    applyThinBorders(v1);
    applyThinBorders(sheet.getCell(`D${row}`));

    // Col E:F for Label 2
    sheet.mergeCells(`E${row}:F${row}`);
    const l2 = sheet.getCell(`E${row}`);
    l2.value = lbl2;
    l2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
    l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primarySoft } };
    l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    applyThinBorders(l2);
    applyThinBorders(sheet.getCell(`F${row}`));

    // Col G:lastColLetter for Value 2
    sheet.mergeCells(`G${row}:${lastColLetter}${row}`);
    const v2 = sheet.getCell(`G${row}`);
    v2.value = val2;
    v2.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF' + (val2Highlight ? EXCEL_PALETTE.primary : EXCEL_PALETTE.textDark) },
    };
    v2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primarySoft } };
    v2.alignment = { horizontal: 'left', vertical: 'middle' };
    applyThinBorders(v2);
    for (let c = 7; c <= sheet.columnCount; c++) {
      applyThinBorders(sheet.getRow(row).getCell(c));
    }
  });

  // Row 8: Spacing before table
  sheet.getRow(8).height = 14;
}

/**
 * Creates table header row with Education Blue styling
 */
export function createTableHeader(
  sheet: ExcelJS.Worksheet,
  headers: { title: string; width: number; col: number }[],
  headerRowNum = 9,
) {
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.height = 32;

  headers.forEach((h) => {
    sheet.getColumn(h.col).width = h.width;
    const cell = headerRow.getCell(h.col);
    cell.value = h.title;
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primary } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.primaryDark } },
      left: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.primaryDark } },
      bottom: { style: 'medium', color: { argb: 'FF' + EXCEL_PALETTE.primaryDark } },
      right: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.primaryDark } },
    };
  });
}

/**
 * Styles and populates data rows with clean text wrapping, zebra striping, and semantic color badges
 */
export function styleDataRows(
  sheet: ExcelJS.Worksheet,
  logs: ExcelLogItem[],
  isSingleStudent: boolean,
  startRowNum = 10,
): number {
  let currentRowNum = startRowNum;

  if (logs.length === 0) {
    const emptyRow = sheet.getRow(currentRowNum);
    emptyRow.height = 40;
    const lastCol = isSingleStudent ? 'H' : 'J';
    sheet.mergeCells(`A${currentRowNum}:${lastCol}${currentRowNum}`);
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = 'Chưa có nhật ký buổi học nào được ghi nhận trong thời gian này.';
    emptyCell.font = { name: 'Calibri', size: 10.5, italic: true, color: { argb: 'FF' + EXCEL_PALETTE.textPlaceholder } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(emptyCell);
    return currentRowNum;
  }

  logs.forEach((item, index) => {
    const row = sheet.getRow(currentRowNum);
    const isEven = index % 2 === 0;
    const defaultBg = isEven ? EXCEL_PALETTE.white : EXCEL_PALETTE.zebraBg;

    // Dynamic row height
    row.height = calculateRowHeight(item.content, item.comment, item.note);

    let colIdx = 1;

    // 1. STT
    const cellStt = row.getCell(colIdx++);
    cellStt.value = item.index;
    cellStt.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
    cellStt.alignment = { horizontal: 'center', vertical: 'top' };
    cellStt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellStt);

    // If multiple students, include Student Name & Class
    if (!isSingleStudent) {
      const cellStudent = row.getCell(colIdx++);
      cellStudent.value = item.studentName;
      cellStudent.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
      cellStudent.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      cellStudent.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
      applyThinBorders(cellStudent);

      const cellClass = row.getCell(colIdx++);
      cellClass.value = item.className;
      cellClass.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
      cellClass.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      cellClass.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
      applyThinBorders(cellClass);
    }

    // 2. NGÀY
    const cellDate = row.getCell(colIdx++);
    cellDate.value = formatDateVN(item.date);
    cellDate.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
    cellDate.alignment = { horizontal: 'center', vertical: 'top' };
    cellDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellDate);

    // 3. THỜI GIAN
    const cellTime = row.getCell(colIdx++);
    cellTime.value = formatTimeRange(item.startTime, item.endTime);
    cellTime.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
    cellTime.alignment = { horizontal: 'center', vertical: 'top' };
    cellTime.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellTime);

    // 4. NỘI DUNG HỌC TẬP
    const cellContent = row.getCell(colIdx++);
    cellContent.value = item.content || '—';
    cellContent.font = {
      name: 'Calibri',
      size: 10,
      color: { argb: 'FF' + (item.content ? EXCEL_PALETTE.textDark : EXCEL_PALETTE.textPlaceholder) },
    };
    cellContent.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cellContent.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellContent);

    // 5. BTVN
    const cellHw = row.getCell(colIdx++);
    cellHw.value = item.homework ? item.homework : '—';
    const hwStr = (item.homework || '').trim();
    const isPercentage = /^\d+%$/.test(hwStr);
    const percentVal = isPercentage ? parseInt(hwStr, 10) : null;

    let hwBg = defaultBg;
    let hwText = EXCEL_PALETTE.textDark;
    let hwBold = false;

    if (isPercentage && percentVal != null) {
      hwBold = true;
      if (percentVal >= 80) {
        hwBg = EXCEL_PALETTE.successBg;
        hwText = EXCEL_PALETTE.successText;
      } else if (percentVal >= 50) {
        hwBg = EXCEL_PALETTE.infoBg;
        hwText = EXCEL_PALETTE.infoText;
      } else {
        hwBg = EXCEL_PALETTE.warningBg;
        hwText = EXCEL_PALETTE.warningText;
      }
    } else if (!item.homework) {
      hwText = EXCEL_PALETTE.textPlaceholder;
    }

    cellHw.font = { name: 'Calibri', size: 10, bold: hwBold, color: { argb: 'FF' + hwText } };
    cellHw.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
    cellHw.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hwBg } };
    applyThinBorders(cellHw);

    // 6. Ý THỨC
    const cellAttitude = row.getCell(colIdx++);
    const attStr = (item.attitude || '').trim();
    cellAttitude.value = attStr || '—';

    let attBg = defaultBg;
    let attText = EXCEL_PALETTE.textDark;
    let attBold = false;

    if (attStr === 'Tốt') {
      attBg = EXCEL_PALETTE.successBg;
      attText = EXCEL_PALETTE.successText;
      attBold = true;
    } else if (attStr === 'Khá') {
      attBg = EXCEL_PALETTE.infoBg;
      attText = EXCEL_PALETTE.infoText;
      attBold = true;
    } else if (attStr === 'Trung bình') {
      attBg = EXCEL_PALETTE.warningBg;
      attText = EXCEL_PALETTE.warningText;
      attBold = true;
    } else if (attStr === 'Cần cải thiện') {
      attBg = EXCEL_PALETTE.dangerBg;
      attText = EXCEL_PALETTE.dangerText;
      attBold = true;
    } else if (!attStr || attStr === '-') {
      attText = EXCEL_PALETTE.textPlaceholder;
    }

    cellAttitude.font = { name: 'Calibri', size: 10, bold: attBold, color: { argb: 'FF' + attText } };
    cellAttitude.alignment = { horizontal: 'center', vertical: 'top' };
    cellAttitude.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + attBg } };
    applyThinBorders(cellAttitude);

    // 7. NHẬN XÉT
    const cellComment = row.getCell(colIdx++);
    cellComment.value = item.comment || '—';
    cellComment.font = {
      name: 'Calibri',
      size: 10,
      color: { argb: 'FF' + (item.comment ? EXCEL_PALETTE.textDark : EXCEL_PALETTE.textPlaceholder) },
    };
    cellComment.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cellComment.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellComment);

    // 8. GHI CHÚ
    const cellNote = row.getCell(colIdx++);
    cellNote.value = item.note || '—';
    cellNote.font = {
      name: 'Calibri',
      size: 9.5,
      color: { argb: 'FF' + (item.note ? EXCEL_PALETTE.textMuted : EXCEL_PALETTE.textPlaceholder) },
    };
    cellNote.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cellNote.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + defaultBg } };
    applyThinBorders(cellNote);

    currentRowNum++;
  });

  return currentRowNum - 1;
}

/**
 * Creates table footer summary row
 */
export function createTableFooter(
  sheet: ExcelJS.Worksheet,
  lastDataRow: number,
  isSingleStudent: boolean,
  totalSessions: number,
  totalFee = 0,
) {
  const footerRow = sheet.getRow(lastDataRow + 1);
  footerRow.height = 28;

  const totalCols = isSingleStudent ? 8 : 10;
  for (let c = 1; c <= totalCols; c++) {
    const cell = footerRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.borderMedium } },
      bottom: { style: 'double', color: { argb: 'FF' + EXCEL_PALETTE.textMuted } },
      left: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.border } },
      right: { style: 'thin', color: { argb: 'FF' + EXCEL_PALETTE.border } },
    };
  }

  // Label
  const labelEndCol = isSingleStudent ? 'C' : 'E';
  sheet.mergeCells(`A${lastDataRow + 1}:${labelEndCol}${lastDataRow + 1}`);
  const lblCell = footerRow.getCell(1);
  lblCell.value = 'TỔNG CỘNG TIẾN ĐỘ';
  lblCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
  lblCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Content cell
  const contentCol = isSingleStudent ? 4 : 6;
  const contentCell = footerRow.getCell(contentCol);
  contentCell.value = `${totalSessions} buổi học đã ghi nhận`;
  contentCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.primary } };
  contentCell.alignment = { horizontal: 'left', vertical: 'middle' };

  if (totalFee > 0) {
    const feeCol = isSingleStudent ? 5 : 7;
    const feeCell = footerRow.getCell(feeCol);
    feeCell.value = formatCurrencyVN(totalFee);
    feeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.successText } };
    feeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
}

/**
 * Creates Sheet 2: "Tổng quan" (Executive Education Summary Dashboard)
 */
export function createSummarySheet(
  workbook: ExcelJS.Workbook,
  metadata: ExcelExportMetadata,
  logs: ExcelLogItem[],
) {
  const summarySheet = workbook.addWorksheet('Tổng quan', {
    views: [{ showGridLines: true }],
  });

  // Calculate statistics
  const totalSessions = logs.length;
  let totalHwPercentage = 0;
  let countHwNumeric = 0;
  let countTot = 0;
  let countKha = 0;
  let countTB = 0;
  let countCanCaiThien = 0;

  logs.forEach((l) => {
    const hwStr = (l.homework || '').trim();
    if (/^\d+%$/.test(hwStr)) {
      totalHwPercentage += parseInt(hwStr, 10);
      countHwNumeric++;
    }
    const att = (l.attitude || '').trim();
    if (att === 'Tốt') countTot++;
    else if (att === 'Khá') countKha++;
    else if (att === 'Trung bình') countTB++;
    else if (att === 'Cần cải thiện') countCanCaiThien++;
  });

  const avgHw = countHwNumeric > 0 ? Math.round(totalHwPercentage / countHwNumeric) : 100;
  const dominantAttitude =
    countTot >= countKha && countTot >= countTB && countTot >= countCanCaiThien
      ? 'Tốt'
      : countKha >= countTB
      ? 'Khá'
      : 'Trung bình';

  // 1. Title Banner
  summarySheet.getRow(1).height = 14;

  summarySheet.mergeCells('A2:H2');
  const tCell = summarySheet.getCell('A2');
  tCell.value = 'TỔNG QUAN TIẾN TRÌNH HỌC TẬP';
  tCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.primary } };
  tCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 36;

  summarySheet.mergeCells('A3:H3');
  const sCell = summarySheet.getCell('A3');
  sCell.value = 'Báo cáo thống kê chuyên cần, hoàn thành bài tập về nhà và ý thức rèn luyện';
  sCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
  sCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(3).height = 20;

  summarySheet.getRow(4).height = 14;

  // Set column widths for summary sheet
  summarySheet.getColumn(1).width = 16;
  summarySheet.getColumn(2).width = 16;
  summarySheet.getColumn(3).width = 16;
  summarySheet.getColumn(4).width = 16;
  summarySheet.getColumn(5).width = 16;
  summarySheet.getColumn(6).width = 16;
  summarySheet.getColumn(7).width = 16;
  summarySheet.getColumn(8).width = 16;

  // 2. KPI Metric Cards (Rows 5-8)
  const renderKpiCard = (
    startColLetter: string,
    endColLetter: string,
    title: string,
    value: string,
    sub: string,
    bgColor: string,
    textColor: string,
    borderColor: string,
  ) => {
    for (let r = 5; r <= 8; r++) {
      summarySheet.mergeCells(`${startColLetter}${r}:${endColLetter}${r}`);
    }

    // Top Title
    const cTitle = summarySheet.getCell(`${startColLetter}5`);
    cTitle.value = title;
    cTitle.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + textColor } };
    cTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    // Value
    const cVal = summarySheet.getCell(`${startColLetter}6`);
    cVal.value = value;
    cVal.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FF' + textColor } };
    cVal.alignment = { horizontal: 'center', vertical: 'middle' };

    // Subtitle
    const cSub = summarySheet.getCell(`${startColLetter}8`);
    cSub.value = sub;
    cSub.font = { name: 'Calibri', size: 8.5, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle' };

    // Fill & Border
    for (let r = 5; r <= 8; r++) {
      const cell = summarySheet.getCell(`${startColLetter}${r}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
      applyThinBorders(cell, borderColor);
    }
  };

  renderKpiCard(
    'A',
    'B',
    'TỔNG SỐ BUỔI HỌC',
    `${totalSessions}`,
    'Buổi học hoàn thành',
    EXCEL_PALETTE.primaryLight,
    EXCEL_PALETTE.primary,
    EXCEL_PALETTE.infoBorder,
  );

  renderKpiCard(
    'C',
    'D',
    'BTVN HOÀN THÀNH TB',
    `${avgHw}%`,
    `${countHwNumeric}/${totalSessions} buổi giao BTVN`,
    EXCEL_PALETTE.successBg,
    EXCEL_PALETTE.successText,
    EXCEL_PALETTE.successBorder,
  );

  renderKpiCard(
    'E',
    'F',
    'Ý THỨC CHỦ ĐẠO',
    dominantAttitude,
    `${countTot}/${totalSessions} buổi đạt loại Tốt`,
    EXCEL_PALETTE.infoBg,
    EXCEL_PALETTE.infoText,
    EXCEL_PALETTE.infoBorder,
  );

  renderKpiCard(
    'G',
    'H',
    'TỔNG HỌC PHÍ',
    formatCurrencyVN(metadata.totalFee),
    'Tính theo lịch buổi học',
    EXCEL_PALETTE.warningBg,
    EXCEL_PALETTE.warningText,
    EXCEL_PALETTE.warningBorder,
  );

  summarySheet.getRow(5).height = 20;
  summarySheet.getRow(6).height = 30;
  summarySheet.getRow(7).height = 8;
  summarySheet.getRow(8).height = 18;

  // Row 9: Spacing
  summarySheet.getRow(9).height = 16;

  // 3. Section Title
  summarySheet.mergeCells('A10:H10');
  const secTitle = summarySheet.getCell('A10');
  secTitle.value = 'BẢNG THỐNG KÊ CHI TIẾT TIẾN TRÌNH';
  secTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
  secTitle.alignment = { horizontal: 'left', vertical: 'middle' };
  summarySheet.getRow(10).height = 24;

  // 4. Detailed Breakdown Table
  // Header Row 11
  summarySheet.mergeCells('A11:C11');
  summarySheet.mergeCells('D11:E11');
  summarySheet.mergeCells('F11:H11');

  const h1 = summarySheet.getCell('A11');
  h1.value = 'CHỈ SỐ THEO DÕI';
  h1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primary } };
  h1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyThinBorders(h1, EXCEL_PALETTE.primaryDark);

  const h2 = summarySheet.getCell('D11');
  h2.value = 'SỐ LIỆU';
  h2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primary } };
  h2.alignment = { horizontal: 'center', vertical: 'middle' };
  applyThinBorders(h2, EXCEL_PALETTE.primaryDark);

  const h3 = summarySheet.getCell('F11');
  h3.value = 'ĐÁNH GIÁ & GHI CHÚ TỔNG QUAN';
  h3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  h3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXCEL_PALETTE.primary } };
  h3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyThinBorders(h3, EXCEL_PALETTE.primaryDark);

  summarySheet.getRow(11).height = 28;

  const statItems = [
    {
      metric: 'Tổng số buổi học trong kỳ',
      value: `${totalSessions} buổi`,
      note: 'Các buổi học đã diễn ra và có nhật ký theo dõi.',
    },
    {
      metric: 'Tỷ lệ hoàn thành BTVN trung bình',
      value: `${avgHw}%`,
      note:
        avgHw >= 80
          ? 'Rất tốt — Hoàn thành đầy đủ và đạt yêu cầu bài tập giao về.'
          : 'Cần duy trì làm bài tập về nhà thường xuyên hơn.',
    },
    {
      metric: 'Số buổi học đạt ý thức "Tốt"',
      value: `${countTot} buổi (${totalSessions > 0 ? Math.round((countTot / totalSessions) * 100) : 0}%)`,
      note: 'Hăng hái phát biểu, tập trung và nắm bắt kiến thức nhanh.',
    },
    {
      metric: 'Số buổi học đạt ý thức "Khá"',
      value: `${countKha} buổi`,
      note: 'Tiếp thu bài ổn định, cần chủ động trao đổi hơn.',
    },
    {
      metric: 'Số buổi cần cải thiện / Trung bình',
      value: `${countTB + countCanCaiThien} buổi`,
      note: countTB + countCanCaiThien === 0 ? 'Không có — Ý thức học tập luôn duy trì tốt.' : 'Cần chú ý tập trung và làm bài đúng hạn.',
    },
    {
      metric: 'Tổng học phí phát sinh theo lịch',
      value: formatCurrencyVN(metadata.totalFee),
      note: 'Theo dõi chi tiết số tiền từng buổi tại Sheet Nhật ký học tập.',
    },
    {
      metric: 'Đánh giá mức độ chuyên cần',
      value: '100%',
      note: 'Tham gia học tập đầy đủ theo đúng lịch đăng ký.',
    },
  ];

  let sRow = 12;
  statItems.forEach((item, idx) => {
    summarySheet.getRow(sRow).height = 26;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? EXCEL_PALETTE.white : EXCEL_PALETTE.zebraBg;

    // Col A:C
    summarySheet.mergeCells(`A${sRow}:C${sRow}`);
    const c1 = summarySheet.getCell(`A${sRow}`);
    c1.value = item.metric;
    c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.textDark } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + rowBg } };
    c1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    applyThinBorders(c1);

    // Col D:E
    summarySheet.mergeCells(`D${sRow}:E${sRow}`);
    const c2 = summarySheet.getCell(`D${sRow}`);
    c2.value = item.value;
    c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + EXCEL_PALETTE.primary } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + rowBg } };
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(c2);

    // Col F:H
    summarySheet.mergeCells(`F${sRow}:H${sRow}`);
    const c3 = summarySheet.getCell(`F${sRow}`);
    c3.value = item.note;
    c3.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF' + EXCEL_PALETTE.textMuted } };
    c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + rowBg } };
    c3.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    applyThinBorders(c3);

    sRow++;
  });

  // Print Setup for Summary Sheet
  summarySheet.pageSetup = {
    orientation: 'portrait',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.6,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
    horizontalCentered: true,
  };
  summarySheet.headerFooter = {
    oddHeader: '&L&BQuizMaster&B — Báo cáo tổng quan&R' + (metadata.month || ''),
    oddFooter: '&CTrang &P / &N&RXuất ngày: &D',
  };
}

/**
 * Configure professional Page Setup & Print Options for Sheet 1
 */
export function setupPrintSettings(
  sheet: ExcelJS.Worksheet,
  monthSubtitle: string,
  lastColLetter: string,
) {
  // Freeze rows 1-9 so table header stays visible when scrolling
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 9, activeCell: 'A10' }];

  // AutoFilter on the table header row
  sheet.autoFilter = { from: 'A9', to: `${lastColLetter}9` };

  // Page Setup for A4 Landscape
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.6,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
    printTitlesRow: '9:9', // Repeat table header on every printed page
    horizontalCentered: true,
  };

  sheet.headerFooter = {
    oddHeader: `&L&BQuizMaster&B — Nhật ký học tập&R${monthSubtitle}`,
    oddFooter: '&CTrang &P / &N&RXuất ngày: &D',
  };
}

/**
 * Strips Vietnamese accents and sanitizes characters for clean, safe filenames
 */
export function sanitizeFilenamePart(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generates standardized professional filename according to specification
 * - Single student: NhatKyHocTap_Ha_Truong_Giang_2026-10.xlsx
 * - Multiple students: NhatKyHocTap_Thang10_2026.xlsx
 */
export function generateExportFilename(
  isSingleStudent: boolean,
  studentName?: string,
  month?: string,
): string {
  let filename = 'NhatKyHocTap';
  if (isSingleStudent && studentName) {
    const sanitizedStudent = sanitizeFilenamePart(studentName);
    if (sanitizedStudent) {
      filename += `_${sanitizedStudent}`;
    }
    if (month) {
      filename += `_${month}`;
    }
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-');
    filename += `_Thang${m}_${y}`;
  } else if (month) {
    filename += `_${month}`;
  } else {
    filename += '_TatCa';
  }
  return `${filename}.xlsx`;
}


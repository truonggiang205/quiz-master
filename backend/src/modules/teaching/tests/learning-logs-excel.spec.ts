import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import {
  formatDateVN,
  formatTimeRange,
  formatCurrencyVN,
  calculateRowHeight,
  sanitizeFilenamePart,
  generateExportFilename,
  createReportHeader,
  createStudentSummary,
  createSummaryKpiStrip,
  createTableHeader,
  styleDataRows,
  createTableFooter,
  createSummarySheet,
  setupPrintSettings,
  EXCEL_PALETTE,
  ExcelExportMetadata,
  ExcelLogItem,
} from '../utils/learning-logs-excel.util.js';

describe('Learning Logs Professional Excel Export', () => {
  describe('Helper & Formatter Functions', () => {
    it('should format date to DD/MM/YYYY', () => {
      expect(formatDateVN('2026-10-17')).toBe('17/10/2026');
      expect(formatDateVN('2026-01-05')).toBe('05/01/2026');
      expect(formatDateVN('')).toBe('');
    });

    it('should format time range properly', () => {
      expect(formatTimeRange('08:00', '09:30')).toBe('08:00 – 09:30');
      expect(formatTimeRange('08:00', '')).toBe('08:00');
      expect(formatTimeRange('', '09:30')).toBe('09:30');
      expect(formatTimeRange('', '')).toBe('');
    });

    it('should format currency to Vietnamese dong format', () => {
      const formatted = formatCurrencyVN(200000);
      expect(formatted).toContain('200.000');
      expect(formatted).toContain('₫');
      expect(formatCurrencyVN(0)).toContain('0');
    });

    it('should sanitize filename part by stripping Vietnamese accents and invalid characters', () => {
      expect(sanitizeFilenamePart('Hà Trường Giang')).toBe('Ha_Truong_Giang');
      expect(sanitizeFilenamePart('Lê Văn Đạt / 12A')).toBe('Le_Van_Dat_12A');
      expect(sanitizeFilenamePart('Nguyễn Thị Mai: Kèm 1-1')).toBe('Nguyen_Thi_Mai_Kem_1-1');
    });

    it('should generate professional filenames adhering to standards', () => {
      // Single student
      expect(generateExportFilename(true, 'Hà Trường Giang', '2026-10')).toBe(
        'NhatKyHocTap_Ha_Truong_Giang_2026-10.xlsx',
      );
      // Multiple students with month
      expect(generateExportFilename(false, undefined, '2026-10')).toBe(
        'NhatKyHocTap_Thang10_2026.xlsx',
      );
      // Multiple students without month
      expect(generateExportFilename(false, undefined, undefined)).toBe(
        'NhatKyHocTap_TatCa.xlsx',
      );
    });

    it('should calculate dynamic row heights accurately without truncation', () => {
      // Short 1-line text
      const hShort = calculateRowHeight('Ngắn', 'Tốt', 'Ghi chú');
      expect(hShort).toBeGreaterThanOrEqual(36);
      expect(hShort).toBeLessThanOrEqual(50);

      // Long multiline text
      const longText =
        'Nội dung rất dài học sinh cần ôn tập kỹ kiến thức chương hàm số lượng giác và giải quyết các bài toán vận dụng cao liên quan đến tiệm cận.';
      const hLong = calculateRowHeight(longText, longText, 'Ghi chú dài...');
      expect(hLong).toBeGreaterThan(hShort);
      expect(hLong).toBeLessThanOrEqual(160);
    });
  });

  describe('Workbook Generation & Layout Structure', () => {
    it('should generate a 2-sheet Professional Education Report with correct layout, KPI strip, and styling', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.title = 'Nhật ký học tập';

      const metadata: ExcelExportMetadata = {
        teacherName: 'Trần Thị Phương Anh',
        studentName: 'Hà Trường Giang',
        studentEmail: 'giang@example.com',
        className: 'Kèm 1-1: Hà Trường Giang',
        month: '2026-10',
        totalFee: 400000,
        isSingleStudent: true,
      };

      const mockLogs: ExcelLogItem[] = [
        {
          index: 1,
          studentName: 'Hà Trường Giang',
          studentEmail: 'giang@example.com',
          className: 'Kèm 1-1: Hà Trường Giang',
          date: '2026-10-17',
          startTime: '08:00',
          endTime: '09:30',
          fee: 200000,
          content: 'Toán: Làm đề trên lớp chuẩn bị kiểm tra 45p đại số và hình học',
          homework: '100%',
          attitude: 'Tốt',
          comment: 'Em nắm kiến thức vững, cần cẩn thận ở phần tính toán căn thức.',
          note: 'Phụ huynh theo dõi thêm bài tập về nhà.',
        },
        {
          index: 2,
          studentName: 'Hà Trường Giang',
          studentEmail: 'giang@example.com',
          className: 'Kèm 1-1: Hà Trường Giang',
          date: '2026-10-24',
          startTime: '13:00',
          endTime: '14:30',
          fee: 200000,
          content: 'Hình học không gian: Góc giữa đường thẳng và mặt phẳng',
          homework: '80%',
          attitude: 'Khá',
          comment: 'Tiếp thu tốt các ví dụ mẫu, bài tập vận dụng làm hơi chậm một chút.',
          note: 'Cần làm thêm 3 bài trong sách bài tập.',
        },
      ];

      // Sheet 1: Nhật ký học tập
      const sheet1 = workbook.addWorksheet('Nhật ký học tập', {
        views: [{ showGridLines: true }],
      });

      createReportHeader(
        sheet1,
        'NHẬT KÝ HỌC TẬP',
        'Theo dõi tiến trình học tập, bài tập và nhận xét qua từng buổi học',
        'H',
      );

      createStudentSummary(sheet1, metadata, mockLogs.length, 'H');

      createSummaryKpiStrip(sheet1, mockLogs, metadata.totalFee, 'H', 9);

      const headers = [
        { title: 'STT', width: 8, col: 1 },
        { title: 'NGÀY', width: 15, col: 2 },
        { title: 'THỜI GIAN', width: 18, col: 3 },
        { title: 'NỘI DUNG HỌC TẬP', width: 42, col: 4 },
        { title: 'BTVN', width: 14, col: 5 },
        { title: 'Ý THỨC', width: 15, col: 6 },
        { title: 'NHẬN XÉT', width: 44, col: 7 },
        { title: 'GHI CHÚ', width: 32, col: 8 },
      ];

      createTableHeader(sheet1, headers, 11);
      const lastRow = styleDataRows(sheet1, mockLogs, true, 12);
      createTableFooter(sheet1, lastRow, true, mockLogs.length, metadata.totalFee);
      setupPrintSettings(sheet1, ' — Tháng 10/2026', 'H', 11);

      // Sheet 2: Tổng quan
      createSummarySheet(workbook, metadata, mockLogs);

      // Verify Sheet 1
      expect(workbook.worksheets).toHaveLength(2);
      expect(workbook.worksheets[0].name).toBe('Nhật ký học tập');
      expect(workbook.worksheets[1].name).toBe('Tổng quan');

      // Title & Subtitle check
      expect(sheet1.getCell('A2').value).toBe('NHẬT KÝ HỌC TẬP');
      expect(sheet1.getCell('A2').font?.size).toBe(22);
      expect(sheet1.getCell('A2').font?.color?.argb).toBe('FF' + EXCEL_PALETTE.primary);
      expect(sheet1.getCell('A3').value).toContain('Theo dõi tiến trình');

      // Student summary labels & values check
      expect(sheet1.getCell('A5').value).toBe('HỌC SINH');
      expect(sheet1.getCell('C5').value).toBe('Hà Trường Giang');
      expect(sheet1.getCell('A5').fill).toBeDefined();

      // Summary KPI strip check (Row 9)
      expect(sheet1.getCell('A9').value).toBe('2 BUỔI HỌC');
      expect(sheet1.getCell('C9').value).toContain('90% BTVN TB');
      expect(sheet1.getCell('E9').value).toBe('Ý THỨC: TỐT');

      // Table Header check (Row 11)
      expect(sheet1.getCell('A11').value).toBe('STT');
      expect(sheet1.getCell('B11').value).toBe('NGÀY');
      expect(sheet1.getCell('D11').value).toBe('NỘI DUNG HỌC TẬP');
      expect(sheet1.getCell('A11').fill).toBeDefined();

      // Row data checks (Row 12+)
      const row12 = sheet1.getRow(12);
      expect(row12.getCell(1).value).toBe(1);
      expect(row12.getCell(2).value).toBe('17/10/2026');
      expect(row12.getCell(5).value).toBe('100%');
      expect(row12.getCell(6).value).toBe('Tốt');
      expect(row12.getCell(4).alignment?.wrapText).toBe(true);
      expect(row12.getCell(7).alignment?.wrapText).toBe(true);

      // Freeze view check (cast to WorksheetViewFrozen to avoid lint error)
      const view0 = sheet1.views[0] as ExcelJS.WorksheetViewFrozen;
      expect(view0.state).toBe('frozen');
      expect(view0.ySplit).toBe(11);

      // AutoFilter check
      expect(sheet1.autoFilter).toBeDefined();

      // Print setup check
      expect(sheet1.pageSetup.orientation).toBe('landscape');
      expect(sheet1.pageSetup.paperSize).toBe(9); // A4
      expect(sheet1.pageSetup.printTitlesRow).toBe('11:11');

      // Verify Sheet 2 (Tổng quan)
      const sheet2 = workbook.getWorksheet('Tổng quan')!;
      expect(sheet2).toBeDefined();
      expect(sheet2.getCell('A2').value).toBe('TỔNG QUAN TIẾN TRÌNH HỌC TẬP');
      expect(sheet2.getCell('A5').value).toBe('TỔNG SỐ BUỔI HỌC');
      expect(sheet2.getCell('A6').value).toBe('2');
      expect(sheet2.getCell('C5').value).toBe('BTVN HOÀN THÀNH TB');
      expect(sheet2.getCell('C6').value).toBe('90%');
      expect(sheet2.getCell('E5').value).toBe('Ý THỨC CHỦ ĐẠO');
      expect(sheet2.getCell('E6').value).toBe('Tốt');

      // Write to buffer and verify non-empty buffer output
      const buffer = await workbook.xlsx.writeBuffer();
      expect(buffer.byteLength).toBeGreaterThan(5000);

      // Re-read written buffer using ExcelJS to verify workbook validity
      const testWb = new ExcelJS.Workbook();
      await testWb.xlsx.load(buffer);
      expect(testWb.worksheets).toHaveLength(2);
      expect(testWb.getWorksheet('Nhật ký học tập')).toBeDefined();
      expect(testWb.getWorksheet('Tổng quan')).toBeDefined();

      // Save a sample demo file NhatKyHocTap_Demo_2026-10.xlsx for user inspection
      const demoPath = path.resolve(__dirname, '../../../../NhatKyHocTap_Demo_2026-10.xlsx');
      fs.writeFileSync(demoPath, Buffer.from(buffer));
      expect(fs.existsSync(demoPath)).toBe(true);
    });
  });
});

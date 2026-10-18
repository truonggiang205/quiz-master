import { Injectable } from '@nestjs/common';
import { HolidayDto, QueryHolidaysDto } from '../dto/holiday.dto.js';

interface FixedHolidayDef {
  id: string;
  name: string;
  month: number; // 1-12
  day: number;   // 1-31
  durationDays?: number;
  type: 'PUBLIC_HOLIDAY' | 'OBSERVANCE' | 'TRADITIONAL';
  description: string;
}

interface YearSpecificHolidayDef {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: 'PUBLIC_HOLIDAY' | 'OBSERVANCE' | 'TRADITIONAL';
  description: string;
}

@Injectable()
export class HolidaysService {
  // 1. Fixed solar holidays recurring every year
  private readonly fixedHolidays: FixedHolidayDef[] = [
    {
      id: 'tet-duong-lich',
      name: 'Tết Dương Lịch',
      month: 1,
      day: 1,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      description: 'Nghỉ Tết Dương Lịch đầu năm mới',
    },
    {
      id: 'quoc-te-phu-nu',
      name: 'Quốc Tế Phụ Nữ',
      month: 3,
      day: 8,
      durationDays: 1,
      type: 'OBSERVANCE',
      description: 'Ngày Quốc tế Phụ nữ 8/3',
    },
    {
      id: 'giai-phong-mien-nam',
      name: 'Giải Phóng Miền Nam',
      month: 4,
      day: 30,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỷ niệm Ngày Giải phóng miền Nam, Thống nhất đất nước',
    },
    {
      id: 'quoc-te-lao-dong',
      name: 'Quốc Tế Lao Động',
      month: 5,
      day: 1,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      description: 'Ngày Quốc tế Lao động 1/5',
    },
    {
      id: 'quoc-te-thieu-nhi',
      name: 'Quốc Tế Thiếu Nhi',
      month: 6,
      day: 1,
      durationDays: 1,
      type: 'OBSERVANCE',
      description: 'Ngày Quốc tế Thiếu nhi 1/6',
    },
    {
      id: 'quoc-khanh',
      name: 'Quốc Khánh',
      month: 9,
      day: 2,
      durationDays: 2, // 01/09 - 02/09 hoặc 02/09 - 03/09 theo Bộ luật Lao động
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỷ niệm Quốc khánh Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam (nghỉ 2 ngày)',
    },
    {
      id: 'phu-nu-viet-nam',
      name: 'Phụ Nữ Việt Nam',
      month: 10,
      day: 20,
      durationDays: 1,
      type: 'OBSERVANCE',
      description: 'Ngày Phụ nữ Việt Nam 20/10',
    },
    {
      id: 'nha-giao-viet-nam',
      name: 'Nhà Giáo Việt Nam',
      month: 11,
      day: 20,
      durationDays: 1,
      type: 'OBSERVANCE',
      description: 'Ngày Nhà giáo Việt Nam 20/11 - Tôn vinh thầy cô giáo',
    },
    {
      id: 'giang-sinh',
      name: 'Lễ Giáng Sinh',
      month: 12,
      day: 25,
      durationDays: 1,
      type: 'OBSERVANCE',
      description: 'Lễ Giáng sinh (Noel)',
    },
  ];

  // 2. Year-specific movable holidays & multi-day breaks (Tết Âm Lịch, Giỗ Tổ Hùng Vương 10/3 âm lịch)
  private readonly yearSpecificHolidays: YearSpecificHolidayDef[] = [
    // --- 2024 ---
    {
      id: 'tet-nguyen-dan-2024',
      name: 'Tết Nguyên Đán (Giáp Thìn)',
      date: '2024-02-08',
      endDate: '2024-02-14',
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỳ nghỉ Tết Nguyên Đán Giáp Thìn 2024 (29 Tết đến mùng 5 Tết)',
    },
    {
      id: 'gio-to-hung-vuong-2024',
      name: 'Giỗ Tổ Hùng Vương',
      date: '2024-04-18',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },

    // --- 2025 ---
    {
      id: 'tet-nguyen-dan-2025',
      name: 'Tết Nguyên Đán (Ất Tỵ)',
      date: '2025-01-25',
      endDate: '2025-02-02',
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỳ nghỉ Tết Nguyên Đán Ất Tỵ 2025 (26 Tết đến mùng 5 Tết)',
    },
    {
      id: 'gio-to-hung-vuong-2025',
      name: 'Giỗ Tổ Hùng Vương',
      date: '2025-04-07',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },

    // --- 2026 ---
    {
      id: 'tet-nguyen-dan-2026',
      name: 'Tết Nguyên Đán (Bính Ngọ)',
      date: '2026-02-15',
      endDate: '2026-02-22',
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỳ nghỉ Tết Nguyên Đán Bính Ngọ 2026 (28 Tết đến mùng 6 Tết)',
    },
    {
      id: 'gio-to-hung-vuong-2026',
      name: 'Giỗ Tổ Hùng Vương',
      date: '2026-04-26',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },

    // --- 2027 ---
    {
      id: 'tet-nguyen-dan-2027',
      name: 'Tết Nguyên Đán (Đinh Mùi)',
      date: '2027-02-05',
      endDate: '2027-02-12',
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỳ nghỉ Tết Nguyên Đán Đinh Mùi 2027',
    },
    {
      id: 'gio-to-hung-vuong-2027',
      name: 'Giỗ Tổ Hùng Vương',
      date: '2027-04-16',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },

    // --- 2028 ---
    {
      id: 'tet-nguyen-dan-2028',
      name: 'Tết Nguyên Đán (Mậu Thân)',
      date: '2028-01-25',
      endDate: '2028-02-01',
      type: 'PUBLIC_HOLIDAY',
      description: 'Kỳ nghỉ Tết Nguyên Đán Mậu Thân 2028',
    },
    {
      id: 'gio-to-hung-vuong-2028',
      name: 'Giỗ Tổ Hùng Vương',
      date: '2028-04-05',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },
  ];

  /**
   * Generates all holidays for a given year by combining fixed solar holidays
   * and year-specific movable/lunar holidays.
   */
  private generateHolidaysForYear(year: number): HolidayDto[] {
    const holidays: HolidayDto[] = [];

    // 1. Add fixed holidays for this year
    for (const f of this.fixedHolidays) {
      const mm = String(f.month).padStart(2, '0');
      const dd = String(f.day).padStart(2, '0');
      const startDateStr = `${year}-${mm}-${dd}`;

      let endDateStr: string | undefined = undefined;
      if (f.durationDays && f.durationDays > 1) {
        const d = new Date(year, f.month - 1, f.day + (f.durationDays - 1));
        const endMm = String(d.getMonth() + 1).padStart(2, '0');
        const endDd = String(d.getDate()).padStart(2, '0');
        endDateStr = `${d.getFullYear()}-${endMm}-${endDd}`;
      }

      holidays.push({
        id: `${f.id}-${year}`,
        name: f.name,
        date: startDateStr,
        endDate: endDateStr,
        type: f.type,
        description: f.description,
        isRecurring: true,
        isActive: true,
      });
    }

    // 2. Add movable / lunar holidays matching this year
    const yearSpecific = this.yearSpecificHolidays.filter(
      (h) => h.date.startsWith(`${year}-`) || (h.endDate && h.endDate.startsWith(`${year}-`)),
    );

    for (const y of yearSpecific) {
      holidays.push({
        id: y.id,
        name: y.name,
        date: y.date,
        endDate: y.endDate,
        type: y.type,
        description: y.description,
        isRecurring: false,
        isActive: true,
      });
    }

    // Sort chronologically
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Retrieve holidays according to range filter or year query.
   */
  getHolidays(query: QueryHolidaysDto = {}): HolidayDto[] {
    let yearsToGenerate: number[] = [];

    if (query.year) {
      yearsToGenerate = [query.year];
    } else if (query.from && query.to) {
      const startYear = parseInt(query.from.substring(0, 4), 10);
      const endYear = parseInt(query.to.substring(0, 4), 10);
      for (let y = startYear; y <= endYear; y++) {
        yearsToGenerate.push(y);
      }
    } else {
      // Default to previous, current, and next year
      const currentYear = new Date().getFullYear();
      yearsToGenerate = [currentYear - 1, currentYear, currentYear + 1];
    }

    let all: HolidayDto[] = [];
    for (const y of yearsToGenerate) {
      all.push(...this.generateHolidaysForYear(y));
    }

    // If 'from' or 'to' is specified, filter by date range
    if (query.from || query.to) {
      all = all.filter((h) => {
        const holidayStart = h.date;
        const holidayEnd = h.endDate || h.date;

        if (query.from && holidayEnd < query.from) return false;
        if (query.to && holidayStart > query.to) return false;
        return true;
      });
    }

    return all;
  }

  /**
   * Check if a specific date falls into any holiday range.
   */
  getHolidayForDate(dateStr: string): HolidayDto | null {
    if (!dateStr || dateStr.length < 10) return null;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const holidays = this.generateHolidaysForYear(year);

    for (const h of holidays) {
      const start = h.date;
      const end = h.endDate || h.date;
      if (dateStr >= start && dateStr <= end) {
        return h;
      }
    }
    return null;
  }
}

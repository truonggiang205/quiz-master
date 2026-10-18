import { Injectable, BadRequestException } from '@nestjs/common';
import { HolidayDto, HolidayType, HolidaySource, QueryHolidaysDto } from '../dto/holiday.dto.js';
import {
  getTetNguyenDanSolarDate,
  getGioToHungVuongSolarDate,
} from '../utils/vietnam-lunar.util.js';

interface FixedHolidayDef {
  id: string;
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  durationDays?: number;
  type: HolidayType;
  description: string;
  isOfficialSchedule: boolean;
}

interface OfficialHolidayScheduleDef {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: HolidayType;
  description: string;
}

@Injectable()
export class HolidaysService {
  // 1. Fixed solar events (Public Holidays & Special Observance Days)
  private readonly fixedHolidays: FixedHolidayDef[] = [
    // PUBLIC HOLIDAYS (Theo Điều 112 Bộ luật Lao động Việt Nam)
    {
      id: 'tet-duong-lich',
      name: 'Tết Dương Lịch',
      month: 1,
      day: 1,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      isOfficialSchedule: true,
      description: 'Nghỉ Tết Dương Lịch đầu năm mới',
    },
    {
      id: 'giai-phong-mien-nam',
      name: 'Giải Phóng Miền Nam',
      month: 4,
      day: 30,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      isOfficialSchedule: true,
      description: 'Kỷ niệm Ngày Giải phóng miền Nam, Thống nhất đất nước 30/4',
    },
    {
      id: 'quoc-te-lao-dong',
      name: 'Quốc Tế Lao Động',
      month: 5,
      day: 1,
      durationDays: 1,
      type: 'PUBLIC_HOLIDAY',
      isOfficialSchedule: true,
      description: 'Ngày Quốc tế Lao động 1/5',
    },
    {
      id: 'quoc-khanh',
      name: 'Quốc Khánh',
      month: 9,
      day: 2,
      durationDays: 2, // 2 ngày theo Bộ luật Lao động (02/09 - 03/09)
      type: 'PUBLIC_HOLIDAY',
      isOfficialSchedule: true,
      description: 'Kỷ niệm Quốc khánh Nước CHXHCN Việt Nam (nghỉ 2 ngày: 02/09 - 03/09)',
    },

    // SPECIAL DAYS (Ngày kỷ niệm truyền thống - KHÔNG phải ngày nghỉ lễ chính thức)
    {
      id: 'quoc-te-phu-nu',
      name: 'Quốc Tế Phụ Nữ',
      month: 3,
      day: 8,
      durationDays: 1,
      type: 'SPECIAL_DAY',
      isOfficialSchedule: false,
      description: 'Ngày Quốc tế Phụ nữ 8/3',
    },
    {
      id: 'quoc-te-thieu-nhi',
      name: 'Quốc Tế Thiếu Nhi',
      month: 6,
      day: 1,
      durationDays: 1,
      type: 'SPECIAL_DAY',
      isOfficialSchedule: false,
      description: 'Ngày Quốc tế Thiếu nhi 1/6',
    },
    {
      id: 'phu-nu-viet-nam',
      name: 'Phụ Nữ Việt Nam',
      month: 10,
      day: 20,
      durationDays: 1,
      type: 'SPECIAL_DAY',
      isOfficialSchedule: false,
      description: 'Ngày Phụ nữ Việt Nam 20/10',
    },
    {
      id: 'nha-giao-viet-nam',
      name: 'Nhà Giáo Việt Nam',
      month: 11,
      day: 20,
      durationDays: 1,
      type: 'SPECIAL_DAY',
      isOfficialSchedule: false,
      description: 'Ngày Nhà giáo Việt Nam 20/11 - Tôn vinh thầy cô giáo',
    },
    {
      id: 'giang-sinh',
      name: 'Lễ Giáng Sinh',
      month: 12,
      day: 25,
      durationDays: 1,
      type: 'SPECIAL_DAY',
      isOfficialSchedule: false,
      description: 'Lễ Giáng sinh (Noel)',
    },
  ];

  // 2. Official Government Holiday Schedules (Đã được Chính phủ / Bộ LĐTBXH phê duyệt)
  private readonly officialSchedules: OfficialHolidayScheduleDef[] = [
    // --- Năm 2024 ---
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

    // --- Năm 2025 ---
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

    // --- Năm 2026 ---
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

    // --- Năm 2027 ---
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

    // --- Năm 2028 ---
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
      date: '2028-04-04',
      type: 'PUBLIC_HOLIDAY',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch',
    },
  ];

  /**
   * Holiday Resolver for a given year:
   * 1. Generates Fixed Solar events.
   * 2. Checks Official Government Schedule (2024-2028).
   * 3. If unconfigured future year, runs astronomical Lunar calculations (Meeus UTC+7).
   * 4. Resolves priorities: OFFICIAL > FIXED > LUNAR_CALCULATED.
   * 5. Deduplicates by date and returns normalized DTOs.
   */
  resolveHolidaysForYear(year: number): HolidayDto[] {
    const holidays: HolidayDto[] = [];

    // Step 1: Fixed solar holidays
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
        source: 'FIXED' as HolidaySource,
        isOfficialSchedule: f.isOfficialSchedule,
        description: f.description,
        isRecurring: true,
        isActive: true,
      });
    }

    // Step 2: Check if this year has official schedules
    const yearPrefix = `${year}-`;
    const officialForYear = this.officialSchedules.filter(
      (h) => h.date.startsWith(yearPrefix) || (h.endDate && h.endDate.startsWith(yearPrefix)),
    );

    if (officialForYear.length > 0) {
      // Official Government Schedule takes priority
      for (const off of officialForYear) {
        holidays.push({
          id: off.id,
          name: off.name,
          date: off.date,
          endDate: off.endDate,
          type: off.type,
          source: 'OFFICIAL' as HolidaySource,
          isOfficialSchedule: true,
          description: off.description,
          isRecurring: false,
          isActive: true,
        });
      }
    } else {
      // Step 3: Future / unconfigured year -> Run astronomical Lunar calculation
      try {
        const tetDate = getTetNguyenDanSolarDate(year);
        const hungVuongDate = getGioToHungVuongSolarDate(year);

        holidays.push({
          id: `tet-nguyen-dan-lunar-${year}`,
          name: 'Tết Nguyên Đán',
          date: tetDate,
          type: 'LUNAR_HOLIDAY' as HolidayType,
          source: 'LUNAR_CALCULATED' as HolidaySource,
          isOfficialSchedule: false,
          description: `Mùng 1 Tết Âm Lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)`,
          isRecurring: false,
          isActive: true,
        });

        holidays.push({
          id: `gio-to-hung-vuong-lunar-${year}`,
          name: 'Giỗ Tổ Hùng Vương',
          date: hungVuongDate,
          type: 'LUNAR_HOLIDAY' as HolidayType,
          source: 'LUNAR_CALCULATED' as HolidaySource,
          isOfficialSchedule: false,
          description: `Giỗ Tổ Hùng Vương 10/3 Âm lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)`,
          isRecurring: false,
          isActive: true,
        });
      } catch (err) {
        console.warn(`Could not compute astronomical lunar dates for year ${year}:`, err);
      }
    }

    // Step 4: Deduplicate and sort chronologically
    return this.deduplicateHolidays(holidays);
  }

  /**
   * Deduplicate holidays by date with strict priority:
   * OFFICIAL > FIXED > LUNAR_CALCULATED.
   * If same date has PUBLIC_HOLIDAY and SPECIAL_DAY, PUBLIC_HOLIDAY takes visual precedence.
   */
  private deduplicateHolidays(holidays: HolidayDto[]): HolidayDto[] {
    const priorityWeight = (h: HolidayDto) => {
      let weight = 0;
      if (h.source === 'OFFICIAL') weight += 100;
      else if (h.source === 'FIXED') weight += 50;
      else if (h.source === 'LUNAR_CALCULATED') weight += 20;

      if (h.type === 'PUBLIC_HOLIDAY') weight += 10;
      else if (h.type === 'LUNAR_HOLIDAY') weight += 5;
      else if (h.type === 'SPECIAL_DAY') weight += 1;

      return weight;
    };

    // Sort by date, then by priority weight descending
    holidays.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return priorityWeight(b) - priorityWeight(a);
    });

    const uniqueMap = new Map<string, HolidayDto>();
    for (const h of holidays) {
      if (!uniqueMap.has(h.date)) {
        uniqueMap.set(h.date, h);
      } else {
        // Same date: keep higher priority, merge description if relevant
        const existing = uniqueMap.get(h.date)!;
        if (priorityWeight(h) > priorityWeight(existing)) {
          uniqueMap.set(h.date, h);
        }
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Validate and retrieve holidays for query parameters.
   */
  getHolidays(query: QueryHolidaysDto = {}): HolidayDto[] {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (query.from && !dateRegex.test(query.from)) {
      throw new BadRequestException('Tham số "from" không hợp lệ. Định dạng chuẩn: YYYY-MM-DD');
    }
    if (query.to && !dateRegex.test(query.to)) {
      throw new BadRequestException('Tham số "to" không hợp lệ. Định dạng chuẩn: YYYY-MM-DD');
    }
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('Tham số "from" không được lớn hơn "to"');
    }
    if (query.year && (query.year < 1900 || query.year > 2100)) {
      throw new BadRequestException('Năm truy vấn phải nằm trong khoảng 1900 đến 2100');
    }

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
      const currentYear = new Date().getFullYear();
      yearsToGenerate = [currentYear - 1, currentYear, currentYear + 1];
    }

    let all: HolidayDto[] = [];
    for (const y of yearsToGenerate) {
      all.push(...this.resolveHolidaysForYear(y));
    }

    // Range filtering
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
   * Find holiday details for a specific date (YYYY-MM-DD).
   */
  getHolidayForDate(dateStr: string): HolidayDto | null {
    if (!dateStr || dateStr.length < 10) return null;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const holidays = this.resolveHolidaysForYear(year);

    for (const h of holidays) {
      const start = h.date;
      const end = h.endDate || h.date;
      if (dateStr >= start && dateStr <= end) {
        return h;
      }
    }
    return null;
  }

  /**
   * Check if a specific date is a Public Holiday (nghỉ lễ chính thức).
   */
  isPublicHoliday(dateStr: string): boolean {
    const h = this.getHolidayForDate(dateStr);
    return h?.type === 'PUBLIC_HOLIDAY';
  }

  /**
   * Check if date is any holiday or special day.
   */
  isHoliday(dateStr: string): boolean {
    return this.getHolidayForDate(dateStr) !== null;
  }
}

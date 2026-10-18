import { apiClient } from './api';
import { Holiday, DayClassification, DayType, OccasionType, WorkStatus } from '../types/calendar';

// Instant offline fallback holidays for Vietnam (calibrated with 3-axis domain model)
const FALLBACK_VIETNAM_HOLIDAYS: Holiday[] = [
  {
    id: 'tet-duong-lich',
    name: 'Tết Dương Lịch',
    date: '2026-01-01',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'WEEKDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: true,
    description: 'Nghỉ Tết Dương Lịch',
  },
  {
    id: 'tet-nguyen-dan-2026',
    name: 'Tết Nguyên Đán (Bính Ngọ)',
    date: '2026-02-17',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'WEEKDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'LUNAR_CALCULATED',
    isOfficialSchedule: false,
    description: 'Mùng 1 Tết Âm Lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)',
  },
  {
    id: 'quoc-te-phu-nu',
    name: 'Quốc Tế Phụ Nữ',
    date: '2026-03-08',
    occasion: 'SPECIAL_DAY',
    dayType: 'SUNDAY',
    workStatus: 'WORKING_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: false,
    description: 'Ngày Quốc tế Phụ nữ 8/3',
  },
  {
    id: 'gio-to-hung-vuong-2026',
    name: 'Giỗ Tổ Hùng Vương',
    date: '2026-04-26',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'SUNDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'LUNAR_CALCULATED',
    isOfficialSchedule: false,
    description: 'Giỗ Tổ Hùng Vương 10/3 Âm lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)',
  },
  {
    id: 'giai-phong-mien-nam',
    name: 'Giải Phóng Miền Nam',
    date: '2026-04-30',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'WEEKDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: true,
    description: 'Ngày Giải phóng miền Nam 30/4',
  },
  {
    id: 'quoc-te-lao-dong',
    name: 'Quốc Tế Lao Động',
    date: '2026-05-01',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'WEEKDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: true,
    description: 'Ngày Quốc tế Lao động 1/5',
  },
  {
    id: 'quoc-te-thieu-nhi',
    name: 'Quốc Tế Thiếu Nhi',
    date: '2026-06-01',
    occasion: 'SPECIAL_DAY',
    dayType: 'WEEKDAY',
    workStatus: 'WORKING_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: false,
    description: 'Ngày Quốc tế Thiếu nhi 1/6',
  },
  {
    id: 'quoc-khanh',
    name: 'Quốc Khánh',
    date: '2026-09-02',
    occasion: 'PUBLIC_HOLIDAY',
    dayType: 'WEEKDAY',
    workStatus: 'REST_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: true,
    description: 'Kỷ niệm Quốc khánh 02/09',
  },
  {
    id: 'phu-nu-viet-nam',
    name: 'Phụ Nữ Việt Nam',
    date: '2026-10-20',
    occasion: 'SPECIAL_DAY',
    dayType: 'WEEKDAY',
    workStatus: 'WORKING_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: false,
    description: 'Ngày Phụ nữ Việt Nam 20/10',
  },
  {
    id: 'nha-giao-viet-nam',
    name: 'Nhà Giáo Việt Nam',
    date: '2026-11-20',
    occasion: 'SPECIAL_DAY',
    dayType: 'WEEKDAY',
    workStatus: 'WORKING_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: false,
    description: 'Ngày Nhà giáo Việt Nam 20/11',
  },
  {
    id: 'giang-sinh',
    name: 'Lễ Giáng Sinh',
    date: '2026-12-25',
    occasion: 'SPECIAL_DAY',
    dayType: 'WEEKDAY',
    workStatus: 'WORKING_DAY',
    scope: 'GENERAL',
    source: 'FIXED',
    isOfficialSchedule: false,
    description: 'Lễ Giáng sinh (Noel)',
  },
];

export class CalendarService {
  private static cache: Map<string, Holiday[]> = new Map();

  /**
   * Fetch holidays from Backend API with memory caching and fallback.
   * Cache key: calendar-holidays:${year}_${from}_${to}
   */
  static async getHolidays(params: { from?: string; to?: string; year?: number } = {}): Promise<Holiday[]> {
    const cacheKey = `calendar-holidays:${params.year || ''}_${params.from || ''}_${params.to || ''}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const res = await apiClient.get('/calendar/holidays', { params });
      const holidays = res.data?.data || res.data || [];
      if (Array.isArray(holidays) && holidays.length > 0) {
        this.cache.set(cacheKey, holidays);
        return holidays;
      }
      return FALLBACK_VIETNAM_HOLIDAYS;
    } catch (err) {
      console.warn('Could not fetch holidays from backend, using fallback:', err);
      return FALLBACK_VIETNAM_HOLIDAYS;
    }
  }

  /**
   * Normalize any Date or string to 'YYYY-MM-DD'.
   */
  static toDateStr(input: Date | string): string {
    if (typeof input === 'string') {
      return input.substring(0, 10);
    }
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Check if date is Saturday or Sunday and return DayType.
   */
  static getDayType(input: Date | string): { dayType: DayType; isWeekend: boolean; isSaturday: boolean; isSunday: boolean } {
    let dateObj: Date;
    if (typeof input === 'string') {
      const [y, m, d] = input.substring(0, 10).split('-').map(Number);
      dateObj = new Date(y, m - 1, d);
    } else {
      dateObj = input;
    }
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const dayType: DayType = isSunday ? 'SUNDAY' : isSaturday ? 'SATURDAY' : 'WEEKDAY';
    return {
      dayType,
      isWeekend: isSaturday || isSunday,
      isSaturday,
      isSunday,
    };
  }

  /**
   * Backward compatible isWeekend check.
   */
  static isWeekend(input: Date | string): { isWeekend: boolean; isSaturday: boolean; isSunday: boolean } {
    return this.getDayType(input);
  }

  /**
   * Pre-compute an O(1) date-to-holiday lookup map from holiday list.
   * Expands range holidays (e.g. multi-day Tet) across all days in the range.
   */
  static createHolidayMap(holidays: Holiday[] = []): Map<string, Holiday> {
    const map = new Map<string, Holiday>();
    const list = holidays.length > 0 ? holidays : FALLBACK_VIETNAM_HOLIDAYS;

    for (const h of list) {
      if (!h.endDate || h.endDate === h.date) {
        map.set(h.date, h);
      } else {
        // Expand multi-day range
        const [startY, startM, startD] = h.date.split('-').map(Number);
        const [endY, endM, endD] = h.endDate.split('-').map(Number);
        const cur = new Date(startY, startM - 1, startD);
        const end = new Date(endY, endM - 1, endD);

        while (cur <= end) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${d}`;
          if (!map.has(key)) {
            map.set(key, h);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }

    return map;
  }

  /**
   * Find matching holiday for a given date (supports Map or array).
   */
  static getHoliday(input: Date | string, source: Holiday[] | Map<string, Holiday> = []): Holiday | undefined {
    const dateStr = this.toDateStr(input);
    if (source instanceof Map) {
      return source.get(dateStr);
    }

    const list = source.length > 0 ? source : FALLBACK_VIETNAM_HOLIDAYS;
    return list.find((h) => {
      const start = h.date;
      const end = h.endDate || h.date;
      return dateStr >= start && dateStr <= end;
    });
  }

  /**
   * Full comprehensive classification of any given date according to 3 axes:
   * A. OCCASION: 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'NONE'
   * B. DAY TYPE: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY'
   * C. WORK STATUS: 'WORKING_DAY' | 'REST_DAY' | 'MAKEUP_WORKING_DAY'
   */
  static classifyDay(input: Date | string, source: Holiday[] | Map<string, Holiday> = []): DayClassification {
    const dateStr = this.toDateStr(input);
    const todayStr = this.toDateStr(new Date());
    const isToday = dateStr === todayStr;

    const { dayType, isWeekend, isSaturday, isSunday } = this.getDayType(input);
    const holiday = this.getHoliday(input, source);

    // Determine 3 axes
    const occasion: OccasionType = holiday?.occasion || (holiday?.type === 'PUBLIC_HOLIDAY' ? 'PUBLIC_HOLIDAY' : holiday?.type === 'SPECIAL_DAY' ? 'SPECIAL_DAY' : 'NONE');
    let workStatus: WorkStatus;
    if (holiday?.workStatus) {
      workStatus = holiday.workStatus;
    } else if (holiday?.type === 'MAKEUP_WORKING_DAY') {
      workStatus = 'MAKEUP_WORKING_DAY';
    } else if (occasion === 'PUBLIC_HOLIDAY') {
      workStatus = 'REST_DAY';
    } else if (isWeekend) {
      workStatus = 'REST_DAY';
    } else {
      workStatus = 'WORKING_DAY';
    }

    const isPublicHoliday = occasion === 'PUBLIC_HOLIDAY';
    const isSpecialDay = occasion === 'SPECIAL_DAY';
    const isMakeupWorkingDay = workStatus === 'MAKEUP_WORKING_DAY';

    const isHoliday = isPublicHoliday;
    const isHolidayWeekend = isPublicHoliday && isWeekend;
    const isNormal = !isWeekend && occasion === 'NONE' && workStatus === 'WORKING_DAY';

    // Label formatting
    let label: string | undefined = undefined;
    if (isPublicHoliday && holiday) {
      label = `🇻🇳 ${holiday.name}`;
    } else if (isSpecialDay && holiday) {
      label = `⭐ ${holiday.name}`;
    } else if (isMakeupWorkingDay && holiday) {
      label = `💼 ${holiday.name}`;
    }

    // Lesson creation warning logic (Section 10 specifications):
    // NORMAL: không warning
    // WEEKEND: "Đây là ngày cuối tuần."
    // PUBLIC_HOLIDAY: "Đây là ngày nghỉ lễ: {name}"
    // WEEKEND + PUBLIC_HOLIDAY: "Đây là ngày cuối tuần và ngày nghỉ lễ: {name}"
    // SPECIAL_DAY: "Ngày đặc biệt: {name}"
    // MAKEUP_WORKING_DAY: "Đây là ngày làm bù theo lịch: {name}" (hoặc "Đây là ngày làm bù theo lịch.")
    let warningText: string | undefined = undefined;
    if (isMakeupWorkingDay) {
      const cleanName = holiday?.name && !holiday.name.toLowerCase().startsWith('làm việc bù') && !holiday.name.toLowerCase().startsWith('làm bù')
        ? holiday.name
        : undefined;
      warningText = cleanName ? `Đây là ngày làm bù theo lịch: ${cleanName}` : 'Đây là ngày làm bù theo lịch.';
    } else if (isHolidayWeekend && holiday) {
      warningText = `Đây là ngày cuối tuần và ngày nghỉ lễ: ${holiday.name}`;
    } else if (isPublicHoliday && holiday) {
      warningText = `Đây là ngày nghỉ lễ: ${holiday.name}`;
    } else if (isSpecialDay && holiday) {
      // Must not be called "ngày nghỉ lễ"!
      warningText = isWeekend
        ? `Đây là ngày cuối tuần. Ngày đặc biệt: ${holiday.name}`
        : `Ngày đặc biệt: ${holiday.name}`;
    } else if (isWeekend) {
      warningText = 'Đây là ngày cuối tuần.';
    }

    return {
      dateStr,
      dayType,
      occasion,
      workStatus,
      isNormal,
      isSaturday,
      isSunday,
      isWeekend,
      isPublicHoliday,
      isSpecialDay,
      isMakeupWorkingDay,
      isHoliday,
      isHolidayWeekend,
      isToday,
      holiday,
      label,
      warningText,
    };
  }
}

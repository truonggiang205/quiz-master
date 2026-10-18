import { apiClient } from './api';
import { Holiday, DayClassification } from '../types/calendar';

// Instant offline fallback holidays for Vietnam (ensures zero flicker while fetching)
const FALLBACK_VIETNAM_HOLIDAYS: Holiday[] = [
  { id: 'tet-duong-lich', name: 'Tết Dương Lịch', date: '2026-01-01', type: 'PUBLIC_HOLIDAY', description: 'Nghỉ Tết Dương Lịch' },
  { id: 'tet-nguyen-dan-2026', name: 'Tết Nguyên Đán', date: '2026-02-15', endDate: '2026-02-22', type: 'PUBLIC_HOLIDAY', description: 'Kỳ nghỉ Tết Nguyên Đán Bính Ngọ' },
  { id: 'quoc-te-phu-nu', name: 'Quốc Tế Phụ Nữ', date: '2026-03-08', type: 'OBSERVANCE', description: 'Ngày Quốc tế Phụ nữ 8/3' },
  { id: 'gio-to-hung-vuong-2026', name: 'Giỗ Tổ Hùng Vương', date: '2026-04-26', type: 'PUBLIC_HOLIDAY', description: 'Giỗ Tổ Hùng Vương 10/3 Âm lịch' },
  { id: 'giai-phong-mien-nam', name: 'Giải Phóng Miền Nam', date: '2026-04-30', type: 'PUBLIC_HOLIDAY', description: 'Ngày Giải phóng miền Nam 30/4' },
  { id: 'quoc-te-lao-dong', name: 'Quốc Tế Lao Động', date: '2026-05-01', type: 'PUBLIC_HOLIDAY', description: 'Ngày Quốc tế Lao động 1/5' },
  { id: 'quoc-te-thieu-nhi', name: 'Quốc Tế Thiếu Nhi', date: '2026-06-01', type: 'OBSERVANCE', description: 'Ngày Quốc tế Thiếu nhi 1/6' },
  { id: 'quoc-khanh', name: 'Quốc Khánh', date: '2026-09-02', endDate: '2026-09-03', type: 'PUBLIC_HOLIDAY', description: 'Kỷ niệm Quốc khánh 2/9' },
  { id: 'phu-nu-viet-nam', name: 'Phụ Nữ Việt Nam', date: '2026-10-20', type: 'OBSERVANCE', description: 'Ngày Phụ nữ Việt Nam 20/10' },
  { id: 'nha-giao-viet-nam', name: 'Nhà Giáo Việt Nam', date: '2026-11-20', type: 'OBSERVANCE', description: 'Ngày Nhà giáo Việt Nam 20/11' },
  { id: 'giang-sinh', name: 'Lễ Giáng Sinh', date: '2026-12-25', type: 'OBSERVANCE', description: 'Lễ Giáng sinh (Noel)' },
];

export class CalendarService {
  private static cache: Map<string, Holiday[]> = new Map();

  /**
   * Fetch holidays from Backend API with memory caching and fallback.
   */
  static async getHolidays(params: { from?: string; to?: string; year?: number } = {}): Promise<Holiday[]> {
    const cacheKey = `${params.from || ''}_${params.to || ''}_${params.year || ''}`;
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
   * Check if date is Saturday or Sunday.
   */
  static isWeekend(input: Date | string): { isWeekend: boolean; isSaturday: boolean; isSunday: boolean } {
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
    return {
      isWeekend: isSaturday || isSunday,
      isSaturday,
      isSunday,
    };
  }

  /**
   * Find matching holiday for a given date.
   */
  static getHoliday(input: Date | string, holidays: Holiday[] = []): Holiday | undefined {
    const dateStr = this.toDateStr(input);
    const list = holidays.length > 0 ? holidays : FALLBACK_VIETNAM_HOLIDAYS;

    return list.find((h) => {
      const start = h.date;
      const end = h.endDate || h.date;
      return dateStr >= start && dateStr <= end;
    });
  }

  /**
   * Full comprehensive classification of any given date.
   */
  static classifyDay(input: Date | string, holidays: Holiday[] = []): DayClassification {
    const dateStr = this.toDateStr(input);
    const todayStr = this.toDateStr(new Date());
    const isToday = dateStr === todayStr;

    const { isWeekend, isSaturday, isSunday } = this.isWeekend(input);
    const holiday = this.getHoliday(input, holidays);
    const isHoliday = !!holiday;
    const isHolidayWeekend = isHoliday && isWeekend;
    const isNormal = !isWeekend && !isHoliday;

    let warningText: string | undefined = undefined;
    if (isHolidayWeekend && holiday) {
      warningText = `Đây là ngày cuối tuần và ngày nghỉ lễ: ${holiday.name}.`;
    } else if (holiday) {
      warningText = `Đây là ngày nghỉ lễ: ${holiday.name}.`;
    } else if (isWeekend) {
      warningText = 'Đây là ngày cuối tuần.';
    }

    return {
      dateStr,
      isNormal,
      isSaturday,
      isSunday,
      isWeekend,
      isHoliday,
      isHolidayWeekend,
      isToday,
      holiday,
      label: holiday?.name ? `🇻🇳 ${holiday.name}` : undefined,
      warningText,
    };
  }
}

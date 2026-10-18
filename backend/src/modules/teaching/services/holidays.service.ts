import { Injectable, BadRequestException } from '@nestjs/common';
import {
  HolidayDto,
  HolidayType,
  HolidaySource,
  OccasionType,
  DayType,
  WorkStatus,
  HolidayScope,
  QueryHolidaysDto,
} from '../dto/holiday.dto.js';
import {
  getTetNguyenDanSolarDate,
  getGioToHungVuongSolarDate,
} from '../utils/vietnam-lunar.util.js';

export function getVietnamDayType(dateStr: string): DayType {
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
  // Construct date at UTC noon to avoid timezone shift in UTC+7
  const date = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
  const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0) return 'SUNDAY';
  if (day === 6) return 'SATURDAY';
  return 'WEEKDAY';
}

interface FixedHolidayDef {
  id: string;
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  durationDays?: number;
  occasion: OccasionType;
  workStatus: WorkStatus;
  scope?: HolidayScope;
  description: string;
  isOfficialSchedule: boolean;
}

interface OfficialHolidayScheduleDef {
  id: string;
  name: string;
  year: number;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  occasion: OccasionType;
  workStatus: WorkStatus;
  scope?: HolidayScope;
  description: string;
  restDates?: string[];
  makeupWorkingDates?: string[];
}

@Injectable()
export class HolidaysService {
  // 1. Fixed solar events (Public Holidays & Special Observance Days)
  // According to Article 112 Vietnam Labor Code
  private readonly fixedHolidays: FixedHolidayDef[] = [
    // PUBLIC HOLIDAYS (Nghỉ lễ cố định theo quy định pháp luật)
    {
      id: 'tet-duong-lich',
      name: 'Tết Dương Lịch',
      month: 1,
      day: 1,
      durationDays: 1,
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: true,
      description: 'Nghỉ Tết Dương Lịch đầu năm mới (Điều 112 Bộ luật Lao động)',
    },
    {
      id: 'giai-phong-mien-nam',
      name: 'Giải Phóng Miền Nam',
      month: 4,
      day: 30,
      durationDays: 1,
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: true,
      description: 'Kỷ niệm Ngày Giải phóng miền Nam, Thống nhất đất nước 30/4',
    },
    {
      id: 'quoc-te-lao-dong',
      name: 'Quốc Tế Lao Động',
      month: 5,
      day: 1,
      durationDays: 1,
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: true,
      description: 'Ngày Quốc tế Lao động 1/5',
    },
    {
      id: 'quoc-khanh',
      name: 'Quốc Khánh',
      month: 9,
      day: 2,
      durationDays: 1, // Mandatory statutory date; contiguous day determined annually by Government decree
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: true,
      description: 'Kỷ niệm Quốc khánh Nước CHXHCN Việt Nam (ngày 02/09 bắt buộc; ngày nghỉ liền kề theo phương án từng năm)',
    },

    // SPECIAL OBSERVANCE DAYS (Ngày kỷ niệm truyền thống - KHÔNG phải ngày nghỉ lễ)
    {
      id: 'quoc-te-phu-nu',
      name: 'Quốc Tế Phụ Nữ',
      month: 3,
      day: 8,
      durationDays: 1,
      occasion: 'SPECIAL_DAY',
      workStatus: 'WORKING_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: false,
      description: 'Ngày Quốc tế Phụ nữ 8/3 (ngày kỷ niệm, đi làm bình thường)',
    },
    {
      id: 'quoc-te-thieu-nhi',
      name: 'Quốc Tế Thiếu Nhi',
      month: 6,
      day: 1,
      durationDays: 1,
      occasion: 'SPECIAL_DAY',
      workStatus: 'WORKING_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: false,
      description: 'Ngày Quốc tế Thiếu nhi 1/6 (ngày kỷ niệm, đi làm bình thường)',
    },
    {
      id: 'phu-nu-viet-nam',
      name: 'Phụ Nữ Việt Nam',
      month: 10,
      day: 20,
      durationDays: 1,
      occasion: 'SPECIAL_DAY',
      workStatus: 'WORKING_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: false,
      description: 'Ngày Phụ nữ Việt Nam 20/10 (ngày kỷ niệm, đi làm bình thường)',
    },
    {
      id: 'nha-giao-viet-nam',
      name: 'Nhà Giáo Việt Nam',
      month: 11,
      day: 20,
      durationDays: 1,
      occasion: 'SPECIAL_DAY',
      workStatus: 'WORKING_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: false,
      description: 'Ngày Nhà giáo Việt Nam 20/11 - Tôn vinh thầy cô giáo',
    },
    {
      id: 'giang-sinh',
      name: 'Lễ Giáng Sinh',
      month: 12,
      day: 25,
      durationDays: 1,
      occasion: 'SPECIAL_DAY',
      workStatus: 'WORKING_DAY',
      scope: 'GENERAL',
      isOfficialSchedule: false,
      description: 'Lễ Giáng sinh Noel (ngày kỷ niệm, đi làm bình thường)',
    },
  ];

  // 2. Official Government Holiday Schedules (Đã được Chính phủ / Bộ LĐ-TB&XH ban hành văn bản chính thức)
  // Only years with authentic officially approved decrees are listed here (e.g. 2024, 2025).
  // Future unannounced years (2026+) fall back to statutory fixed rules & astronomical calculation.
  private readonly officialSchedules: OfficialHolidayScheduleDef[] = [
    // --- Năm 2024 ---
    {
      id: 'tet-nguyen-dan-2024',
      name: 'Tết Nguyên Đán (Giáp Thìn)',
      year: 2024,
      date: '2024-02-08',
      endDate: '2024-02-14',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Kỳ nghỉ Tết Nguyên Đán Giáp Thìn 2024 (29 Tết đến mùng 5 Tết)',
    },
    {
      id: 'gio-to-hung-vuong-2024',
      name: 'Giỗ Tổ Hùng Vương',
      year: 2024,
      date: '2024-04-18',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Giỗ Tổ Hùng Vương mùng 10 tháng 3 Âm lịch theo lịch chính thức 2024',
    },
    {
      id: 'nghi-hoan-doi-30-4-2024',
      name: 'Nghỉ hoán đổi (30/4 - 1/5)',
      year: 2024,
      date: '2024-04-29',
      occasion: 'NONE',
      workStatus: 'REST_DAY',
      scope: 'GOVERNMENT',
      description: 'Nghỉ hoán đổi thứ Hai 29/04/2024 theo Thông báo 1570/TB-BLĐTBXH',
    },
    {
      id: 'lam-bu-30-4-2024',
      name: 'Làm việc bù (Hoán đổi 30/4 - 1/5)',
      year: 2024,
      date: '2024-05-04',
      occasion: 'NONE',
      workStatus: 'MAKEUP_WORKING_DAY',
      scope: 'GOVERNMENT',
      description: 'Làm việc bù thứ Bảy ngày 04/05/2024 cho ngày nghỉ hoán đổi 29/04/2024 theo Thông báo 1570/TB-BLĐTBXH',
    },
    {
      id: 'quoc-khanh-lien-ke-2024',
      name: 'Nghỉ Quốc Khánh (liền kề sau)',
      year: 2024,
      date: '2024-09-03',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Nghỉ liền kề sau Quốc khánh 03/09/2024 theo phương án năm 2024',
    },

    // --- Năm 2025 ---
    {
      id: 'tet-nguyen-dan-2025',
      name: 'Tết Nguyên Đán (Ất Tỵ)',
      year: 2025,
      date: '2025-01-25',
      endDate: '2025-02-02',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Kỳ nghỉ Tết Nguyên Đán Ất Tỵ 2025 (26 Tết đến mùng 5 Tết) theo Thông báo số 8880/TB-BLĐTBXH',
    },
    {
      id: 'gio-to-hung-vuong-2025',
      name: 'Giỗ Tổ Hùng Vương',
      year: 2025,
      date: '2025-04-07',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Giỗ Tổ Hùng Vương 10/3 Âm lịch rơi vào thứ Hai ngày 07/04/2025 theo Thông báo số 8880/TB-BLĐTBXH',
    },
    {
      id: 'lam-bu-30-4-2025',
      name: 'Làm việc bù (Hoán đổi 30/4 - 1/5)',
      year: 2025,
      date: '2025-04-26',
      occasion: 'NONE',
      workStatus: 'MAKEUP_WORKING_DAY',
      scope: 'GOVERNMENT',
      description: 'Làm việc bù thứ Bảy ngày 26/04/2025 cho ngày nghỉ hoán đổi thứ Sáu 02/05/2025 theo Thông báo số 8880/TB-BLĐTBXH',
    },
    {
      id: 'nghi-hoan-doi-30-4-2025',
      name: 'Nghỉ hoán đổi (30/4 - 1/5)',
      year: 2025,
      date: '2025-05-02',
      occasion: 'NONE',
      workStatus: 'REST_DAY',
      scope: 'GOVERNMENT',
      description: 'Nghỉ hoán đổi thứ Sáu ngày 02/05/2025 để nghỉ liên tiếp 5 ngày theo Thông báo số 8880/TB-BLĐTBXH',
    },
    {
      id: 'quoc-khanh-lien-ke-2025',
      name: 'Nghỉ Quốc Khánh (liền kề trước)',
      year: 2025,
      date: '2025-09-01',
      occasion: 'PUBLIC_HOLIDAY',
      workStatus: 'REST_DAY',
      scope: 'GENERAL',
      description: 'Nghỉ liền kề trước Quốc khánh thứ Hai ngày 01/09/2025 theo Thông báo số 8880/TB-BLĐTBXH',
    },
  ];

  /**
   * Holiday Resolver for a given year:
   * 1. Generates Fixed Solar statutory holidays & special days.
   * 2. Checks Official Government Schedule (only if officially enacted for that year).
   * 3. If year lacks official schedule, runs astronomical Lunar calculations (Meeus UTC+7) for Tet & Giỗ Tổ.
   *    Note: Giỗ Tổ Hùng Vương is strictly PUBLIC_HOLIDAY (Article 112 Labor Code).
   * 4. Resolves priorities: OFFICIAL > FIXED > LUNAR_CALCULATED.
   * 5. Populates occasion, dayType, workStatus, scope, and deduplicates.
   */
  resolveHolidaysForYear(year: number): HolidayDto[] {
    const holidays: HolidayDto[] = [];

    // Step 1: Fixed solar holidays & special days
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

      const dayType = getVietnamDayType(startDateStr);
      holidays.push({
        id: `${f.id}-${year}`,
        name: f.name,
        date: startDateStr,
        endDate: endDateStr,
        occasion: f.occasion,
        dayType,
        workStatus: f.workStatus,
        scope: f.scope || 'GENERAL',
        source: 'FIXED' as HolidaySource,
        isOfficialSchedule: f.isOfficialSchedule,
        year,
        description: f.description,
        type: this.mapLegacyType(f.occasion, f.workStatus),
        isRecurring: true,
        isActive: true,
      });
    }

    // Step 2: Check if this specific year actually has official schedules enacted
    const officialForYear = this.officialSchedules.filter((h) => h.year === year);

    if (officialForYear.length > 0) {
      // Official Government Schedule takes precedence
      for (const off of officialForYear) {
        const dayType = getVietnamDayType(off.date);
        holidays.push({
          id: off.id,
          name: off.name,
          date: off.date,
          endDate: off.endDate,
          occasion: off.occasion,
          dayType,
          workStatus: off.workStatus,
          scope: off.scope || 'GENERAL',
          source: 'OFFICIAL' as HolidaySource,
          isOfficialSchedule: true,
          year,
          description: off.description,
          restDates: off.restDates,
          makeupWorkingDates: off.makeupWorkingDates,
          type: this.mapLegacyType(off.occasion, off.workStatus),
          isRecurring: false,
          isActive: true,
        });
      }
    } else {
      // Step 3: Year lacks official government decree -> Run astronomical Lunar calculations
      // (Using astronomical Meeus algorithm in UTC+7 / Asia/Ho_Chi_Minh)
      try {
        const tetDate = getTetNguyenDanSolarDate(year);
        const hungVuongDate = getGioToHungVuongSolarDate(year);

        // Tết Nguyên Đán: Statutory Public Holiday (Điều 112)
        holidays.push({
          id: `tet-nguyen-dan-lunar-${year}`,
          name: 'Tết Nguyên Đán',
          date: tetDate,
          occasion: 'PUBLIC_HOLIDAY',
          dayType: getVietnamDayType(tetDate),
          workStatus: 'REST_DAY',
          scope: 'GENERAL',
          source: 'LUNAR_CALCULATED' as HolidaySource,
          isOfficialSchedule: false,
          year,
          description: 'Mùng 1 Tết Âm Lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)',
          type: 'PUBLIC_HOLIDAY',
          isRecurring: false,
          isActive: true,
        });

        // Giỗ Tổ Hùng Vương: Statutory Public Holiday (Điều 112)
        // CRITICAL: Giỗ Tổ is strictly PUBLIC_HOLIDAY (not merely LUNAR_HOLIDAY)
        holidays.push({
          id: `gio-to-hung-vuong-lunar-${year}`,
          name: 'Giỗ Tổ Hùng Vương',
          date: hungVuongDate,
          occasion: 'PUBLIC_HOLIDAY',
          dayType: getVietnamDayType(hungVuongDate),
          workStatus: 'REST_DAY',
          scope: 'GENERAL',
          source: 'LUNAR_CALCULATED' as HolidaySource,
          isOfficialSchedule: false,
          year,
          description: 'Giỗ Tổ Hùng Vương 10/3 Âm lịch (tính theo thuật toán thiên văn UTC+7, chưa có công văn nghỉ chính thức)',
          type: 'PUBLIC_HOLIDAY',
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
   * Map modern 3-axis attributes to backward compatible legacy `type`.
   */
  private mapLegacyType(occasion: OccasionType, workStatus: WorkStatus): HolidayType {
    if (workStatus === 'MAKEUP_WORKING_DAY') return 'MAKEUP_WORKING_DAY';
    if (occasion === 'PUBLIC_HOLIDAY') return 'PUBLIC_HOLIDAY';
    if (occasion === 'SPECIAL_DAY') return 'SPECIAL_DAY';
    return 'PUBLIC_HOLIDAY';
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

      if (h.occasion === 'PUBLIC_HOLIDAY') weight += 10;
      else if (h.workStatus === 'MAKEUP_WORKING_DAY') weight += 8;
      else if (h.occasion === 'SPECIAL_DAY') weight += 2;

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
    if (query.year !== undefined && (query.year < 1900 || query.year > 2100)) {
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
    return h?.occasion === 'PUBLIC_HOLIDAY';
  }

  /**
   * Check if date is a Makeup Working Day (làm bù theo lịch).
   */
  isMakeupWorkingDay(dateStr: string): boolean {
    const h = this.getHolidayForDate(dateStr);
    return h?.workStatus === 'MAKEUP_WORKING_DAY';
  }

  /**
   * Check if date is any holiday or special day.
   */
  isHoliday(dateStr: string): boolean {
    return this.getHolidayForDate(dateStr) !== null;
  }
}

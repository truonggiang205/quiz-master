export type OccasionType = 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'NONE';
export type DayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY';
export type WorkStatus = 'WORKING_DAY' | 'REST_DAY' | 'MAKEUP_WORKING_DAY';
export type HolidaySource = 'OFFICIAL' | 'FIXED' | 'LUNAR_CALCULATED';
export type HolidayScope = 'GENERAL' | 'GOVERNMENT' | 'EMPLOYEE' | 'SCHOOL';

// Backward compatibility type alias
export type HolidayType = 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'MAKEUP_WORKING_DAY' | 'LUNAR_HOLIDAY';

/**
 * Holiday / Event Entity:
 * Defines a discrete holiday, observance, or makeup work decree.
 */
export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  occasion: OccasionType;
  dayType: DayType;
  workStatus: WorkStatus;
  scope?: HolidayScope;
  source: HolidaySource;
  isOfficialSchedule: boolean;
  year?: number;
  description?: string;
  restDates?: string[];
  makeupWorkingDates?: string[];
  type?: HolidayType;
  isRecurring?: boolean;
  isActive?: boolean;
}

/**
 * Normalized Calendar Day Entity:
 * Represents a single calendar cell / date with its day type, work status, and associated events.
 */
export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayType: DayType; // 'WEEKDAY' | 'SATURDAY' | 'SUNDAY'
  workStatus: WorkStatus; // 'WORKING_DAY' | 'REST_DAY' | 'MAKEUP_WORKING_DAY'
  occasion: OccasionType; // 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'NONE'
  events: Holiday[]; // All holiday events occurring on this date
  primaryEvent?: Holiday; // Primary event (highest visual priority)
  holiday?: Holiday; // Backward-compatibility alias to primaryEvent

  // Normalized convenience flags
  isNormal: boolean; // Monday - Friday, normal working day, no holiday, no special day
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean; // Saturday or Sunday
  isPublicHoliday: boolean; // Public holiday (nghỉ lễ)
  isSpecialDay: boolean; // Special observance (kỷ niệm) - NOT a day off!
  isMakeupWorkingDay: boolean; // Makeup working day per official decree
  isHoliday: boolean; // Any public holiday
  isHolidayWeekend: boolean; // Public holiday falling on Saturday or Sunday
  isToday: boolean;

  label?: string; // e.g. "🇻🇳 Quốc Khánh", "⭐ Ngày Nhà giáo VN", "💼 Làm bù"
  warningText?: string; // Informative warning for lesson creation (warning-only)
}

// Backward-compatibility alias
export type DayClassification = CalendarDay;

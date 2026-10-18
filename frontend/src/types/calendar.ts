export type HolidayType = 'PUBLIC_HOLIDAY' | 'LUNAR_HOLIDAY' | 'SPECIAL_DAY' | 'MAKEUP_WORKING_DAY';
export type HolidaySource = 'OFFICIAL' | 'FIXED' | 'LUNAR_CALCULATED';

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: HolidayType;
  source: HolidaySource;
  isOfficialSchedule: boolean;
  description?: string;
  isRecurring?: boolean;
  isActive?: boolean;
}

export interface DayClassification {
  dateStr: string; // YYYY-MM-DD
  isNormal: boolean; // Monday - Friday, neither holiday nor special day
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean; // Saturday or Sunday
  isPublicHoliday: boolean; // Official public holiday (nghỉ lễ)
  isLunarHoliday: boolean; // Calculated lunar holiday
  isSpecialDay: boolean; // Special observance (kỷ niệm) - NOT a day off!
  isHoliday: boolean; // Any public holiday or lunar holiday
  isHolidayWeekend: boolean; // Public or lunar holiday falling on Saturday or Sunday
  isToday: boolean;
  holiday?: Holiday;
  label?: string; // e.g. "🇻🇳 Quốc Khánh" or "⭐ Ngày Nhà giáo VN"
  warningText?: string; // Used for lesson creation warning
}

export type HolidayType = 'PUBLIC_HOLIDAY' | 'OBSERVANCE' | 'TRADITIONAL';

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: HolidayType;
  description?: string;
  isRecurring?: boolean;
  isActive?: boolean;
}

export interface DayClassification {
  dateStr: string; // YYYY-MM-DD
  isNormal: boolean; // Monday - Friday, not a holiday
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean; // Saturday or Sunday
  isHoliday: boolean;
  isHolidayWeekend: boolean; // Holiday falling on Saturday or Sunday
  isToday: boolean;
  holiday?: Holiday;
  label?: string; // e.g. "🇻🇳 Quốc Khánh"
  warningText?: string; // Used for lesson creation warning
}

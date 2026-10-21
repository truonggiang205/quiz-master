import { Lesson } from '../../../types/teaching';
import { TuitionRow } from '../../../types/teaching';

export type ReceiptTemplateType = 'template-1' | 'template-2';

export interface ReceiptToggles {
  showStudent: boolean;
  showClass: boolean;
  showPrepaid: boolean;
  showTuitionRate: boolean;
  showLessonCount: boolean;
  showTotalHours: boolean;
  showLessonDates: boolean;
  showDiscount: boolean;
  showSurcharge: boolean;
  showQr: boolean;
  showSchedule: boolean;
  showTuitionDetails: boolean;
}

export interface QuickPresetItem {
  id: string;
  category: 'general' | 'roadmap';
  text: string;
  isCustom?: boolean;
}

export interface ReceiptData {
  // Student & Class
  studentId: string;
  studentName: string;
  studentPhone?: string;
  className: string;
  prepaidText: string;
  tuitionRateFormatted: string;

  // Period
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  periodTitle: string;

  // Lesson & Stats
  lessonCount: number;
  totalHours: number;
  lessonDatesFormatted: string; // e.g. "04/10 - 08/10 - 14/10"
  lessons: Lesson[];

  // Evaluations
  generalComment: string;
  roadmap: string;
  closingMessage: string;

  // Financials
  baseAmount: number;
  surcharge: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Bank & QR
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
  qrUrl: string;

  // Teacher / Brand
  teacherName: string;
  teacherPhone: string;

  // Layout & toggles
  template: ReceiptTemplateType;
  toggles: ReceiptToggles;
}

export interface ReceiptDraft {
  studentId: string;
  month: string;
  template: ReceiptTemplateType;
  toggles: ReceiptToggles;
  periodTitle: string;
  startDate: string;
  endDate: string;
  generalComment: string;
  roadmap: string;
  closingMessage: string;
  prepaidText?: string;
  tuitionRateFormatted?: string;
  updatedAt: string;
}

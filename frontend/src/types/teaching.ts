export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'EXCUSED';
export type LessonStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type AssessmentType = 'QUIZ' | 'HOMEWORK' | 'MIDTERM' | 'FINAL' | 'ORAL' | 'PRACTICE' | 'OTHER';
export type TuitionStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOMO' | 'OTHER';

export interface LessonParticipant {
  id: string;
  lessonId: string;
  studentId: string;
  attendanceStatus: AttendanceStatus;
  feeAmount: number;
  student?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Lesson {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // hours
  status: LessonStatus;
  feePerLesson: number;
  content?: string;
  homework?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: string;
    name: string;
    subject?: string;
  };
  participants?: LessonParticipant[];
  learningLogs?: LearningLog[];
  scores?: ScoreRecord[];
}

export interface CreateLessonPayload {
  classId: string;
  title?: string;
  date: string;
  startTime: string;
  endTime: string;
  studentIds?: string[];
  feePerLesson?: number;
  content?: string;
  homework?: string;
  notes?: string;
  recurring?: {
    daysOfWeek: number[];
    endDate: string;
  };
}

export interface UpdateLessonPayload {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: LessonStatus;
  feePerLesson?: number;
  content?: string;
  homework?: string;
  notes?: string;
  participants?: {
    studentId: string;
    attendanceStatus: AttendanceStatus;
    feeAmount?: number;
  }[];
}

export interface LearningLog {
  id: string;
  teacherId: string;
  classId: string;
  lessonId: string;
  studentId: string;
  content?: string;
  homework?: string;
  attitude?: string;
  comment?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  class?: {
    id: string;
    name: string;
    subject?: string;
  };
  lesson?: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    feePerLesson?: number;
    content?: string;
    homework?: string;
  };
}

export interface SaveLearningLogPayload {
  lessonId: string;
  studentId: string;
  content?: string;
  homework?: string;
  attitude?: string;
  comment?: string;
  note?: string;
}

export interface TuitionRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  month: string;
  lessonCount: number;
  totalHours: number;
  baseAmount: number;
  surcharge: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: TuitionStatus;
  adjustmentsCount: number;
  paymentsCount: number;
}

export interface TuitionAdjustment {
  id: string;
  tuitionItemId: string;
  type: 'SURCHARGE' | 'DISCOUNT';
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface TuitionPayment {
  id: string;
  tuitionItemId: string;
  teacherId: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface TuitionDetail {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  month: string;
  baseAmount: number;
  surcharge: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: TuitionStatus;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  class?: {
    id: string;
    name: string;
  };
  adjustments?: TuitionAdjustment[];
  payments?: TuitionPayment[];
}

export interface ScoreRecord {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  lessonId?: string | null;
  assessmentType: AssessmentType;
  assessmentName: string;
  score: number;
  maxScore: number;
  date: string;
  comment?: string;
  createdAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  class?: {
    id: string;
    name: string;
  };
  lesson?: {
    id: string;
    title: string;
    date: string;
  } | null;
}

export interface ScoreMatrixStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  scores: Record<string, { id: string; score: number; maxScore: number; date: string }>;
  averageScore: number;
  totalAssessments: number;
}

export interface ScoreMatrixResponse {
  classId: string;
  className: string;
  assessments: { key: string; name: string; type: AssessmentType }[];
  students: ScoreMatrixStudent[];
  classAverage: number;
}

export interface ImportResult {
  successCount: number;
  errors: string[];
}

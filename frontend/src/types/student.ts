export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';
export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface StudentAccountInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
  isActive?: boolean;
}

export interface TeacherStudent {
  id: string;
  teacherId?: string;
  studentAccountId?: string | null;
  fullName: string;
  name?: string; // Tương thích ngược với User
  role?: string;
  phone?: string | null;
  email?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  dob?: string | null;
  gender?: StudentGender | null;
  school?: string | null;
  note?: string | null;
  status: StudentStatus;
  avatar?: string | null;
  isExternal: boolean;
  createdAt?: string;
  updatedAt?: string;
  studentAccount?: StudentAccountInfo | null;
}

export interface CreateExternalStudentPayload {
  fullName: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  dob?: string;
  gender?: StudentGender;
  school?: string;
  note?: string;
}

export interface UpdateTeacherStudentPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  dob?: string;
  gender?: StudentGender;
  school?: string;
  note?: string;
  status?: StudentStatus;
}

export interface LinkAccountPayload {
  emailOrAccountId: string;
}

export interface StudentDetailSummary {
  totalLessons: number;
  attendedLessons: number;
  totalTuition: number;
  paidTuition: number;
  remainingTuition: number;
  avgScore: number;
  logsCount: number;
}

export interface StudentDetailResponse {
  student: TeacherStudent;
  account: StudentAccountInfo | null;
  isExternal: boolean;
  summary: StudentDetailSummary;
  schedules: any[];
  attendance: any[];
  learningLogs: any[];
  scores: any[];
  tuitions: any[];
  payments: any[];
}

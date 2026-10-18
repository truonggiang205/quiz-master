import { User } from './user';

export interface ClassroomStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  quizCount: number;
  completionRate: number;
  avgScore: number;
  scoreDistribution?: { label: string; count: number }[];
  recentQuizScores?: { id: string; title: string; avgScore: number; totalAttempts: number }[];
}

export interface ClassStudent {
  stt: number;
  id: string;
  name: string;
  email: string;
  username: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  phone?: string;
  school?: string;
  avatar?: string;
  avgScore?: number | null;
  submissionsCount?: number;
}

export interface ImportStudentError {
  row: number;
  email?: string;
  name?: string;
  message: string;
}

export interface ImportStudentResult {
  successCount: number;
  skippedCount: number;
  errorCount: number;
  totalRows: number;
  errors: ImportStudentError[];
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  subject: string;
  inviteCode: string;
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  students?: User[];
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;
  stats?: ClassroomStats;
}

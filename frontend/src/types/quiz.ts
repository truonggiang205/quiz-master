export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  status: QuizStatus;
  startTime: string;
  endTime: string;
  mode?: 'QUIZ' | 'PRACTICE';
  totalAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
  showExplanation: boolean;
  answerReleaseAt: string; // ISO String
  teacherId: string;
  teacherName: string;
  questionCount: number;
  totalScore: number;
  classId?: string | null;
  assignedStudentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  subject: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  mode?: 'QUIZ' | 'PRACTICE';
  totalAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  showScoreImmediately?: boolean;
  showCorrectAnswers?: boolean;
  showExplanation?: boolean;
  answerReleaseAt?: string;
}

export interface MockStudentAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect?: boolean;
  scoreAwarded?: number;
}

export interface MockSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  startedAt: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeUsedSeconds: number;
  answers: MockStudentAnswer[];
}

export const MOCK_SUBMISSIONS: MockSubmission[] = [];

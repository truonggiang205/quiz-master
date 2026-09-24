export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface MockQuiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  status: QuizStatus;
  startTime: string;
  endTime: string;
  totalAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
  showExplanation: boolean;
  answerReleaseAt: string;
  teacherId: string;
  teacherName: string;
  questionCount: number;
  totalScore: number;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_QUIZZES: MockQuiz[] = [];

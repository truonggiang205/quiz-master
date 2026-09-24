export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface MockQuestion {
  id: string;
  quizId: string;
  content: string;
  type: QuestionType;
  options: AnswerOption[];
  score: number;
  explanation: string;
  order: number;
}

export const MOCK_QUESTIONS: MockQuestion[] = [];

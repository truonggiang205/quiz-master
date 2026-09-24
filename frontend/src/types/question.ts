export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  quizId: string;
  content: string;
  imageUrl?: string;
  type: QuestionType;
  subject?: string;
  options: AnswerOption[];
  score: number;
  explanation?: string;
  order: number;
}

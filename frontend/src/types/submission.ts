import { QuestionType } from './question';

export interface StudentAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  essayImageUrl?: string;
  isCorrect?: boolean;
  scoreAwarded?: number;
}

export interface DetailedAnswerReview extends StudentAnswer {
  questionContent: string;
  questionImageUrl?: string;
  questionType: QuestionType;
  score: number;
  options: {
    id: string;
    text: string;
    isCorrect?: boolean;
  }[];
  explanation?: string;
}

export interface Submission {
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
  answers: StudentAnswer[];
  isAnswerReleased?: boolean;
  answerReleaseAt?: string;
  detailedAnswers?: DetailedAnswerReview[];
}

export interface QuizResultsResponse {
  quizId: string;
  totalSubmissions: number;
  statistics: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
  };
  submissions: Submission[];
}

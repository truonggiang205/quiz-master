export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

/** A single grading criterion for an ESSAY question */
export interface EssayCriterion {
  id: string;
  description: string;
  keywords: string[];
  synonyms?: Record<string, string[]>;
  maxPoints: number;
  requireAll?: boolean;
}

/** Rubric attached to an ESSAY question */
export interface EssayRubric {
  /** List of "perfect" accepted answers used for exact/fuzzy match */
  acceptedAnswers: string[];
  /** List of grading criteria with keywords and point values */
  criteria: EssayCriterion[];
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
  points: number;
  isLocked: boolean;
  explanation?: string;
  order: number;
  /** Only for ESSAY type: rubric with accepted answers & criteria */
  essayRubric?: EssayRubric;
}

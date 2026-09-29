import { apiClient } from './api';
import type { EssayRubric } from '../types/question';

// ── Types mirroring backend ─────────────────────────────────────────────────

export interface GradingCriterionResult {
  criterionId: string;
  description: string;
  score: number;
  maxPoints: number;
  reason: string;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface GradingTierLog {
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  confidence: number;
  scoreRatio: number;
  notes: string;
}

export interface GradingResult {
  id: string;
  submissionId: string;
  questionId: string;
  originalAnswer: string;
  normalizedAnswer: string;
  score: number;
  maxScore: number;
  winningTier: 1 | 2 | 3 | 4 | null;
  criteriaDetails: GradingCriterionResult[];
  decisionLog: GradingTierLog[];
  confidence: number;
  needsReview: boolean;
  isReviewed: boolean;
  teacherScore: number | null;
  teacherComment: string | null;
  gradedAt: string;
  createdAt: string;
}

export interface GradeEssayPayload {
  questionId: string;
  submissionId: string;
  studentAnswer: string;
  rubric: {
    questionId: string;
    acceptedAnswers?: string[];
    criteria: Array<{
      id: string;
      description: string;
      keywords: string[];
      synonyms?: Record<string, string[]>;
      maxPoints: number;
      requireAll?: boolean;
    }>;
    totalScore: number;
  };
}

// ── Grading Service ────────────────────────────────────────────────────────

export const gradingService = {
  /** Save/update rubric for a question */
  upsertRubric: async (
    questionId: string,
    rubric: EssayRubric,
    totalScore: number,
  ) => {
    const res = await apiClient.post('/grading/rubrics', {
      questionId,
      acceptedAnswers: rubric.acceptedAnswers,
      criteria: rubric.criteria,
      totalScore,
    });
    return res.data;
  },

  /** Get rubric for a question */
  getRubric: async (questionId: string) => {
    const res = await apiClient.get(`/grading/rubrics/${questionId}`);
    return res.data;
  },

  /** Auto-grade a single essay answer */
  gradeEssay: async (payload: GradeEssayPayload): Promise<GradingResult> => {
    const res = await apiClient.post('/grading/grade', payload);
    return res.data;
  },

  /** Bulk auto-grade multiple essays */
  bulkGrade: async (items: GradeEssayPayload[]): Promise<GradingResult[]> => {
    const res = await apiClient.post('/grading/grade/bulk', { items });
    return res.data;
  },

  /** Get all grading results for a submission */
  getResultsBySubmission: async (submissionId: string): Promise<GradingResult[]> => {
    const res = await apiClient.get(`/grading/results/submission/${submissionId}`);
    return res.data;
  },

  /** Get all results flagged for teacher review */
  getPendingReviews: async (): Promise<GradingResult[]> => {
    const res = await apiClient.get('/grading/reviews/pending');
    return res.data;
  },

  /** Teacher override score */
  teacherReview: async (
    resultId: string,
    teacherScore: number,
    teacherComment?: string,
  ): Promise<GradingResult> => {
    const res = await apiClient.patch(`/grading/results/${resultId}/review`, {
      teacherScore,
      teacherComment,
    });
    return res.data;
  },
};

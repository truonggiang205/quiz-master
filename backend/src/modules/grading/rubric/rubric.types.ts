// ============================================================
// rubric.types.ts — Core interfaces & types for grading module
// ============================================================

/** A single grading criterion inside a rubric */
export interface Criterion {
  /** Unique id within the rubric */
  id: string;
  /** Human-readable description of what this criterion checks */
  description: string;
  /** Primary keywords that must appear (after lemmatization) */
  keywords: string[];
  /** Accepted synonyms per keyword: { keyword: [syn1, syn2] } */
  synonyms?: Record<string, string[]>;
  /** Maximum points for this criterion */
  maxPoints: number;
  /** If true, the student must mention ALL keywords to get full credit */
  requireAll?: boolean;
}

/** Full rubric for one ESSAY question */
export interface EssayRubric {
  questionId: string;
  /** Accepted "perfect" answers for exact/fuzzy match (optional) */
  acceptedAnswers?: string[];
  criteria: Criterion[];
  /** Total max score (should equal sum of criteria maxPoints) */
  totalScore: number;
}

/** Per-criterion result */
export interface CriterionResult {
  criterionId: string;
  description: string;
  score: number;
  maxPoints: number;
  /** Short reason for the score awarded */
  reason: string;
  /** Keywords found in student answer */
  matchedKeywords: string[];
  /** Keywords not found */
  missingKeywords: string[];
}

/** Decision log entry for one tier */
export interface TierLog {
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  confidence: number;
  scoreRatio: number;
  notes: string;
}

/** Final grading result returned by the pipeline */
export interface GradingResult {
  questionId: string;
  submissionId: string;
  /** Exact text as submitted */
  originalAnswer: string;
  /** Normalised text used for comparison */
  normalizedAnswer: string;
  score: number;
  maxScore: number;
  /** Which tier ultimately determined the score */
  winningTier: 1 | 2 | 3 | 4 | null;
  /** Detailed breakdown by criterion */
  criteriaDetails: CriterionResult[];
  /** Full audit trail of every tier attempted */
  decisionLog: TierLog[];
  /** True when confidence < threshold and a teacher should review */
  needsReview: boolean;
  /** Confidence value [0, 1] from the winning tier */
  confidence: number;
  gradedAt: string;
}

/** Input to the grading pipeline */
export interface GradeEssayInput {
  questionId: string;
  submissionId: string;
  studentAnswer: string;
  rubric: EssayRubric;
}

// ============================================================
// rubric-grader.ts — Orchestrates per-criterion grading
// ============================================================

import { EssayRubric, CriterionResult, GradingResult, GradeEssayInput, TierLog } from '../rubric/rubric.types.js';
import { normalizeText } from '../normalizer/text-normalizer.js';
import { exactMatch } from '../matchers/exact-matcher.js';
import { keywordMatch } from '../matchers/keyword-matcher.js';
import { fuzzyMatch } from '../matchers/fuzzy-matcher.js';
import { tfidfMatch } from '../matchers/tfidf-matcher.js';
import { GradingConfig } from '../grading.config.js';

/**
 * Grade a single ESSAY answer against its rubric using the 4-tier pipeline.
 *
 * Tier escalation logic:
 *   Tier 1 (Exact)    → if matches → score = 100%, done.
 *   Tier 2 (Keyword)  → run always, collect per-criterion scores.
 *   Tier 3 (Fuzzy)    → run if Tier 2 confidence < acceptanceThreshold.
 *   Tier 4 (TF-IDF)   → run if Tier 3 confidence < acceptanceThreshold.
 *
 * The final score is the best score found across all tiers.
 */
export function gradeWithRubric(
  input: GradeEssayInput,
  config: GradingConfig,
): GradingResult {
  const { questionId, submissionId, studentAnswer, rubric } = input;
  const decisionLog: TierLog[] = [];

  // ── Normalise ────────────────────────────────────────────────────────────
  const normResult = normalizeText(studentAnswer, config.normalizer);
  const normStudent = normResult.normalized;
  const normAccepted = (rubric.acceptedAnswers ?? []).map(
    (a) => normalizeText(a, config.normalizer).normalized,
  );

  // ── Tier 1: Exact match ──────────────────────────────────────────────────
  let winningTier: 1 | 2 | 3 | 4 | null = null;
  let finalScore = 0;
  let finalConfidence = 0;
  let criteriaDetails: CriterionResult[] = rubric.criteria.map((c) => ({
    criterionId: c.id,
    description: c.description,
    score: 0,
    maxPoints: c.maxPoints,
    reason: 'Not yet evaluated.',
    matchedKeywords: [],
    missingKeywords: [...c.keywords],
  }));

  if (config.tiers.exactMatch.enabled && normAccepted.length > 0) {
    const t1 = exactMatch(normStudent, normAccepted);
    decisionLog.push(t1.log);

    if (t1.matched) {
      winningTier = 1;
      finalScore = rubric.totalScore;
      finalConfidence = 1.0;
      // Give full points to all criteria
      criteriaDetails = rubric.criteria.map((c) => ({
        criterionId: c.id,
        description: c.description,
        score: c.maxPoints,
        maxPoints: c.maxPoints,
        reason: 'Full credit via exact match.',
        matchedKeywords: [...c.keywords],
        missingKeywords: [],
      }));
    }
  }

  // ── Tier 2: Keyword match ────────────────────────────────────────────────
  if (winningTier === null && config.tiers.keywordMatch.enabled) {
    const t2 = keywordMatch(
      normStudent,
      rubric.criteria,
      config.tiers.keywordMatch.minKeywordRatio,
    );
    decisionLog.push(t2.log);
    criteriaDetails = t2.criteriaResults;

    if (t2.scoreRatio >= config.pipeline.acceptanceThreshold) {
      winningTier = 2;
      finalScore = t2.totalScore;
      finalConfidence = t2.confidence;
    } else {
      // Keep keyword result as baseline; attempt higher tiers
      finalScore = t2.totalScore;
      finalConfidence = t2.confidence;
    }
  }

  // ── Tier 3: Fuzzy match ──────────────────────────────────────────────────
  if (
    winningTier === null &&
    config.tiers.fuzzyMatch.enabled &&
    normAccepted.length > 0
  ) {
    const t3 = fuzzyMatch(
      normStudent,
      normAccepted,
      config.tiers.fuzzyMatch.maxDistanceRatio,
    );
    decisionLog.push(t3.log);

    if (t3.scoreRatio > 0) {
      const fuzzyScore = t3.scoreRatio * rubric.totalScore;
      if (fuzzyScore > finalScore) {
        finalScore = fuzzyScore;
        finalConfidence = t3.confidence;
        winningTier = 3;
        // Distribute fuzzy score proportionally across criteria
        criteriaDetails = distributeFuzzyScore(rubric, t3.scoreRatio);
      }
    }
  }

  // ── Tier 4: TF-IDF ──────────────────────────────────────────────────────
  if (
    winningTier === null &&
    config.tiers.tfidfMatch.enabled &&
    normAccepted.length > 0
  ) {
    const t4 = tfidfMatch(
      normStudent,
      normAccepted,
      config.tiers.tfidfMatch.minSimilarity,
    );
    decisionLog.push(t4.log);

    if (t4.scoreRatio > 0) {
      const tfidfScore = t4.scoreRatio * rubric.totalScore;
      if (tfidfScore > finalScore) {
        finalScore = tfidfScore;
        finalConfidence = t4.confidence;
        winningTier = 4;
        criteriaDetails = distributeFuzzyScore(rubric, t4.scoreRatio);
      }
    }
  }

  // Mark winning tier if keyword won via baseline
  if (winningTier === null && finalScore > 0) {
    winningTier = 2;
  }

  // Clamp score to max
  finalScore = Math.min(rubric.totalScore, Math.max(0, Math.round(finalScore * 100) / 100));

  const needsReview = finalConfidence < config.pipeline.reviewThreshold;

  return {
    questionId,
    submissionId,
    originalAnswer: studentAnswer,
    normalizedAnswer: normStudent,
    score: finalScore,
    maxScore: rubric.totalScore,
    winningTier,
    criteriaDetails,
    decisionLog,
    needsReview,
    confidence: finalConfidence,
    gradedAt: new Date().toISOString(),
  };
}

/**
 * When a non-keyword tier wins, distribute the score proportionally
 * to each criterion by their maxPoints weight.
 */
function distributeFuzzyScore(
  rubric: EssayRubric,
  ratio: number,
): CriterionResult[] {
  return rubric.criteria.map((c) => ({
    criterionId: c.id,
    description: c.description,
    score: Math.round(c.maxPoints * ratio * 100) / 100,
    maxPoints: c.maxPoints,
    reason: `Score distributed proportionally from similarity-based tier (ratio: ${(ratio * 100).toFixed(0)}%).`,
    matchedKeywords: [],
    missingKeywords: c.keywords,
  }));
}

// ============================================================
// fuzzy-matcher.ts — Tier 3: Fuzzy edit-distance matching
// ============================================================

import { distance } from 'fastest-levenshtein';
import { TierLog } from '../rubric/rubric.types.js';

export interface FuzzyMatchResult {
  bestMatchAnswer: string | null;
  similarity: number;
  scoreRatio: number;
  confidence: number;
  log: TierLog;
}

/**
 * Tier 3 — Fuzzy string matching using Levenshtein edit distance.
 *
 * For each accepted answer, compute normalised edit distance:
 *   dist_ratio = editDistance(student, accepted) / max(len(student), len(accepted))
 *   similarity = 1 - dist_ratio
 *
 * Returns the best (highest similarity) accepted answer.
 * If similarity ≥ (1 - maxDistanceRatio) → award credit proportional to similarity.
 */
export function fuzzyMatch(
  normalizedStudent: string,
  normalizedAccepted: string[],
  maxDistanceRatio: number,
): FuzzyMatchResult {
  if (normalizedAccepted.length === 0 || normalizedStudent.length === 0) {
    return noMatch('No accepted answers or empty student answer.');
  }

  let bestSimilarity = 0;
  let bestAnswer: string | null = null;

  for (const accepted of normalizedAccepted) {
    const maxLen = Math.max(normalizedStudent.length, accepted.length);
    if (maxLen === 0) continue;

    const editDist = distance(normalizedStudent, accepted);
    const sim = 1 - editDist / maxLen;

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestAnswer = accepted;
    }
  }

  const threshold = 1 - maxDistanceRatio;
  const meetsThreshold = bestSimilarity >= threshold;
  // Partial credit: linear scale from threshold to 1.0
  const scoreRatio = meetsThreshold
    ? Math.min(1.0, (bestSimilarity - threshold) / (1 - threshold) * 0.5 + 0.5)
    : 0;

  const log: TierLog = {
    tier: 3,
    tierName: 'Fuzzy Match',
    confidence: meetsThreshold ? bestSimilarity : 0,
    scoreRatio,
    notes: bestAnswer
      ? `Best match similarity: ${(bestSimilarity * 100).toFixed(1)}% vs "${bestAnswer}". Threshold: ${(threshold * 100).toFixed(0)}%.`
      : 'No candidate found.',
  };

  return {
    bestMatchAnswer: bestAnswer,
    similarity: bestSimilarity,
    scoreRatio,
    confidence: meetsThreshold ? bestSimilarity : 0,
    log,
  };
}

function noMatch(reason: string): FuzzyMatchResult {
  return {
    bestMatchAnswer: null,
    similarity: 0,
    scoreRatio: 0,
    confidence: 0,
    log: { tier: 3, tierName: 'Fuzzy Match', confidence: 0, scoreRatio: 0, notes: reason },
  };
}

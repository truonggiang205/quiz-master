// ============================================================
// exact-matcher.ts — Tier 1: Exact match after normalisation
// ============================================================

import { TierLog } from '../rubric/rubric.types.js';

export interface ExactMatchResult {
  matched: boolean;
  confidence: number;
  scoreRatio: number;
  log: TierLog;
}

/**
 * Tier 1 — Exact string match.
 * Compares the normalised student answer against every normalised accepted answer.
 * If any accepted answer matches exactly → full credit (scoreRatio = 1.0).
 */
export function exactMatch(
  normalizedStudent: string,
  normalizedAccepted: string[],
): ExactMatchResult {
  const matched = normalizedAccepted.some((ans) => ans === normalizedStudent);

  const log: TierLog = {
    tier: 1,
    tierName: 'Exact Match',
    confidence: matched ? 1.0 : 0.0,
    scoreRatio: matched ? 1.0 : 0.0,
    notes: matched
      ? 'Student answer exactly matches an accepted answer after normalisation.'
      : `No exact match found. Checked ${normalizedAccepted.length} accepted answer(s).`,
  };

  return {
    matched,
    confidence: matched ? 1.0 : 0.0,
    scoreRatio: matched ? 1.0 : 0.0,
    log,
  };
}

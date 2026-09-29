// ============================================================
// keyword-matcher.ts — Tier 2: Keyword + synonym matching with stemming
// ============================================================

import natural from 'natural';
import { Criterion, CriterionResult, TierLog } from '../rubric/rubric.types.js';
import { hasNegationNear } from '../normalizer/text-normalizer.js';

const stemmer = natural.PorterStemmer;

/**
 * Stem a word (or phrase) for comparison.
 * Multi-word phrases: stem each word and rejoin.
 */
function stemPhrase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => stemmer.stem(w))
    .join(' ');
}

/** Return all tokens from a text (split on whitespace) */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export interface KeywordMatchResult {
  criteriaResults: CriterionResult[];
  totalScore: number;
  maxScore: number;
  scoreRatio: number;
  confidence: number;
  log: TierLog;
}

/**
 * Tier 2 — Keyword matching per rubric criterion.
 *
 * Algorithm per criterion:
 * 1. Stem all keywords and all tokens in the student answer.
 * 2. For each keyword, check if its stem (or any synonym's stem) appears in the student tokens.
 * 3. If negation is detected near the keyword, it does NOT count.
 * 4. Score = (matched / total) * criterion.maxPoints (partial credit).
 * 5. If criterion.requireAll = true, student must match ALL keywords for any credit.
 */
export function keywordMatch(
  normalizedStudent: string,
  criteria: Criterion[],
  minKeywordRatio: number,
): KeywordMatchResult {
  const studentTokens = tokenize(normalizedStudent).map((t) => stemPhrase(t));
  const criteriaResults: CriterionResult[] = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const criterion of criteria) {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const kw of criterion.keywords) {
      const kwStem = stemPhrase(kw);

      // Gather all forms (keyword + synonyms)
      const allForms: string[] = [kwStem];
      if (criterion.synonyms?.[kw]) {
        for (const syn of criterion.synonyms[kw]) {
          allForms.push(stemPhrase(syn));
        }
      }

      // For single-word forms: check against stemmed tokens
      // For multi-word forms: check as substring in stemmed student text
      const stemmedStudentText = studentTokens.join(' ');
      const found = allForms.some((form) => {
        if (form.includes(' ')) {
          // Multi-word: substring check in the stemmed text
          return stemmedStudentText.includes(form);
        }
        return studentTokens.includes(form);
      });

      // Check negation: use the original unstemmed keyword in normalised text
      const negated = found && hasNegationNear(normalizedStudent, kw);

      if (found && !negated) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    }

    const total = criterion.keywords.length;
    const ratio = total > 0 ? matched.length / total : 0;
    let score = 0;

    if (criterion.requireAll) {
      // Must match everything
      score = ratio === 1 ? criterion.maxPoints : 0;
    } else if (ratio >= minKeywordRatio) {
      // Partial credit
      score = Math.round(ratio * criterion.maxPoints * 100) / 100;
    }

    totalScore += score;
    totalMax += criterion.maxPoints;

    criteriaResults.push({
      criterionId: criterion.id,
      description: criterion.description,
      score,
      maxPoints: criterion.maxPoints,
      reason: buildReason(matched, missing, criterion.requireAll ?? false),
      matchedKeywords: matched,
      missingKeywords: missing,
    });
  }

  const scoreRatio = totalMax > 0 ? totalScore / totalMax : 0;
  // Confidence = how many criteria got ≥ minKeywordRatio coverage
  const coveredCount = criteriaResults.filter(
    (r) => r.score > 0,
  ).length;
  const confidence = criteria.length > 0 ? coveredCount / criteria.length : 0;

  const log: TierLog = {
    tier: 2,
    tierName: 'Keyword Match',
    confidence,
    scoreRatio,
    notes: `${coveredCount}/${criteria.length} criteria covered. Score: ${totalScore.toFixed(2)}/${totalMax}.`,
  };

  return {
    criteriaResults,
    totalScore,
    maxScore: totalMax,
    scoreRatio,
    confidence,
    log,
  };
}

function buildReason(
  matched: string[],
  missing: string[],
  requireAll: boolean,
): string {
  const parts: string[] = [];
  if (matched.length > 0) parts.push(`Found: [${matched.join(', ')}]`);
  if (missing.length > 0) parts.push(`Missing: [${missing.join(', ')}]`);
  if (requireAll && missing.length > 0) parts.push('(all required — no credit)');
  return parts.join('. ') || 'No keywords defined.';
}

// ============================================================
// tfidf-matcher.ts — Tier 4: TF-IDF cosine similarity
// ============================================================

import natural from 'natural';
import { TierLog } from '../rubric/rubric.types.js';

const { TfIdf } = natural;

export interface TfidfMatchResult {
  bestSimilarity: number;
  scoreRatio: number;
  confidence: number;
  log: TierLog;
}

/**
 * Compute cosine similarity between two TF-IDF vectors.
 */
function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, weightA] of vecA) {
    dot += weightA * (vecB.get(term) ?? 0);
    normA += weightA * weightA;
  }
  for (const [, weightB] of vecB) {
    normB += weightB * weightB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Build a TF-IDF term-weight map for a single document within a corpus.
 * We use the TfIdf class with the accepted answers + student answer as the corpus.
 */
function buildTfIdfVector(
  docIndex: number,
  tfidf: InstanceType<typeof TfIdf>,
): Map<string, number> {
  const vec = new Map<string, number>();
  tfidf.listTerms(docIndex).forEach(({ term, tfidf: weight }: { term: string; tfidf: number }) => {
    vec.set(term, weight);
  });
  return vec;
}

/**
 * Tier 4 — TF-IDF cosine similarity.
 *
 * Builds a mini corpus: [student_answer, accepted_answer_1, ..., accepted_answer_N]
 * then computes cosine similarity of the student vector against each accepted vector.
 *
 * A higher minSimilarity threshold means the answer must be more topically aligned.
 */
export function tfidfMatch(
  normalizedStudent: string,
  normalizedAccepted: string[],
  minSimilarity: number,
): TfidfMatchResult {
  if (normalizedAccepted.length === 0 || normalizedStudent.trim().length === 0) {
    return noMatch('No accepted answers or empty student answer.');
  }

  const tfidf = new TfIdf();
  tfidf.addDocument(normalizedStudent);
  for (const acc of normalizedAccepted) {
    tfidf.addDocument(acc);
  }

  const studentVec = buildTfIdfVector(0, tfidf);
  let bestSim = 0;

  for (let i = 0; i < normalizedAccepted.length; i++) {
    const accVec = buildTfIdfVector(i + 1, tfidf);
    const sim = cosineSimilarity(studentVec, accVec);
    if (sim > bestSim) bestSim = sim;
  }

  const meetsThreshold = bestSim >= minSimilarity;
  const scoreRatio = meetsThreshold ? bestSim : 0;

  const log: TierLog = {
    tier: 4,
    tierName: 'TF-IDF Cosine Similarity',
    confidence: meetsThreshold ? bestSim : 0,
    scoreRatio,
    notes: `Best cosine similarity: ${(bestSim * 100).toFixed(1)}%. Minimum required: ${(minSimilarity * 100).toFixed(0)}%.`,
  };

  return {
    bestSimilarity: bestSim,
    scoreRatio,
    confidence: meetsThreshold ? bestSim : 0,
    log,
  };
}

function noMatch(reason: string): TfidfMatchResult {
  return {
    bestSimilarity: 0,
    scoreRatio: 0,
    confidence: 0,
    log: {
      tier: 4,
      tierName: 'TF-IDF Cosine Similarity',
      confidence: 0,
      scoreRatio: 0,
      notes: reason,
    },
  };
}

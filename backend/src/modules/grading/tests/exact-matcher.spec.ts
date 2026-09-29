// ============================================================
// exact-matcher.spec.ts — Unit tests for Tier 1
// ============================================================

import { describe, it, expect } from 'vitest';
import { exactMatch } from '../matchers/exact-matcher.js';

describe('ExactMatcher (Tier 1)', () => {
  it('returns matched=true when student answer equals accepted', () => {
    const result = exactMatch('photosynthesis converts light to energy', [
      'photosynthesis converts light to energy',
    ]);
    expect(result.matched).toBe(true);
    expect(result.scoreRatio).toBe(1.0);
    expect(result.confidence).toBe(1.0);
  });

  it('matches against any of multiple accepted answers', () => {
    const result = exactMatch('the water cycle', [
      'water cycle',
      'the water cycle',
      'hydrological cycle',
    ]);
    expect(result.matched).toBe(true);
  });

  it('returns matched=false for a different answer', () => {
    const result = exactMatch('the sun is hot', ['photosynthesis uses sunlight']);
    expect(result.matched).toBe(false);
    expect(result.scoreRatio).toBe(0);
  });

  it('returns matched=false for empty accepted list', () => {
    const result = exactMatch('any answer', []);
    expect(result.matched).toBe(false);
  });

  it('is case-sensitive (normalisation expected before calling)', () => {
    // normalizeText should casefold before calling exactMatch
    const result = exactMatch('Photosynthesis', ['photosynthesis']);
    expect(result.matched).toBe(false);
  });

  it('logs correct tier metadata', () => {
    const result = exactMatch('answer', ['answer']);
    expect(result.log.tier).toBe(1);
    expect(result.log.tierName).toBe('Exact Match');
  });
});

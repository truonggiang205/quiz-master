// ============================================================
// fuzzy-matcher.spec.ts — Unit tests for Tier 3
// ============================================================

import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../matchers/fuzzy-matcher.js';

describe('FuzzyMatcher (Tier 3)', () => {
  it('matches an answer with a single typo', () => {
    // "photosinthesis" vs "photosynthesis" — 1 char different
    const r = fuzzyMatch('photosinthesis', ['photosynthesis'], 0.2);
    expect(r.scoreRatio).toBeGreaterThan(0);
    expect(r.similarity).toBeGreaterThan(0.9);
  });

  it('matches against the best of multiple accepted answers', () => {
    const r = fuzzyMatch('the water cycl', [
      'photosynthesis',
      'the water cycle',
    ], 0.2);
    expect(r.bestMatchAnswer).toBe('the water cycle');
    expect(r.similarity).toBeGreaterThan(0.8);
  });

  it('returns 0 for completely different answers', () => {
    const r = fuzzyMatch('elephant in the room', ['photosynthesis uses sunlight'], 0.2);
    expect(r.scoreRatio).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it('handles empty accepted answers', () => {
    const r = fuzzyMatch('any answer', [], 0.2);
    expect(r.scoreRatio).toBe(0);
  });

  it('handles empty student answer', () => {
    const r = fuzzyMatch('', ['photosynthesis'], 0.2);
    expect(r.scoreRatio).toBe(0);
  });

  it('perfect match gives scoreRatio close to 1.0', () => {
    const r = fuzzyMatch('photosynthesis', ['photosynthesis'], 0.2);
    expect(r.scoreRatio).toBeCloseTo(1.0);
    expect(r.similarity).toBe(1.0);
  });

  it('slightly wrong spelling still scores within partial range', () => {
    // "phootosynthesis" — 1 extra char
    const r = fuzzyMatch('phootosynthesis', ['photosynthesis'], 0.2);
    expect(r.scoreRatio).toBeGreaterThan(0);
    expect(r.scoreRatio).toBeLessThan(1);
  });

  it('logs correct tier metadata', () => {
    const r = fuzzyMatch('test', ['test'], 0.2);
    expect(r.log.tier).toBe(3);
    expect(r.log.tierName).toBe('Fuzzy Match');
  });
});

// ============================================================
// normalizer.spec.ts — Unit tests for the text normalisation pipeline
// ============================================================

import { describe, it, expect } from 'vitest';
import { normalizeText, hasNegationNear } from '../normalizer/text-normalizer.js';
import { DEFAULT_GRADING_CONFIG } from '../grading.config.js';

const cfg = DEFAULT_GRADING_CONFIG.normalizer;

describe('TextNormalizer', () => {
  // ── Basic ────────────────────────────────────────────────────────────────

  it('should casefold text', () => {
    const { normalized } = normalizeText('Photosynthesis Is FUN', cfg);
    expect(normalized).toBe('photosynthesis is fun');
  });

  it('should trim leading/trailing whitespace', () => {
    const { normalized } = normalizeText('  hello world  ', cfg);
    expect(normalized).toBe('hello world');
  });

  it('should collapse multiple spaces', () => {
    const { normalized } = normalizeText('hello   world    again', cfg);
    expect(normalized).toBe('hello world again');
  });

  // ── Contractions ─────────────────────────────────────────────────────────

  it("expands don't → do not", () => {
    const { normalized } = normalizeText("Plants don't need sunlight", cfg);
    expect(normalized).toContain('do not');
    expect(normalized).not.toContain("don't");
  });

  it("expands it's → it is", () => {
    const { normalized } = normalizeText("It's a process", cfg);
    expect(normalized).toContain('it is');
  });

  it("expands cannot from can't", () => {
    const { normalized } = normalizeText("I can't do it", cfg);
    expect(normalized).toContain('cannot');
  });

  it('expands multiple contractions in one sentence', () => {
    const { normalized } = normalizeText("He's not here, isn't he?", cfg);
    expect(normalized).toContain('he is');
    expect(normalized).toContain('is not');
  });

  // ── Numbers ──────────────────────────────────────────────────────────────

  it('converts ordinal suffix: 10th → 10', () => {
    const { normalized } = normalizeText('The 10th amendment', cfg);
    expect(normalized).toContain('10');
    expect(normalized).not.toContain('10th');
  });

  it('converts ordinal suffix: 1st → 1', () => {
    const { normalized } = normalizeText('She came in 1st place', cfg);
    expect(normalized).toContain('1');
  });

  it('converts ordinal word: tenth → 10', () => {
    const { normalized } = normalizeText('the tenth century', cfg);
    expect(normalized).toContain('10');
  });

  it('converts number word: ten → 10', () => {
    const { normalized } = normalizeText('ten apples', cfg);
    expect(normalized).toContain('10');
  });

  it('converts number word: twenty → 20', () => {
    const { normalized } = normalizeText('twenty students', cfg);
    expect(normalized).toContain('20');
  });

  // ── British/American ─────────────────────────────────────────────────────

  it('normalises colour → color', () => {
    const { normalized } = normalizeText('The colour of the sky', cfg);
    expect(normalized).toContain('color');
    expect(normalized).not.toContain('colour');
  });

  it('normalises centre → center', () => {
    const { normalized } = normalizeText('In the centre of the city', cfg);
    expect(normalized).toContain('center');
  });

  it('normalises organise → organize', () => {
    const { normalized } = normalizeText('They organise events', cfg);
    expect(normalized).toContain('organize');
  });

  // ── Punctuation ──────────────────────────────────────────────────────────

  it('strips punctuation but keeps hyphens', () => {
    const { normalized } = normalizeText('well-known fact!', cfg);
    expect(normalized).toContain('well-known');
    expect(normalized).not.toContain('!');
  });

  it('converts curly quotes to straight (then stripped as punctuation)', () => {
    // \u201CHello\u201D → "Hello" after step 2, then " is stripped as punctuation
    // Test the step directly:
    const { steps } = normalizeText('\u201CHello\u201D', cfg);
    // After straightenPunctuation step, the result should contain straight double quote
    expect(steps['straightenPunctuation']).toContain('"');
    // Final normalized string has the punctuation stripped — word remains
    const { normalized } = normalizeText('\u201CHello\u201D', cfg);
    expect(normalized).toBe('hello');
  });

  // ── Step audit ──────────────────────────────────────────────────────────

  it('returns step-by-step audit trail', () => {
    const { steps } = normalizeText("It's great!", cfg);
    expect(steps).toHaveProperty('casefold');
    expect(steps).toHaveProperty('expandContractions');
  });

  // ── Negation detection ───────────────────────────────────────────────────

  it('detects negation near keyword', () => {
    expect(hasNegationNear('plants do not use photosynthesis', 'photosynthesis')).toBe(true);
  });

  it('does not flag negation far from keyword', () => {
    expect(hasNegationNear('do not worry about the weather photosynthesis rocks', 'photosynthesis')).toBe(false);
  });

  it('detects "never" as negation', () => {
    expect(hasNegationNear('it will never stop growing', 'stop')).toBe(true);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('handles empty string', () => {
    const { normalized } = normalizeText('', cfg);
    expect(normalized).toBe('');
  });

  it('handles string with only whitespace', () => {
    const { normalized } = normalizeText('   ', cfg);
    expect(normalized).toBe('');
  });

  it('handles unicode NFKC: full-width A → A', () => {
    const { normalized } = normalizeText('\uFF21', cfg);
    expect(normalized).toBe('a');
  });
});

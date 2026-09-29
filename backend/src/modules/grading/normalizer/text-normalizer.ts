// ============================================================
// text-normalizer.ts — Main normalisation pipeline
// ============================================================

import { NormalizerConfig } from '../grading.config.js';
import { CONTRACTIONS, CONTRACTION_KEYS_SORTED } from './contractions.js';
import { normalizeNumbers } from './number-words.js';
import { normalizeBritishAmerican } from './british-american.js';

/** Negation words used by other modules to detect negation */
export const NEGATION_WORDS = new Set([
  'no', 'not', 'never', 'neither', 'nor', 'nobody', 'nothing',
  'nowhere', 'cannot', 'without',
]);

export interface NormalizedText {
  original: string;
  normalized: string;
  steps: Record<string, string>;
}

/**
 * Full normalisation pipeline.
 * Each step can be toggled individually via config.
 * @returns Both the final normalized string AND a step-by-step audit trail.
 */
export function normalizeText(
  text: string,
  config: NormalizerConfig,
): NormalizedText {
  const steps: Record<string, string> = {};
  let s = text;

  // ── Step 1: Unicode NFKC ────────────────────────────────────────────────
  if (config.unicodeNFKC) {
    s = s.normalize('NFKC');
    steps['unicodeNFKC'] = s;
  }

  // ── Step 2: Straighten curly quotes / em-dash ───────────────────────────
  if (config.straightenPunctuation) {
    s = s
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // curly single quotes → '
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')   // curly double quotes → "
      .replace(/\u2014|\u2013|\u2012/g, '-')          // em/en dash → hyphen
      .replace(/\u2026/g, '...');                     // ellipsis → ...
    steps['straightenPunctuation'] = s;
  }

  // ── Step 3: Strip invisible characters ──────────────────────────────────
  if (config.stripInvisibleChars) {
    s = s
      .replace(/\u00A0/g, ' ')   // non-breaking space → regular space
      .replace(/[\u200B-\u200D\uFEFF\u2060]/g, ''); // zero-width chars
    steps['stripInvisibleChars'] = s;
  }

  // ── Step 4: Trim ────────────────────────────────────────────────────────
  if (config.trim) {
    s = s.trim();
    steps['trim'] = s;
  }

  // ── Step 5: Casefold ────────────────────────────────────────────────────
  if (config.casefold) {
    s = s.toLocaleLowerCase('en-US');
    steps['casefold'] = s;
  }

  // ── Step 6: Expand contractions ─────────────────────────────────────────
  if (config.expandContractions) {
    for (const key of CONTRACTION_KEYS_SORTED) {
      // Word-boundary aware replacement
      const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi');
      s = s.replace(pattern, CONTRACTIONS[key]);
    }
    steps['expandContractions'] = s;
  }

  // ── Step 7: Normalise numbers ───────────────────────────────────────────
  if (config.normalizeNumbers) {
    s = normalizeNumbers(s);
    steps['normalizeNumbers'] = s;
  }

  // ── Step 8: British → American ──────────────────────────────────────────
  if (config.normalizeBritishAmerican) {
    s = normalizeBritishAmerican(s);
    steps['normalizeBritishAmerican'] = s;
  }

  // ── Step 9: Strip trailing punctuation (keep ' and -) ───────────────────
  if (config.stripPunctuation) {
    // Remove punctuation that is NOT apostrophe or hyphen
    s = s.replace(/[!"#$%&()*+,./:;<=>?@[\\\]^_`{|}~]/g, ' ');
    steps['stripPunctuation'] = s;
  }

  // ── Step 10: Collapse whitespace ────────────────────────────────────────
  if (config.collapseWhitespace) {
    s = s.replace(/\s+/g, ' ').trim();
    steps['collapseWhitespace'] = s;
  }

  return { original: text, normalized: s, steps };
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect if the normalised text contains a negation near a keyword.
 * Window: ±3 words around the keyword.
 */
export function hasNegationNear(text: string, keyword: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const keyIdx = words.findIndex((w) => w === keyword || w.startsWith(keyword));
  if (keyIdx === -1) return false;

  const start = Math.max(0, keyIdx - 3);
  const end = Math.min(words.length, keyIdx + 4);
  return words.slice(start, end).some((w) => NEGATION_WORDS.has(w));
}

// ============================================================
// number-words.ts — Bidirectional number ↔ word normalisation
// ============================================================

/** Words for 0–19 */
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

/** Tens */
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Ordinal suffix → base form */
const ORDINAL_SUFFIX_RE = /(\d+)(st|nd|rd|th)\b/gi;

/** Ordinal words → cardinal */
const ORDINAL_WORDS: Record<string, string> = {
  first: '1', second: '2', third: '3', fourth: '4', fifth: '5',
  sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10',
  eleventh: '11', twelfth: '12', thirteenth: '13', fourteenth: '14',
  fifteenth: '15', sixteenth: '16', seventeenth: '17', eighteenth: '18',
  nineteenth: '19', twentieth: '20', thirtieth: '30', fortieth: '40',
  fiftieth: '50', sixtieth: '60', seventieth: '70', eightieth: '80',
  ninetieth: '90', hundredth: '100', thousandth: '1000',
};

/**
 * Parse a simple English number phrase (up to 999) into a digit string.
 * Returns null if the phrase is not a recognisable number.
 */
function parseNumberPhrase(phrase: string): string | null {
  const words = phrase.trim().toLowerCase().replace(/-/g, ' ').split(/\s+/);
  let total = 0;
  let current = 0;

  for (const w of words) {
    if (w in ONES) {
      current += ONES[w];
    } else if (w in TENS) {
      current += TENS[w];
    } else if (w === 'hundred') {
      current = current === 0 ? 100 : current * 100;
    } else if (w === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      return null; // Unknown word
    }
  }
  total += current;
  return total === 0 && !words.includes('zero') ? null : String(total);
}

/**
 * Normalise number representations in a text.
 * Strategy: convert ordinal suffixes (10th → 10) and ordinal words (tenth → 10).
 * We deliberately do NOT convert full word-numbers (ten → 10) during normalisation
 * to avoid false matches on common words — that mapping is handled in keyword matching.
 */
export function normalizeNumbers(text: string): string {
  // Step 1: 1st/2nd/3rd/4th... → 1/2/3/4
  let result = text.replace(ORDINAL_SUFFIX_RE, '$1');

  // Step 2: ordinal words → digits
  const ordinalPattern = new RegExp(
    `\\b(${Object.keys(ORDINAL_WORDS).join('|')})\\b`,
    'gi',
  );
  result = result.replace(ordinalPattern, (_, w: string) => ORDINAL_WORDS[w.toLowerCase()] ?? w);

  // Step 3: simple number words → digits (handles "ten", "twenty-five" etc.)
  // We build a regex of all recognisable phrases — single-word only for safety
  const singleWordNumbers = { ...ONES, ...TENS };
  const numPattern = new RegExp(
    `\\b(${Object.keys(singleWordNumbers).join('|')})\\b`,
    'gi',
  );
  result = result.replace(numPattern, (match: string) => {
    const parsed = parseNumberPhrase(match);
    return parsed !== null ? parsed : match;
  });

  return result;
}

// Re-export for use in matchers
export { ONES, TENS, ORDINAL_WORDS, parseNumberPhrase };

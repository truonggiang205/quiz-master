// ============================================================
// grading.config.ts — All thresholds & feature flags (no hardcoding)
// ============================================================

export interface NormalizerConfig {
  /** Unicode NFKC normalisation */
  unicodeNFKC: boolean;
  /** Replace curly quotes / em-dash with straight equivalents */
  straightenPunctuation: boolean;
  /** Remove zero-width and non-breaking spaces */
  stripInvisibleChars: boolean;
  /** Trim leading/trailing whitespace */
  trim: boolean;
  /** casefold (lowercase) */
  casefold: boolean;
  /** Expand contractions: don't → do not */
  expandContractions: boolean;
  /** Normalise number words: ten ↔ 10, 10th ↔ tenth */
  normalizeNumbers: boolean;
  /** Normalise British ↔ American spelling */
  normalizeBritishAmerican: boolean;
  /** Strip trailing punctuation (keep ' and -) */
  stripPunctuation: boolean;
  /** Collapse multiple spaces into one */
  collapseWhitespace: boolean;
}

export interface TierConfig {
  /** Tier 1 — Exact match */
  exactMatch: { enabled: boolean };
  /** Tier 2 — Keyword + synonym match */
  keywordMatch: {
    enabled: boolean;
    /** Min ratio [0,1] of keywords that must match to get ANY credit */
    minKeywordRatio: number;
  };
  /** Tier 3 — Fuzzy (edit-distance) match */
  fuzzyMatch: {
    enabled: boolean;
    /** Max edit distance ratio [0,1] — e.g. 0.15 = up to 15% chars can differ */
    maxDistanceRatio: number;
    /** Only apply fuzzy on exact-match candidates (saves CPU) */
    onlyForExactCandidates: boolean;
  };
  /** Tier 4 — TF-IDF cosine similarity */
  tfidfMatch: {
    enabled: boolean;
    /** Min cosine similarity to award any credit */
    minSimilarity: number;
  };
}

export interface PipelineConfig {
  /** Score ratio [0,1] at or above which a tier's result is accepted immediately */
  acceptanceThreshold: number;
  /** Confidence value below which the result is flagged needsReview */
  reviewThreshold: number;
  /** Penalty factor for negation detection (multiply score by this) */
  negationPenalty: number;
}

export interface GradingConfig {
  normalizer: NormalizerConfig;
  tiers: TierConfig;
  pipeline: PipelineConfig;
}

// ---------------------------------------------------------------------------
// Default config — override via environment variables or a JSON file
// ---------------------------------------------------------------------------
export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  normalizer: {
    unicodeNFKC: true,
    straightenPunctuation: true,
    stripInvisibleChars: true,
    trim: true,
    casefold: true,
    expandContractions: true,
    normalizeNumbers: true,
    normalizeBritishAmerican: true,
    stripPunctuation: true,
    collapseWhitespace: true,
  },
  tiers: {
    exactMatch: { enabled: true },
    keywordMatch: {
      enabled: true,
      minKeywordRatio: Number(process.env.GRADING_MIN_KEYWORD_RATIO ?? 0.5),
    },
    fuzzyMatch: {
      enabled: true,
      maxDistanceRatio: Number(process.env.GRADING_FUZZY_MAX_DIST ?? 0.2),
      onlyForExactCandidates: false,
    },
    tfidfMatch: {
      enabled: true,
      minSimilarity: Number(process.env.GRADING_TFIDF_MIN_SIM ?? 0.3),
    },
  },
  pipeline: {
    acceptanceThreshold: Number(process.env.GRADING_ACCEPTANCE_THRESHOLD ?? 0.9),
    reviewThreshold: Number(process.env.GRADING_REVIEW_THRESHOLD ?? 0.5),
    negationPenalty: Number(process.env.GRADING_NEGATION_PENALTY ?? 0.0),
  },
};

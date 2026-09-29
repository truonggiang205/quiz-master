// ============================================================
// contractions.ts — English contraction expansion table
// ============================================================

/** Map contraction → expanded form (lowercase keys) */
export const CONTRACTIONS: Record<string, string> = {
  // Common negations
  "aren't": 'are not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "didn't": 'did not',
  "doesn't": 'does not',
  "don't": 'do not',
  "hadn't": 'had not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "isn't": 'is not',
  "mightn't": 'might not',
  "mustn't": 'must not',
  "needn't": 'need not',
  "shan't": 'shall not',
  "shouldn't": 'should not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "won't": 'will not',
  "wouldn't": 'would not',
  // Contractions with "have"
  "could've": 'could have',
  "might've": 'might have',
  "must've": 'must have',
  "should've": 'should have',
  "would've": 'would have',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  // Contractions with "will"
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "we'll": 'we will',
  "they'll": 'they will',
  // Contractions with "would"
  "i'd": 'i would',
  "you'd": 'you would',
  "he'd": 'he would',
  "she'd": 'she would',
  "we'd": 'we would',
  "they'd": 'they would',
  // Contractions with "is/are/am"
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
  "that's": 'that is',
  "there's": 'there is',
  "here's": 'here is',
  "who's": 'who is',
  "what's": 'what is',
  "where's": 'where is',
  "when's": 'when is',
  "why's": 'why is',
  "how's": 'how is',
  "let's": 'let us',
};

/** Sorted by length descending to match longest first */
export const CONTRACTION_KEYS_SORTED = Object.keys(CONTRACTIONS).sort(
  (a, b) => b.length - a.length,
);

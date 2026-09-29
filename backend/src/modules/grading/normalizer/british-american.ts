// ============================================================
// british-american.ts — Bidirectional British ↔ American spelling
// ============================================================

/**
 * Canonical British → American mapping.
 * Both forms are considered correct; during normalisation we always
 * convert to the American form so comparisons work regardless of variant.
 */
export const BRITISH_TO_AMERICAN: Record<string, string> = {
  // -our → -or
  colour: 'color', favour: 'favor', honour: 'honor', labour: 'labor',
  neighbour: 'neighbor', behaviour: 'behavior', harbour: 'harbor',
  humour: 'humor', rumour: 'rumor', flavour: 'flavor', odour: 'odor',
  valour: 'valor', vigour: 'vigor', tumour: 'tumor', glamour: 'glamor',
  // -ise → -ize
  organise: 'organize', realise: 'realize', recognise: 'recognize',
  analyse: 'analyze', apologise: 'apologize', authorise: 'authorize',
  centralise: 'centralize', characterise: 'characterize',
  emphasise: 'emphasize', equalise: 'equalize', finalise: 'finalize',
  globalise: 'globalize', harmonise: 'harmonize', legalise: 'legalize',
  maximise: 'maximize', minimise: 'minimize', modernise: 'modernize',
  normalise: 'normalize', optimise: 'optimize', prioritise: 'prioritize',
  specialise: 'specialize', standardise: 'standardize',
  synchronise: 'synchronize', utilise: 'utilize',
  // -re → -er
  centre: 'center', fibre: 'fiber', litre: 'liter', metre: 'meter',
  theatre: 'theater', calibre: 'caliber', sombre: 'somber',
  spectre: 'specter', lustre: 'luster',
  // -ll → -l (travelling, etc.)
  travelling: 'traveling', travelled: 'traveled', traveller: 'traveler',
  modelling: 'modeling', modelled: 'modeled', modeller: 'modeler',
  cancelling: 'canceling', cancelled: 'canceled',
  labelling: 'labeling', labelled: 'labeled',
  fulfil: 'fulfill', fulfilment: 'fulfillment',
  // -ae/-oe → -e
  aesthetic: 'esthetic', anaesthesia: 'anesthesia', encyclopaedia: 'encyclopedia',
  // Misc
  grey: 'gray', cheque: 'check', programme: 'program',
  tyre: 'tire', pyjamas: 'pajamas', mould: 'mold', smoulder: 'smolder',
  draught: 'draft', plough: 'plow',
};

const BA_PATTERN = new RegExp(
  `\\b(${Object.keys(BRITISH_TO_AMERICAN).join('|')})\\b`,
  'gi',
);

/** Normalise British spellings to American form (case-insensitive, preserves surrounding text) */
export function normalizeBritishAmerican(text: string): string {
  return text.replace(BA_PATTERN, (match: string) => {
    const lower = match.toLowerCase();
    return BRITISH_TO_AMERICAN[lower] ?? match;
  });
}

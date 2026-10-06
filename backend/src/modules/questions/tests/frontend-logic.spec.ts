import { describe, it, expect } from 'vitest';

// 1. Replicate pure logic of isQuestionAnswered for testing
function isQuestionAnswered(
  question: { id: string; type: string } | null | undefined,
  answerState: {
    answers?: Record<string, string[]>;
    essayAnswers?: Record<string, string[] | string>;
    essayTextAnswers?: Record<string, string>;
  } | null | undefined
): boolean {
  if (!question || !question.id || !answerState) {
    return false;
  }

  if (question.type === 'ESSAY') {
    const text = answerState.essayTextAnswers?.[question.id];
    if (typeof text === 'string' && text.trim().length > 0) {
      return true;
    }

    const rawImages = answerState.essayAnswers?.[question.id];
    if (Array.isArray(rawImages)) {
      return rawImages.some((url) => typeof url === 'string' && url.trim().length > 0);
    }
    if (typeof rawImages === 'string' && rawImages.trim().length > 0) {
      return true;
    }

    return false;
  }

  const selectedOptions = answerState.answers?.[question.id];
  return Array.isArray(selectedOptions) && selectedOptions.length > 0;
}

// 2. Replicate cleanInput and blur fallback logic of NumberInput
function cleanNumberInput(text: string): string {
  let cleaned = text.replace(/,/g, '.');
  if (/^0\d+/.test(cleaned)) {
    cleaned = cleaned.replace(/^0+(?=\d)/, '');
  } else if (/^-0\d+/.test(cleaned)) {
    cleaned = cleaned.replace(/^-0+(?=\d)/, '-');
  }
  return cleaned;
}

function resolveNumberOnBlur(
  rawText: string,
  options: { defaultValue?: number; min?: number; max?: number }
): number {
  const trimmed = rawText.trim();
  let targetVal: number;

  if (trimmed === '' || trimmed === '-' || trimmed === '.') {
    targetVal = options.defaultValue ?? (options.min !== undefined ? options.min : 0);
  } else {
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || !isFinite(parsed)) {
      targetVal = options.defaultValue ?? (options.min !== undefined ? options.min : 0);
    } else {
      targetVal = parsed;
    }
  }

  if (options.min !== undefined && targetVal < options.min) {
    targetVal = options.min;
  }
  if (options.max !== undefined && targetVal > options.max) {
    targetVal = options.max;
  }

  return targetVal;
}

describe('Mục 1: isQuestionAnswered logic', () => {
  it('should return false when question or answerState is null', () => {
    expect(isQuestionAnswered(null, {})).toBe(false);
    expect(isQuestionAnswered({ id: 'q1', type: 'SINGLE_CHOICE' }, null)).toBe(false);
  });

  it('should handle multiple choice questions accurately', () => {
    const q = { id: 'q1', type: 'MULTIPLE_CHOICE' };
    expect(isQuestionAnswered(q, { answers: {} })).toBe(false);
    expect(isQuestionAnswered(q, { answers: { q1: [] } })).toBe(false);
    expect(isQuestionAnswered(q, { answers: { q1: ['opt1'] } })).toBe(true);
    // Resetting when unselected
    expect(isQuestionAnswered(q, { answers: { q1: [] } })).toBe(false);
  });

  it('should recognize essay question answered with text (ignoring whitespace)', () => {
    const q = { id: 'essay-1', type: 'ESSAY' };
    expect(isQuestionAnswered(q, { essayTextAnswers: { 'essay-1': '' } })).toBe(false);
    expect(isQuestionAnswered(q, { essayTextAnswers: { 'essay-1': '   ' } })).toBe(false);
    expect(isQuestionAnswered(q, { essayTextAnswers: { 'essay-1': '\n\t' } })).toBe(false);
    expect(isQuestionAnswered(q, { essayTextAnswers: { 'essay-1': 'Lời giải câu 1' } })).toBe(true);
  });

  it('should recognize essay question answered with uploaded images', () => {
    const q = { id: 'essay-2', type: 'ESSAY' };
    expect(isQuestionAnswered(q, { essayAnswers: { 'essay-2': [] } })).toBe(false);
    expect(isQuestionAnswered(q, { essayAnswers: { 'essay-2': [''] } })).toBe(false);
    expect(isQuestionAnswered(q, { essayAnswers: { 'essay-2': ['https://res.cloudinary.com/test.jpg'] } })).toBe(true);
    expect(isQuestionAnswered(q, { essayAnswers: { 'essay-2': 'https://res.cloudinary.com/single.jpg' } })).toBe(true);
  });
});

describe('Mục 2: NumberInput formatting & zero-stripping', () => {
  it('should strip leading zeros while preserving valid decimals', () => {
    expect(cleanNumberInput('007')).toBe('7');
    expect(cleanNumberInput('0005')).toBe('5');
    expect(cleanNumberInput('0.5')).toBe('0.5');
    expect(cleanNumberInput('0.33')).toBe('0.33');
    expect(cleanNumberInput('0,75')).toBe('0.75'); // converts comma to dot
  });

  it('should fallback to defaultValue or min or 0 when emptied on blur', () => {
    expect(resolveNumberOnBlur('', { defaultValue: 10 })).toBe(10);
    expect(resolveNumberOnBlur('  ', { min: 1 })).toBe(1);
    expect(resolveNumberOnBlur('-', { defaultValue: 5 })).toBe(5);
    expect(resolveNumberOnBlur('25', { min: 0, max: 20 })).toBe(20);
    expect(resolveNumberOnBlur('-5', { min: 0, max: 100 })).toBe(0);
  });
});

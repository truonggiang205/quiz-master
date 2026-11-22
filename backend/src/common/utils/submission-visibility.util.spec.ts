import { describe, expect, it } from 'vitest';
import { sanitizeStudentAnswerData } from './submission-visibility.util.js';

describe('submission visibility sanitizer', () => {
  it('removes marking data recursively while retaining the student response', () => {
    const result = sanitizeStudentAnswerData({
      questionId: 'q1', selectedOptionIds: ['a'], isCorrect: true, scoreAwarded: 50,
      questionEssayRubric: { acceptedAnswers: ['secret'], criteria: [{ keywords: ['secret'] }] },
      questionOptions: [{ id: 'a', text: 'A', isCorrect: true }],
      statementAnswers: [{ statementId: 's1', answer: true, correctAnswer: false, isCorrect: false }],
      nested: { acceptedAnswers: ['secret'], scoreAwarded: 10 },
    });
    expect(result).toEqual({
      questionId: 'q1', selectedOptionIds: ['a'],
      questionOptions: [{ id: 'a', text: 'A' }],
      statementAnswers: [{ statementId: 's1', answer: true }],
      nested: {},
    });
  });
});

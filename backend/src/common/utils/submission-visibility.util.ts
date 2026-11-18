/** Fields that can disclose marking logic before the configured release time. */
const SENSITIVE_ANSWER_KEYS = new Set([
  'correctAnswer', 'isCorrect', 'scoreAwarded', 'questionExplanation',
  'questionEssayRubric', 'essayRubric', 'acceptedAnswers', 'criteria', 'explanation',
]);

/**
 * Produces a response-only copy. It intentionally walks nested JSON snapshots
 * so a future endpoint cannot accidentally expose a nested rubric or answer.
 */
export function sanitizeStudentAnswerData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => sanitizeStudentAnswerData(item)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !SENSITIVE_ANSWER_KEYS.has(key))
    .map(([key, item]) => {
      if (key === 'questionOptions' || key === 'options') {
        return [key, Array.isArray(item) ? item.map(option => {
          if (!option || typeof option !== 'object') return option;
          const { isCorrect: _isCorrect, ...publicOption } = option as Record<string, unknown>;
          return sanitizeStudentAnswerData(publicOption);
        }) : item];
      }
      return [key, sanitizeStudentAnswerData(item)];
    })) as T;
}

export function isAnswerReleased(answerReleaseAt?: string | null): boolean {
  return Boolean(answerReleaseAt && new Date(answerReleaseAt) <= new Date());
}

import { Question } from '../types/question';

export interface AnswerState {
  answers?: Record<string, string[]>;
  essayAnswers?: Record<string, string[] | string>;
  essayTextAnswers?: Record<string, string>;
  statementAnswers?: Record<string, Record<string, boolean>>;
}

export function statementLabel(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(97 + (n - 1) % 26) + label;
  }
  return `${label})`;
}

/**
 * Kiểm tra xem một câu hỏi đã được thí sinh trả lời hay chưa.
 * - Trắc nghiệm (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE): Có ít nhất 1 lựa chọn được chọn.
 * - Tự luận (ESSAY): Có nội dung văn bản (không rỗng sau khi trim) HOẶC có ít nhất 1 ảnh bài làm đã tải lên.
 */
export function isQuestionAnswered(
  question: Question | null | undefined,
  answerState: AnswerState | null | undefined
): boolean {
  if (!question || !question.id || !answerState) {
    return false;
  }

  if (question.type === 'MULTIPLE_TRUE_FALSE') {
    const answers = answerState.statementAnswers?.[question.id] || {};
    return question.options.length > 0 && question.options.every(option => typeof answers[option.id] === 'boolean');
  }

  if (question.type === 'ESSAY') {
    // 1. Kiểm tra văn bản tự luận
    const text = answerState.essayTextAnswers?.[question.id];
    if (typeof text === 'string' && text.trim().length > 0) {
      return true;
    }

    // 2. Kiểm tra ảnh bài làm đã tải lên
    const rawImages = answerState.essayAnswers?.[question.id];
    if (Array.isArray(rawImages)) {
      return rawImages.some((url) => typeof url === 'string' && url.trim().length > 0);
    }
    if (typeof rawImages === 'string' && rawImages.trim().length > 0) {
      return true;
    }

    return false;
  }

  // Câu hỏi trắc nghiệm hoặc đúng/sai
  const selectedOptions = answerState.answers?.[question.id];
  return Array.isArray(selectedOptions) && selectedOptions.length > 0;
}

import { describe, expect, it } from 'vitest';
import { parseDocxHtml } from '../docx.parser.js';
import { parseQuestions } from '../question.parser.js';

describe('DOCX question import', () => {
  it('uses formatting from each option instead of treating a bold question label as a correct answer', () => {
    const lines = parseDocxHtml(`
      <p><strong>Câu 40. </strong>Nguyên tố nào có nguyên tử khối bằng 127?<br />
      A. Ag&nbsp;&nbsp; B. F&nbsp;&nbsp; C. Ar&nbsp;&nbsp; <strong>D. I</strong></p>
    `);

    expect(lines).toMatchObject([
      { text: 'Câu 40. Nguyên tố nào có nguyên tử khối bằng 127?', isBold: true },
      { text: 'A. Ag', isBold: false, isHighlight: false },
      { text: 'B. F', isBold: false, isHighlight: false },
      { text: 'C. Ar', isBold: false, isHighlight: false },
      { text: 'D. I', isBold: true },
    ]);

    const [question] = parseQuestions(lines);
    expect(question.correctAnswer).toBe('D');
    expect(question.options.map(({ label, isCorrect }) => ({ label, isCorrect }))).toEqual([
      { label: 'A', isCorrect: false },
      { label: 'B', isCorrect: false },
      { label: 'C', isCorrect: false },
      { label: 'D', isCorrect: true },
    ]);
  });

  it('recognizes highlighted answers and ignores section text between adjacent questions', () => {
    const lines = parseDocxHtml(`
      <p><strong>Câu 40. </strong>Nguyên tố nào có nguyên tử khối bằng 127?<br />
      A. Ag&nbsp;&nbsp; B. F&nbsp;&nbsp; C. Ar&nbsp;&nbsp; <strong>D. I</strong></p>
      <p><strong>TRẮC NGHIỆM NGUYÊN TỬ KHỐI</strong></p>
      <p>Phần 5/5 • Câu 41–50</p>
      <p>Giá trị gần đúng theo quy ước THCS; đáp án đúng được tô vàng.</p>
      <p><strong>Câu 41. </strong>Nguyên tố nào có nguyên tử khối bằng 39?<br />
      A. Si&nbsp;&nbsp; B. Ba&nbsp;&nbsp; <span style="background-color: yellow">C. K</span>&nbsp;&nbsp; D. Ca</p>
    `);

    const questions = parseQuestions(lines);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({ questionNumber: 40, correctAnswer: 'D' });
    expect(questions[0].options.find(option => option.label === 'D')?.text).toBe('I');
    expect(questions[1]).toMatchObject({ questionNumber: 41, correctAnswer: 'C' });
    expect(questions[1].options.map(({ label, isCorrect }) => ({ label, isCorrect }))).toEqual([
      { label: 'A', isCorrect: false },
      { label: 'B', isCorrect: false },
      { label: 'C', isCorrect: true },
      { label: 'D', isCorrect: false },
    ]);
  });

  it('does not mistake uppercase option text for a section heading', () => {
    const questions = parseQuestions([
      { text: 'Câu 1. Chọn nhận định đúng', isBold: false, isHighlight: false },
      { text: 'A. ĐÚNG', isBold: false, isHighlight: false },
      { text: 'B. SAI', isBold: true, isHighlight: false },
    ]);

    expect(questions[0]).toMatchObject({ correctAnswer: 'B' });
    expect(questions[0].options).toHaveLength(2);
  });
});

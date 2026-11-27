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

  it('does not treat bold option labels as answer keys or append worksheet explanations', () => {
    const lines = parseDocxHtml(`
      <p><strong>Câu 1. </strong>Nguyên tố nào có kí hiệu Na?</p>
      <p><strong>A. </strong>S&nbsp;&nbsp;&nbsp;
      <strong>B. </strong><strong><span style="background-color: yellow">Na</span></strong>&nbsp;&nbsp;&nbsp;
      <strong>C. </strong>Ca&nbsp;&nbsp;&nbsp;
      <strong>D. </strong>K</p>
      <p>→ Sodium (natri) có kí hiệu hoá học là Na.</p>
      <p><strong>Câu 2. </strong>Chọn kí hiệu của kali.</p>
      <p><strong>A. </strong>Ca&nbsp;&nbsp;&nbsp;
      <strong>B. </strong>Na&nbsp;&nbsp;&nbsp;
      <strong>C. </strong><strong>K</strong>&nbsp;&nbsp;&nbsp;
      <strong>D. </strong>Ag</p>
    `);

    const questions = parseQuestions(lines);
    expect(questions).toHaveLength(2);
    expect(questions[0].correctAnswer).toBe('B');
    expect(questions[0].options.map(({ label, isCorrect }) => ({ label, isCorrect }))).toEqual([
      { label: 'A', isCorrect: false },
      { label: 'B', isCorrect: true },
      { label: 'C', isCorrect: false },
      { label: 'D', isCorrect: false },
    ]);
    expect(questions[0].options.find(option => option.label === 'D')?.text).toBe('K');
    expect(questions[1].correctAnswer).toBe('C');
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

  it('does not duplicate table cells or turn lower-case essay subparts into choices', () => {
    const lines = parseDocxHtml(`
      <p><strong>Câu 1. </strong>Chọn đáp án đúng</p>
      <p><strong>A. </strong>Một <strong>B. Hai</strong></p>
      <table><tbody><tr><td><p>a)</p></td><td><p>Nội dung nhận định</p></td><td><p><strong>Đ</strong></p></td></tr></tbody></table>
      <p><strong>Câu 2. </strong>Tự luận</p>
      <p>a) Ý nhỏ thứ nhất.</p>
      <p>b) Ý nhỏ thứ hai.</p>
    `);

    const questions = parseQuestions(lines);
    expect(questions).toHaveLength(2);
    expect(questions[0].options.map(option => option.label)).toEqual(['A', 'B']);
    expect(questions[1].options).toHaveLength(0);
  });
});

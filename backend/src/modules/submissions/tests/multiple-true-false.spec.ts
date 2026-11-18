import { describe, expect, it, vi } from 'vitest';
import { SubmissionsService } from '../submissions.service.js';

describe('MULTIPLE_TRUE_FALSE submission', () => {
  const statements = [
    { id: 'a', text: 'A', isCorrect: true },
    { id: 'b', text: 'B', isCorrect: false },
    { id: 'c', text: 'C', isCorrect: true },
  ];

  function setup() {
    let saved: any;
    const quiz = { id: 'quiz', title: 'Quiz', totalPoints: 100, totalAttempts: 1, answerReleaseAt: '2999-01-01' };
    const question = { id: 'question', quizId: 'quiz', type: 'MULTIPLE_TRUE_FALSE', options: statements, points: 100 };
    const submissions: any = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(value => value),
      save: vi.fn(value => { saved = value; return value; }),
      findOneBy: vi.fn(() => saved),
    };
    const quizzes: any = { findOneBy: vi.fn().mockResolvedValue(quiz) };
    const questions: any = { find: vi.fn().mockResolvedValue([question]) };
    const service = new SubmissionsService(submissions, quizzes, questions, {} as any, {} as any, {} as any);
    const submit = (answers: { statementId: string; answer: boolean }[]) => service.submitQuiz('quiz', {
      answers: [{ questionId: 'question', statementAnswers: answers }], timeUsedSeconds: 10,
    }, { id: 'student', name: 'Student', email: 'student@example.com' });
    return { service, submit, getSaved: () => saved };
  }

  it.each([
    [[true, false, true], 100],
    [[false, true, false], 0],
    [[true, true, true], 67],
    [[true], 33],
    [[], 0],
  ])('awards proportional integer points for %j', async (values, expected) => {
    const { submit, getSaved } = setup();
    const result = await submit(values.map((answer, index) => ({ statementId: statements[index].id, answer })));
    expect(result.score).toBe(expected);
    expect(result.answers[0].statementAnswers).toBeUndefined();
    expect(getSaved().answers[0].statementAnswers).toHaveLength(3);
  });

  it('rejects unknown and duplicate statement ids', async () => {
    const { submit } = setup();
    await expect(submit([{ statementId: 'unknown', answer: true }])).rejects.toThrow();
    await expect(submit([{ statementId: 'a', answer: true }, { statementId: 'a', answer: false }])).rejects.toThrow();
  });

  it('does not use a correct answer supplied by the client', async () => {
    const { submit } = setup();
    const result = await submit([{ statementId: 'a', answer: false, correctAnswer: false } as any]);
    expect(result.score).toBe(0);
  });

  it('hides saved correct answers from students until release and shows them to teachers', async () => {
    const { service, submit, getSaved } = setup();
    await submit([{ statementId: 'a', answer: true }]);
    const student = await service.getSubmissionById(getSaved().id, 'STUDENT', 'student');
    expect(student.answers[0].statementAnswers).toBeUndefined();
    expect(student.detailedAnswers[0].statementAnswers).toBeUndefined();
    const teacher = await service.getSubmissionById(getSaved().id, 'TEACHER', 'teacher');
    expect(teacher.detailedAnswers[0].statementAnswers?.[0].correctAnswer).toBe(true);
  });
});

describe('existing question grading', () => {
  it.each(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'])('keeps exact-match grading for %s', async type => {
    const quiz: any = { id: 'quiz', title: 'Quiz', totalPoints: 100, totalAttempts: 1 };
    const question: any = { id: 'q', type, points: 100, options: [{ id: 'a', isCorrect: true }, { id: 'b', isCorrect: type === 'MULTIPLE_CHOICE' }] };
    const repo: any = { count: vi.fn().mockResolvedValue(0), create: (value: any) => value, save: (value: any) => value };
    const service = new SubmissionsService(repo, { findOneBy: async () => quiz } as any, { find: async () => [question] } as any, {} as any, {} as any, {} as any);
    const selectedOptionIds = type === 'MULTIPLE_CHOICE' ? ['a', 'b'] : ['a'];
    const result = await service.submitQuiz('quiz', { answers: [{ questionId: 'q', selectedOptionIds }], timeUsedSeconds: 1 }, { id: 's', name: 'S', email: 's@example.com' });
    expect(result.score).toBe(100);
    expect(result.answers[0].isCorrect).toBe(true);
  });
});

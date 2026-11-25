import { describe, expect, it } from 'vitest';
import { SubmissionsService } from '../submissions.service.js';

describe('manual essay answer-release policy', () => {
  const quiz: any = {
    id: 'quiz-1', title: 'Tự luận', durationMinutes: 30, totalPoints: 100,
    answerReleaseAt: '2099-01-01T00:00:00.000Z', showScoreImmediately: true,
    showCorrectAnswers: true, showExplanation: true,
  };

  const service = () => new SubmissionsService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );

  it('waits for manual grading while preserving the teacher visibility choices', () => {
    const instance = service();
    const question: any = {
      id: 'essay-1', type: 'ESSAY', content: 'Trình bày lời giải', options: [],
      points: 100, score: 1, order: 1, essayRubric: { acceptedAnswers: [], criteria: [] },
    };

    const snapshot = (instance as any).createAttemptSnapshot(quiz, [question]);

    expect(snapshot.requiresManualEssayGrading).toBe(true);
    expect(snapshot.answerReleaseAt).toBeNull();
    expect(snapshot.showCorrectAnswers).toBe(true);
    expect(snapshot.showExplanation).toBe(true);

    const publicAttempt = (instance as any).publicAttempt({
      quizSnapshot: snapshot, startedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:30:00.000Z', id: 'attempt-1', draftAnswers: [],
    }, quiz);
    expect(publicAttempt.answerReleaseAt).toBeNull();
  });

  it('keeps the selected answer-release policy when every essay can be auto-graded', () => {
    const instance = service();
    const question: any = {
      id: 'essay-1', type: 'ESSAY', content: 'Điền đáp án', options: [],
      points: 100, score: 1, order: 1,
      essayRubric: { acceptedAnswers: ['đáp án mẫu'], criteria: [] },
    };

    const snapshot = (instance as any).createAttemptSnapshot(quiz, [question]);

    expect(snapshot.requiresManualEssayGrading).toBe(false);
    expect(snapshot.answerReleaseAt).toBe(quiz.answerReleaseAt);
    expect(snapshot.showCorrectAnswers).toBe(true);
  });

  it('uses the latest teacher visibility policy without mutating the attempt questions', () => {
    const instance = service();
    const startedWith: any = {
      ...quiz,
      answerReleaseAt: '2099-01-01T00:00:00.000Z',
      showScoreImmediately: false,
      showCorrectAnswers: false,
      showExplanation: false,
    };
    const question: any = {
      id: 'choice-1', type: 'SINGLE_CHOICE', content: 'Nội dung ban đầu',
      options: [{ id: 'a', text: 'A', isCorrect: true }], points: 100, score: 1, order: 1,
    };
    const quizSnapshot = (instance as any).createAttemptSnapshot(startedWith, [question]);
    const currentQuiz: any = {
      ...startedWith,
      answerReleaseAt: '2026-01-01T00:00:00.000Z',
      showScoreImmediately: true,
      showCorrectAnswers: true,
      showExplanation: true,
    };

    const resolved = (instance as any).getAttemptSnapshot({ quizSnapshot }, currentQuiz);

    expect(resolved.questions).toEqual(quizSnapshot.questions);
    expect(resolved.answerReleaseAt).toBe(currentQuiz.answerReleaseAt);
    expect(resolved.showScoreImmediately).toBe(true);
    expect(resolved.showCorrectAnswers).toBe(true);
    expect(resolved.showExplanation).toBe(true);
  });
});

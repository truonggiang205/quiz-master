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
});

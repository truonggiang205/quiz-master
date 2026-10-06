import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionsService } from '../questions.service.js';

describe('QuestionsService Diff & Bank Sync', () => {
  let service: QuestionsService;
  let mockQuestionRepo: any;
  let mockSubmissionRepo: any;
  let mockRubricRepo: any;
  let mockQuizzesService: any;
  let mockUploadService: any;

  beforeEach(() => {
    mockQuestionRepo = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      count: vi.fn(),
      save: vi.fn((q) => Promise.resolve(q)),
      create: vi.fn((q) => q),
      delete: vi.fn(() => Promise.resolve({ affected: 1 })),
      manager: {
        transaction: vi.fn((cb) => cb(mockQuestionRepo.manager)),
        getRepository: vi.fn(() => mockQuestionRepo),
      },
    };

    mockSubmissionRepo = {
      count: vi.fn().mockResolvedValue(0),
      find: vi.fn().mockResolvedValue([]),
    };

    mockRubricRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    mockQuizzesService = {
      getQuizById: vi.fn().mockResolvedValue({ id: 'quiz-1', teacherId: 'teacher-1', subject: 'Toán' }),
      updateQuestionStats: vi.fn().mockResolvedValue(true),
    };

    mockUploadService = {
      uploadBase64: vi.fn(),
      deleteFileByUrl: vi.fn(),
    };

    service = new QuestionsService(
      mockQuestionRepo,
      mockSubmissionRepo,
      mockRubricRepo,
      mockQuizzesService,
      mockUploadService,
    );
  });

  it('updateQuestion: should not call syncQuizStats if score and points are not changed', async () => {
    const existing = {
      id: 'q-1',
      quizId: 'quiz-1',
      content: 'Nội dung cũ',
      score: 2,
      points: 200,
      type: 'SINGLE_CHOICE',
      options: [],
    };
    mockQuestionRepo.findOneBy.mockResolvedValue({ ...existing });
    const syncSpy = vi.spyOn(service as any, 'syncQuizStats');

    await service.updateQuestion('q-1', { content: 'Nội dung mới' });

    expect(mockQuestionRepo.save).toHaveBeenCalledTimes(1);
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('syncQuestionsDiff: should only update the specific modified question in transaction', async () => {
    const q1 = { id: 'q-1', quizId: 'quiz-1', content: 'Câu 1', score: 2, points: 200 };
    mockQuestionRepo.find.mockResolvedValue([q1]);

    const result = await service.syncQuestionsDiff('quiz-1', {
      updated: [{ id: 'q-1', changes: { content: 'Câu 1 đã sửa' } }],
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(q1.content).toBe('Câu 1 đã sửa');
    expect(mockQuizzesService.updateQuestionStats).not.toHaveBeenCalled();
  });

  it('saveToBankFromExam: should clone questions and skip duplicates', async () => {
    const examQuestions = [
      { id: 'q-1', quizId: 'quiz-1', content: 'Câu hỏi trùng', type: 'SINGLE_CHOICE', options: [] },
      { id: 'q-2', quizId: 'quiz-1', content: 'Câu hỏi mới', type: 'SINGLE_CHOICE', options: [] },
    ];
    mockQuestionRepo.find
      .mockResolvedValueOnce(examQuestions) // query exam questions
      .mockResolvedValueOnce([
        { id: 'bank-1', isBank: true, teacherId: 'teacher-1', content: 'câu hỏi trùng', type: 'SINGLE_CHOICE' },
      ]); // existing bank questions

    const result = await service.saveToBankFromExam('teacher-1', {
      examId: 'quiz-1',
      questionIds: ['q-1', 'q-2'],
    });

    expect(result.savedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.totalRequested).toBe(2);
  });
});

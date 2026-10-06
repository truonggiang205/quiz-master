import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionsService } from '../questions.service.js';
import { QuestionEntity, SubmissionEntity } from '../../../entities/index.js';
import { BadRequestException } from '@nestjs/common';

describe('QuestionsService - Essay Rubric and Submission Handling', () => {
  let service: QuestionsService;
  let mockQuestionRepo: any;
  let mockSubmissionRepo: any;
  let mockRubricRepo: any;
  let mockQuizzesService: any;
  let mockUploadService: any;

  beforeEach(() => {
    mockQuestionRepo = {
      findOneBy: vi.fn(),
      count: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      findBy: vi.fn().mockResolvedValue([]),
      create: vi.fn((q) => q),
      save: vi.fn((q) => Promise.resolve(q)),
      delete: vi.fn(),
    };

    mockSubmissionRepo = {
      count: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((s) => s),
      save: vi.fn((s) => Promise.resolve(s)),
    };

    mockRubricRepo = {
      findOneBy: vi.fn(),
      create: vi.fn((r) => r),
      save: vi.fn((r) => Promise.resolve(r)),
    };

    mockQuizzesService = {
      getQuizById: vi.fn(),
      updateQuestionStats: vi.fn(),
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

  it('allows teacher to update essayRubric on an existing essay question when submissions exist without throwing error', async () => {
    const existingQuestion: QuestionEntity = {
      id: 'q-essay-1',
      quizId: 'quiz-1',
      teacherId: 'teacher-1',
      content: 'Thủ đô của Việt Nam là gì?',
      type: 'ESSAY',
      score: 2.0,
      points: 1000,
      isBank: false,
      options: [],
      order: 1,
      isLocked: false,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockQuestionRepo.findOneBy.mockResolvedValue({ ...existingQuestion });
    // There is 1 submission
    mockSubmissionRepo.count.mockResolvedValue(1);
    mockSubmissionRepo.find.mockResolvedValue([]);

    const result = await service.updateQuestion('q-essay-1', {
      content: 'Thủ đô của Việt Nam là gì?',
      score: 2.0,
      points: 1000,
      essayRubric: {
        acceptedAnswers: ['Hà Nội'],
        criteria: [
          { id: 'crit-1', description: 'Nêu đúng Hà Nội', keywords: ['Hà Nội'], maxPoints: 1000 },
        ],
      },
    });

    expect(result).toBeDefined();
    expect(result.essayRubric).toEqual({
      acceptedAnswers: ['Hà Nội'],
      criteria: [
        { id: 'crit-1', description: 'Nêu đúng Hà Nội', keywords: ['Hà Nội'], maxPoints: 1000 },
      ],
    });
    // Points and score should remain preserved
    expect(result.points).toBe(1000);
    expect(result.score).toBe(2.0);
  });

  it('auto-grades existing pending student submissions when teacher fills in the essay rubric', async () => {
    const existingQuestion: QuestionEntity = {
      id: 'q-essay-1',
      quizId: 'quiz-1',
      teacherId: 'teacher-1',
      content: 'Thủ đô của Việt Nam là gì?',
      type: 'ESSAY',
      score: 2.0,
      points: 1000,
      isBank: false,
      options: [],
      order: 1,
      isLocked: false,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pendingSubmission: SubmissionEntity = {
      id: 'sub-1',
      quizId: 'quiz-1',
      quizTitle: 'Bài kiểm tra Địa lý',
      studentId: 'student-1',
      studentName: 'Nguyễn Văn A',
      studentEmail: 'vana@example.com',
      studentAvatar: '',
      score: 0,
      maxScore: 1000,
      percentage: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      timeUsedSeconds: 120,
      submittedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      answers: [
        {
          questionId: 'q-essay-1',
          essayText: 'Thủ đô của Việt Nam là Hà Nội',
          isCorrect: undefined, // Pending manual/auto grading
          scoreAwarded: 0,
        },
      ],
    };

    mockQuestionRepo.findOneBy.mockResolvedValue({ ...existingQuestion });
    mockSubmissionRepo.count.mockResolvedValue(1);
    mockSubmissionRepo.find.mockResolvedValue([pendingSubmission]);

    await service.updateQuestion('q-essay-1', {
      essayRubric: {
        acceptedAnswers: ['Hà Nội', 'Thủ đô của Việt Nam là Hà Nội'],
        criteria: [
          { id: 'c-1', description: 'Có nhắc đến Hà Nội', keywords: ['Hà Nội'], maxPoints: 1000 },
        ],
      },
    });

    // Check that submissionRepo.save was called with auto-graded answer
    expect(mockSubmissionRepo.save).toHaveBeenCalled();
    const savedSub = mockSubmissionRepo.save.mock.calls[0][0];
    expect(savedSub.answers[0].isCorrect).toBe(true);
    expect(savedSub.answers[0].scoreAwarded).toBe(1000);
    expect(savedSub.score).toBe(1000);
    expect(savedSub.percentage).toBe(100);
    expect(savedSub.correctCount).toBe(1);
  });

  it('prevents deleting questions when quiz already has student submissions', async () => {
    const existingQuestion: QuestionEntity = {
      id: 'q-1',
      quizId: 'quiz-1',
      teacherId: 'teacher-1',
      content: 'Câu hỏi kiểm tra',
      type: 'SINGLE_CHOICE',
      score: 2.0,
      points: 1000,
      isBank: false,
      options: [],
      order: 1,
      isLocked: false,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockQuestionRepo.findOneBy.mockResolvedValue(existingQuestion);
    mockSubmissionRepo.count.mockResolvedValue(3); // 3 submissions exist

    await expect(service.deleteQuestion('q-1')).rejects.toThrow(BadRequestException);
  });
});

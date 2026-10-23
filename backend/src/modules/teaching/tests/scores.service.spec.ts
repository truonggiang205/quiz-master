import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoresService } from '../services/scores.service.js';
import { BadRequestException } from '@nestjs/common';

describe('ScoresService - Online Quiz Integration & Scorebook Suite', () => {
  let scoreRepo: any;
  let classRepo: any;
  let userRepo: any;
  let lessonRepo: any;
  let teacherStudentRepo: any;
  let quizRepo: any;
  let submissionRepo: any;
  let service: ScoresService;

  const teacherId = 'teacher-101';
  const otherTeacherId = 'teacher-999';
  const classId = 'class-math-101';
  const otherClassId = 'class-phys-202';
  const studentAccountId = 'user-student-001';
  const profileId = 'ts-student-001';

  beforeEach(() => {
    scoreRepo = {
      createQueryBuilder: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((data) => ({ ...data, id: 'scr-' + Math.random() })),
      save: vi.fn((data) => Promise.resolve(data)),
      remove: vi.fn(),
    };

    classRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: classId,
        name: 'Toán 10A1',
        teacherId,
        students: [
          {
            id: studentAccountId,
            name: 'Nguyễn Văn A',
            email: 'nguyenvana@example.com',
          },
        ],
      }),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    userRepo = {
      findOne: vi.fn(),
    };

    lessonRepo = {
      findOne: vi.fn(),
    };

    teacherStudentRepo = {
      find: vi.fn().mockResolvedValue([
        {
          id: profileId,
          teacherId,
          studentAccountId,
          fullName: 'Nguyễn Văn A',
          email: 'nguyenvana@example.com',
        },
      ]),
      findOne: vi.fn(),
    };

    quizRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    submissionRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    service = new ScoresService(
      scoreRepo,
      classRepo,
      userRepo,
      lessonRepo,
      teacherStudentRepo,
      quizRepo,
      submissionRepo,
    );
  });

  it('TC-TCH-SCORE-UNIT-001: Validate khoảng điểm hợp lệ: 0 <= score <= maxScore', () => {
    expect(() => (service as any).validateScoreRange(8, 10)).not.toThrow();
    expect(() => (service as any).validateScoreRange(0, 10)).not.toThrow();
    expect(() => (service as any).validateScoreRange(10, 10)).not.toThrow();
    expect(() => (service as any).validateScoreRange(-1, 10)).toThrow(BadRequestException);
    expect(() => (service as any).validateScoreRange(5, 0)).toThrow(BadRequestException);
    expect(() => (service as any).validateScoreRange(12, 10)).toThrow(BadRequestException);
  });

  it('TC-SCORE-ONLINE-01: Student có account + đã làm quiz -> online score xuất hiện', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-1',
        title: 'Kiểm tra 15 phút Số học',
        teacherId,
        classId,
        createdAt: new Date('2026-10-20'),
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        quizId: 'quiz-1',
        studentId: studentAccountId,
        score: 9,
        maxScore: 10,
        submittedAt: '2026-10-21T08:00:00.000Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(1);
    expect(results[0].source).toBe('ONLINE');
    expect(results[0].quizId).toBe('quiz-1');
    expect(results[0].score).toBe(9);
    expect(results[0].maxScore).toBe(10);
    expect(results[0].assessmentName).toBe('Kiểm tra 15 phút Số học');
  });

  it('TC-SCORE-ONLINE-02: Student có account + chưa làm quiz -> không có score', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-not-taken',
        title: 'Quiz chưa làm',
        teacherId,
        classId,
      },
    ]);

    // Student has not submitted any attempt
    submissionRepo.find.mockResolvedValue([]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(0);

    const matrix = await service.getClassScoreMatrix(teacherId, classId);
    expect(matrix.students.length).toBe(1);
    expect(matrix.students[0].totalAssessments).toBe(0);
    expect(matrix.students[0].averageScore).toBe(0);
    expect(matrix.students[0].scores).toEqual({});
  });

  it('TC-SCORE-ONLINE-03: Student thủ công -> manual score vẫn hoạt động bình thường', async () => {
    const manualStudentId = 'ts-manual-999';

    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'scr-manual-only',
          teacherId,
          classId,
          studentId: manualStudentId,
          assessmentName: 'Kiểm tra 15 phút Hình học',
          assessmentType: 'QUIZ',
          score: 8.5,
          maxScore: 10,
          date: '2026-10-21',
          student: { id: manualStudentId, name: 'Học sinh thủ công Thùy' },
        },
      ]),
    });

    // No online quiz submissions
    quizRepo.find.mockResolvedValue([]);
    submissionRepo.find.mockResolvedValue([]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(1);
    expect(results[0].source).toBe('MANUAL');
    expect(results[0].score).toBe(8.5);
    expect(results[0].student?.name).toBe('Học sinh thủ công Thùy');
  });

  it('TC-SCORE-ONLINE-04: Student có account + manual score -> cả hai nguồn điểm được xử lý đúng', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'scr-oral',
          teacherId,
          classId,
          studentId: studentAccountId,
          assessmentName: 'Kiểm tra miệng',
          assessmentType: 'ORAL',
          score: 8.5,
          maxScore: 10,
          date: '2026-10-20',
        },
      ]),
    });

    scoreRepo.find.mockResolvedValue([
      {
        id: 'scr-oral',
        teacherId,
        classId,
        studentId: studentAccountId,
        assessmentName: 'Kiểm tra miệng',
        assessmentType: 'ORAL',
        score: 8.5,
        maxScore: 10,
        date: '2026-10-20',
      },
    ]);

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-online-diff',
        title: 'Quiz 01 Đại số',
        teacherId,
        classId,
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-online-diff',
        quizId: 'quiz-online-diff',
        studentId: studentAccountId,
        score: 9.5,
        maxScore: 10,
        submittedAt: '2026-10-21T08:00:00.000Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(2);
    expect(results.some((r) => r.source === 'MANUAL' && r.score === 8.5)).toBe(true);
    expect(results.some((r) => r.source === 'ONLINE' && r.score === 9.5)).toBe(true);

    const matrix = await service.getClassScoreMatrix(teacherId, classId);
    expect(matrix.assessments.length).toBe(2);
    expect(matrix.students[0].totalAssessments).toBe(2);
    // (8.5 + 9.5) / 2 = 9.0
    expect(matrix.students[0].averageScore).toBe(9.0);
  });

  it('TC-SCORE-ONLINE-05: Quiz của Teacher A -> không xuất hiện trong Teacher B Scores', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    // When querying for otherTeacherId, quizRepo should filter where { teacherId: otherTeacherId }
    quizRepo.find.mockImplementation(async ({ where }: any) => {
      if (where.teacherId === otherTeacherId) return [];
      return [{ id: 'quiz-teacher-a', teacherId, classId }];
    });

    const results = await service.getScores(otherTeacherId, { classId });
    expect(results.length).toBe(0);
  });

  it('TC-SCORE-ONLINE-06: Essay chưa chấm -> không hiển thị điểm cuối cùng', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-essay',
        title: 'Tự luận Văn học',
        teacherId,
        classId,
      },
    ]);

    // Submission with ungraded essay answer
    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-essay-pending',
        quizId: 'quiz-essay',
        studentId: studentAccountId,
        score: 0,
        maxScore: 10,
        submittedAt: '2026-10-22T10:00:00Z',
        answers: [
          { questionId: 'q1', textAnswer: 'Bài làm tự luận...', isCorrect: null, isManuallyGraded: false },
        ],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(0);
  });

  it('TC-SCORE-ONLINE-07: Student submit lại -> score phản ánh kết quả hợp lệ mới nhất theo lifecycle hiện tại', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-multi-attempt',
        title: 'Trắc nghiệm Hàm số',
        teacherId,
        classId,
      },
    ]);

    // Submissions ordered DESC: latest first
    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-attempt-2',
        quizId: 'quiz-multi-attempt',
        studentId: studentAccountId,
        score: 9.5,
        maxScore: 10,
        createdAt: new Date('2026-10-22T10:00:00Z'),
        submittedAt: '2026-10-22T10:00:00Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
      {
        id: 'sub-attempt-1',
        quizId: 'quiz-multi-attempt',
        studentId: studentAccountId,
        score: 6.0,
        maxScore: 10,
        createdAt: new Date('2026-10-21T09:00:00Z'),
        submittedAt: '2026-10-21T09:00:00Z',
        answers: [{ questionId: 'q1', isCorrect: false }],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(1);
    expect(results[0].submissionId).toBe('sub-attempt-2');
    expect(results[0].score).toBe(9.5);
  });

  it('TC-SCORE-ONLINE-08: Không tạo duplicate score khi giáo viên đã nhập điểm cho bài kiểm tra cùng tên', async () => {
    const quizTitle = 'Kiểm tra 15 phút Đại số';

    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'scr-manual-dup',
          teacherId,
          classId,
          studentId: studentAccountId,
          assessmentName: quizTitle,
          assessmentType: 'QUIZ',
          score: 9.0,
          maxScore: 10,
          date: '2026-10-22',
        },
      ]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-dup',
        title: quizTitle,
        teacherId,
        classId,
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-dup',
        quizId: 'quiz-dup',
        studentId: studentAccountId,
        score: 8.0,
        maxScore: 10,
        submittedAt: '2026-10-22T08:00:00Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    // Online score was skipped because manual score exists for this quiz
    expect(results.length).toBe(1);
    expect(results[0].source).toBe('MANUAL');
    expect(results[0].score).toBe(9.0);
  });

  it('TC-SCORE-ONLINE-09: Điểm trung bình không bị tính duplicate khi có cả manual và online cho cùng bài', async () => {
    const quizTitle = 'Kiểm tra 15 phút Đại số';

    scoreRepo.find.mockResolvedValue([
      {
        id: 'scr-manual-dup',
        teacherId,
        classId,
        studentId: studentAccountId,
        assessmentName: quizTitle,
        assessmentType: 'QUIZ',
        score: 9.0,
        maxScore: 10,
        date: '2026-10-22',
      },
    ]);

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-dup',
        title: quizTitle,
        teacherId,
        classId,
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-dup',
        quizId: 'quiz-dup',
        studentId: studentAccountId,
        score: 8.0,
        maxScore: 10,
        submittedAt: '2026-10-22T08:00:00Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const matrix = await service.getClassScoreMatrix(teacherId, classId);

    // Only 1 assessment should exist, no duplicate online column
    expect(matrix.assessments.length).toBe(1);
    expect(matrix.assessments[0].source).toBe('MANUAL');
    expect(matrix.students[0].totalAssessments).toBe(1);
    // Average must be 9.0, not (9.0 + 8.0)/2 = 8.5
    expect(matrix.students[0].averageScore).toBe(9.0);
    expect(matrix.classAverage).toBe(9.0);
  });

  it('TC-SCORE-ONLINE-10: Teacher Scores không tạo INSERT/UPDATE ngầm khi GET', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    await service.getScores(teacherId, { classId });
    await service.getClassScoreMatrix(teacherId, classId);

    expect(scoreRepo.save).not.toHaveBeenCalled();
    expect(scoreRepo.create).not.toHaveBeenCalled();
    expect(classRepo.save).not.toHaveBeenCalled();
    expect(classRepo.create).not.toHaveBeenCalled();
  });

  it('TC-SCORE-ONLINE-11: Attempting to delete online score throws BadRequestException', async () => {
    await expect(service.deleteScore(teacherId, 'online-sub-123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-SCORE-ONLINE-12: Attempting to update online score throws BadRequestException', async () => {
    await expect(
      service.updateScore(teacherId, 'online-sub-123', { score: 9 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-SCORE-ONLINE-13: Score normalization converts score to scale 10 (e.g. 40/50 -> 8.0/10)', async () => {
    scoreRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-50pts',
        title: 'Đề thi 50 câu 50 điểm',
        teacherId,
        classId,
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-pts',
        quizId: 'quiz-50pts',
        studentId: studentAccountId,
        score: 40,
        maxScore: 50,
        submittedAt: '2026-10-21T08:00:00.000Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const results = await service.getScores(teacherId, { classId });
    expect(results.length).toBe(1);
    expect(results[0].score).toBe(8.0);
    expect(results[0].maxScore).toBe(10);
  });

  it('TC-SCORE-ONLINE-14: Private 1-1 class student can view online quiz scores', async () => {
    const privateClassId = `private-${studentAccountId}`;
    classRepo.findOne.mockResolvedValue({
      id: privateClassId,
      name: 'Kèm 1-1: Nguyễn Văn A',
      teacherId,
      isPrivate: true,
      students: [
        {
          id: studentAccountId,
          name: 'Nguyễn Văn A',
          email: 'nguyenvana@example.com',
        },
      ],
    });

    quizRepo.find.mockResolvedValue([
      {
        id: 'quiz-private',
        title: 'Chuyên đề 1-1 Bất đẳng thức',
        teacherId,
        classId: privateClassId,
      },
    ]);

    submissionRepo.find.mockResolvedValue([
      {
        id: 'sub-private-1',
        quizId: 'quiz-private',
        studentId: studentAccountId,
        score: 10,
        maxScore: 10,
        submittedAt: '2026-10-23T08:00:00Z',
        answers: [{ questionId: 'q1', isCorrect: true }],
      },
    ]);

    const matrix = await service.getClassScoreMatrix(teacherId, privateClassId);
    expect(matrix.assessments.length).toBe(1);
    expect(matrix.assessments[0].source).toBe('ONLINE');
    expect(matrix.students[0].averageScore).toBe(10);
  });
});

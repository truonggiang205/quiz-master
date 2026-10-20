import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../dashboard.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockQuizRepo: any;
  let mockSubmissionRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockQuizRepo = {
      createQueryBuilder: vi.fn(),
      find: vi.fn(),
    };

    mockSubmissionRepo = {
      createQueryBuilder: vi.fn(),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    service = new DashboardService(mockQuizRepo, mockSubmissionRepo, mockUserRepo);
  });

  describe('getTeacherDashboard', () => {
    it('should aggregate quiz stats, SQL score distribution, and continuous activity trend', async () => {
      // Mock Quiz query
      const mockQuizQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [
            { id: 'quiz-1', status: 'PUBLISHED', subject: 'Toán' },
            { id: 'quiz-2', status: 'DRAFT', subject: 'Văn' },
          ],
          2,
        ]),
      };
      mockQuizRepo.createQueryBuilder.mockReturnValue(mockQuizQb);
      mockQuizRepo.find.mockResolvedValue([
        { id: 'quiz-1', title: 'Đề 1', subject: 'Toán', status: 'PUBLISHED' },
        { id: 'quiz-2', title: 'Đề 2', subject: 'Văn', status: 'DRAFT' },
      ]);

      // Mock Submissions stats query
      const mockSubQb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({
          totalSubmissions: '10',
          totalStudents: '4',
          avgPercentage: '78.5',
          range1: '1', // < 5.0
          range2: '2', // 5.0 - 6.5
          range3: '4', // 6.5 - 8.0
          range4: '2', // 8.0 - 9.0
          range5: '1', // 9.0 - 10
        }),
        getRawMany: vi.fn().mockImplementation(() => {
          const now = new Date();
          const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          return Promise.resolve([
            { dateStr: localToday, count: '5', avgScore: '80.0' },
          ]);
        }),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

      const result = await service.getTeacherDashboard('teacher-1', { periodDays: 7 });

      expect(result.stats.totalQuizzes).toBe(2);
      expect(result.stats.activeQuizzes).toBe(1);
      expect(result.stats.totalSubmissions).toBe(10);
      expect(result.stats.totalStudents).toBe(4);
      expect(result.stats.averageScore).toBe(7.85); // 78.5 / 10

      // Score distribution check
      expect(result.charts.scoreDistribution).toHaveLength(5);
      expect(result.charts.scoreDistribution[0].range).toBe('< 5.0');
      expect(result.charts.scoreDistribution[0].count).toBe(1);
      expect(result.charts.scoreDistribution[0].percentage).toBe(10); // 1/10 * 100

      // Activity trend check (7 days continuous)
      expect(result.charts.activityTrend).toHaveLength(7);
      const todayEntry = result.charts.activityTrend[result.charts.activityTrend.length - 1];
      expect(todayEntry.submissions).toBe(5);
      expect(todayEntry.avgScore).toBe(8.0);

      // Filter options
      expect(result.filterOptions.subjects).toEqual(['Toán', 'Văn']);
      expect(result.filterOptions.quizzes).toHaveLength(2);
    });
  });

  describe('getTeacherSubmissions', () => {
    it('should paginate and filter submissions correctly', async () => {
      const mockSubQb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [
            { id: 'sub-1', score: 850, percentage: 85, studentName: 'Nguyễn Văn A' },
          ],
          15,
        ]),
      };
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

      const result = await service.getTeacherSubmissions('teacher-1', {
        page: 2,
        limit: 10,
        scoreMin: 8,
        scoreMax: 9,
        search: 'Nguyễn',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(mockSubQb.skip).toHaveBeenCalledWith(10);
      expect(mockSubQb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getTeacherStudents', () => {
    it('should return aggregated student metrics', async () => {
      const rawStudents = [
        {
          id: 'stu-1',
          name: 'Học sinh 1',
          email: 'hs1@gmail.com',
          avatar: null,
          submissionsCount: '5',
          averageScore: '8.25',
          highestScore: '9.50',
          lastSubmittedAt: '2026-10-06T10:00:00Z',
        },
      ];

      const mockSubQb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        addGroupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(rawStudents),
      };
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

      const result = await service.getTeacherStudents('teacher-1', { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('Học sinh 1');
      expect(result.items[0].submissionsCount).toBe(5);
      expect(result.items[0].averageScore).toBe(8.25);
      expect(result.items[0].highestScore).toBe(9.5);
    });
  });

  describe('getStudentDashboard', () => {
    it('should return null for average and highest score when student has 0 submissions', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'stu-new', classes: [] });

      const mockQuizQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { id: 'quiz-1', totalAttempts: 1, subject: 'Toán' },
        ]),
      };
      mockQuizRepo.createQueryBuilder.mockReturnValue(mockQuizQb);

      const mockSubQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

      const result = await service.getStudentDashboard('stu-new');

      expect(result.stats.completedCount).toBe(0);
      expect(result.stats.availableCount).toBe(1);
      expect(result.stats.averageScore).toBeNull();
      expect(result.stats.highestScore).toBeNull();
      expect(result.progressTrend).toHaveLength(0);
      expect(result.subjectPerformance).toHaveLength(0);
    });

    it('should calculate progress trend and subject performance when student has submissions', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'stu-1', classes: [] });

      const mockQuizQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { id: 'quiz-1', totalAttempts: 1, subject: 'Toán' },
          { id: 'quiz-2', totalAttempts: 2, subject: 'Văn' },
        ]),
      };
      mockQuizRepo.createQueryBuilder.mockReturnValue(mockQuizQb);

      const mockSubQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: 'sub-1',
            quizId: 'quiz-1',
            quizTitle: 'Đề Toán',
            percentage: 80,
            score: 800,
            createdAt: new Date(),
          },
          {
            id: 'sub-2',
            quizId: 'quiz-2',
            quizTitle: 'Đề Văn',
            percentage: 90,
            score: 900,
            createdAt: new Date(),
          },
        ]),
      };
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

      const result = await service.getStudentDashboard('stu-1');

      expect(result.stats.completedCount).toBe(2);
      expect(result.stats.averageScore).toBe(8.5); // (80 + 90) / 2 / 10 = 8.5
      expect(result.stats.highestScore).toBe(9.0); // 90 / 10 = 9.0
      expect(result.progressTrend).toHaveLength(2);
      expect(result.subjectPerformance).toHaveLength(2);
    });
  });
});

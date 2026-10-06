import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizEntity, SubmissionEntity, UserEntity } from '../../entities/index.js';
import {
  TeacherDashboardQueryDto,
  TeacherSubmissionsQueryDto,
  TeacherStudentsQueryDto,
} from './dto/teacher-dashboard-query.dto.js';
import { StudentDashboardQueryDto } from './dto/student-dashboard-query.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private formatDayLabel(d: Date): string {
    const dayOfWeek = d.getDay();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = dayNames[dayOfWeek];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${dayName} ${day}/${month}`;
  }

  private formatDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getTeacherDashboard(teacherId: string, query: TeacherDashboardQueryDto = {}) {
    const { periodDays = 7, quizId, subject, classId, status, from, to } = query;

    // 1. Quizzes query
    const quizQb = this.quizRepo
      .createQueryBuilder('quiz')
      .where('quiz.teacherId = :teacherId', { teacherId });

    if (quizId) quizQb.andWhere('quiz.id = :quizId', { quizId });
    if (subject) quizQb.andWhere('quiz.subject = :subject', { subject });
    if (classId) quizQb.andWhere('quiz.classId = :classId', { classId });
    if (status) quizQb.andWhere('quiz.status = :status', { status });

    const [quizzes, totalQuizzes] = await quizQb
      .orderBy('quiz.createdAt', 'DESC')
      .getManyAndCount();

    const activeQuizzes = quizzes.filter((q) => q.status === 'PUBLISHED').length;

    // Available subjects and quizzes for filter options
    const allTeacherQuizzes = await this.quizRepo.find({
      where: { teacherId },
      select: { id: true, title: true, subject: true, status: true },
      order: { createdAt: 'DESC' },
    });
    const availableSubjects = Array.from(
      new Set(allTeacherQuizzes.map((q) => q.subject).filter(Boolean)),
    );
    const availableQuizzes = allTeacherQuizzes.map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      status: q.status,
    }));

    // Date range calculation
    let startDate: Date | null = null;
    let endDate: Date = new Date();

    if (from) {
      startDate = new Date(from);
    } else if (Number(periodDays) > 0) {
      startDate = new Date(Date.now() - Number(periodDays) * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    }
    if (to) {
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    }

    // 2. Submissions query for teacher's quizzes
    const subQb = this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin(QuizEntity, 'quiz', 'quiz.id = sub.quizId')
      .where('quiz.teacherId = :teacherId', { teacherId });

    if (quizId) subQb.andWhere('sub.quizId = :quizId', { quizId });
    if (subject) subQb.andWhere('quiz.subject = :subject', { subject });
    if (classId) subQb.andWhere('quiz.classId = :classId', { classId });
    if (status) subQb.andWhere('quiz.status = :status', { status });
    if (startDate) subQb.andWhere('sub.createdAt >= :startDate', { startDate });
    if (endDate) subQb.andWhere('sub.createdAt <= :endDate', { endDate });

    // Aggregate stats in SQL
    const aggResult = await subQb
      .select('COUNT(sub.id)', 'totalSubmissions')
      .addSelect('COUNT(DISTINCT sub.studentId)', 'totalStudents')
      .addSelect('AVG(sub.percentage)', 'avgPercentage')
      .addSelect('SUM(CASE WHEN sub.percentage < 50 THEN 1 ELSE 0 END)', 'range1')
      .addSelect('SUM(CASE WHEN sub.percentage >= 50 AND sub.percentage < 65 THEN 1 ELSE 0 END)', 'range2')
      .addSelect('SUM(CASE WHEN sub.percentage >= 65 AND sub.percentage < 80 THEN 1 ELSE 0 END)', 'range3')
      .addSelect('SUM(CASE WHEN sub.percentage >= 80 AND sub.percentage < 90 THEN 1 ELSE 0 END)', 'range4')
      .addSelect('SUM(CASE WHEN sub.percentage >= 90 THEN 1 ELSE 0 END)', 'range5')
      .getRawOne();

    const totalSubmissions = Number(aggResult?.totalSubmissions || 0);
    const totalStudents = Number(aggResult?.totalStudents || 0);
    const avgPercentage = Number(aggResult?.avgPercentage || 0);
    // Convert 0-100 percentage to 10-point scale: 80% -> 8.00
    const averageScore = Number(((avgPercentage / 10)).toFixed(2));

    // Score distribution with percentage calculation
    const r1 = Number(aggResult?.range1 || 0);
    const r2 = Number(aggResult?.range2 || 0);
    const r3 = Number(aggResult?.range3 || 0);
    const r4 = Number(aggResult?.range4 || 0);
    const r5 = Number(aggResult?.range5 || 0);

    const scoreDistribution = [
      {
        range: '< 5.0',
        min: 0,
        max: 5,
        count: r1,
        percentage: totalSubmissions > 0 ? Number(((r1 / totalSubmissions) * 100).toFixed(1)) : 0,
      },
      {
        range: '5.0 - 6.5',
        min: 5,
        max: 6.5,
        count: r2,
        percentage: totalSubmissions > 0 ? Number(((r2 / totalSubmissions) * 100).toFixed(1)) : 0,
      },
      {
        range: '6.5 - 8.0',
        min: 6.5,
        max: 8,
        count: r3,
        percentage: totalSubmissions > 0 ? Number(((r3 / totalSubmissions) * 100).toFixed(1)) : 0,
      },
      {
        range: '8.0 - 9.0',
        min: 8,
        max: 9,
        count: r4,
        percentage: totalSubmissions > 0 ? Number(((r4 / totalSubmissions) * 100).toFixed(1)) : 0,
      },
      {
        range: '9.0 - 10',
        min: 9,
        max: 10,
        count: r5,
        percentage: totalSubmissions > 0 ? Number(((r5 / totalSubmissions) * 100).toFixed(1)) : 0,
      },
    ];

    // 3. Activity Trend query grouped by DATE in SQL
    const trendQb = this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin(QuizEntity, 'quiz', 'quiz.id = sub.quizId')
      .where('quiz.teacherId = :teacherId', { teacherId });

    if (quizId) trendQb.andWhere('sub.quizId = :quizId', { quizId });
    if (subject) trendQb.andWhere('quiz.subject = :subject', { subject });
    if (classId) trendQb.andWhere('quiz.classId = :classId', { classId });
    if (status) trendQb.andWhere('quiz.status = :status', { status });
    if (startDate) trendQb.andWhere('sub.createdAt >= :startDate', { startDate });
    if (endDate) trendQb.andWhere('sub.createdAt <= :endDate', { endDate });

    const rawTrend = await trendQb
      .select('DATE(sub.createdAt)', 'dateStr')
      .addSelect('COUNT(sub.id)', 'count')
      .addSelect('AVG(sub.percentage)', 'avgScore')
      .groupBy('DATE(sub.createdAt)')
      .orderBy('dateStr', 'ASC')
      .getRawMany();

    const trendMap = new Map<string, { count: number; avgScore: number }>();
    for (const row of rawTrend) {
      const dStr = row.dateStr instanceof Date ? this.formatDateString(row.dateStr) : String(row.dateStr).slice(0, 10);
      trendMap.set(dStr, {
        count: Number(row.count || 0),
        avgScore: Number(((Number(row.avgScore || 0) / 10)).toFixed(2)),
      });
    }

    // Build continuous date timeline based on period
    const daysToShow = Number(periodDays) > 0 ? Math.min(Number(periodDays), 90) : 7;
    const activityTrend: Array<{ day: string; date: string; submissions: number; avgScore: number }> = [];

    const cursorDate = new Date();
    cursorDate.setHours(0, 0, 0, 0);

    for (let i = daysToShow - 1; i >= 0; i--) {
      const target = new Date(cursorDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = this.formatDateString(target);
      const entry = trendMap.get(dStr) || { count: 0, avgScore: 0 };
      activityTrend.push({
        day: this.formatDayLabel(target),
        date: dStr,
        submissions: entry.count,
        avgScore: entry.avgScore,
      });
    }

    // Recent 5 quizzes and submissions
    const recentSubmissions = await this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin(QuizEntity, 'quiz', 'quiz.id = sub.quizId')
      .where('quiz.teacherId = :teacherId', { teacherId })
      .orderBy('sub.createdAt', 'DESC')
      .take(5)
      .getMany();

    return {
      stats: {
        totalQuizzes,
        activeQuizzes,
        totalStudents,
        totalSubmissions,
        averageScore,
      },
      charts: {
        scoreDistribution,
        activityTrend,
      },
      filterOptions: {
        subjects: availableSubjects,
        quizzes: availableQuizzes,
      },
      recentQuizzes: quizzes.slice(0, 5),
      recentSubmissions,
    };
  }

  async getTeacherSubmissions(teacherId: string, query: TeacherSubmissionsQueryDto = {}) {
    const {
      quizId,
      studentId,
      scoreMin,
      scoreMax,
      date,
      search,
      page = 1,
      limit = 10,
      sort = 'time_desc',
    } = query;

    const qb = this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin(QuizEntity, 'quiz', 'quiz.id = sub.quizId')
      .where('quiz.teacherId = :teacherId', { teacherId });

    if (quizId) {
      qb.andWhere('sub.quizId = :quizId', { quizId });
    }
    if (studentId) {
      qb.andWhere('sub.studentId = :studentId', { studentId });
    }
    if (scoreMin !== undefined && scoreMin !== null) {
      // scoreMin is in 10 scale, percentage is 0-100
      qb.andWhere('sub.percentage >= :minPerc', { minPerc: Number(scoreMin) * 10 });
    }
    if (scoreMax !== undefined && scoreMax !== null) {
      qb.andWhere('sub.percentage <= :maxPerc', { maxPerc: Number(scoreMax) * 10 });
    }
    if (date) {
      qb.andWhere('DATE(sub.createdAt) = :date', { date });
    }
    if (search && search.trim()) {
      qb.andWhere(
        '(sub.studentName LIKE :search OR sub.studentEmail LIKE :search OR quiz.title LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    if (sort === 'score_desc') {
      qb.orderBy('sub.score', 'DESC');
    } else if (sort === 'score_asc') {
      qb.orderBy('sub.score', 'ASC');
    } else if (sort === 'time_asc') {
      qb.orderBy('sub.createdAt', 'ASC');
    } else {
      qb.orderBy('sub.createdAt', 'DESC');
    }

    const safePage = Math.max(1, Number(page));
    const safeLimit = Math.min(100, Math.max(1, Number(limit)));
    const skip = (safePage - 1) * safeLimit;

    qb.skip(skip).take(safeLimit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getTeacherStudents(teacherId: string, query: TeacherStudentsQueryDto = {}) {
    const { search, page = 1, limit = 20 } = query;

    const qb = this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin(QuizEntity, 'quiz', 'quiz.id = sub.quizId')
      .where('quiz.teacherId = :teacherId', { teacherId });

    if (search && search.trim()) {
      qb.andWhere('(sub.studentName LIKE :search OR sub.studentEmail LIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    qb.select('sub.studentId', 'id')
      .addSelect('sub.studentName', 'name')
      .addSelect('sub.studentEmail', 'email')
      .addSelect('sub.studentAvatar', 'avatar')
      .addSelect('COUNT(sub.id)', 'submissionsCount')
      .addSelect('ROUND(AVG(sub.percentage) / 10, 2)', 'averageScore')
      .addSelect('ROUND(MAX(sub.percentage) / 10, 2)', 'highestScore')
      .addSelect('MAX(sub.createdAt)', 'lastSubmittedAt')
      .groupBy('sub.studentId')
      .addGroupBy('sub.studentName')
      .addGroupBy('sub.studentEmail')
      .addGroupBy('sub.studentAvatar')
      .orderBy('lastSubmittedAt', 'DESC');

    const rawStudents = await qb.getRawMany();
    const total = rawStudents.length;

    const safePage = Math.max(1, Number(page));
    const safeLimit = Math.min(100, Math.max(1, Number(limit)));
    const skip = (safePage - 1) * safeLimit;
    const paginated = rawStudents.slice(skip, skip + safeLimit).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      submissionsCount: Number(s.submissionsCount || 0),
      averageScore: Number(s.averageScore || 0),
      highestScore: Number(s.highestScore || 0),
      lastSubmittedAt: s.lastSubmittedAt,
    }));

    return {
      items: paginated,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getStudentDashboard(studentId: string, query: StudentDashboardQueryDto = {}) {
    const { subject, periodDays, search } = query;

    const student = await this.userRepo.findOne({
      where: { id: studentId },
      relations: { classes: true },
    });

    const classIds = student?.classes?.map((c) => c.id) || [];

    // All published quizzes accessible to this student
    const quizQb = this.quizRepo
      .createQueryBuilder('quiz')
      .where('quiz.status = :status', { status: 'PUBLISHED' })
      .andWhere(
        `(
          (quiz.classId IS NULL AND (quiz.assignedStudentIds IS NULL OR JSON_LENGTH(quiz.assignedStudentIds) = 0)) OR
          (quiz.classId IN (:...classIds)) OR
          (JSON_CONTAINS(quiz.assignedStudentIds, :studentIdStr))
        )`,
        {
          classIds: classIds.length ? classIds : ['DUMMY_ID'],
          studentIdStr: `"${studentId}"`,
        },
      );

    if (subject) {
      quizQb.andWhere('quiz.subject = :subject', { subject });
    }
    if (search && search.trim()) {
      quizQb.andWhere('quiz.title LIKE :search', { search: `%${search.trim()}%` });
    }

    const quizzes = await quizQb.orderBy('quiz.createdAt', 'DESC').getMany();

    // Student's submissions
    const subQb = this.submissionRepo
      .createQueryBuilder('sub')
      .where('sub.studentId = :studentId', { studentId });

    if (periodDays && Number(periodDays) > 0) {
      const startDate = new Date(Date.now() - Number(periodDays) * 24 * 60 * 60 * 1000);
      subQb.andWhere('sub.createdAt >= :startDate', { startDate });
    }

    const mySubmissions = await subQb.orderBy('sub.createdAt', 'DESC').getMany();

    const submissionCounts = mySubmissions.reduce(
      (acc, sub) => {
        acc[sub.quizId] = (acc[sub.quizId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const availableQuizzes = quizzes.filter(
      (q) => (submissionCounts[q.id] || 0) < (q.totalAttempts || 1),
    );

    const totalCompleted = mySubmissions.length;
    let avgScore: number | null = null;
    let highestScore: number | null = null;

    if (totalCompleted > 0) {
      const totalPerc = mySubmissions.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
      avgScore = Number(((totalPerc / totalCompleted) / 10).toFixed(2));
      const maxPerc = Math.max(...mySubmissions.map((s) => Number(s.percentage || 0)));
      highestScore = Number(((maxPerc / 10)).toFixed(2));
    }

    // Progress trend: chronological order for chart
    const progressTrend = [...mySubmissions]
      .reverse()
      .slice(-15)
      .map((s) => ({
        id: s.id,
        quizTitle: s.quizTitle,
        submittedAt: s.submittedAt || s.createdAt,
        score: Number(((s.percentage / 10)).toFixed(2)),
        percentage: s.percentage,
        timeUsedSeconds: s.timeUsedSeconds,
      }));

    // Subject performance breakdown
    const subjectMap = new Map<string, { totalPerc: number; count: number }>();
    const quizMap = new Map(quizzes.map((q) => [q.id, q]));

    for (const sub of mySubmissions) {
      const q = quizMap.get(sub.quizId);
      const subj = q?.subject || 'Khác';
      const existing = subjectMap.get(subj) || { totalPerc: 0, count: 0 };
      existing.totalPerc += Number(sub.percentage || 0);
      existing.count += 1;
      subjectMap.set(subj, existing);
    }

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subj, data]) => ({
      subject: subj,
      count: data.count,
      avgScore: Number(((data.totalPerc / data.count) / 10).toFixed(2)),
    }));

    // Available subjects for student filter
    const availableSubjects = Array.from(new Set(quizzes.map((q) => q.subject).filter(Boolean)));

    return {
      stats: {
        availableCount: availableQuizzes.length,
        completedCount: totalCompleted,
        totalQuizzes: quizzes.length,
        averageScore: avgScore, // null if 0 submissions
        highestScore: highestScore, // null if 0 submissions
      },
      availableQuizzes: availableQuizzes.slice(0, 6),
      recentSubmissions: mySubmissions.slice(0, 6),
      progressTrend,
      subjectPerformance,
      availableSubjects,
    };
  }
}

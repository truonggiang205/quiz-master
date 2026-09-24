import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizEntity, SubmissionEntity, UserEntity } from '../../entities/index.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
  ) {}

  async getTeacherDashboard(teacherId: string) {
    const quizzes = await this.quizRepo.find({ 
      where: { teacherId },
      order: { createdAt: 'DESC' } 
    });
    const totalQuizzes = quizzes.length;
    const activeQuizzes = quizzes.filter((q) => q.status === 'PUBLISHED').length;

    const quizIds = quizzes.map((q) => q.id);
    let submissions: SubmissionEntity[] = [];
    if (quizIds.length > 0) {
      submissions = await this.submissionRepo.find({ 
        where: { quizId: In(quizIds) },
        order: { createdAt: 'DESC' } 
      });
    }
    const totalSubmissions = submissions.length;
    const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size;

    const averageScore =
      totalSubmissions > 0
        ? Number(
            (
              submissions.reduce((sum, s) => sum + Number(s.score), 0) / totalSubmissions
            ).toFixed(1),
          )
        : 0;

    // Score distribution for chart based on real submission data
    const scoreDistribution = [
      { range: '< 5.0', count: submissions.filter((s) => Number(s.score) < 5).length },
      { range: '5.0 - 6.5', count: submissions.filter((s) => Number(s.score) >= 5 && Number(s.score) < 6.5).length },
      { range: '6.5 - 8.0', count: submissions.filter((s) => Number(s.score) >= 6.5 && Number(s.score) < 8).length },
      { range: '8.0 - 9.0', count: submissions.filter((s) => Number(s.score) >= 8 && Number(s.score) < 9).length },
      { range: '9.0 - 10', count: submissions.filter((s) => Number(s.score) >= 9).length },
    ];

    // Activity trend
    const activityTrend = [
      { day: 'Thứ 2', submissions: 0, avgScore: 0 },
      { day: 'Thứ 3', submissions: 0, avgScore: 0 },
      { day: 'Thứ 4', submissions: 0, avgScore: 0 },
      { day: 'Thứ 5', submissions: 0, avgScore: 0 },
      { day: 'Thứ 6', submissions: 0, avgScore: 0 },
      { day: 'Thứ 7', submissions: 0, avgScore: 0 },
      { day: 'Chủ Nhật', submissions: totalSubmissions, avgScore: averageScore },
    ];

    return {
      stats: {
        totalQuizzes,
        activeQuizzes,
        totalStudents: uniqueStudents,
        totalSubmissions,
        averageScore,
      },
      charts: {
        scoreDistribution,
        activityTrend,
      },
      recentQuizzes: quizzes.slice(0, 5),
      recentSubmissions: submissions.slice(0, 5),
    };
  }

  async getStudentDashboard(studentId: string) {
    const student = await this.submissionRepo.manager.connection.getRepository(UserEntity).findOne({
      where: { id: studentId },
      relations: { classes: true },
    });
    
    const classIds = student?.classes?.map(c => c.id) || [];
    
    const quizzes = await this.quizRepo.createQueryBuilder('quiz')
      .where('quiz.status = :status', { status: 'PUBLISHED' })
      .andWhere(`(
        (quiz.classId IS NULL AND (quiz.assignedStudentIds IS NULL OR JSON_LENGTH(quiz.assignedStudentIds) = 0)) OR
        (quiz.classId IN (:...classIds)) OR
        (JSON_CONTAINS(quiz.assignedStudentIds, :studentIdStr))
      )`, {
        classIds: classIds.length ? classIds : ['DUMMY_ID'],
        studentIdStr: `"${studentId}"`
      })
      .orderBy('quiz.createdAt', 'DESC')
      .getMany();

    const mySubmissions = await this.submissionRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });

    const completedQuizIds = new Set(mySubmissions.map((s) => s.quizId));
    const availableQuizzes = quizzes.filter((q) => !completedQuizIds.has(q.id));

    const totalCompleted = mySubmissions.length;
    const avgScore =
      totalCompleted > 0
        ? Number(
            (
              mySubmissions.reduce((sum, s) => sum + Number(s.score), 0) / totalCompleted
            ).toFixed(1),
          )
        : 0;

    return {
      stats: {
        availableCount: availableQuizzes.length,
        completedCount: totalCompleted,
        averageScore: avgScore,
        highestScore: totalCompleted > 0 ? Math.max(...mySubmissions.map((s) => Number(s.score))) : 0,
      },
      availableQuizzes: availableQuizzes.slice(0, 4),
      recentSubmissions: mySubmissions.slice(0, 4),
    };
  }
}

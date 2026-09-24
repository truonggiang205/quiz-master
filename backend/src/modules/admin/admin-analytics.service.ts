import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
  ) {}

  async getDashboardAnalytics() {
    const totalTeachers = await this.userRepo.countBy({ role: 'TEACHER' });
    const totalStudents = await this.userRepo.countBy({ role: 'STUDENT' });
    const totalQuizzes = await this.quizRepo.count();
    const totalSubmissions = await this.submissionRepo.count();

    // Get all submissions to calculate average score
    const submissions = await this.submissionRepo.find({ select: { score: true, createdAt: true } });
    const averageScore = submissions.length > 0 
      ? submissions.reduce((acc, curr) => acc + curr.score, 0) / submissions.length
      : 0;

    // Calculate submissions per day for the last 7 days for trend chart
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const count = submissions.filter(s => {
        const sDate = new Date(s.createdAt);
        return sDate.toISOString().split('T')[0] === dateStr;
      }).length;

      trend.push({ name: dateStr, submissions: count });
    }

    return {
      stats: {
        totalUsers: totalTeachers + totalStudents,
        totalTeachers,
        totalStudents,
        totalQuizzes,
        totalSubmissions,
        averageScore: Number(averageScore.toFixed(1))
      },
      charts: {
        activityTrend: trend
      }
    };
  }
}

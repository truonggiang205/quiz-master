import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppealEntity, AppealStatus } from '../../entities/appeal.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { QuizEntity } from '../../entities/quiz.entity.js';

@Injectable()
export class AppealsService {
  constructor(
    @InjectRepository(AppealEntity)
    private readonly appealRepo: Repository<AppealEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAppeal(studentId: string, submissionId: string, reason: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp');
    }
    
    if (submission.studentId !== studentId) {
      throw new UnauthorizedException('Bạn không phải chủ nhân bài nộp này');
    }

    const quiz = await this.quizRepo.findOneBy({ id: submission.quizId });
    if (!quiz) throw new NotFoundException('Không tìm thấy đề thi');

    // Check if appeal already exists
    const existing = await this.appealRepo.findOneBy({ submissionId });
    if (existing) {
      throw new BadRequestException('Bạn đã gửi yêu cầu phúc khảo cho bài này rồi');
    }

    const appeal = this.appealRepo.create({
      submissionId,
      studentId,
      teacherId: quiz.teacherId,
      reason,
      status: AppealStatus.PENDING,
    });

    await this.appealRepo.save(appeal);

    // Notify the teacher
    await this.notificationsService.createPersonalNotification(
      quiz.teacherId,
      'Yêu cầu phúc khảo mới',
      `Học sinh vừa gửi yêu cầu phúc khảo cho bài thi "${quiz.title}". Lý do: ${reason}`
    );

    return appeal;
  }

  async getMyAppeals(userId: string, role: string) {
    const qb = this.appealRepo.createQueryBuilder('appeal')
      .leftJoinAndSelect('appeal.submission', 'submission')
      .leftJoinAndSelect('appeal.student', 'student')
      .orderBy('appeal.createdAt', 'DESC');

    if (role === 'TEACHER') {
      qb.where('appeal.teacherId = :userId', { userId });
    } else {
      qb.where('appeal.studentId = :userId', { userId });
    }

    return await qb.getMany();
  }

  async replyAppeal(teacherId: string, appealId: string, status: AppealStatus, reply: string) {
    const appeal = await this.appealRepo.findOne({
      where: { id: appealId },
      relations: { submission: true },
    });

    if (!appeal) {
      throw new NotFoundException('Không tìm thấy yêu cầu phúc khảo');
    }

    if (appeal.teacherId !== teacherId) {
      throw new UnauthorizedException('Bạn không có quyền xử lý phúc khảo này');
    }

    appeal.status = status;
    appeal.teacherReply = reply;
    await this.appealRepo.save(appeal);

    const quizTitle = appeal.submission?.quizTitle || 'bài thi';
    const statusText = status === AppealStatus.APPROVED ? 'CHẤP NHẬN' : 'TỪ CHỐI';

    // Notify the student
    await this.notificationsService.createPersonalNotification(
      appeal.studentId,
      `Kết quả phúc khảo: ${statusText}`,
      `Giáo viên đã phản hồi yêu cầu phúc khảo bài thi "${quizTitle}". Phản hồi: ${reply}`
    );

    return appeal;
  }
}

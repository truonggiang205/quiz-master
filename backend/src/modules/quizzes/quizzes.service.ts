import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizEntity, QuizStatus, QuestionEntity, SubmissionEntity, ClassEntity, UserEntity } from '../../entities/index.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { UploadService } from '../upload/upload.service.js';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async getAllQuizzes(userRole?: string, userId?: string) {
    if (userRole === 'TEACHER') {
      return this.quizRepo.find({
        where: { teacherId: userId },
        order: { createdAt: 'DESC' },
      });
    }
    // Students only see PUBLISHED quizzes assigned to them or their classes or ALL
    const qb = this.quizRepo.createQueryBuilder('quiz')
      .where('quiz.status = :status', { status: 'PUBLISHED' })
      .orderBy('quiz.createdAt', 'DESC');

    if (userId) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: { classes: true },
      });
      const classIds = user?.classes?.map(c => c.id) || [];

      qb.andWhere(`(
        (quiz.classId IS NULL AND (quiz.assignedStudentIds IS NULL OR JSON_LENGTH(quiz.assignedStudentIds) = 0)) OR
        (quiz.classId IN (:...classIds)) OR
        (JSON_CONTAINS(quiz.assignedStudentIds, :userIdStr))
      )`, { 
        classIds: classIds.length ? classIds : ['DUMMY_ID'], 
        userIdStr: `"${userId}"` 
      });
    }

    const quizzes = await qb.getMany();
    if (userId) {
      // Filter out quizzes where the user has reached totalAttempts
      const submissions = await this.submissionRepo.find({
        where: { studentId: userId, quizId: In(quizzes.map(q => q.id)) },
      });
      const submissionCounts = submissions.reduce((acc, sub) => {
        acc[sub.quizId] = (acc[sub.quizId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return quizzes.filter(q => (submissionCounts[q.id] || 0) < (q.totalAttempts || 1));
    }
    return quizzes;
  }

  async getQuizById(id: string, userRole?: string) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    // Business rule: Student cannot see unpublished quiz unless role is TEACHER
    if (userRole !== 'TEACHER' && quiz.status !== 'PUBLISHED') {
      throw new BadRequestException('Bài kiểm tra này chưa được xuất bản hoặc đã đóng');
    }
    return quiz;
  }

  async createQuiz(dto: CreateQuizDto, teacher: { id: string; name: string }) {
    const now = new Date().toISOString();
    const newQuiz = this.quizRepo.create({
      id: `quiz-${Date.now()}`,
      title: dto.title,
      description: dto.description || '',
      subject: dto.subject,
      durationMinutes: dto.durationMinutes || 45,
      status: 'DRAFT',
      startTime: dto.startTime || now,
      endTime: dto.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAttempts: dto.totalAttempts || 1,
      shuffleQuestions: dto.shuffleQuestions ?? true,
      shuffleAnswers: dto.shuffleAnswers ?? true,
      showScoreImmediately: dto.showScoreImmediately ?? true,
      showCorrectAnswers: dto.showCorrectAnswers ?? true,
      showExplanation: dto.showExplanation ?? true,
      answerReleaseAt: dto.answerReleaseAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      teacherId: teacher.id,
      teacherName: teacher.name,
      questionCount: 0,
      totalScore: 0,
      classId: dto.classId || undefined,
      assignedStudentIds: dto.assignedStudentIds || [],
    });

    return this.quizRepo.save(newQuiz);
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra để cập nhật');
    }

    Object.assign(quiz, dto);
    return this.quizRepo.save(quiz);
  }

  async deleteQuiz(id: string) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra để xóa');
    }

    // Cascade delete questions and submissions
    const questions = await this.questionRepo.find({ where: { quizId: id } });
    for (const q of questions) {
      if (q.imageUrl) await this.uploadService.deleteFileByUrl(q.imageUrl);
    }

    const submissions = await this.submissionRepo.find({ where: { quizId: id } });
    for (const sub of submissions) {
      if (sub.answers) {
        for (const ans of sub.answers) {
          if (ans.essayImageUrl) {
            const urls = ans.essayImageUrl.split('|||');
            for (const url of urls) {
              await this.uploadService.deleteFileByUrl(url);
            }
          }
        }
      }
    }

    await this.questionRepo.delete({ quizId: id });
    await this.submissionRepo.delete({ quizId: id });
    await this.quizRepo.delete({ id });

    return { id, deleted: true };
  }

  async publishQuiz(id: string) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    // Business rule: If quiz has 0 questions, cannot publish!
    if (quiz.questionCount === 0) {
      throw new BadRequestException('Bài kiểm tra phải có ít nhất 1 câu hỏi trước khi xuất bản');
    }
    quiz.status = 'PUBLISHED';
    return this.quizRepo.save(quiz);
  }

  async unpublishQuiz(id: string) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    quiz.status = 'DRAFT';
    return this.quizRepo.save(quiz);
  }

  async updateQuestionStats(id: string, count: number, totalScore: number) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (quiz) {
      quiz.questionCount = count;
      quiz.totalScore = totalScore;
      await this.quizRepo.save(quiz);
    }
  }
}

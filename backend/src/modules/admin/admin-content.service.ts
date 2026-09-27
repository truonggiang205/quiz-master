import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { QuestionEntity } from '../../entities/question.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { UserEntity } from '../../entities/user.entity.js';

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
  ) {}

  async getAllQuizzes(search?: string) {
    const qb = this.quizRepo.createQueryBuilder('quiz')
      .orderBy('quiz.createdAt', 'DESC');

    if (search) {
      qb.andWhere('quiz.title LIKE :search', { search: `%${search}%` });
    }

    const quizzes = await qb.getMany();

    // Attach questions count and teacher info for each quiz
    const result = await Promise.all(
      quizzes.map(async (q) => {
        const questionsCount = await this.questionRepo.countBy({ quizId: q.id });
        const teacher = await this.quizRepo.manager.findOneBy(UserEntity, { id: q.teacherId });
        return {
          ...q,
          questionsCount,
          teacherName: teacher ? (teacher as any).name : 'Unknown',
          teacherEmail: teacher ? (teacher as any).email : '',
        };
      })
    );

    return result;
  }

  async deleteQuiz(id: string) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài thi');
    }

    // Cascade delete is usually handled by TypeORM or DB constraints,
    // but just to be safe, let's delete manually if needed, or rely on cascade.
    // Assuming `onDelete: 'CASCADE'` is on the entities for Submission and Question.
    await this.quizRepo.remove(quiz);
    
    return { id, message: 'Đã xóa bài thi thành công' };
  }
}

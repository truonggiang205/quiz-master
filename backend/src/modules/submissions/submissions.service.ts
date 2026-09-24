import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubmissionEntity,
  QuizEntity,
  QuestionEntity,
  StudentAnswer,
} from '../../entities/index.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
  ) {}

  async startQuiz(quizId: string, student: { id: string; name: string }) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    if (quiz.status !== 'PUBLISHED') {
      throw new BadRequestException('Bài kiểm tra này hiện không khả dụng để làm');
    }

    const now = new Date();
    if (quiz.startTime && new Date(quiz.startTime) > now) {
      throw new BadRequestException('Chưa đến thời gian bắt đầu làm bài kiểm tra');
    }
    if (quiz.endTime && new Date(quiz.endTime) < now) {
      throw new BadRequestException('Bài kiểm tra này đã kết thúc thời gian nộp bài');
    }

    const startedAt = now.toISOString();
    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      durationMinutes: quiz.durationMinutes,
      startedAt,
      studentId: student.id,
      studentName: student.name,
      totalQuestions: quiz.questionCount,
    };
  }

  async submitQuiz(
    quizId: string,
    dto: SubmitQuizDto,
    student: { id: string; name: string; email: string; avatar?: string },
  ) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    const previousAttempts = await this.submissionRepo.count({
        where: { quizId, studentId: student.id }
    });
    if (previousAttempts >= (quiz.totalAttempts || 1)) {
        throw new BadRequestException('Bạn đã hết số lần làm bài cho phép');
    }

    const quizQuestions = await this.questionRepo.find({
      where: { quizId },
      order: { order: 'ASC' },
    });

    const answers: StudentAnswer[] = [];

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of quizQuestions) {
      const studentAns = (dto.answers || []).find((a) => a.questionId === q.id);
      const selected = studentAns ? studentAns.selectedOptionIds || [] : [];
      const essayImageUrl = studentAns ? studentAns.essayImageUrl : undefined;

      if (q.type === 'ESSAY') {
        answers.push({
          questionId: q.id,
          essayImageUrl,
          isCorrect: undefined, // Pending manual grading
          scoreAwarded: 0,
        });
        continue;
      }

      if (selected.length === 0) {
        unansweredCount++;
        answers.push({
          questionId: q.id,
          selectedOptionIds: [],
          isCorrect: false,
          scoreAwarded: 0,
        });
        continue;
      }

      const correctOptionIds = (q.options || [])
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id);

      const isExactMatch =
        correctOptionIds.length === selected.length &&
        correctOptionIds.every((id) => selected.includes(id));

      if (isExactMatch) {
        correctCount++;
        const scoreAwarded = Number(q.score) || 2.0;
        totalScore += scoreAwarded;
        answers.push({
          questionId: q.id,
          selectedOptionIds: selected,
          isCorrect: true,
          scoreAwarded,
        });
      } else {
        wrongCount++;
        answers.push({
          questionId: q.id,
          selectedOptionIds: selected,
          isCorrect: false,
          scoreAwarded: 0,
        });
      }
    }

    const maxScore = quizQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0) || 10;
    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
    const scaledScore = maxScore > 0 ? Number(((totalScore / maxScore) * 10).toFixed(1)) : 0;

    const submission = this.submissionRepo.create({
      id: `sub-${Date.now()}`,
      quizId,
      quizTitle: quiz.title,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentAvatar: student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
      score: scaledScore,
      maxScore: 10,
      percentage,
      correctCount,
      wrongCount,
      unansweredCount,
      timeUsedSeconds: dto.timeUsedSeconds || 0,
      answers,
      submittedAt: new Date().toISOString(),
    });

    const saved = await this.submissionRepo.save(submission);
    return saved;
  }

  async getSubmissionById(id: string, userRole?: string, userId?: string) {
    const sub = await this.submissionRepo.findOneBy({ id });
    if (!sub) {
      throw new NotFoundException('Không tìm thấy bài nộp');
    }

    if (userRole !== 'TEACHER' && userRole !== 'ADMIN' && sub.studentId !== userId) {
      throw new UnauthorizedException('Bạn không có quyền xem bài nộp này');
    }

    const quiz = await this.quizRepo.findOneBy({ id: sub.quizId });
    const quizQuestions = await this.questionRepo.find({
      where: { quizId: sub.quizId },
      order: { order: 'ASC' },
    });

    const now = new Date();
    const isTeacher = userRole === 'TEACHER';
    const releaseTime = quiz?.answerReleaseAt ? new Date(quiz.answerReleaseAt) : null;
    const canViewAnswers = isTeacher || (releaseTime ? now >= releaseTime : true);

    const detailedAnswers = sub.answers.map((ans) => {
      const q = quizQuestions.find((ques) => ques.id === ans.questionId);
      if (!q) return ans;

      return {
        ...ans,
        questionContent: q.content,
        questionImageUrl: q.imageUrl,
        questionType: q.type,
        options: (q.options || []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: canViewAnswers ? opt.isCorrect : undefined,
        })),
        explanation: canViewAnswers ? q.explanation : undefined,
      };
    });

    return {
      ...sub,
      quiz,
      detailedAnswers,
      isAnswerReleased: canViewAnswers,
      answerReleaseAt: quiz?.answerReleaseAt,
    };
  }

  async getQuizResults(quizId: string) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    const submissions = await this.submissionRepo.find({
      where: { quizId },
      order: { createdAt: 'DESC' },
    });

    const totalSubmissions = submissions.length;
    const avgScore =
      totalSubmissions > 0
        ? Number(
            (
              submissions.reduce((sum, s) => sum + Number(s.score), 0) / totalSubmissions
            ).toFixed(1),
          )
        : 0;

    const highestScore = totalSubmissions > 0 ? Math.max(...submissions.map((s) => Number(s.score))) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...submissions.map((s) => Number(s.score))) : 0;
    const passedCount = submissions.filter((s) => Number(s.score) >= 5.0).length;
    const passRate =
      totalSubmissions > 0 ? Number(((passedCount / totalSubmissions) * 100).toFixed(1)) : 0;

    return {
      quiz,
      stats: {
        totalSubmissions,
        avgScore,
        highestScore,
        lowestScore,
        passRate,
      },
      submissions,
    };
  }

  async getStudentSubmissions(studentId: string) {
    return this.submissionRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }
}

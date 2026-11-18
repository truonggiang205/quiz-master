import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubmissionEntity,
  QuizEntity,
  QuestionEntity,
  QuestionType,
  StudentAnswer,
  UserEntity,
  QuizAttemptEntity,
  AttemptQuestionSnapshot,
  AttemptQuizSnapshot,
} from '../../entities/index.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { UploadService } from '../upload/upload.service.js';
import { EssayRubricEntity } from '../grading/entities/essay-rubric.entity.js';
import { gradeWithRubric } from '../grading/rubric/rubric-grader.js';
import { DEFAULT_GRADING_CONFIG } from '../grading/grading.config.js';
import { isAnswerReleased, sanitizeStudentAnswerData } from '../../common/utils/submission-visibility.util.js';

@Injectable()
export class SubmissionsService {
  private maskAnswerForStudent(answer: StudentAnswer): any {
    return sanitizeStudentAnswerData(answer);
  }

  private isAnswerReleased(quiz?: QuizEntity | null): boolean {
    return isAnswerReleased(quiz?.answerReleaseAt);
  }

  private async assertStudentCanAttempt(quiz: QuizEntity, studentId: string) {
    if (quiz.status !== 'PUBLISHED') throw new BadRequestException('Bài kiểm tra này hiện không khả dụng để làm');
    const now = new Date();
    if (quiz.startTime && new Date(quiz.startTime) > now) throw new BadRequestException('Chưa đến thời gian bắt đầu làm bài kiểm tra');
    if (quiz.endTime && new Date(quiz.endTime) < now) throw new BadRequestException('Bài kiểm tra này đã kết thúc thời gian nộp bài');
    const student = await this.userRepo.findOne({ where: { id: studentId }, relations: { classes: true } });
    const inClass = Boolean(quiz.classId && student?.classes?.some(cls => cls.id === quiz.classId));
    const assigned = Boolean(quiz.assignedStudentIds?.includes(studentId));
    if (!inClass && !assigned) throw new UnauthorizedException('Bạn không được giao bài kiểm tra này');
  }

  private snapshotQuestions(questions: QuestionEntity[]): AttemptQuestionSnapshot[] {
    return questions.map(question => ({
      id: question.id, content: question.content, imageUrl: question.imageUrl, type: question.type,
      options: JSON.parse(JSON.stringify(question.options || [])), essayRubric: question.essayRubric ? JSON.parse(JSON.stringify(question.essayRubric)) : null,
      points: Number(question.points) || 0, score: Number(question.score) || 0, explanation: question.explanation || '', order: question.order,
    }));
  }

  private publicQuestions(snapshot: AttemptQuestionSnapshot[]) {
    return snapshot.map(({ options, essayRubric: _rubric, explanation: _explanation, ...question }) => ({
      ...question, options: options.map(({ isCorrect: _correct, ...option }) => option),
    }));
  }

  private createAttemptSnapshot(quiz: QuizEntity, questions: QuestionEntity[]): AttemptQuizSnapshot {
    return {
      version: 1, quizId: quiz.id, quizTitle: quiz.title, durationMinutes: quiz.durationMinutes,
      totalPoints: quiz.totalPoints, answerReleaseAt: quiz.answerReleaseAt,
      showScoreImmediately: quiz.showScoreImmediately, showCorrectAnswers: quiz.showCorrectAnswers,
      showExplanation: quiz.showExplanation, questions: this.snapshotQuestions(questions),
    };
  }

  private getAttemptSnapshot(attempt: QuizAttemptEntity, quiz: QuizEntity): AttemptQuizSnapshot {
    return attempt.quizSnapshot || {
      version: 1, quizId: quiz.id, quizTitle: quiz.title, durationMinutes: quiz.durationMinutes,
      totalPoints: quiz.totalPoints, answerReleaseAt: quiz.answerReleaseAt,
      showScoreImmediately: quiz.showScoreImmediately, showCorrectAnswers: quiz.showCorrectAnswers,
      showExplanation: quiz.showExplanation, questions: attempt.questionSnapshot || [],
    };
  }

  private publicAttempt(attempt: QuizAttemptEntity, quiz: QuizEntity) {
    const snapshot = this.getAttemptSnapshot(attempt, quiz);
    return {
      quizId: snapshot.quizId, quizTitle: snapshot.quizTitle, durationMinutes: snapshot.durationMinutes,
      totalPoints: snapshot.totalPoints, answerReleaseAt: snapshot.answerReleaseAt, startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt, attemptId: attempt.id, totalQuestions: snapshot.questions.length,
      questions: this.publicQuestions(snapshot.questions), draftAnswers: attempt.draftAnswers || [],
    };
  }
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly attemptRepo: Repository<QuizAttemptEntity>,
    @InjectRepository(EssayRubricEntity)
    private readonly rubricRepo: Repository<EssayRubricEntity>,
    private readonly uploadService: UploadService,
  ) {}

  private getSubmissionFolder(quiz: QuizEntity): string {
    const rootDir = quiz.mode === 'PRACTICE' ? 'on-tap' : 'bai-thi';
    const subjectDir = (quiz.subject || 'khac').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const titleDir = quiz.title.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `quiz-master/${rootDir}/${subjectDir}/${titleDir}/bai-tap`;
  }

  async startQuiz(quizId: string, student: { id: string; name: string }) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    await this.assertStudentCanAttempt(quiz, student.id);
    try {
      return await this.attemptRepo.manager.transaction(async manager => {
      const attemptRepo = manager.getRepository(QuizAttemptEntity);
      const now = new Date();
      const active = await attemptRepo.createQueryBuilder('attempt').setLock('pessimistic_write')
        .where('attempt.quizId = :quizId AND attempt.studentId = :studentId AND attempt.status = :status', { quizId, studentId: student.id, status: 'IN_PROGRESS' }).getOne();
      if (active && new Date(active.expiresAt) > now) {
        return { ...this.publicAttempt(active, quiz), studentId: student.id, studentName: student.name };
      }
      if (active) { active.status = 'EXPIRED'; await attemptRepo.save(active); }
      const attempts = await attemptRepo.count({ where: { quizId, studentId: student.id } });
      if (attempts >= (quiz.totalAttempts || 1)) throw new BadRequestException('Bạn đã hết số lần làm bài cho phép');
      const questions = await manager.getRepository(QuestionEntity).find({ where: { quizId }, order: { order: 'ASC' } });
      const quizSnapshot = this.createAttemptSnapshot(quiz, questions);
      const expiresAt = new Date(Math.min(now.getTime() + quizSnapshot.durationMinutes * 60_000, quiz.endTime ? new Date(quiz.endTime).getTime() : Number.MAX_SAFE_INTEGER));
      const attempt = attemptRepo.create({ id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, quizId, studentId: student.id,
        attemptNumber: attempts + 1, status: 'IN_PROGRESS', questionSnapshot: quizSnapshot.questions, quizSnapshot, draftAnswers: [], startedAt: now.toISOString(), expiresAt: expiresAt.toISOString() });
      await attemptRepo.save(attempt);
      return { ...this.publicAttempt(attempt, quiz), studentId: student.id, studentName: student.name };
      });
    } catch (error: any) {
      // The unique attempt number constraint is the final database backstop for
      // concurrent starts. Convert the losing request into a normal resume.
      if (error?.code === 'ER_DUP_ENTRY') {
        const active = await this.attemptRepo.findOne({ where: { quizId, studentId: student.id, status: 'IN_PROGRESS' as any }, order: { createdAt: 'DESC' } });
        if (active && new Date(active.expiresAt) > new Date()) {
          return { ...this.publicAttempt(active, quiz), studentId: student.id, studentName: student.name };
        }
      }
      throw error;
    }
  }

  async getAttempt(quizId: string, attemptId: string, studentId: string) {
    const [quiz, attempt] = await Promise.all([
      this.quizRepo.findOneBy({ id: quizId }),
      this.attemptRepo.findOneBy({ id: attemptId, quizId, studentId }),
    ]);
    if (!quiz || !attempt) throw new UnauthorizedException('Attempt không hợp lệ');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Attempt này không còn khả dụng');
    if (new Date(attempt.expiresAt) < new Date()) {
      attempt.status = 'EXPIRED';
      await this.attemptRepo.save(attempt);
      throw new BadRequestException('Đã hết thời gian làm bài');
    }
    return this.publicAttempt(attempt, quiz);
  }

  async saveAttemptAnswers(quizId: string, attemptId: string, studentId: string, answers: any[]) {
    return this.attemptRepo.manager.transaction(async manager => {
      const repo = manager.getRepository(QuizAttemptEntity);
      const attempt = await repo.createQueryBuilder('attempt').setLock('pessimistic_write')
        .where('attempt.id = :attemptId AND attempt.quizId = :quizId AND attempt.studentId = :studentId', { attemptId, quizId, studentId })
        .getOne();
      if (!attempt) throw new UnauthorizedException('Attempt không hợp lệ');
      if (attempt.status !== 'IN_PROGRESS' || new Date(attempt.expiresAt) < new Date()) {
        if (attempt.status === 'IN_PROGRESS') { attempt.status = 'EXPIRED'; await repo.save(attempt); }
        throw new BadRequestException('Attempt này không còn khả dụng');
      }
      const snapshot = attempt.quizSnapshot?.questions || attempt.questionSnapshot;
      const questionIds = new Set(snapshot.map(question => question.id));
      if (!Array.isArray(answers) || answers.some(answer => !answer || !questionIds.has(answer.questionId))) {
        throw new BadRequestException('Dữ liệu bài làm không hợp lệ');
      }
      attempt.draftAnswers = JSON.parse(JSON.stringify(answers));
      await repo.save(attempt);
      return { attemptId: attempt.id, answers: attempt.draftAnswers };
    });
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

    const attempt = await this.attemptRepo.findOneBy({ id: dto.attemptId, quizId, studentId: student.id });
    if (!attempt) throw new UnauthorizedException('Attempt không hợp lệ');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Attempt này đã được nộp hoặc không còn hiệu lực');
    const now = new Date();
    if (new Date(attempt.expiresAt) < now) {
      attempt.status = 'EXPIRED';
      await this.attemptRepo.save(attempt);
      throw new BadRequestException('Đã hết thời gian làm bài');
    }
    const attemptSnapshot = this.getAttemptSnapshot(attempt, quiz);
    const quizQuestions = attemptSnapshot.questions;

    const statementResponses = (dto.answers || []).filter(answer => answer.statementAnswers !== undefined);
    if (statementResponses.some(answer => !quizQuestions.some(question => question.id === answer.questionId && question.type === 'MULTIPLE_TRUE_FALSE') ||
        dto.answers.filter(item => item.questionId === answer.questionId).length !== 1) ||
        new Set(statementResponses.map(answer => answer.questionId)).size !== statementResponses.length) {
      throw new BadRequestException('Câu hỏi nhận định không hợp lệ hoặc bị trùng');
    }

    const answers: StudentAnswer[] = [];

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of quizQuestions) {
      const studentAns = (dto.answers || []).find((a) => a.questionId === q.id);
      const selected = studentAns ? studentAns.selectedOptionIds || [] : [];
      let essayImageUrl = studentAns ? studentAns.essayImageUrl : undefined;
      let essayText = studentAns ? studentAns.essayText : undefined;

      if (q.type === 'MULTIPLE_TRUE_FALSE') {
        const statements = q.options || [];
        const submitted = studentAns?.statementAnswers || [];
        const validIds = new Set(statements.map(statement => statement.id));
        if (submitted.some(item => !validIds.has(item.statementId)) ||
            new Set(submitted.map(item => item.statementId)).size !== submitted.length) {
          throw new BadRequestException('Nhận định không hợp lệ hoặc bị trùng');
        }
        const statementAnswers = statements.map(statement => {
          const answer = submitted.find(item => item.statementId === statement.id)?.answer ?? null;
          return { statementId: statement.id, text: statement.text, answer,
            correctAnswer: statement.isCorrect === true,
            isCorrect: answer !== null && answer === statement.isCorrect };
        });
        const correct = statementAnswers.filter(item => item.isCorrect).length;
        const scoreAwarded = statements.length ? Math.round((Number(q.points) || 0) * correct / statements.length) : 0;
        totalScore += scoreAwarded;
        if (submitted.length === 0) unansweredCount++;
        else if (correct === statements.length) correctCount++;
        else wrongCount++;
        answers.push({ questionId: q.id, statementAnswers, scoreAwarded,
          isCorrect: correct === statements.length && statements.length > 0 });
        continue;
      }

      if (q.type === 'ESSAY') {
        if (essayImageUrl) {
          const urls = essayImageUrl.split('|||');
          const uploadedUrls = [];
          for (let url of urls) {
            if (url.startsWith('data:image/')) {
              try {
                const folder = this.getSubmissionFolder(quiz);
                const uploadResult = await this.uploadService.uploadBase64(url, folder);
                uploadedUrls.push(uploadResult.secure_url || uploadResult.url);
              } catch (e) {
                console.error('Lỗi khi tải ảnh tự luận lên Cloudinary:', e);
                uploadedUrls.push(url); // fallback
              }
            } else {
              uploadedUrls.push(url);
            }
          }
          essayImageUrl = uploadedUrls.join('|||');
        }

        // Kiểm tra xem giáo viên đã điền đáp án chấm tự luận hay chưa
        let rubric = q.essayRubric;
        if (!rubric) {
          try {
            const stored = await this.rubricRepo.findOneBy({ questionId: q.id });
            if (stored) {
              rubric = {
                acceptedAnswers: stored.acceptedAnswers || [],
                criteria: stored.criteria || [],
                totalScore: stored.totalScore || Number(q.points) || 100,
              };
            }
          } catch (e) {
            // ignore
          }
        }

        const acceptedAnswers: string[] = [];
        if (Array.isArray(rubric?.acceptedAnswers)) {
          acceptedAnswers.push(
            ...rubric.acceptedAnswers
              .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
              .map((a: string) => a.trim())
          );
        }

        // Đồng thời kiểm tra nếu giáo viên nhập đáp án đúng trong options
        if (Array.isArray(q.options)) {
          const correctOpts = q.options.filter(o => o.isCorrect && o.text?.trim().length > 0);
          for (const opt of correctOpts) {
            const trimmed = opt.text.trim();
            if (!acceptedAnswers.includes(trimmed)) {
              acceptedAnswers.push(trimmed);
            }
          }
        }

        const criteria = Array.isArray(rubric?.criteria)
          ? rubric.criteria.filter((c: any) => Array.isArray(c.keywords) && c.keywords.length > 0)
          : [];

        const hasTeacherAnswer = acceptedAnswers.length > 0 || criteria.length > 0;

        if (hasTeacherAnswer) {
          // Giáo viên đã điền đáp án -> TỰ ĐỘNG CHẤM (Auto-grade)
          const studentText = (essayText || '').trim();
          const questionPoints = Number(q.points) || (Number(q.score) ? Math.round(Number(q.score) * 100) : 100);

          if (!studentText) {
            // Học sinh không nhập văn bản trả lời
            wrongCount++;
            answers.push({
              questionId: q.id,
              essayImageUrl,
              essayText,
              isCorrect: false,
              scoreAwarded: 0,
            });
          } else {
            const gradeResult = gradeWithRubric(
              {
                questionId: q.id,
                submissionId: '',
                studentAnswer: studentText,
                rubric: {
                  questionId: q.id,
                  acceptedAnswers,
                  criteria,
                  totalScore: questionPoints,
                },
              },
              DEFAULT_GRADING_CONFIG,
            );

            const scoreAwarded = Math.min(questionPoints, Math.max(0, Math.round(gradeResult.score)));
            if (scoreAwarded > 0) {
              correctCount++;
              totalScore += scoreAwarded;
              answers.push({
                questionId: q.id,
                essayImageUrl,
                essayText,
                isCorrect: true,
                scoreAwarded,
              });
            } else {
              wrongCount++;
              answers.push({
                questionId: q.id,
                essayImageUrl,
                essayText,
                isCorrect: false,
                scoreAwarded: 0,
              });
            }
          }
        } else {
          // Giáo viên KHÔNG điền đáp án -> KHÔNG tự động chấm, chờ giáo viên chấm thủ công
          answers.push({
            questionId: q.id,
            essayImageUrl,
            essayText,
            isCorrect: undefined, // Pending manual grading
            scoreAwarded: 0,
          });
        }
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
        const scoreAwarded = Number(q.points) || 0;
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

    const maxScore = attemptSnapshot.totalPoints || quizQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) || 1000;
    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
    const scaledScore = totalScore; // store raw points

    const submission = this.submissionRepo.create({
      id: `sub-${Date.now()}`,
      quizId,
      quizTitle: attemptSnapshot.quizTitle,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentAvatar: student.avatar || null,
      score: scaledScore,
      maxScore: maxScore,
      percentage,
      correctCount,
      wrongCount,
      unansweredCount,
      timeUsedSeconds: dto.timeUsedSeconds || 0,
      answers: answers.map(answer => {
        const question = quizQuestions.find(q => q.id === answer.questionId)!;
        return { ...answer, questionType: question.type, questionContent: question.content, questionImageUrl: question.imageUrl,
          questionPoints: question.points, questionMaxScore: question.points, questionOptions: question.options,
          questionExplanation: question.explanation, questionEssayRubric: question.essayRubric };
      }),
      submittedAt: new Date().toISOString(),
      answerReleaseAt: attemptSnapshot.answerReleaseAt || null,
    });

    const saved = await this.submissionRepo.manager.transaction(async manager => {
      const lockedAttempt = await manager.getRepository(QuizAttemptEntity).createQueryBuilder('attempt').setLock('pessimistic_write')
        .where('attempt.id = :id', { id: attempt.id }).getOne();
      if (!lockedAttempt || lockedAttempt.studentId !== student.id || lockedAttempt.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Attempt này đã được nộp hoặc không còn hiệu lực');
      }
      if (new Date(lockedAttempt.expiresAt) < new Date()) {
        lockedAttempt.status = 'EXPIRED';
        await manager.getRepository(QuizAttemptEntity).save(lockedAttempt);
        throw new BadRequestException('Đã hết thời gian làm bài');
      }
      const result = await manager.getRepository(SubmissionEntity).save(submission);
      lockedAttempt.status = 'SUBMITTED';
      lockedAttempt.submittedAt = result.submittedAt;
      lockedAttempt.submissionId = result.id;
      await manager.getRepository(QuizAttemptEntity).save(lockedAttempt);
      return result;
    });
    const answerReleased = isAnswerReleased(attemptSnapshot.answerReleaseAt);
    return answerReleased ? saved : { ...saved, answers: saved.answers.map(answer => this.maskAnswerForStudent(answer)) };
  }

  async getSubmissionById(id: string, userRole?: string, userId?: string) {
    const sub = await this.submissionRepo.findOneBy({ id });
    if (!sub) {
      throw new NotFoundException('Không tìm thấy bài nộp');
    }

    const quiz = await this.quizRepo.findOneBy({ id: sub.quizId });
    if (userRole === 'TEACHER' && quiz?.teacherId !== userId) {
      throw new UnauthorizedException('Bạn không có quyền xem bài nộp này');
    }
    if (userRole !== 'TEACHER' && userRole !== 'ADMIN' && sub.studentId !== userId) {
      throw new UnauthorizedException('Bạn không có quyền xem bài nộp này');
    }

    const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN';
    const canViewAnswers = isTeacher || isAnswerReleased(sub.answerReleaseAt ?? quiz?.answerReleaseAt);

    const detailedAnswers = sub.answers.map((ans) => {
      // New submissions carry a full immutable question snapshot.  Old rows keep
      // their legacy fallback without changing their stored answers.
      const q = ans.questionContent ? {
        content: ans.questionContent, imageUrl: ans.questionImageUrl, type: ans.questionType,
        points: ans.questionPoints, options: ans.questionOptions || [], explanation: ans.questionExplanation, essayRubric: ans.questionEssayRubric,
      } : undefined;
      if (!q) return canViewAnswers ? ans : this.maskAnswerForStudent(ans);

      return {
        ...(canViewAnswers ? ans : this.maskAnswerForStudent(ans)),
        questionContent: q.content,
        questionImageUrl: q.imageUrl,
        questionType: q.type,
        score: Number(q.points) || 0,
        options: (q.options || []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: canViewAnswers ? opt.isCorrect : undefined,
        })),
        explanation: canViewAnswers ? q.explanation : undefined,
        essayRubric: canViewAnswers ? q.essayRubric : undefined,
      };
    });

    return {
      ...sub,
      answers: canViewAnswers ? sub.answers : sub.answers.map(answer => this.maskAnswerForStudent(answer)),
      quiz,
      detailedAnswers,
      isAnswerReleased: canViewAnswers,
      answerReleaseAt: quiz?.answerReleaseAt,
    };
  }

  async getQuizResults(quizId: string, userRole?: string, userId?: string) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    if (userRole === 'TEACHER' && quiz.teacherId !== userId) throw new UnauthorizedException('Bạn không có quyền xem kết quả bài kiểm tra này');

    const submissions = await this.submissionRepo.find({
      where: { quizId },
      order: { createdAt: 'DESC' },
    });

    let unsubmittedStudents: any[] = [];
    if (quiz.teacherId) {
      const teacher = await this.userRepo.findOne({
        where: { id: quiz.teacherId },
        relations: { students: { classes: true } },
      });
      if (teacher && teacher.students) {
        // Chỉ lấy những học sinh được giao bài thi
        const assignedStudents = teacher.students.filter(stu => {
          if (quiz.assignedStudentIds && quiz.assignedStudentIds.length > 0) {
            return quiz.assignedStudentIds.includes(stu.id);
          }
          if (quiz.classId) {
            return stu.classes?.some(c => c.id === quiz.classId);
          }
          return true; // Dành cho tất cả
        });

        unsubmittedStudents = assignedStudents.filter(
          (stu) => !submissions.some((sub) => sub.studentId === stu.id)
        ).map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
        }));
      }
    }

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
      submissions: userRole === 'TEACHER' || userRole === 'ADMIN' ? submissions : submissions.map(sub => ({
        ...sub, answers: sub.answers.map(answer => this.maskAnswerForStudent(answer)),
      })),
      unsubmittedStudents,
    };
  }

  async getStudentSubmissions(studentId: string) {
    const submissions = await this.submissionRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
    
    // Attach quiz type and grading status
    const result = [];
    for (const sub of submissions) {
      const quiz = await this.quizRepo.findOneBy({ id: sub.quizId });
      const hasUngradedEssay = sub.answers?.some(a => a.isCorrect === undefined && a.scoreAwarded === 0);
      result.push({
        ...sub,
        answers: isAnswerReleased(sub.answerReleaseAt ?? quiz?.answerReleaseAt) ? sub.answers : sub.answers.map(answer => this.maskAnswerForStudent(answer)),
        quizType: quiz?.mode || 'QUIZ',
        isFullyGraded: !hasUngradedEssay,
      });
    }
    return result;
  }

  async gradeSubmission(
    submissionId: string,
    grades: { questionId: string; scoreAwarded: number }[],
    teacherId: string
  ) {
    const sub = await this.submissionRepo.findOneBy({ id: submissionId });
    if (!sub) {
      throw new NotFoundException('Không tìm thấy bài nộp');
    }
    
    // Verify teacher owns the quiz
    const quiz = await this.quizRepo.findOneBy({ id: sub.quizId });
    if (!quiz || quiz.teacherId !== teacherId) {
      throw new UnauthorizedException('Bạn không có quyền chấm bài nộp này');
    }

    let totalRawScore = 0;

    // Update answers
    sub.answers = sub.answers.map(ans => {
      // If this is an essay and there's a manual grade for it
      const manualGrade = grades.find(g => g.questionId === ans.questionId);
      if (manualGrade && ans.questionType === 'ESSAY') {
        ans.scoreAwarded = Math.min(Number(ans.questionPoints) || 0, Math.max(0, Number(manualGrade.scoreAwarded) || 0));
        if (ans.scoreAwarded > 0) ans.isCorrect = true;
        else ans.isCorrect = false;
        ans.isManuallyGraded = true;
      }

      totalRawScore += Number(ans.scoreAwarded) || 0;
      return ans;
    });

    sub.correctCount = sub.answers.filter(a => a.isCorrect === true).length;
    sub.wrongCount = sub.answers.filter(a => a.isCorrect === false).length;

    const maxScore = Number(sub.maxScore) || quiz.totalPoints || 1000;
    const percentage = maxScore > 0 ? Number(((totalRawScore / maxScore) * 100).toFixed(1)) : 0;
    const scaledScore = totalRawScore;

    sub.score = scaledScore;
    sub.percentage = percentage;
    
    return await this.submissionRepo.save(sub);
  }

  /**
   * Tự động chấm lại toàn bộ câu hỏi tự luận theo đáp án/rubric hiện tại của giáo viên
   */
  async regradeQuizEssays(quizId: string, userId: string, userRole?: string) {
    const quiz = await this.quizRepo.findOneBy({ id: quizId });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    if (userRole !== 'ADMIN' && quiz.teacherId !== userId) throw new UnauthorizedException('Bạn không có quyền chấm lại bài này');

    const quizQuestions = await this.questionRepo.find({
      where: { quizId, type: 'ESSAY' as QuestionType },
    });

    if (!quizQuestions.length) {
      return { regradedCount: 0, message: 'Bài thi không có câu hỏi tự luận' };
    }

    const submissions = await this.submissionRepo.find({ where: { quizId } });
    if (!submissions.length) {
      return { regradedCount: 0, message: 'Chưa có bài nộp nào' };
    }

    let regradedCount = 0;

    for (const sub of submissions) {
      if (!Array.isArray(sub.answers)) continue;
      let subUpdated = false;

      for (const ans of sub.answers) {
        const q = quizQuestions.find((ques) => ques.id === ans.questionId);
        // Snapshot-backed attempts are immutable; this legacy tool only handles
        // rows created before snapshots existed.
        if (ans.questionType || !q || q.type !== 'ESSAY') continue;

        // Bỏ qua nếu giáo viên đã chấm thủ công
        if (ans.isManuallyGraded) continue;

        let rubric = q.essayRubric;
        if (!rubric) {
          try {
            const stored = await this.rubricRepo.findOneBy({ questionId: q.id });
            if (stored) {
              rubric = {
                acceptedAnswers: stored.acceptedAnswers || [],
                criteria: stored.criteria || [],
                totalScore: stored.totalScore || Number(q.points) || 100,
              };
            }
          } catch (e) {}
        }

        const acceptedAnswers: string[] = [];
        if (Array.isArray(rubric?.acceptedAnswers)) {
          acceptedAnswers.push(
            ...rubric.acceptedAnswers
              .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
              .map((a: string) => a.trim()),
          );
        }

        if (Array.isArray(q.options)) {
          const correctOpts = q.options.filter((o) => o.isCorrect && o.text?.trim().length > 0);
          for (const opt of correctOpts) {
            const trimmed = opt.text.trim();
            if (!acceptedAnswers.includes(trimmed)) {
              acceptedAnswers.push(trimmed);
            }
          }
        }

        const criteria = Array.isArray(rubric?.criteria)
          ? rubric.criteria.filter((c: any) => Array.isArray(c.keywords) && c.keywords.length > 0)
          : [];

        const hasTeacherAnswer = acceptedAnswers.length > 0 || criteria.length > 0;
        if (!hasTeacherAnswer) continue;

        const studentText = (ans.essayText || '').trim();
        const questionPoints = Number(q.points) || (Number(q.score) ? Math.round(Number(q.score) * 100) : 100);

        if (!studentText) {
          ans.scoreAwarded = 0;
          ans.isCorrect = false;
          subUpdated = true;
        } else {
          const gradeResult = gradeWithRubric(
            {
              questionId: q.id,
              submissionId: sub.id,
              studentAnswer: studentText,
              rubric: {
                questionId: q.id,
                acceptedAnswers,
                criteria,
                totalScore: questionPoints,
              },
            },
            DEFAULT_GRADING_CONFIG,
          );

          const scoreAwarded = Math.min(questionPoints, Math.max(0, Math.round(gradeResult.score)));
          ans.scoreAwarded = scoreAwarded;
          ans.isCorrect = scoreAwarded > 0;
          subUpdated = true;
        }
      }

      if (subUpdated) {
        let totalRawScore = 0;
        for (const a of sub.answers) {
          totalRawScore += Number(a.scoreAwarded) || 0;
        }
        sub.correctCount = sub.answers.filter((a) => a.isCorrect === true).length;
        sub.wrongCount = sub.answers.filter((a) => a.isCorrect === false).length;
        sub.score = totalRawScore;
        const maxScore = sub.maxScore || 1000;
        sub.percentage = maxScore > 0 ? Number(((totalRawScore / maxScore) * 100).toFixed(1)) : 0;
        await this.submissionRepo.save(sub);
        regradedCount++;
      }
    }

    return {
      regradedCount,
      message: `Đã tự động chấm lại ${regradedCount} bài nộp tự luận`,
    };
  }
}

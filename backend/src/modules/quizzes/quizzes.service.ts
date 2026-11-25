import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizEntity, QuizStatus, QuestionEntity, SubmissionEntity, ClassEntity, UserEntity, QuizAttemptEntity } from '../../entities/index.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { UploadService } from '../upload/upload.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TeacherStudentEntity } from '../students/entities/teacher-student.entity.js';

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
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly attemptRepo: Repository<QuizAttemptEntity>,
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo: Repository<TeacherStudentEntity>,
    private readonly uploadService: UploadService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAllQuizzes(userRole?: string, userId?: string) {
    const normalizedRole = userRole?.toUpperCase();
    if (normalizedRole === 'TEACHER') {
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

      // Early versions of the teacher UI persisted a TeacherStudent profile ID
      // instead of the linked login-account ID. Support those already-published
      // assignments while all new assignments use the account ID.
      const profiles = await this.teacherStudentRepo.find({
        where: { studentAccountId: userId },
        select: { id: true },
      });
      const assignedIdentityParams = [userId, ...profiles.map(profile => profile.id)];
      const assignedStudentCondition = assignedIdentityParams
        .map((_, index) => `JSON_CONTAINS(quiz.assignedStudentIds, :assignedStudentId${index})`)
        .join(' OR ');

      // Students only see quizzes assigned to their class or directly to them (NOT "all" mode)
      qb.andWhere(`(
        (quiz.classId IN (:...classIds)) OR
        (${assignedStudentCondition})
      )`, { 
        classIds: classIds.length ? classIds : ['DUMMY_ID'],
        ...Object.fromEntries(assignedIdentityParams.map((id, index) => [`assignedStudentId${index}`, `"${id}"`])),
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
    if (dto.classId) await this.assertGroupClassAssignment(dto.classId, teacher.id);
    const now = new Date().toISOString();
    const newQuiz = this.quizRepo.create({
      id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: dto.title,
      description: dto.description || '',
      subject: dto.subject,
      durationMinutes: dto.durationMinutes || 45,
      mode: dto.mode || 'QUIZ',
      totalPoints: dto.totalPoints || 1000,
      status: 'DRAFT',
      startTime: dto.startTime || now,
      endTime: dto.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAttempts: dto.totalAttempts || 1,
      shuffleQuestions: dto.shuffleQuestions ?? true,
      shuffleAnswers: dto.shuffleAnswers ?? true,
      showScoreImmediately: dto.showScoreImmediately ?? true,
      showCorrectAnswers: dto.showCorrectAnswers ?? true,
      showExplanation: dto.showExplanation ?? true,
      // Undefined keeps the legacy default. Null is an explicit policy for
      // manually graded essays: do not publish an answer-release schedule.
      answerReleaseAt: dto.answerReleaseAt === undefined
        ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        : dto.answerReleaseAt,
      teacherId: teacher.id,
      teacherName: teacher.name,
      questionCount: 0,
      totalScore: 0,
      classId: dto.classId || undefined,
      assignedStudentIds: dto.assignedStudentIds || [],
    });

    return this.quizRepo.save(newQuiz);
  }

  private assertQuizManager(quiz: QuizEntity, user: { id?: string; role?: string }) {
    if (user?.role === 'ADMIN') return;
    if (user?.role !== 'TEACHER' || quiz.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thao tác với bài kiểm tra này');
    }
  }

  private async assertGroupClassAssignment(classId: string, teacherId: string) {
    const classroom = await this.classRepo.findOneBy({ id: classId });
    if (!classroom || classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền giao đề cho lớp này');
    }
    if (classroom.isPrivate || classroom.id.startsWith('private-')) {
      throw new BadRequestException('Học sinh kèm 1-1 phải được giao đề ở chế độ “Học sinh 1-1”, không phải “Theo lớp”');
    }
  }

  private isAssetInQuizFolder(url: string, quizFolder: string): boolean {
    if (!url?.includes('cloudinary.com')) return false;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match?.[1]) return false;
    const publicId = decodeURIComponent(match[1]).replace(/\.[^/.]+$/, '');
    return publicId.startsWith(`${quizFolder}/`);
  }

  private async retryCloudinaryCleanup(label: string, action: () => Promise<boolean>) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (await action()) return;
    }
    // The DB is already committed. Keep the failure visible for an operator;
    // never resurrect quiz data just because an external delete failed.
    console.error(`Cloudinary cleanup requires retry: ${label}`);
  }

  async updateQuiz(id: string, dto: UpdateQuizDto, user: { id?: string; role?: string }) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra để cập nhật');
    }

    this.assertQuizManager(quiz, user);
    if (dto.classId) await this.assertGroupClassAssignment(dto.classId, user.id!);
    const { teacherId: _teacherId, teacherName: _teacherName, ...safeDto } = dto as any;
    Object.assign(quiz, safeDto);
    return this.quizRepo.save(quiz);
  }

  async deleteQuiz(id: string, user: { id?: string; role?: string }) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra để xóa');
    }

    this.assertQuizManager(quiz, user);
    // Capture only assets proven to belong to this quiz. DB deletion is committed
    // first; external Cloudinary cleanup must never precede it.
    const questions = await this.questionRepo.find({ where: { quizId: id } });
    // Clean up empty folders in Cloudinary
    const rootDir = quiz.mode === 'PRACTICE' ? 'ôn tập' : 'bài thi';
    const subjectDir = (quiz.subject || 'khác').trim().toLowerCase();
    const titleDir = quiz.title.trim();
    const quizFolder = `quiz-master/${rootDir}/${subjectDir}/${titleDir}`;
    
    // A folder name is not a durable ownership boundary (two quizzes can have
    // the same title). Only remove a question image when no question belonging
    // to another quiz references that exact URL. Submission JSON has no asset
    // relation to prove exclusive ownership, so it is intentionally retained.
    const candidateQuestionUrls = [...new Set(questions.map(question => question.imageUrl)
      .filter((url): url is string => this.isAssetInQuizFolder(url || '', quizFolder)))];

    await this.attemptRepo.manager.transaction(async manager => {
      await manager.getRepository(QuizAttemptEntity).delete({ quizId: id });
      await manager.getRepository(QuestionEntity).delete({ quizId: id });
      await manager.getRepository(SubmissionEntity).delete({ quizId: id });
      await manager.getRepository(QuizEntity).delete({ id });
    });

    for (const url of candidateQuestionUrls) {
      const references = await this.questionRepo.count({ where: { imageUrl: url } });
      if (references === 0) {
        await this.retryCloudinaryCleanup(`file ${url}`, () => this.uploadService.deleteFileByUrl(url));
      }
    }

    return { id, deleted: true };
  }

  async publishQuiz(id: string, user: { id?: string; role?: string }) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    this.assertQuizManager(quiz, user);
    // BE validate: tổng điểm các câu phải bằng total_points khi xuất bản, điểm mỗi câu >= 0 và là số nguyên.
    const questions = await this.questionRepo.find({ where: { quizId: id } });
    let currentTotalPoints = 0;
    for (const q of questions) {
      if (q.points < 0 || !Number.isInteger(q.points)) {
        throw new BadRequestException(`Điểm của câu hỏi (ID: ${q.id}) phải là số nguyên >= 0.`);
      }
      currentTotalPoints += q.points;
    }

    if (currentTotalPoints !== quiz.totalPoints) {
      const diff = quiz.totalPoints - currentTotalPoints;
      const textDiff = diff > 0 ? `thiếu ${diff / 100}đ` : `thừa ${-diff / 100}đ`;
      throw new BadRequestException(`Tổng điểm các câu hỏi (${currentTotalPoints / 100}đ) không khớp với thang điểm của bài thi (${quiz.totalPoints / 100}đ). Bạn đang ${textDiff}.`);
    }

    quiz.status = 'PUBLISHED';
    await this.quizRepo.save(quiz);

    // Gửi thông báo cho các học sinh liên quan
    const studentIds: string[] = [];

    if (quiz.classId) {
      // Giao theo lớp: lấy danh sách học sinh trong lớp
      const classEntity = await this.classRepo.findOne({
        where: { id: quiz.classId },
        relations: { students: true },
      });
      if (classEntity?.students) {
        studentIds.push(...classEntity.students.map(s => s.id));
      }
    } else if (quiz.assignedStudentIds && quiz.assignedStudentIds.length > 0) {
      // Giao theo học sinh 1-1
      studentIds.push(...quiz.assignedStudentIds);
    }

    for (const sid of studentIds) {
      await this.notificationsService.createPersonalNotification(
        sid,
        `Bài kiểm tra mới: ${quiz.title}`,
        `Giáo viên vừa giao bài kiểm tra "${quiz.title}" cho bạn. Hãy vào làm bài nhé!`,
        `/student/quizzes`,
        'Xem bài kiểm tra',
      );
    }

    return quiz;
  }

  async unpublishQuiz(id: string, user: { id?: string; role?: string }) {
    const quiz = await this.quizRepo.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }
    this.assertQuizManager(quiz, user);
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

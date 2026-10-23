import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ScoreRecordEntity, AssessmentType } from '../entities/score-record.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import { LessonEntity } from '../entities/lesson.entity.js';
import { QuizEntity } from '../../../entities/quiz.entity.js';
import { SubmissionEntity } from '../../../entities/submission.entity.js';
import { CreateScoreDto, UpdateScoreDto } from '../dto/score.dto.js';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

export type ScoreSource = 'MANUAL' | 'ONLINE';

export interface ScoreItemResponse {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  lessonId: string | null;
  assessmentType: AssessmentType;
  assessmentName: string;
  score: number;
  maxScore: number;
  date: string;
  comment: string;
  source: ScoreSource;
  quizId?: string;
  submissionId?: string;
  student?: {
    id: string;
    name: string;
    fullName?: string;
    email?: string;
  };
  class?: {
    id: string;
    name: string;
  };
  lesson?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoreMatrixAssessment {
  key: string;
  name: string;
  type: AssessmentType;
  source: ScoreSource;
  quizId?: string;
}

export interface ScoreMatrixStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  scores: Record<
    string,
    { id: string; score: number; maxScore: number; date: string; source: ScoreSource }
  >;
  averageScore: number;
  totalAssessments: number;
}

export interface ScoreMatrixResponse {
  classId: string;
  className: string;
  assessments: ScoreMatrixAssessment[];
  students: ScoreMatrixStudent[];
  classAverage: number;
}

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(ScoreRecordEntity)
    private readonly scoreRepo: Repository<ScoreRecordEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo?: Repository<TeacherStudentEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo?: Repository<QuizEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo?: Repository<SubmissionEntity>,
  ) {}

  private validateScoreRange(score: number, maxScore: number) {
    if (score < 0) {
      throw new BadRequestException('Điểm số không được nhỏ hơn 0');
    }
    if (maxScore <= 0) {
      throw new BadRequestException('Thang điểm tối đa phải lớn hơn 0');
    }
    if (score > maxScore) {
      throw new BadRequestException(
        `Điểm số (${score}) không được vượt quá thang điểm tối đa (${maxScore})`,
      );
    }
  }

  private isSubmissionPendingGrading(sub: SubmissionEntity): boolean {
    if (!Array.isArray(sub.answers)) return false;
    return sub.answers.some(
      (ans) => (ans.isCorrect === undefined || ans.isCorrect === null) && !ans.isManuallyGraded,
    );
  }

  private getStudentAccountId(student: any, profiles: TeacherStudentEntity[]): string | null {
    if (student.studentAccountId) return student.studentAccountId;
    if (student.userId) return student.userId;
    for (const p of profiles) {
      if (p.id === student.id || p.studentAccountId === student.id) {
        return p.studentAccountId || null;
      }
    }
    if (student.id && !student.id.startsWith('ts-')) {
      return student.id;
    }
    return null;
  }

  private getStudentIdentifiers(student: any, profiles: TeacherStudentEntity[]): Set<string> {
    const ids = new Set<string>();
    if (student.id) ids.add(student.id);
    if (student.userId) ids.add(student.userId);
    if (student.studentAccountId) ids.add(student.studentAccountId);
    if (student.studentProfileId) ids.add(student.studentProfileId);
    for (const p of profiles) {
      if (
        (student.id && (p.id === student.id || p.studentAccountId === student.id)) ||
        (student.email && p.email && p.email.toLowerCase() === student.email.toLowerCase())
      ) {
        ids.add(p.id);
        if (p.studentAccountId) ids.add(p.studentAccountId);
      }
    }
    return ids;
  }

  private async getOnlineQuizScores(
    teacherId: string,
    query: {
      classId?: string;
      studentId?: string;
      startDate?: string;
      endDate?: string;
    },
    manualScores: ScoreRecordEntity[] = [],
  ): Promise<ScoreItemResponse[]> {
    if (!this.quizRepo || !this.submissionRepo) {
      return [];
    }

    // 1. Quizzes MUST belong to this teacher (authorization requirement)
    const teacherQuizzes = await this.quizRepo.find({
      where: { teacherId },
      order: { createdAt: 'ASC' },
    });

    if (teacherQuizzes.length === 0) {
      return [];
    }

    // 2. Fetch teacher's student profiles for mapping
    const profiles = (await this.teacherStudentRepo?.find({ where: { teacherId } })) || [];

    // Determine target class and student filters
    let targetClass: ClassEntity | null = null;
    let targetStudents: any[] = [];

    if (query.classId) {
      targetClass = await this.ensureClass(teacherId, query.classId, false);
      if (!targetClass || targetClass.teacherId !== teacherId) {
        return [];
      }
      targetStudents = targetClass.students || [];
      if (query.classId.startsWith('private-') && targetStudents.length === 0) {
        const studentId = query.classId.replace('private-', '');
        const profile = profiles.find((p) => p.id === studentId || p.studentAccountId === studentId);
        if (profile) {
          targetStudents = [
            {
              id: profile.id,
              name: profile.fullName,
              email: profile.email,
              studentAccountId: profile.studentAccountId,
            },
          ];
        } else {
          const user = await this.userRepo.findOne({ where: { id: studentId } });
          if (user) {
            targetStudents = [user];
          }
        }
      }
    } else if (query.studentId) {
      const profile = profiles.find((p) => p.id === query.studentId || p.studentAccountId === query.studentId);
      if (profile) {
        targetStudents = [
          {
            id: profile.id,
            name: profile.fullName,
            email: profile.email,
            studentAccountId: profile.studentAccountId,
          },
        ];
      } else {
        const user = await this.userRepo.findOne({ where: { id: query.studentId } });
        if (user) {
          targetStudents = [user];
        }
      }
    } else {
      targetStudents = profiles.map((p) => ({
        id: p.id,
        name: p.fullName,
        email: p.email,
        studentAccountId: p.studentAccountId,
      }));
    }

    // Collect account IDs of target students
    const targetAccountIds = new Set<string>();
    for (const s of targetStudents) {
      const accId = this.getStudentAccountId(s, profiles);
      if (accId) targetAccountIds.add(accId);
    }

    if (targetAccountIds.size === 0) {
      return [];
    }

    // Filter relevant quizzes
    const isPrivate = query.classId ? query.classId.startsWith('private-') : false;
    let relevantQuizzes = teacherQuizzes.filter((q) => {
      if (query.classId) {
        if (q.classId === query.classId) return true;
        if (Array.isArray(q.assignedStudentIds) && q.assignedStudentIds.length > 0) {
          return q.assignedStudentIds.some((id) => targetAccountIds.has(id));
        }
        return false;
      }
      return true;
    });

    if (isPrivate && relevantQuizzes.length === 0) {
      const studentSubs = await this.submissionRepo.find({
        where: { studentId: In(Array.from(targetAccountIds)) },
        select: { quizId: true },
      });
      const submittedQuizIds = new Set(studentSubs.map((s) => s.quizId));
      relevantQuizzes = teacherQuizzes.filter((tq) => submittedQuizIds.has(tq.id));
    }

    const quizIds = relevantQuizzes.map((q) => q.id);
    if (quizIds.length === 0) {
      return [];
    }

    // Batch query submissions
    const submissions = await this.submissionRepo.find({
      where: {
        quizId: In(quizIds),
        studentId: In(Array.from(targetAccountIds)),
      },
      order: { createdAt: 'DESC' },
    });

    if (submissions.length === 0) {
      return [];
    }

    // Group submissions by studentId and quizId, keeping the latest valid attempt
    const seenQuizStudent = new Set<string>();
    const latestValidSubmissions = new Map<string, SubmissionEntity>();
    for (const sub of submissions) {
      const key = `${sub.studentId}__${sub.quizId}`;
      if (seenQuizStudent.has(key)) {
        continue;
      }
      seenQuizStudent.add(key);

      if (this.isSubmissionPendingGrading(sub)) {
        // Latest attempt is pending grading, so do not display score
        continue;
      }
      latestValidSubmissions.set(key, sub);
    }

    // Build online score items
    const onlineScoreItems: ScoreItemResponse[] = [];

    for (const student of targetStudents) {
      const studentAccId = this.getStudentAccountId(student, profiles);
      if (!studentAccId) continue;

      const studentIds = this.getStudentIdentifiers(student, profiles);
      const studentName = student.name || student.fullName || 'Học sinh';
      const studentEmail = student.email || '';

      for (const quiz of relevantQuizzes) {
        const sub = latestValidSubmissions.get(`${studentAccId}__${quiz.id}`);
        if (!sub) continue;

        const subDate = sub.submittedAt
          ? sub.submittedAt.substring(0, 10)
          : sub.createdAt
          ? new Date(sub.createdAt).toISOString().substring(0, 10)
          : new Date().toISOString().substring(0, 10);

        if (query.startDate && query.endDate) {
          if (subDate < query.startDate || subDate > query.endDate) {
            continue;
          }
        }

        // Deduplication: check if teacher entered a manual score for the same quiz
        const hasManualDuplicate = manualScores.some((ms) => {
          const isSameStudent = studentIds.has(ms.studentId);
          const isSameClass = !query.classId || ms.classId === query.classId;
          const isSameQuiz =
            ms.assessmentType === 'QUIZ' &&
            ms.assessmentName?.trim().toLowerCase() === quiz.title?.trim().toLowerCase();
          return isSameStudent && isSameClass && isSameQuiz;
        });

        if (hasManualDuplicate) {
          continue;
        }

        const maxScore = sub.maxScore > 0 ? sub.maxScore : 10;
        const normalizedScore = Number(((sub.score / maxScore) * 10).toFixed(1));

        const resolvedClassId =
          query.classId || quiz.classId || (targetClass ? targetClass.id : `private-${studentAccId}`);
        const resolvedClassName = targetClass
          ? targetClass.name
          : quiz.classId
          ? 'Lớp học'
          : `Kèm 1-1: ${studentName}`;

        onlineScoreItems.push({
          id: `online-${sub.id}`,
          teacherId,
          classId: resolvedClassId,
          studentId: student.id || studentAccId,
          lessonId: null,
          assessmentType: 'QUIZ',
          assessmentName: quiz.title,
          score: normalizedScore,
          maxScore: 10,
          date: subDate,
          comment: `Điểm bài thi online: ${quiz.title}`,
          source: 'ONLINE',
          quizId: quiz.id,
          submissionId: sub.id,
          student: {
            id: student.id || studentAccId,
            name: studentName,
            fullName: studentName,
            email: studentEmail,
          },
          class: {
            id: resolvedClassId,
            name: resolvedClassName,
          },
          lesson: null,
          createdAt: sub.createdAt || new Date(),
          updatedAt: sub.updatedAt || new Date(),
        });
      }
    }

    return onlineScoreItems;
  }

  async getScores(
    teacherId: string,
    query: {
      classId?: string;
      studentId?: string;
      lessonId?: string;
      assessmentType?: AssessmentType;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ScoreItemResponse[]> {
    const qb = this.scoreRepo
      .createQueryBuilder('score')
      .leftJoinAndSelect('score.student', 'student')
      .leftJoinAndSelect('score.class', 'class')
      .leftJoinAndSelect('score.lesson', 'lesson')
      .where('score.teacherId = :teacherId', { teacherId });

    if (query.classId) {
      qb.andWhere('score.classId = :classId', { classId: query.classId });
    }

    if (query.studentId) {
      qb.andWhere('score.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.lessonId) {
      qb.andWhere('score.lessonId = :lessonId', { lessonId: query.lessonId });
    }

    if (query.assessmentType) {
      qb.andWhere('score.assessmentType = :assessmentType', {
        assessmentType: query.assessmentType,
      });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('score.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    qb.orderBy('score.date', 'DESC').addOrderBy('score.createdAt', 'DESC');

    const manualScores = await qb.getMany();

    const formattedManualScores: ScoreItemResponse[] = manualScores.map((sc) => ({
      ...sc,
      source: 'MANUAL' as ScoreSource,
      student: sc.student
        ? {
            id: sc.student.id,
            name: sc.student.name || (sc.student as any).fullName || '',
            fullName: (sc.student as any).fullName || sc.student.name || '',
            email: sc.student.email || '',
          }
        : undefined,
      class: sc.class
        ? {
            id: sc.class.id,
            name: sc.class.name,
          }
        : undefined,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
    }));

    if (query.lessonId || (query.assessmentType && query.assessmentType !== 'QUIZ')) {
      return formattedManualScores;
    }

    const onlineScores = await this.getOnlineQuizScores(teacherId, query, manualScores);

    const allScores = [...formattedManualScores, ...onlineScores];
    allScores.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return allScores;
  }

  async getScoreById(teacherId: string, id: string) {
    const score = await this.scoreRepo.findOne({
      where: { id },
      relations: { student: true, class: true, lesson: true },
    });

    if (!score) {
      throw new NotFoundException('Không tìm thấy bản ghi điểm');
    }

    if (score.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền truy cập điểm này');
    }

    return score;
  }

  async ensureClass(
    teacherId: string,
    classId: string,
    persistIfVirtual = false,
  ): Promise<ClassEntity | null> {
    let classEntity = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true },
    });

    if (!classEntity && classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');
      let studentName = '';
      let studentUser: UserEntity | null = null;

      if (this.teacherStudentRepo) {
        const ts = await this.teacherStudentRepo.findOne({
          where: [{ id: studentId, teacherId }, { studentAccountId: studentId, teacherId }],
        });
        if (ts) {
          studentName = ts.fullName;
          if (ts.studentAccountId) {
            studentUser = await this.userRepo.findOne({ where: { id: ts.studentAccountId } });
          }
        }
      }

      if (!studentName) {
        studentUser = await this.userRepo.findOne({ where: { id: studentId } });
        if (studentUser) studentName = studentUser.name;
      }

      if (studentName) {
        const rawCode = `PV${studentId.replace(/\D/g, '').slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        classEntity = this.classRepo.create({
          id: classId,
          name: `Kèm 1-1: ${studentName}`,
          subject: 'Gia sư cá nhân',
          description: 'Lớp học riêng 1 kèm 1',
          inviteCode: rawCode,
          isPrivate: true,
          teacherId,
          students: studentUser ? [studentUser] : [],
        });
        if (persistIfVirtual) {
          await this.classRepo.save(classEntity);
        }
      }
    } else if (
      classEntity &&
      classId.startsWith('private-') &&
      (!classEntity.students || classEntity.students.length === 0)
    ) {
      const studentId = classId.replace('private-', '');
      const student = await this.userRepo.findOne({ where: { id: studentId } });
      if (student) {
        classEntity.students = [student];
        if (persistIfVirtual) {
          await this.classRepo.save(classEntity);
        }
      }
    }

    return classEntity;
  }

  async createScore(teacherId: string, dto: CreateScoreDto) {
    const maxScore = dto.maxScore ?? 10;
    this.validateScoreRange(dto.score, maxScore);

    const classEntity = await this.ensureClass(teacherId, dto.classId, true);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền nhập điểm cho lớp học này');
    }

    let isStudentInClass = classEntity.students.some((s) => s.id === dto.studentId);
    if (!isStudentInClass && classEntity.id.startsWith('private-')) {
      isStudentInClass = classEntity.id === `private-${dto.studentId}`;
    }
    if (!isStudentInClass && this.teacherStudentRepo) {
      const ts = await this.teacherStudentRepo.findOne({
        where: [{ id: dto.studentId, teacherId }, { studentAccountId: dto.studentId, teacherId }],
      });
      if (ts) isStudentInClass = true;
    }
    if (!isStudentInClass) {
      throw new BadRequestException('Học sinh này không thuộc lớp học được chọn');
    }

    let lesson: LessonEntity | null = null;
    if (dto.lessonId) {
      lesson = await this.lessonRepo.findOne({ where: { id: dto.lessonId } });
      if (!lesson) {
        throw new NotFoundException('Không tìm thấy buổi học liên kết');
      }
      if (lesson.teacherId !== teacherId || lesson.classId !== dto.classId) {
        throw new BadRequestException('Buổi học không khớp với lớp hoặc giáo viên');
      }
    }

    const newScore = this.scoreRepo.create({
      id: `scr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      teacherId,
      classId: dto.classId,
      studentId: dto.studentId,
      lessonId: lesson ? lesson.id : null,
      assessmentType: dto.assessmentType,
      assessmentName: dto.assessmentName,
      score: dto.score,
      maxScore,
      date: dto.date,
      comment: dto.comment || '',
    });

    return await this.scoreRepo.save(newScore);
  }

  async updateScore(teacherId: string, id: string, dto: UpdateScoreDto) {
    if (id.startsWith('online-')) {
      throw new BadRequestException('Không thể cập nhật điểm bài làm online trực tiếp từ bảng điểm');
    }

    const score = await this.getScoreById(teacherId, id);

    const newScoreValue = dto.score ?? score.score;
    const newMaxScore = dto.maxScore ?? score.maxScore;
    this.validateScoreRange(newScoreValue, newMaxScore);

    score.assessmentType = dto.assessmentType ?? score.assessmentType;
    score.assessmentName = dto.assessmentName ?? score.assessmentName;
    score.score = newScoreValue;
    score.maxScore = newMaxScore;
    score.date = dto.date ?? score.date;
    score.comment = dto.comment ?? score.comment;

    return await this.scoreRepo.save(score);
  }

  async deleteScore(teacherId: string, id: string) {
    if (id.startsWith('online-')) {
      throw new BadRequestException('Không thể xóa điểm bài làm online trực tiếp từ bảng điểm');
    }

    const score = await this.getScoreById(teacherId, id);
    await this.scoreRepo.remove(score);
    return { success: true, message: 'Đã xóa điểm thành công' };
  }

  async getClassScoreMatrix(teacherId: string, classId: string): Promise<ScoreMatrixResponse> {
    const classEntity = await this.ensureClass(teacherId, classId, false);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xem bảng điểm của lớp này');
    }

    // 1. Fetch manual scores for this class
    const manualScores = await this.scoreRepo.find({
      where: { classId },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    // 2. Fetch profiles for student mapping
    const profiles = (await this.teacherStudentRepo?.find({ where: { teacherId } })) || [];

    // Ensure students list has proper student info
    let classStudents = classEntity.students || [];
    if (classId.startsWith('private-') && classStudents.length === 0) {
      const studentId = classId.replace('private-', '');
      const profile = profiles.find((p) => p.id === studentId || p.studentAccountId === studentId);
      if (profile) {
        classStudents = [
          {
            id: profile.id,
            name: profile.fullName,
            email: profile.email || '',
            studentAccountId: profile.studentAccountId,
          } as any,
        ];
      } else {
        const user = await this.userRepo.findOne({ where: { id: studentId } });
        if (user) classStudents = [user];
      }
    }

    // 3. Fetch online quiz scores for this class
    const onlineScores = await this.getOnlineQuizScores(
      teacherId,
      { classId },
      manualScores,
    );

    // 4. Build assessment columns Map (Key -> metadata)
    const assessmentMap = new Map<string, ScoreMatrixAssessment>();

    // Add manual assessment definitions
    for (const sc of manualScores) {
      const key = `MANUAL__${sc.assessmentType}__${sc.assessmentName}`;
      if (!assessmentMap.has(key)) {
        assessmentMap.set(key, {
          key,
          name: sc.assessmentName,
          type: sc.assessmentType,
          source: 'MANUAL',
        });
      }
    }

    // Add online assessment definitions
    for (const sc of onlineScores) {
      const key = `ONLINE__${sc.quizId || sc.id}`;
      if (!assessmentMap.has(key)) {
        assessmentMap.set(key, {
          key,
          name: sc.assessmentName,
          type: 'QUIZ',
          source: 'ONLINE',
          quizId: sc.quizId,
        });
      }
    }

    const assessments = Array.from(assessmentMap.values());

    // 5. Build matrix for each student
    const studentRows: ScoreMatrixStudent[] = [];
    let totalScoreAll = 0;
    let totalAssessmentsAll = 0;

    for (const student of classStudents) {
      const studentIds = this.getStudentIdentifiers(student, profiles);
      const studentAccId = this.getStudentAccountId(student, profiles);

      const studentManualScores = manualScores.filter((sc) => studentIds.has(sc.studentId));
      const studentOnlineScores = onlineScores.filter(
        (sc) => studentIds.has(sc.studentId) || (studentAccId && sc.studentId === studentAccId),
      );

      const scoreObj: Record<
        string,
        { id: string; score: number; maxScore: number; date: string; source: ScoreSource }
      > = {};

      let studentNormalizedSum = 0;
      let count = 0;

      // Populate manual scores
      for (const sc of studentManualScores) {
        const key = `MANUAL__${sc.assessmentType}__${sc.assessmentName}`;
        scoreObj[key] = {
          id: sc.id,
          score: sc.score,
          maxScore: sc.maxScore,
          date: sc.date,
          source: 'MANUAL',
        };
        studentNormalizedSum += (sc.score / sc.maxScore) * 10;
        count++;
      }

      // Populate online scores
      for (const sc of studentOnlineScores) {
        const key = `ONLINE__${sc.quizId || sc.id}`;
        if (!scoreObj[key]) {
          scoreObj[key] = {
            id: sc.id,
            score: sc.score,
            maxScore: sc.maxScore,
            date: sc.date,
            source: 'ONLINE',
          };
          studentNormalizedSum += (sc.score / sc.maxScore) * 10;
          count++;
        }
      }

      const averageScore = count > 0 ? Number((studentNormalizedSum / count).toFixed(2)) : 0;

      if (count > 0) {
        totalScoreAll += studentNormalizedSum;
        totalAssessmentsAll += count;
      }

      const displayName = student.name || (student as any).fullName || 'Học sinh';
      const displayEmail = student.email || '';

      studentRows.push({
        studentId: student.id,
        studentName: displayName,
        studentEmail: displayEmail,
        scores: scoreObj,
        averageScore,
        totalAssessments: count,
      });
    }

    const classAverage =
      totalAssessmentsAll > 0 ? Number((totalScoreAll / totalAssessmentsAll).toFixed(2)) : 0;

    return {
      classId: classEntity.id,
      className: classEntity.name,
      assessments,
      students: studentRows,
      classAverage,
    };
  }

  async exportScoresToExcel(
    teacherId: string,
    query: { classId?: string; studentId?: string },
  ): Promise<Buffer> {
    if (query.classId) {
      const matrix = await this.getClassScoreMatrix(teacherId, query.classId);
      const rows = matrix.students.map((st, idx) => {
        const row: Record<string, any> = {
          STT: idx + 1,
          'Học sinh': st.studentName,
          Email: st.studentEmail,
        };

        for (const ass of matrix.assessments) {
          const sc = st.scores[ass.key];
          const colName = ass.source === 'ONLINE' ? `${ass.name} (Online)` : ass.name;
          row[colName] = sc ? `${sc.score}/${sc.maxScore}` : '-';
        }

        row['Điểm trung bình (hệ 10)'] = st.averageScore;
        return row;
      });

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
      return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    const scores = await this.getScores(teacherId, query);
    const rows = scores.map((sc, idx) => ({
      STT: idx + 1,
      'Học sinh': sc.student?.name || '',
      Email: sc.student?.email || '',
      'Lớp học': sc.class?.name || '',
      'Nguồn': sc.source === 'ONLINE' ? 'Online Quiz' : 'GV nhập',
      'Loại đánh giá': sc.assessmentType,
      'Tên bài kiểm tra': sc.assessmentName,
      'Điểm đạt được': sc.score,
      'Thang điểm': sc.maxScore,
      'Ngày chấm': sc.date,
      'Nhận xét': sc.comment || '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DanhSachDiem');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async importScoresFromExcel(
    teacherId: string,
    classId: string,
    fileBuffer: Buffer,
  ): Promise<{ successCount: number; errors: string[] }> {
    const classEntity = await this.ensureClass(teacherId, classId, true);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền nhập điểm cho lớp này');
    }

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File Excel không có dữ liệu');
    }

    const rawRows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!rawRows || rawRows.length === 0) {
      throw new BadRequestException('Sheet đầu tiên của file Excel trống');
    }

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;

      const email = String(row['Email'] || row['email'] || '').trim();
      const assessmentName = String(
        row['Tên bài kiểm tra'] || row['Bài kiểm tra'] || row['AssessmentName'] || '',
      ).trim();
      const scoreStr = row['Điểm đạt được'] ?? row['Điểm'] ?? row['Score'];
      const maxScoreStr = row['Thang điểm'] ?? row['MaxScore'] ?? 10;
      const date = String(row['Ngày chấm'] || row['Ngày'] || row['Date'] || '').trim();
      const typeStr = String(row['Loại đánh giá'] || row['Loại'] || 'QUIZ').trim().toUpperCase();
      const comment = String(row['Nhận xét'] || row['Comment'] || '').trim();

      if (!email || !assessmentName || scoreStr === undefined || !date) {
        errors.push(`Dòng ${rowNum}: Thiếu Email, Tên bài kiểm tra, Điểm hoặc Ngày`);
        continue;
      }

      const score = Number(scoreStr);
      const maxScore = Number(maxScoreStr);

      if (isNaN(score) || isNaN(maxScore) || score < 0 || maxScore <= 0 || score > maxScore) {
        errors.push(`Dòng ${rowNum}: Điểm số không hợp lệ (0 <= điểm <= thang điểm)`);
        continue;
      }

      const student = classEntity.students.find((s) => s.email.toLowerCase() === email.toLowerCase());
      if (!student) {
        errors.push(`Dòng ${rowNum}: Học sinh "${email}" không thuộc lớp này`);
        continue;
      }

      const validTypes: AssessmentType[] = [
        'QUIZ',
        'HOMEWORK',
        'MIDTERM',
        'FINAL',
        'ORAL',
        'PRACTICE',
        'OTHER',
      ];
      const assessmentType: AssessmentType = validTypes.includes(typeStr as any)
        ? (typeStr as AssessmentType)
        : 'QUIZ';

      await this.createScore(teacherId, {
        classId: classEntity.id,
        studentId: student.id,
        assessmentName,
        assessmentType,
        score,
        maxScore,
        date,
        comment,
      });

      successCount++;
    }

    return { successCount, errors };
  }
}

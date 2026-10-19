import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreRecordEntity, AssessmentType } from '../entities/score-record.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import { LessonEntity } from '../entities/lesson.entity.js';
import { CreateScoreDto, UpdateScoreDto } from '../dto/score.dto.js';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

export interface ScoreMatrixStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  scores: Record<string, { id: string; score: number; maxScore: number; date: string }>;
  averageScore: number;
  totalAssessments: number;
}

export interface ScoreMatrixResponse {
  classId: string;
  className: string;
  assessments: { key: string; name: string; type: AssessmentType }[];
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
  ) {
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

    return await qb.getMany();
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

  async ensureClass(teacherId: string, classId: string): Promise<ClassEntity | null> {
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
        await this.classRepo.save(classEntity);
      }
    } else if (classEntity && classId.startsWith('private-') && (!classEntity.students || classEntity.students.length === 0)) {
      const studentId = classId.replace('private-', '');
      const student = await this.userRepo.findOne({ where: { id: studentId } });
      if (student) {
        classEntity.students = [student];
        await this.classRepo.save(classEntity);
      }
    }

    return classEntity;
  }

  async createScore(teacherId: string, dto: CreateScoreDto) {
    const maxScore = dto.maxScore ?? 10;
    this.validateScoreRange(dto.score, maxScore);

    // Validate class ownership (supporting both group & private 1-on-1 tutoring classes)
    const classEntity = await this.ensureClass(teacherId, dto.classId);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền nhập điểm cho lớp học này');
    }

    // Validate student is enrolled in class (supports both TeacherStudent and UserEntity)
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

    // If lessonId is provided, validate lesson belongs to teacher and class
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
    const score = await this.getScoreById(teacherId, id);
    await this.scoreRepo.remove(score);
    return { success: true, message: 'Đã xóa điểm thành công' };
  }

  async getClassScoreMatrix(teacherId: string, classId: string): Promise<ScoreMatrixResponse> {
    const classEntity = await this.ensureClass(teacherId, classId);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xem bảng điểm của lớp này');
    }

    const scores = await this.scoreRepo.find({
      where: { classId },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    // Extract unique assessment definitions (Key: assessmentType + Name)
    const assessmentMap = new Map<string, { key: string; name: string; type: AssessmentType }>();
    for (const sc of scores) {
      const key = `${sc.assessmentType}__${sc.assessmentName}`;
      if (!assessmentMap.has(key)) {
        assessmentMap.set(key, {
          key,
          name: sc.assessmentName,
          type: sc.assessmentType,
        });
      }
    }
    const assessments = Array.from(assessmentMap.values());

    // Build matrix for each student
    const studentRows: ScoreMatrixStudent[] = [];
    let totalScoreAll = 0;
    let totalAssessmentsAll = 0;

    for (const student of classEntity.students) {
      const studentScores = scores.filter((sc) => sc.studentId === student.id);
      const scoreObj: Record<string, { id: string; score: number; maxScore: number; date: string }> = {};

      let studentNormalizedSum = 0;
      for (const sc of studentScores) {
        const key = `${sc.assessmentType}__${sc.assessmentName}`;
        scoreObj[key] = {
          id: sc.id,
          score: sc.score,
          maxScore: sc.maxScore,
          date: sc.date,
        };
        // Normalize to scale 10: (score / maxScore) * 10
        studentNormalizedSum += (sc.score / sc.maxScore) * 10;
      }

      const count = studentScores.length;
      const averageScore = count > 0 ? Number((studentNormalizedSum / count).toFixed(2)) : 0;

      if (count > 0) {
        totalScoreAll += studentNormalizedSum;
        totalAssessmentsAll += count;
      }

      studentRows.push({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
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
          row[ass.name] = sc ? `${sc.score}/${sc.maxScore}` : '-';
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
    const classEntity = await this.ensureClass(teacherId, classId);

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

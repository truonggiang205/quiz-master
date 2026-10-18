import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningLogEntity } from '../entities/learning-log.entity.js';
import { LessonEntity } from '../entities/lesson.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import {
  CreateLearningLogDto,
  UpdateLearningLogDto,
  BulkSaveLogsDto,
} from '../dto/learning-log.dto.js';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

@Injectable()
export class LearningLogsService {
  constructor(
    @InjectRepository(LearningLogEntity)
    private readonly logRepo: Repository<LearningLogEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getLogs(
    teacherId: string,
    query: {
      month?: string;
      classId?: string;
      studentId?: string;
      search?: string;
      lessonId?: string;
    },
  ) {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.student', 'student')
      .leftJoinAndSelect('log.class', 'class')
      .leftJoinAndSelect('log.lesson', 'lesson')
      .where('log.teacherId = :teacherId', { teacherId });

    if (query.classId) {
      qb.andWhere('log.classId = :classId', { classId: query.classId });
    }

    if (query.studentId) {
      qb.andWhere('log.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.lessonId) {
      qb.andWhere('log.lessonId = :lessonId', { lessonId: query.lessonId });
    }

    if (query.month) {
      qb.andWhere('lesson.date LIKE :month', { month: `${query.month}%` });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(student.name) LIKE LOWER(:search) OR LOWER(student.email) LIKE LOWER(:search) OR LOWER(log.content) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('lesson.date', 'DESC').addOrderBy('student.name', 'ASC');

    return await qb.getMany();
  }

  async getLogById(teacherId: string, logId: string) {
    const log = await this.logRepo.findOne({
      where: { id: logId },
      relations: { student: true, class: true, lesson: true },
    });

    if (!log) {
      throw new NotFoundException('Không tìm thấy nhật ký học tập');
    }

    if (log.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xem nhật ký này');
    }

    return log;
  }

  async createOrUpdateLog(teacherId: string, dto: CreateLearningLogDto) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: dto.lessonId },
      relations: { class: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }

    if (lesson.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền ghi nhật ký cho buổi học này');
    }

    // Verify student exists
    const student = await this.userRepo.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    // Check if log already exists for this lesson and student
    let log = await this.logRepo.findOne({
      where: { lessonId: dto.lessonId, studentId: dto.studentId },
    });

    if (log) {
      log.content = dto.content ?? log.content;
      log.homework = dto.homework ?? log.homework;
      log.attitude = dto.attitude ?? log.attitude;
      log.comment = dto.comment ?? log.comment;
      log.note = dto.note ?? log.note;
      return await this.logRepo.save(log);
    }

    log = this.logRepo.create({
      id: `log-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      teacherId,
      classId: lesson.classId,
      lessonId: lesson.id,
      studentId: student.id,
      content: dto.content || '',
      homework: dto.homework || '',
      attitude: dto.attitude || 'Tốt',
      comment: dto.comment || '',
      note: dto.note || '',
    });

    return await this.logRepo.save(log);
  }

  async bulkSaveLogs(teacherId: string, dto: BulkSaveLogsDto) {
    const results = [];
    for (const item of dto.logs) {
      const saved = await this.createOrUpdateLog(teacherId, item);
      results.push(saved);
    }
    return results;
  }

  async updateLog(teacherId: string, logId: string, dto: UpdateLearningLogDto) {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) {
      throw new NotFoundException('Không tìm thấy nhật ký học tập');
    }

    if (log.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền sửa nhật ký này');
    }

    log.content = dto.content ?? log.content;
    log.homework = dto.homework ?? log.homework;
    log.attitude = dto.attitude ?? log.attitude;
    log.comment = dto.comment ?? log.comment;
    log.note = dto.note ?? log.note;

    return await this.logRepo.save(log);
  }

  async exportLogsToExcel(
    teacherId: string,
    query: { month?: string; classId?: string; studentId?: string },
  ): Promise<Buffer> {
    const logs = await this.getLogs(teacherId, query);

    const rows = logs.map((l, index) => ({
      STT: index + 1,
      'Học sinh': l.student?.name || '',
      Email: l.student?.email || '',
      'Lớp học': l.class?.name || '',
      'Ngày học': l.lesson?.date || '',
      'Giờ học': l.lesson ? `${l.lesson.startTime} - ${l.lesson.endTime}` : '',
      'Nội dung buổi học': l.content || '',
      'BTVN giao về': l.homework || '',
      'Ý thức học tập': l.attitude || '',
      'Nhận xét của giáo viên': l.comment || '',
      'Ghi chú thêm': l.note || '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'NhatKyHocTap');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async importLogsFromExcel(
    teacherId: string,
    fileBuffer: Buffer,
  ): Promise<{ successCount: number; errors: string[] }> {
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
      const date = String(row['Ngày học'] || row['Date'] || row['date'] || '').trim();
      const content = String(row['Nội dung buổi học'] || row['Nội dung'] || row['Content'] || '').trim();
      const homework = String(row['BTVN giao về'] || row['BTVN'] || row['Homework'] || '').trim();
      const attitude = String(row['Ý thức học tập'] || row['Ý thức'] || row['Attitude'] || '').trim();
      const comment = String(row['Nhận xét của giáo viên'] || row['Nhận xét'] || row['Comment'] || '').trim();
      const note = String(row['Ghi chú thêm'] || row['Ghi chú'] || row['Note'] || '').trim();

      if (!email || !date) {
        errors.push(`Dòng ${rowNum}: Thiếu Email hoặc Ngày học`);
        continue;
      }

      // Find student
      const student = await this.userRepo.findOne({ where: { email } });
      if (!student) {
        errors.push(`Dòng ${rowNum}: Không tìm thấy học sinh với email "${email}"`);
        continue;
      }

      // Find teacher's lesson on that date where student is participant
      const lesson = await this.lessonRepo
        .createQueryBuilder('l')
        .innerJoin('l.participants', 'p', 'p.studentId = :studentId', { studentId: student.id })
        .where('l.teacherId = :teacherId', { teacherId })
        .andWhere('l.date = :date', { date })
        .getOne();

      if (!lesson) {
        errors.push(`Dòng ${rowNum}: Không tìm thấy buổi học ngày "${date}" cho học sinh "${email}"`);
        continue;
      }

      await this.createOrUpdateLog(teacherId, {
        lessonId: lesson.id,
        studentId: student.id,
        content,
        homework,
        attitude: attitude || 'Tốt',
        comment,
        note,
      });

      successCount++;
    }

    return { successCount, errors };
  }
}

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
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import {
  CreateLearningLogDto,
  UpdateLearningLogDto,
  BulkSaveLogsDto,
} from '../dto/learning-log.dto.js';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import {
  ExcelExportMetadata,
  ExcelLogItem,
  createReportHeader,
  createStudentSummary,
  createSummaryKpiStrip,
  createTableHeader,
  styleDataRows,
  createTableFooter,
  createSummarySheet,
  setupPrintSettings,
  generateExportFilename,
} from '../utils/learning-logs-excel.util.js';

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
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo?: Repository<TeacherStudentEntity>,
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
        '(LOWER(student.fullName) LIKE LOWER(:search) OR LOWER(student.email) LIKE LOWER(:search) OR LOWER(log.content) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('lesson.date', 'DESC').addOrderBy('student.fullName', 'ASC');

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

    // Verify student exists (supports both TeacherStudent and UserEntity)
    let studentId = dto.studentId;
    let studentFound = false;

    if (this.teacherStudentRepo) {
      const ts = await this.teacherStudentRepo.findOne({
        where: [{ id: dto.studentId, teacherId }, { studentAccountId: dto.studentId, teacherId }],
      });
      if (ts) {
        studentId = ts.id;
        studentFound = true;
      }
    }

    if (!studentFound) {
      const student = await this.userRepo.findOne({ where: { id: dto.studentId } });
      if (student) {
        studentFound = true;
      }
    }

    if (!studentFound) {
      throw new NotFoundException('Không tìm thấy học sinh hoặc bạn không có quyền ghi nhật ký cho học sinh này');
    }

    // Check if log already exists for this lesson and student
    let log = await this.logRepo.findOne({
      where: { lessonId: dto.lessonId, studentId },
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
      studentId,
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
  ): Promise<{ buffer: Buffer; filename: string }> {
    const logs = await this.getLogs(teacherId, query);

    // Sort logs chronologically by date and start time ascending
    logs.sort((a, b) => {
      const cmpDate = (a.lesson?.date || '').localeCompare(b.lesson?.date || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.lesson?.startTime || '').localeCompare(b.lesson?.startTime || '');
    });

    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });
    const student = query.studentId
      ? await this.userRepo.findOne({ where: { id: query.studentId } })
      : logs[0]?.student;
    const classObj = query.classId
      ? await this.classRepo.findOne({ where: { id: query.classId } })
      : logs[0]?.class;

    const totalFee = logs.reduce((acc, l) => acc + (l.lesson?.feePerLesson || 0), 0);
    const uniqueStudentIds = new Set(logs.map((l) => l.studentId));
    const isSingleStudent = !!query.studentId || uniqueStudentIds.size <= 1;

    const metadata: ExcelExportMetadata = {
      teacherName: teacher?.name || 'Giáo viên phụ trách',
      studentName: (student as any)?.fullName || student?.name || (logs[0]?.student as any)?.fullName || logs[0]?.student?.name || 'Tất cả học sinh',
      studentEmail: (student?.email || logs[0]?.student?.email) ?? undefined,
      className: classObj?.name || logs[0]?.class?.name || (isSingleStudent ? 'Kèm 1-1' : 'Tổng hợp các lớp'),
      month: query.month,
      totalFee,
      isSingleStudent,
    };

    const logItems: ExcelLogItem[] = logs.map((l, index) => ({
      index: index + 1,
      studentName: l.student?.name || '',
      studentEmail: l.student?.email || '',
      className: l.class?.name || '',
      date: l.lesson?.date || '',
      startTime: l.lesson?.startTime || '',
      endTime: l.lesson?.endTime || '',
      fee: l.lesson?.feePerLesson || 0,
      content: l.content || '',
      homework: l.homework || '',
      attitude: l.attitude || 'Tốt',
      comment: l.comment || '',
      note: l.note || '',
    }));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QuizMaster';
    workbook.lastModifiedBy = teacher?.name || 'QuizMaster';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = 'Nhật ký học tập';
    workbook.subject = 'Báo cáo tiến trình học tập chuyên nghiệp';
    workbook.company = 'QuizMaster Education';

    // Sheet 1: Nhật ký học tập
    const sheet1 = workbook.addWorksheet('Nhật ký học tập', {
      views: [{ showGridLines: true }],
    });

    const lastColLetter = isSingleStudent ? 'H' : 'J';

    createReportHeader(
      sheet1,
      'NHẬT KÝ HỌC TẬP',
      'Theo dõi tiến trình học tập, bài tập và nhận xét qua từng buổi học',
      lastColLetter,
    );

    createStudentSummary(sheet1, metadata, logs.length, lastColLetter);

    createSummaryKpiStrip(sheet1, logItems, totalFee, lastColLetter, 9);

    const headers = isSingleStudent
      ? [
          { title: 'STT', width: 8, col: 1 },
          { title: 'NGÀY', width: 15, col: 2 },
          { title: 'THỜI GIAN', width: 18, col: 3 },
          { title: 'NỘI DUNG HỌC TẬP', width: 42, col: 4 },
          { title: 'BTVN', width: 14, col: 5 },
          { title: 'Ý THỨC', width: 15, col: 6 },
          { title: 'NHẬN XÉT', width: 44, col: 7 },
          { title: 'GHI CHÚ', width: 32, col: 8 },
        ]
      : [
          { title: 'STT', width: 8, col: 1 },
          { title: 'HỌC SINH', width: 24, col: 2 },
          { title: 'LỚP HỌC', width: 18, col: 3 },
          { title: 'NGÀY', width: 14, col: 4 },
          { title: 'THỜI GIAN', width: 18, col: 5 },
          { title: 'NỘI DUNG HỌC TẬP', width: 40, col: 6 },
          { title: 'BTVN', width: 14, col: 7 },
          { title: 'Ý THỨC', width: 15, col: 8 },
          { title: 'NHẬN XÉT', width: 40, col: 9 },
          { title: 'GHI CHÚ', width: 30, col: 10 },
        ];

    createTableHeader(sheet1, headers, 11);

    const lastRow = styleDataRows(sheet1, logItems, isSingleStudent, 12);

    if (logs.length > 0) {
      createTableFooter(sheet1, lastRow, isSingleStudent, logs.length, totalFee);
    }

    setupPrintSettings(
      sheet1,
      metadata.month ? ` — Tháng ${metadata.month}` : '',
      lastColLetter,
      11,
    );

    // Sheet 2: Tổng quan (Executive Education Summary Dashboard)
    createSummarySheet(workbook, metadata, logItems);

    const filename = generateExportFilename(
      metadata.isSingleStudent,
      metadata.studentName,
      metadata.month,
    );

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename,
    };
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

    const sheet = workbook.Sheets[sheetName];
    // Auto-detect header row index (row 0 to 15)
    let headerRowIdx = 0;
    const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    for (let r = 0; r < Math.min(rawData.length, 15); r++) {
      const row = rawData[r];
      if (Array.isArray(row)) {
        const hasDate = row.some((cell: any) => typeof cell === 'string' && /ngày/i.test(cell));
        const hasContentOrEmail = row.some(
          (cell: any) => typeof cell === 'string' && (/email|học sinh|nội dung|btvn/i.test(cell)),
        );
        if (hasDate && hasContentOrEmail) {
          headerRowIdx = r;
          break;
        }
      }
    }

    const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { range: headerRowIdx });
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

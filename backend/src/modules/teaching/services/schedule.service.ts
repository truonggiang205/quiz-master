import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { LessonEntity } from '../entities/lesson.entity.js';
import { LessonParticipantEntity } from '../entities/lesson-participant.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import { TuitionItemEntity } from '../entities/tuition-item.entity.js';
import { CreateLessonDto, UpdateLessonDto } from '../dto/schedule.dto.js';
import crypto from 'crypto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(LessonParticipantEntity)
    private readonly participantRepo: Repository<LessonParticipantEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TuitionItemEntity)
    private readonly tuitionRepo: Repository<TuitionItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  calculateDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (
      isNaN(startH) ||
      isNaN(startM) ||
      isNaN(endH) ||
      isNaN(endM) ||
      startH < 0 ||
      startH > 23 ||
      endH < 0 ||
      endH > 23 ||
      startM < 0 ||
      startM > 59 ||
      endM < 0 ||
      endM > 59
    ) {
      throw new BadRequestException('Định dạng thời gian không hợp lệ (HH:mm)');
    }
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    if (endMins <= startMins) {
      throw new BadRequestException('Giờ kết thúc phải lớn hơn giờ bắt đầu');
    }
    return Number(((endMins - startMins) / 60).toFixed(2));
  }

  async checkConflict(
    teacherId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeLessonId?: string,
  ): Promise<void> {
    const lessons = await this.lessonRepo.find({
      where: { teacherId, date },
    });

    const activeLessons = lessons.filter(
      (l) => l.status !== 'CANCELLED' && (!excludeLessonId || l.id !== excludeLessonId),
    );

    for (const l of activeLessons) {
      if (l.startTime < endTime && l.endTime > startTime) {
        throw new BadRequestException(
          `Xung đột lịch dạy: Đã có buổi học "${l.title}" (${l.startTime} - ${l.endTime}) vào ngày ${date}`,
        );
      }
    }
  }

  async getLessons(
    teacherId: string,
    query: {
      classId?: string;
      startDate?: string;
      endDate?: string;
      month?: string;
      status?: string;
    },
  ) {
    const qb = this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.class', 'class')
      .leftJoinAndSelect('lesson.participants', 'participants')
      .leftJoinAndSelect('participants.student', 'student')
      .where('lesson.teacherId = :teacherId', { teacherId });

    if (query.classId) {
      qb.andWhere('lesson.classId = :classId', { classId: query.classId });
    }

    if (query.status) {
      qb.andWhere('lesson.status = :status', { status: query.status });
    }

    if (query.month) {
      qb.andWhere('lesson.date LIKE :month', { month: `${query.month}%` });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('lesson.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    } else if (query.startDate) {
      qb.andWhere('lesson.date >= :startDate', { startDate: query.startDate });
    } else if (query.endDate) {
      qb.andWhere('lesson.date <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('lesson.date', 'ASC').addOrderBy('lesson.startTime', 'ASC');

    return await qb.getMany();
  }

  async getLessonById(teacherId: string, lessonId: string) {
    const lesson = await this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.class', 'class')
      .leftJoinAndSelect('lesson.participants', 'participants')
      .leftJoinAndSelect('participants.student', 'student')
      .leftJoinAndSelect('lesson.learningLogs', 'learningLogs')
      .leftJoinAndSelect('learningLogs.student', 'logStudent')
      .leftJoinAndSelect('lesson.scores', 'scores')
      .leftJoinAndSelect('scores.student', 'scoreStudent')
      .where('lesson.id = :lessonId', { lessonId })
      .getOne();

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }

    if (lesson.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền truy cập buổi học này');
    }

    return lesson;
  }

  async ensureClass(teacherId: string, classId: string): Promise<ClassEntity | null> {
    let classEntity = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true },
    });

    if (!classEntity && classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');
      const student = await this.userRepo.findOne({ where: { id: studentId } });
      if (student) {
        const rawCode = `PV${studentId.replace(/\D/g, '').slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        classEntity = this.classRepo.create({
          id: classId,
          name: `Kèm 1-1: ${student.name}`,
          subject: 'Gia sư cá nhân',
          description: 'Lớp học riêng 1 kèm 1',
          inviteCode: rawCode,
          isPrivate: true,
          teacherId,
          students: [student],
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

  async createLesson(teacherId: string, dto: CreateLessonDto) {
    // 1. Verify class ownership (supporting both group & private 1-on-1 tutoring classes)
    const classEntity = await this.ensureClass(teacherId, dto.classId);

    if (!classEntity) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classEntity.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền tạo lịch cho lớp học này');
    }

    // 2. Validate time
    const duration = this.calculateDuration(dto.startTime, dto.endTime);

    // 3. Determine students to add
    let targetStudents: UserEntity[] = [];
    if (dto.studentIds && dto.studentIds.length > 0) {
      const allowedStudentIds = new Set(classEntity.students.map((s) => s.id));
      const invalid = dto.studentIds.some((sid) => !allowedStudentIds.has(sid));
      if (invalid) {
        throw new BadRequestException('Một số học sinh được chọn không thuộc lớp học này');
      }
      targetStudents = classEntity.students.filter((s) => dto.studentIds!.includes(s.id));
    } else {
      targetStudents = classEntity.students;
    }

    // 4. Handle Single vs Recurring schedule
    const datesToSchedule: string[] = [];
    if (dto.recurring && dto.recurring.daysOfWeek?.length > 0 && dto.recurring.endDate) {
      const start = new Date(dto.date);
      const end = new Date(dto.recurring.endDate);
      if (end < start) {
        throw new BadRequestException('Ngày kết thúc lặp lại phải sau ngày bắt đầu');
      }

      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        throw new BadRequestException('Khoảng thời gian lặp lại không được vượt quá 1 năm');
      }

      const current = new Date(start);
      while (current <= end && datesToSchedule.length < 100) {
        const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon...
        if (dto.recurring.daysOfWeek.includes(dayOfWeek)) {
          const yyyy = current.getFullYear();
          const mm = String(current.getMonth() + 1).padStart(2, '0');
          const dd = String(current.getDate()).padStart(2, '0');
          datesToSchedule.push(`${yyyy}-${mm}-${dd}`);
        }
        current.setDate(current.getDate() + 1);
      }

      if (datesToSchedule.length === 0) {
        datesToSchedule.push(dto.date);
      }
    } else {
      datesToSchedule.push(dto.date);
    }

    // 5. Check conflict for all target dates first
    for (const date of datesToSchedule) {
      await this.checkConflict(teacherId, date, dto.startTime, dto.endTime);
    }

    // 6. Transactional creation
    return await this.dataSource.transaction(async (manager) => {
      const createdLessons: LessonEntity[] = [];

      for (let i = 0; i < datesToSchedule.length; i++) {
        const sessionDate = datesToSchedule[i];
        const title =
          dto.title ||
          `${classEntity.name} - Buổi ${i + 1} (${sessionDate})`;

        const lesson = manager.create(LessonEntity, {
          id: `lesson-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          teacherId,
          classId: classEntity.id,
          title,
          date: sessionDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          duration,
          status: 'SCHEDULED',
          feePerLesson: dto.feePerLesson ?? 0,
          content: dto.content || '',
          homework: dto.homework || '',
          notes: dto.notes || '',
        });

        const savedLesson = await manager.save(lesson);

        // Participants
        if (targetStudents.length > 0) {
          const participants = targetStudents.map((st) =>
            manager.create(LessonParticipantEntity, {
              id: `part-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
              lessonId: savedLesson.id,
              studentId: st.id,
              attendanceStatus: 'ATTENDED',
              feeAmount: dto.feePerLesson ?? 0,
            }),
          );
          await manager.save(participants);
          savedLesson.participants = participants;
        }

        createdLessons.push(savedLesson);
      }

      return createdLessons.length === 1 ? createdLessons[0] : createdLessons;
    });
  }

  async updateLesson(teacherId: string, lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
      relations: { participants: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }

    if (lesson.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền sửa buổi học này');
    }

    const newDate = dto.date || lesson.date;
    const newStartTime = dto.startTime || lesson.startTime;
    const newEndTime = dto.endTime || lesson.endTime;

    let newDuration = lesson.duration;
    if (dto.startTime || dto.endTime) {
      newDuration = this.calculateDuration(newStartTime, newEndTime);
    }

    // Check conflict if date or time changed
    if (dto.date || dto.startTime || dto.endTime) {
      await this.checkConflict(teacherId, newDate, newStartTime, newEndTime, lessonId);
    }

    return await this.dataSource.transaction(async (manager) => {
      lesson.title = dto.title ?? lesson.title;
      lesson.date = newDate;
      lesson.startTime = newStartTime;
      lesson.endTime = newEndTime;
      lesson.duration = newDuration;
      lesson.status = dto.status ?? lesson.status;
      lesson.feePerLesson = dto.feePerLesson ?? lesson.feePerLesson;
      lesson.content = dto.content ?? lesson.content;
      lesson.homework = dto.homework ?? lesson.homework;
      lesson.notes = dto.notes ?? lesson.notes;

      const updated = await manager.save(lesson);

      // Update participants attendance / fees if provided
      if (dto.participants && dto.participants.length > 0) {
        for (const pDto of dto.participants) {
          let part = lesson.participants.find((p) => p.studentId === pDto.studentId);
          if (part) {
            part.attendanceStatus = pDto.attendanceStatus;
            if (pDto.feeAmount !== undefined) {
              part.feeAmount = pDto.feeAmount;
            }
            await manager.save(part);
          }
        }
      }

      return updated;
    });
  }

  async deleteLesson(teacherId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }

    if (lesson.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xóa buổi học này');
    }

    await this.lessonRepo.remove(lesson);
    return { success: true, message: 'Đã xóa buổi học thành công' };
  }
}

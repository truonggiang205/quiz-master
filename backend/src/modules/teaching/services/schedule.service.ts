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
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import { TuitionService } from './tuition.service.js';
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
    private readonly tuitionService: TuitionService,
    private readonly dataSource: DataSource,
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo?: Repository<TeacherStudentEntity>,
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
      studentId?: string;
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
      .leftJoinAndSelect('lesson.learningLogs', 'learningLogs')
      .leftJoinAndSelect('learningLogs.student', 'logStudent')
      .where('lesson.teacherId = :teacherId', { teacherId });

    if (query.classId) {
      qb.andWhere('lesson.classId = :classId', { classId: query.classId });
    }

    if (query.studentId) {
      qb.andWhere(
        '(participants.studentId = :studentId OR lesson.classId = :privateClassId)',
        {
          studentId: query.studentId,
          privateClassId: `private-${query.studentId}`,
        },
      );
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

    // 3. Determine students to add (supports both TeacherStudent and UserEntity)
    let targetStudents: { id: string }[] = [];
    if (dto.studentIds && dto.studentIds.length > 0) {
      targetStudents = dto.studentIds.map((sid) => ({ id: sid }));
    } else if (classEntity.students && classEntity.students.length > 0) {
      targetStudents = classEntity.students.map((s) => ({ id: s.id }));
    } else if (classEntity.id.startsWith('private-')) {
      targetStudents = [{ id: classEntity.id.replace('private-', '') }];
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
    // 6. Transactional creation
    const result = await this.dataSource.transaction(async (manager) => {
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

    // Tự động đồng bộ học phí cho tất cả các tháng bị ảnh hưởng với cơ chế retry an toàn
    const distinctMonths = Array.from(new Set(datesToSchedule.map((d) => d.substring(0, 7))));
    await this.safeSyncTuition(teacherId, distinctMonths);

    return result;
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

    const oldMonth = lesson.date.substring(0, 7);
    const newDate = dto.date || lesson.date;
    const newMonth = newDate.substring(0, 7);
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

    // Audit log nếu đổi giá buổi học
    if (dto.feePerLesson !== undefined && dto.feePerLesson !== Number(lesson.feePerLesson || 0)) {
      console.log(
        `[AUDIT - FEE CHANGE] Giáo viên ${teacherId} đổi giá buổi học ${lesson.id}: ${lesson.feePerLesson} -> ${dto.feePerLesson} vào lúc ${new Date().toISOString()}`,
      );
    }

    // Bảo vệ ràng buộc tài chính nếu giảm tiền, hủy buổi hoặc đổi tháng
    if (dto.status === 'CANCELLED' && lesson.status !== 'CANCELLED') {
      await this.validateFinancialIntegrity(teacherId, lesson, 'CANCEL');
    } else if (newMonth !== oldMonth) {
      await this.validateFinancialIntegrity(teacherId, lesson, 'MOVE_MONTH');
    } else if (dto.feePerLesson !== undefined && dto.feePerLesson < Number(lesson.feePerLesson || 0)) {
      await this.validateFinancialIntegrity(teacherId, lesson, 'FEE_CHANGE', dto.feePerLesson);
    }

    const updated = await this.dataSource.transaction(async (manager) => {
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

      const saved = await manager.save(lesson);

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
      } else if (dto.feePerLesson !== undefined && lesson.participants && lesson.participants.length > 0) {
        // Đồng bộ giá mới cho toàn bộ học sinh trong buổi nếu đổi giá buổi học
        for (const part of lesson.participants) {
          part.feeAmount = dto.feePerLesson;
          await manager.save(part);
        }
      }

      return saved;
    });

    // Tự động đồng bộ học phí cho các tháng liên quan
    const monthsToSync = [newMonth];
    if (oldMonth !== newMonth) monthsToSync.push(oldMonth);
    await this.safeSyncTuition(teacherId, monthsToSync);

    return updated;
  }

  async deleteLesson(teacherId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
      relations: { participants: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }

    if (lesson.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xóa buổi học này');
    }

    // Bảo vệ ràng buộc tài chính: Không cho phép xóa buổi học nếu đã phát sinh thanh toán vượt quá
    await this.validateFinancialIntegrity(teacherId, lesson, 'DELETE');

    const month = lesson.date.substring(0, 7);
    await this.lessonRepo.remove(lesson);

    // Tự động đồng bộ học phí sau khi xóa buổi học
    await this.safeSyncTuition(teacherId, [month]);

    return { success: true, message: 'Đã xóa buổi học thành công' };
  }

  /**
   * Đồng bộ học phí an toàn có cơ chế thử lại (Retry) khi gặp lỗi kết nối
   */
  private async safeSyncTuition(teacherId: string, months: string[]) {
    for (const m of months) {
      let attempts = 3;
      let lastErr: any = null;
      while (attempts > 0) {
        try {
          await this.tuitionService.syncTuitionData(teacherId, m);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          attempts--;
          if (attempts > 0) {
            await new Promise((r) => setTimeout(r, 50));
          }
        }
      }
      if (lastErr) {
        console.error(
          `[CRITICAL RECONCILIATION] Không thể tự động đồng bộ học phí tháng ${m} sau 3 lần thử. Dữ liệu sẽ được tự động đối soát trong lần đọc tiếp theo:`,
          lastErr,
        );
      }
    }
  }

  /**
   * Kiểm tra ràng buộc tài chính: Không cho phép thao tác làm tổng học phí giảm xuống thấp hơn số tiền học sinh đã thanh toán.
   */
  private async validateFinancialIntegrity(
    teacherId: string,
    lesson: LessonEntity,
    action: 'DELETE' | 'CANCEL' | 'MOVE_MONTH' | 'FEE_CHANGE',
    newFeePerLesson?: number,
  ) {
    const month = lesson.date.substring(0, 7);
    const studentIds = new Set<string>();

    if (lesson.participants && lesson.participants.length > 0) {
      for (const p of lesson.participants) {
        if (p.studentId) studentIds.add(p.studentId);
      }
    } else if (lesson.classId.startsWith('private-')) {
      studentIds.add(lesson.classId.replace('private-', ''));
    }

    if (studentIds.size === 0) return;

    const allMonthLessons = await this.lessonRepo.find({
      where: { teacherId },
    });
    const validMonthLessons = allMonthLessons.filter(
      (l) => l.date.startsWith(month) && l.status !== 'CANCELLED',
    );
    const validLessonIds = validMonthLessons.map((l) => l.id);

    let allParticipants: LessonParticipantEntity[] = [];
    if (validLessonIds.length > 0) {
      allParticipants = await this.participantRepo.find({
        where: { lessonId: In(validLessonIds) },
      });
    }

    for (const studentId of studentIds) {
      const tuitionItem = await this.tuitionRepo.findOne({
        where: { teacherId, classId: lesson.classId, studentId, month },
      });

      if (!tuitionItem || Number(tuitionItem.paidAmount) <= 0) continue;

      let simulatedBaseAmount = 0;

      for (const otherLesson of validMonthLessons) {
        if (action === 'DELETE' && otherLesson.id === lesson.id) continue;
        if (action === 'CANCEL' && otherLesson.id === lesson.id) continue;
        if (action === 'MOVE_MONTH' && otherLesson.id === lesson.id) continue;

        let feeForThisLesson = 0;
        if (otherLesson.id === lesson.id && action === 'FEE_CHANGE' && newFeePerLesson !== undefined) {
          feeForThisLesson = newFeePerLesson;
        } else {
          const part = allParticipants.find(
            (p) => p.lessonId === otherLesson.id && p.studentId === studentId,
          );
          if (part) {
            if (part.attendanceStatus === 'ABSENT') continue;
            feeForThisLesson = Number(
              part.feeAmount !== null && part.feeAmount !== undefined
                ? part.feeAmount
                : otherLesson.feePerLesson || 0,
            );
          } else if (otherLesson.classId === `private-${studentId}`) {
            feeForThisLesson = Number(otherLesson.feePerLesson || 0);
          }
        }

        simulatedBaseAmount += feeForThisLesson;
      }

      const simulatedTotalAmount = Math.max(
        0,
        Math.round(
          simulatedBaseAmount +
            Number(tuitionItem.surcharge || 0) -
            Number(tuitionItem.discount || 0),
        ),
      );

      const paidAmount = Number(tuitionItem.paidAmount);
      if (simulatedTotalAmount < paidAmount) {
        throw new BadRequestException(
          `Không thể thực hiện thao tác: Học sinh đã thanh toán ${paidAmount.toLocaleString('vi-VN')} đ (học phí sau khi điều chỉnh là ${simulatedTotalAmount.toLocaleString('vi-VN')} đ). Vui lòng hoàn tiền hoặc điều chỉnh học phí trước.`,
        );
      }
    }
  }
}

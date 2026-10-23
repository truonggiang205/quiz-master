import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { ClassEntity } from '../../entities/class.entity.js';
import { TeacherStudentEntity } from './entities/teacher-student.entity.js';
import {
  LessonEntity,
  LessonParticipantEntity,
  LearningLogEntity,
  ScoreRecordEntity,
  TuitionItemEntity,
  TuitionPaymentEntity,
} from '../teaching/entities/index.js';
import { MailerService } from '../mailer/mailer.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateExternalStudentDto,
  UpdateTeacherStudentDto,
  LinkAccountDto,
} from './dto/teacher-student.dto.js';
import crypto from 'crypto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo: Repository<TeacherStudentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(LessonParticipantEntity)
    private readonly participantRepo: Repository<LessonParticipantEntity>,
    @InjectRepository(LearningLogEntity)
    private readonly logRepo: Repository<LearningLogEntity>,
    @InjectRepository(ScoreRecordEntity)
    private readonly scoreRepo: Repository<ScoreRecordEntity>,
    @InjectRepository(TuitionItemEntity)
    private readonly tuitionRepo: Repository<TuitionItemEntity>,
    @InjectRepository(TuitionPaymentEntity)
    private readonly paymentRepo: Repository<TuitionPaymentEntity>,
    private readonly mailerService: MailerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper giải quyết học sinh an toàn với ràng buộc quyền sở hữu giáo viên (Teacher Ownership / IDOR).
   * Tra cứu theo `id` (ưu tiên) hoặc `studentAccountId` (tương thích ngược).
   */
  async resolveStudent(teacherId: string, studentIdOrAccountId: string): Promise<TeacherStudentEntity> {
    let student = await this.teacherStudentRepo.findOne({
      where: { id: studentIdOrAccountId, teacherId },
      relations: { studentAccount: true },
    });

    if (!student) {
      student = await this.teacherStudentRepo.findOne({
        where: { studentAccountId: studentIdOrAccountId, teacherId },
        relations: { studentAccount: true },
      });
    }

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh hoặc bạn không có quyền truy cập');
    }

    return student;
  }

  /**
   * Tự động đồng bộ các học sinh từ bảng join legacy `teacher_students` sang `TeacherStudentEntity`.
   * Đảm bảo không tạo trùng lặp và giữ nguyên 100% dữ liệu lịch sử.
   */
  async syncLegacyStudents(teacherId: string): Promise<void> {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });

    if (!teacher || !teacher.students || teacher.students.length === 0) {
      return;
    }

    for (const legacyStudent of teacher.students) {
      const existing = await this.teacherStudentRepo.findOne({
        where: { teacherId, studentAccountId: legacyStudent.id },
      });

      if (!existing) {
        const newProfile = this.teacherStudentRepo.create({
          id: `ts-${Date.now()}-${legacyStudent.id.slice(-6)}-${crypto.randomBytes(3).toString('hex')}`,
          teacherId,
          studentAccountId: legacyStudent.id,
          fullName: legacyStudent.name,
          email: legacyStudent.email,
          phone: legacyStudent.phone || null,
          school: legacyStudent.school || null,
          avatar: legacyStudent.avatar || null,
          status: legacyStudent.isActive !== false ? 'ACTIVE' : 'INACTIVE',
          note: 'Hồ sơ học sinh từ tài khoản QuizMaster',
        });
        await this.teacherStudentRepo.save(newProfile);
      }
    }
  }

  /**
   * Lấy danh sách học sinh của giáo viên (hỗ trợ cả External Student và Linked Student).
   */
  async getTeacherStudents(teacherId: string) {
    await this.syncLegacyStudents(teacherId);

    const students = await this.teacherStudentRepo.find({
      where: { teacherId },
      relations: { studentAccount: true },
      order: { createdAt: 'DESC' },
    });

    return students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      name: s.fullName, // compatibility
      phone: s.phone,
      email: s.email || s.studentAccount?.email || null,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      dob: s.dob,
      gender: s.gender,
      school: s.school,
      note: s.note,
      status: s.status,
      avatar: s.avatar || s.studentAccount?.avatar || null,
      studentAccountId: s.studentAccountId,
      isExternal: !s.studentAccountId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Phương thức tương thích ngược với API cũ `GET /students/my-students`.
   */
  async getMyStudents(teacherId: string) {
    return await this.getTeacherStudents(teacherId);
  }

  /**
   * Tạo học sinh ngoài hệ thống (External Student).
   * Không yêu cầu email, password, hay tạo UserEntity.
   */
  async createExternalStudent(teacherId: string, dto: CreateExternalStudentDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới có quyền tạo học sinh ngoài hệ thống');
    }

    const student = this.teacherStudentRepo.create({
      id: `ts-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      teacherId,
      studentAccountId: null,
      fullName: dto.fullName.trim(),
      phone: dto.phone ? dto.phone.trim() : null,
      email: dto.email ? dto.email.trim().toLowerCase() : null,
      parentName: dto.parentName ? dto.parentName.trim() : null,
      parentPhone: dto.parentPhone ? dto.parentPhone.trim() : null,
      dob: dto.dob ? dto.dob.trim() : null,
      gender: dto.gender || null,
      school: dto.school ? dto.school.trim() : null,
      note: dto.note ? dto.note.trim() : null,
      status: 'ACTIVE',
      avatar: null,
    });

    const saved = await this.teacherStudentRepo.save(student);

    return {
      ...saved,
      name: saved.fullName,
      isExternal: true,
    };
  }

  /**
   * Lấy chi tiết hồ sơ học sinh kèm toàn bộ lịch sử tổng hợp:
   * Lịch dạy, Điểm danh, Nhật ký học tập, Điểm số, Học phí, Lịch sử thanh toán.
   */
  async getStudentDetail(teacherId: string, studentId: string) {
    const student = await this.resolveStudent(teacherId, studentId);

    // Thu thập danh sách ID đại diện của học sinh (cả TeacherStudent.id và studentAccountId nếu có)
    const targetIds = [student.id];
    if (student.studentAccountId) {
      targetIds.push(student.studentAccountId);
    }

    // 1. Lấy lịch học & điểm danh
    const participants = await this.participantRepo.find({
      where: { studentId: In(targetIds) },
      relations: { lesson: { class: true } },
    });
    const validParticipants = participants.filter(
      (p) => p.lesson && p.lesson.teacherId === teacherId,
    );
    const lessons = validParticipants.map((p) => ({
      lessonId: p.lesson.id,
      title: p.lesson.title,
      date: p.lesson.date,
      startTime: p.lesson.startTime,
      endTime: p.lesson.endTime,
      duration: p.lesson.duration,
      status: p.lesson.status,
      className: p.lesson.class?.name || 'Kèm 1-1',
      attendanceStatus: p.attendanceStatus,
      feeAmount: Number(p.feeAmount || 0),
    }));
    lessons.sort((a, b) => b.date.localeCompare(a.date));

    // 2. Lấy nhật ký học tập
    const learningLogs = await this.logRepo.find({
      where: { studentId: In(targetIds), teacherId },
      relations: { lesson: true, class: true },
      order: { createdAt: 'DESC' },
    });

    // 3. Lấy bảng điểm
    const scores = await this.scoreRepo.find({
      where: { studentId: In(targetIds), teacherId },
      relations: { class: true, lesson: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    // 4. Lấy học phí & lịch sử thanh toán
    const tuitionItems = await this.tuitionRepo.find({
      where: { studentId: In(targetIds), teacherId },
      relations: { class: true, payments: true, adjustments: true },
      order: { month: 'DESC' },
    });

    const allPayments: TuitionPaymentEntity[] = [];
    tuitionItems.forEach((t) => {
      if (t.payments && t.payments.length > 0) {
        allPayments.push(...t.payments);
      }
    });
    allPayments.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

    // 5. Thống kê nhanh
    const totalLessons = lessons.length;
    const attendedLessons = lessons.filter((l) => l.attendanceStatus === 'ATTENDED').length;
    const absentLessons = lessons.filter((l) => l.attendanceStatus === 'ABSENT').length;
    const totalTuition = tuitionItems.reduce((acc, t) => acc + Number(t.totalAmount || 0), 0);
    const paidTuition = tuitionItems.reduce((acc, t) => acc + Number(t.paidAmount || 0), 0);
    const remainingTuition = tuitionItems.reduce((acc, t) => acc + Number(t.remainingAmount || 0), 0);
    const avgScore =
      scores.length > 0
        ? Number((scores.reduce((acc, s) => acc + Number(s.score || 0), 0) / scores.length).toFixed(1))
        : null;

    const stats = {
      totalLessons,
      attendedLessons,
      absentLessons,
      totalTuition,
      paidTuition,
      remainingTuition,
      avgScore: avgScore !== null ? avgScore : 0,
      scoresCount: scores.length,
      logsCount: learningLogs.length,
    };

    const attendanceList = validParticipants.map((p) => ({
      id: p.id,
      lessonId: p.lesson?.id,
      lesson: {
        id: p.lesson?.id,
        title: p.lesson?.title,
        date: p.lesson?.date,
        startTime: p.lesson?.startTime,
        endTime: p.lesson?.endTime,
      },
      attendanceStatus: p.attendanceStatus,
      attendanceNote: (p as any).note || (p as any).attendanceNote || null,
      feeAmount: p.feeAmount,
    }));

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        name: student.fullName,
        phone: student.phone,
        email: student.email || student.studentAccount?.email || null,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        dob: student.dob,
        gender: student.gender,
        school: student.school,
        note: student.note,
        status: student.status,
        avatar: student.avatar || student.studentAccount?.avatar || null,
        studentAccountId: student.studentAccountId,
        isExternal: !student.studentAccountId,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      account: student.studentAccount
        ? {
            id: student.studentAccount.id,
            name: student.studentAccount.name,
            email: student.studentAccount.email,
            avatar: student.studentAccount.avatar,
            role: student.studentAccount.role,
            isActive: student.studentAccount.isActive,
          }
        : null,
      isExternal: !student.studentAccountId,
      summary: stats,
      stats,
      schedules: lessons,
      lessons,
      attendance: attendanceList,
      learningLogs,
      scores,
      tuitions: tuitionItems,
      tuition: tuitionItems,
      payments: allPayments,
    };
  }

  /**
   * Cập nhật thông tin hồ sơ học sinh.
   */
  async updateStudent(teacherId: string, studentId: string, dto: UpdateTeacherStudentDto) {
    const student = await this.resolveStudent(teacherId, studentId);

    if (dto.fullName !== undefined) student.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) student.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.email !== undefined) student.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.parentName !== undefined) student.parentName = dto.parentName ? dto.parentName.trim() : null;
    if (dto.parentPhone !== undefined) student.parentPhone = dto.parentPhone ? dto.parentPhone.trim() : null;
    if (dto.dob !== undefined) student.dob = dto.dob ? dto.dob.trim() : null;
    if (dto.gender !== undefined) student.gender = dto.gender;
    if (dto.school !== undefined) student.school = dto.school ? dto.school.trim() : null;
    if (dto.note !== undefined) student.note = dto.note ? dto.note.trim() : null;
    if (dto.status !== undefined) student.status = dto.status;

    const saved = await this.teacherStudentRepo.save(student);

    return {
      ...saved,
      name: saved.fullName,
      isExternal: !saved.studentAccountId,
    };
  }

  /**
   * Xóa học sinh khỏi danh bạ giáo viên (Bảo vệ toàn vẹn dữ liệu lịch sử).
   * Nếu học sinh đã có lịch học, học phí, thanh toán, điểm số hoặc nhật ký,
   * từ chối xóa vĩnh viễn và yêu cầu chuyển trạng thái sang NGHỈ HỌC (INACTIVE).
   */
  async deleteStudent(teacherId: string, studentId: string) {
    const student = await this.resolveStudent(teacherId, studentId);

    const targetIds = [student.id];
    if (student.studentAccountId) {
      targetIds.push(student.studentAccountId);
    }

    // 1. Kiểm tra toàn vẹn dữ liệu lịch sử (Schedule, Tuition, Payments, Scores, Learning Logs)
    const safeCount = async (repo: any, where: any) => {
      if (!repo) return 0;
      if (typeof repo.count === 'function') {
        return await repo.count({ where });
      }
      if (typeof repo.find === 'function') {
        const res = await repo.find({ where });
        return Array.isArray(res) ? res.length : 0;
      }
      return 0;
    };

    const [partCount, tuiCount, payCount, scoreCount, logCount] = await Promise.all([
      safeCount(this.participantRepo, { studentId: In(targetIds) }),
      safeCount(this.tuitionRepo, { studentId: In(targetIds), teacherId }),
      safeCount(this.paymentRepo, { studentId: In(targetIds), teacherId }),
      safeCount(this.scoreRepo, { studentId: In(targetIds), teacherId }),
      safeCount(this.logRepo, { studentId: In(targetIds), teacherId }),
    ]);

    const hasHistory = partCount > 0 || tuiCount > 0 || payCount > 0 || scoreCount > 0 || logCount > 0;
    if (hasHistory) {
      throw new BadRequestException(
        'Không thể xóa học sinh đã có lịch sử học tập hoặc học phí/thanh toán. Vui lòng chuyển trạng thái học sinh sang NGHỈ HỌC (INACTIVE) để lưu trữ.',
      );
    }

    // 2. Thực hiện dọn dẹp toàn bộ quan hệ trong một Database Transaction nguyên tử
    const executeInTransaction = async (work: (mgr: any) => Promise<any>) => {
      if (this.teacherStudentRepo?.manager?.transaction) {
        return await this.teacherStudentRepo.manager.transaction(work);
      }
      const fakeManager = {
        find: (entity: any, opts: any) => {
          if (entity === ClassEntity && this.classRepo) return this.classRepo.find(opts);
          if (entity === UserEntity && this.userRepo) return this.userRepo.find(opts);
          return [];
        },
        findOne: (entity: any, opts: any) => {
          if (entity === ClassEntity && this.classRepo) return this.classRepo.findOne(opts);
          if (entity === UserEntity && this.userRepo) return this.userRepo.findOne(opts);
          return null;
        },
        count: (entity: any, opts: any) => {
          if (entity === LessonEntity && this.lessonRepo) return this.lessonRepo.count(opts);
          if (entity === TuitionItemEntity && this.tuitionRepo) return this.tuitionRepo.count(opts);
          return 0;
        },
        save: (entity: any, data: any) => {
          if (entity === ClassEntity && this.classRepo) return this.classRepo.save(data);
          if (entity === UserEntity && this.userRepo) return this.userRepo.save(data);
          return data;
        },
        remove: (entity: any, data: any) => {
          if (entity === ClassEntity && this.classRepo) return this.classRepo.remove(data);
          if (entity === TeacherStudentEntity && this.teacherStudentRepo) return this.teacherStudentRepo.remove(data);
          return data;
        },
      };
      return await work(fakeManager);
    };

    await executeInTransaction(async (manager) => {
      // a. Xóa học sinh khỏi tất cả các lớp nhóm thuộc sở hữu của giáo viên này (bảng class_students)
      const teacherClasses = await manager.find(ClassEntity, {
        where: { teacherId },
        relations: { students: true },
      });

      for (const cls of teacherClasses) {
        if (!cls.isPrivate && cls.students && cls.students.length > 0) {
          const originalCount = cls.students.length;
          cls.students = cls.students.filter((s: any) => !targetIds.includes(s.id));
          if (cls.students.length !== originalCount) {
            await manager.save(ClassEntity, cls);
          }
        }
      }

      // b. Xử lý các lớp học kèm 1-1 (isPrivate: true) của học sinh với giáo viên này
      const privateClasses = teacherClasses.filter((cls: any) => {
        if (!cls.isPrivate) return false;
        if (cls.id === `private-${student.id}`) return true;
        if (student.studentAccountId && cls.id === `private-${student.studentAccountId}`) return true;
        if (cls.students && cls.students.some((s: any) => targetIds.includes(s.id))) return true;
        return false;
      });

      for (const pClass of privateClasses) {
        // Kiểm tra xem lớp private này có bất kỳ bài học hoặc mục học phí nào gắn vào không
        const [lessonCount, tuitionCount] = await Promise.all([
          manager.count(LessonEntity, { where: { classId: pClass.id } }),
          manager.count(TuitionItemEntity, { where: { classId: pClass.id } }),
        ]);

        if (lessonCount === 0 && tuitionCount === 0) {
          pClass.students = [];
          await manager.save(ClassEntity, pClass);
          await manager.remove(ClassEntity, pClass);
        } else {
          // Nếu có lịch sử liên quan đến lớp, chỉ detach quan hệ học sinh nhưng giữ lớp
          pClass.students = (pClass.students || []).filter((s: any) => !targetIds.includes(s.id));
          await manager.save(ClassEntity, pClass);
        }
      }

      // c. Đồng bộ gỡ khỏi bảng join legacy teacher_students
      if (student.studentAccountId) {
        const teacher = await manager.findOne(UserEntity, {
          where: { id: teacherId },
          relations: { students: true },
        });
        if (teacher && teacher.students) {
          teacher.students = teacher.students.filter((s: any) => s.id !== student.studentAccountId);
          await manager.save(UserEntity, teacher);
        }
      }

      // d. Xóa hồ sơ khỏi teacher_student_profiles (UserEntity trong bảng users KHÔNG bị xóa)
      await manager.remove(TeacherStudentEntity, student);
    });

    return { success: true, message: 'Đã xóa học sinh khỏi danh bạ thành công' };
  }

  /**
   * Phương thức tương thích ngược `removeStudent`.
   */
  async removeStudent(teacherId: string, studentId: string) {
    return await this.deleteStudent(teacherId, studentId);
  }

  /**
   * Liên kết hồ sơ External Student với tài khoản người dùng QuizMaster hiện có.
   * KHÔNG tạo Student mới. KHÔNG thay đổi TeacherStudent.id.
   * Toàn bộ lịch sử (Schedule, Tuition, Payments, Logs, Scores) được giữ nguyên 100%.
   */
  async linkAccount(teacherId: string, studentId: string, dto: LinkAccountDto | any) {
    const student = await this.resolveStudent(teacherId, studentId);

    const term = (dto?.emailOrAccountId || dto?.email || dto?.studentAccountId || '').trim();
    if (!term) {
      throw new BadRequestException('Vui lòng cung cấp email hoặc ID tài khoản học sinh cần liên kết');
    }
    const targetUser = await this.userRepo.findOne({
      where: [{ email: term.toLowerCase() }, { id: term }],
    });

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng với thông tin cung cấp');
    }

    if (targetUser.role !== 'STUDENT') {
      throw new BadRequestException(
        'Chỉ có thể liên kết với tài khoản học sinh (STUDENT), không được liên kết với tài khoản Giáo viên hoặc Quản trị viên',
      );
    }

    // Kiểm tra xung đột: Giáo viên đã liên kết tài khoản này với một học sinh khác chưa?
    const existingConflict = await this.teacherStudentRepo.findOne({
      where: { teacherId, studentAccountId: targetUser.id },
    });
    if (existingConflict && existingConflict.id !== student.id) {
      throw new BadRequestException('Tài khoản này đã được liên kết với một hồ sơ học sinh khác của bạn.');
    }

    // Cập nhật duy nhất studentAccountId
    student.studentAccountId = targetUser.id;
    if (!student.email) student.email = targetUser.email;
    if (!student.avatar) student.avatar = targetUser.avatar;

    const saved = await this.teacherStudentRepo.save(student);

    // Cập nhật bảng join legacy teacher_students để đảm bảo tương thích ngược
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });
    if (teacher) {
      if (!teacher.students) teacher.students = [];
      if (!teacher.students.some((s) => s.id === targetUser.id)) {
        teacher.students.push(targetUser);
        await this.userRepo.save(teacher);
      }
    }

    return {
      ...saved,
      name: saved.fullName,
      isExternal: false,
      message: `Đã liên kết thành công với tài khoản ${targetUser.name} (${targetUser.email})`,
    };
  }

  /**
   * Hủy liên kết tài khoản (chuyển về trạng thái External Student độc lập).
   * Toàn bộ lịch sử tiếp tục được bảo toàn.
   */
  async unlinkAccount(teacherId: string, studentId: string) {
    const student = await this.resolveStudent(teacherId, studentId);

    if (!student.studentAccountId) {
      throw new BadRequestException('Học sinh này chưa được liên kết với tài khoản QuizMaster nào');
    }

    const oldAccountId = student.studentAccountId;

    // Gỡ khỏi bảng join legacy
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });
    if (teacher && teacher.students) {
      teacher.students = teacher.students.filter((s) => s.id !== oldAccountId);
      await this.userRepo.save(teacher);
    }

    student.studentAccountId = null;
    const saved = await this.teacherStudentRepo.save(student);

    return {
      ...saved,
      name: saved.fullName,
      isExternal: true,
      message: 'Đã hủy liên kết tài khoản thành công',
    };
  }

  /**
   * Gửi lời mời học sinh qua email (Workflow mời học sinh có tài khoản).
   */
  async inviteStudentByEmail(teacherId: string, email: string) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới được mời học sinh');
    }

    const student = await this.userRepo.findOneBy({ email: email.toLowerCase() });
    if (!student) {
      throw new BadRequestException(
        'Không tìm thấy học sinh với email này trong hệ thống. Học sinh cần đăng ký tài khoản trước hoặc bạn có thể tạo Học sinh ngoài hệ thống.',
      );
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestException('Tài khoản này không phải là tài khoản học sinh.');
    }

    const actionUrl = `/student/accept-invite?t=${teacher.id}`;

    await this.notificationsService.createPersonalNotification(
      student.id,
      `Lời mời học từ giáo viên ${teacher.name}`,
      `Giáo viên ${teacher.name} vừa mời bạn tham gia học. Bấm vào nút bên dưới để chấp nhận.`,
      actionUrl,
      'Chấp nhận lời mời',
    );
    this.logger.log(`Invite notification sent to ${email} (student ID: ${student.id}) with teacherId ${teacher.id}`);

    return { success: true, message: 'Đã gửi lời mời qua thông báo cá nhân' };
  }

  /**
   * Học sinh chấp nhận lời mời học từ giáo viên.
   */
  async acceptInvite(studentId: string, teacherId: string) {
    const student = await this.userRepo.findOne({
      where: { id: studentId },
      relations: { teachers: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new UnauthorizedException('Chỉ học sinh mới được chấp nhận lời mời');
    }

    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new NotFoundException('Không tìm thấy giáo viên');
    }

    if (student.teachers.some((t) => t.id === teacher.id)) {
      throw new BadRequestException('Bạn đã là học sinh của giáo viên này rồi');
    }

    student.teachers.push(teacher);
    await this.userRepo.save(student);

    // Đồng bộ tạo hoặc liên kết TeacherStudentEntity
    let teacherStudent = await this.teacherStudentRepo.findOne({
      where: { teacherId, studentAccountId: student.id },
    });
    if (!teacherStudent) {
      teacherStudent = this.teacherStudentRepo.create({
        id: `ts-${Date.now()}-${student.id.slice(-6)}-${crypto.randomBytes(3).toString('hex')}`,
        teacherId,
        studentAccountId: student.id,
        fullName: student.name,
        email: student.email,
        phone: student.phone || null,
        school: student.school || null,
        avatar: student.avatar || null,
        status: 'ACTIVE',
        note: 'Gia nhập qua lời mời',
      });
      await this.teacherStudentRepo.save(teacherStudent);
    }

    await this.notificationsService.createPersonalNotification(
      teacher.id,
      `Học sinh ${student.name} đã chấp nhận lời mời`,
      `${student.name} (${student.email}) đã chấp nhận lời mời và tham gia vào danh sách học sinh của bạn.`,
      `/teacher/students`,
      'Xem danh sách học sinh',
    );

    return { success: true, teacherName: teacher.name };
  }
}

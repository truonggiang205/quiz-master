import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClassEntity } from '../../entities/class.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { CreateClassDto, JoinClassDto } from './dto/classroom.dto.js';
import { TeacherStudentEntity } from '../students/entities/teacher-student.entity.js';
import * as bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

export interface ClassroomStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  quizCount: number;
  completionRate: number;
  avgScore: number;
  scoreDistribution: { label: string; count: number }[];
  recentQuizScores: { id: string; title: string; avgScore: number; totalAttempts: number }[];
}

export interface ImportStudentError {
  row: number;
  email?: string;
  name?: string;
  message: string;
}

export interface ImportStudentResult {
  successCount: number;
  skippedCount: number;
  errorCount: number;
  totalRows: number;
  errors: ImportStudentError[];
}

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(TeacherStudentEntity)
    private readonly teacherStudentRepo: Repository<TeacherStudentEntity>,
  ) {}

  // Sinh mã lớp ngẫu nhiên dạng: SUBJECT-XXXX (Ví dụ: MATH-A8F2)
  private generateInviteCode(subject?: string): string {
    const prefix = subject ? subject.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'CLASS';
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomStr}`;
  }

  // Helper tính toán thống kê thực tế cho lớp học
  private async calculateClassStats(classId: string, students: UserEntity[]): Promise<ClassroomStats> {
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.isActive !== false).length;
    const inactiveStudents = students.filter((s) => s.isActive === false).length;

    const getNormScore = (rawScore: number): number => {
      if (!rawScore || rawScore <= 0) return 0;
      return rawScore > 10 ? rawScore / 100 : rawScore;
    };

    let quizzes: QuizEntity[] = [];

    if (classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');

      // 1. Quizzes assigned to private class or specifically to student
      quizzes = await this.quizRepo
        .createQueryBuilder('quiz')
        .where('quiz.classId = :classId', { classId })
        .orWhere('JSON_CONTAINS(quiz.assignedStudentIds, :sIdStr)', { sIdStr: `"${studentId}"` })
        .orderBy('quiz.createdAt', 'DESC')
        .getMany();

      // 2. Also find any quiz that this student has submissions for
      const studentSubs = await this.submissionRepo.find({
        where: { studentId },
        select: { quizId: true },
      });
      const submittedQuizIds = Array.from(new Set(studentSubs.map((s) => s.quizId)));
      if (submittedQuizIds.length > 0) {
        const extraQuizzes = await this.quizRepo.find({
          where: { id: In(submittedQuizIds) },
        });
        const existingIds = new Set(quizzes.map((q) => q.id));
        for (const eq of extraQuizzes) {
          if (!existingIds.has(eq.id)) {
            quizzes.push(eq);
          }
        }
      }
    } else {
      quizzes = await this.quizRepo.find({
        where: { classId },
        order: { createdAt: 'DESC' },
      });
    }

    const quizCount = quizzes.length;

    if (quizCount === 0 || totalStudents === 0) {
      return {
        totalStudents,
        activeStudents,
        inactiveStudents,
        quizCount: 0,
        completionRate: 0,
        avgScore: 0,
        scoreDistribution: [
          { label: '0-5', count: 0 },
          { label: '5-7', count: 0 },
          { label: '7-8.5', count: 0 },
          { label: '8.5-10', count: 0 },
        ],
        recentQuizScores: [],
      };
    }

    const quizIds = quizzes.map((q) => q.id);
    let submissions: SubmissionEntity[] = [];
    if (quizIds.length > 0) {
      submissions = await this.submissionRepo.find({
        where: { quizId: In(quizIds) },
      });
    }

    // Filter submissions strictly for this class or private student
    if (classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');
      submissions = submissions.filter((s) => s.studentId === studentId);
    } else {
      const classStudentIds = new Set(students.map((s) => s.id));
      if (classStudentIds.size > 0) {
        submissions = submissions.filter((s) => classStudentIds.has(s.studentId));
      }
    }

    const totalSubmissions = submissions.length;
    const avgScore =
      totalSubmissions > 0
        ? Number(
            (
              submissions.reduce((acc, sub) => acc + getNormScore(sub.score || 0), 0) /
              totalSubmissions
            ).toFixed(1),
          )
        : 0;

    const totalExpectedSubmissions = totalStudents * quizCount;
    const completionRate =
      totalExpectedSubmissions > 0
        ? Math.min(100, Math.round((totalSubmissions / totalExpectedSubmissions) * 100))
        : 0;

    // Phân bố điểm số thực tế
    let bucket0to5 = 0;
    let bucket5to7 = 0;
    let bucket7to85 = 0;
    let bucket85to10 = 0;

    for (const sub of submissions) {
      const score = getNormScore(sub.score || 0);
      if (score < 5) bucket0to5++;
      else if (score < 7) bucket5to7++;
      else if (score < 8.5) bucket7to85++;
      else bucket85to10++;
    }

    const scoreDistribution = [
      { label: '0-5', count: bucket0to5 },
      { label: '5-7', count: bucket5to7 },
      { label: '7-8.5', count: bucket7to85 },
      { label: '8.5-10', count: bucket85to10 },
    ];

    // Lấy điểm trung bình 5 bài kiểm tra gần nhất
    const recentQuizScores = quizzes.slice(0, 5).map((q) => {
      const qSubs = submissions.filter((s) => s.quizId === q.id);
      const qAvg =
        qSubs.length > 0
          ? Number(
              (
                qSubs.reduce((acc, s) => acc + getNormScore(s.score || 0), 0) /
                qSubs.length
              ).toFixed(1),
            )
          : 0;
      return {
        id: q.id,
        title: q.title,
        avgScore: qAvg,
        totalAttempts: qSubs.length,
      };
    });

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      quizCount,
      completionRate,
      avgScore,
      scoreDistribution,
      recentQuizScores,
    };
  }

  async createClass(teacherId: string, dto: CreateClassDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới được tạo lớp học');
    }

    let inviteCode = this.generateInviteCode(dto.subject);
    while (await this.classRepo.findOneBy({ inviteCode })) {
      inviteCode = this.generateInviteCode(dto.subject);
    }

    const newClass = this.classRepo.create({
      id: `class-${Date.now()}`,
      name: dto.name,
      description: dto.description || '',
      subject: dto.subject || 'Tổng hợp',
      inviteCode,
      teacherId: teacher.id,
      isPrivate: dto.isPrivate ?? false,
    });

    return await this.classRepo.save(newClass);
  }

  async joinClass(studentId: string, dto: JoinClassDto) {
    const student = await this.userRepo.findOne({
      where: { id: studentId },
      relations: { classes: true },
    });

    if (!student || student.role !== 'STUDENT') {
      throw new UnauthorizedException('Chỉ học sinh mới được tham gia lớp học');
    }

    const classToJoin = await this.classRepo.findOne({
      where: { inviteCode: dto.inviteCode.toUpperCase() },
      relations: { students: true },
    });

    if (!classToJoin) {
      throw new NotFoundException('Mã lớp học không hợp lệ');
    }

    if (classToJoin.students.some((s) => s.id === student.id)) {
      throw new BadRequestException('Bạn đã tham gia lớp học này rồi');
    }

    classToJoin.students.push(student);
    await this.classRepo.save(classToJoin);

    return {
      success: true,
      classId: classToJoin.id,
      className: classToJoin.name,
    };
  }

  async getClassesForTeacher(teacherId: string) {
    // 1. Get real group classrooms (non-private)
    const groupClasses = await this.classRepo.find({
      where: { teacherId, isPrivate: false },
      order: { createdAt: 'DESC' },
      relations: { students: true },
    });

    // 2. Get private 1-on-1 tutoring classes from teacher_student_profiles (supporting both manual/external and linked students)
    const teacherProfiles = await this.teacherStudentRepo.find({
      where: { teacherId },
      relations: { studentAccount: true },
      order: { createdAt: 'DESC' },
    });

    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });

    // Compute real statistics for each group class and map students to canonical profile IDs
    const groupClassesWithStats = await Promise.all(
      groupClasses.map(async (c) => {
        const stats = await this.calculateClassStats(c.id, c.students || []);
        const mappedStudents = await Promise.all(
          (c.students || []).map(async (s) => {
            let p = teacherProfiles.find((tp) => tp.studentAccountId === s.id);
            if (!p) {
              const foundProfile = await this.teacherStudentRepo.findOne({
                where: { teacherId, studentAccountId: s.id },
              });
              if (foundProfile) {
                p = foundProfile;
              }
            }
            if (!p) {
              p = this.teacherStudentRepo.create({
                id: `ts-${Date.now()}-${s.id.slice(-6)}-${crypto.randomBytes(3).toString('hex')}`,
                teacherId,
                studentAccountId: s.id,
                fullName: s.name,
                email: s.email,
                phone: s.phone || null,
                school: s.school || null,
                avatar: s.avatar || null,
                status: s.isActive !== false ? 'ACTIVE' : 'INACTIVE',
                note: `Tự động tạo từ lớp ${c.name}`,
              });
              await this.teacherStudentRepo.save(p);
              teacherProfiles.push(p);
            }
            return {
              id: p.id, // Canonical teacher_student_profiles.id
              studentProfileId: p.id,
              userId: s.id,
              studentAccountId: s.id,
              name: s.name,
              email: s.email,
              avatar: s.avatar || p.avatar || p.studentAccount?.avatar || null,
            };
          }),
        );
        return {
          ...c,
          students: mappedStudents as any,
          stats,
        };
      }),
    );

    // Build unified unique students for 1-1 private classes
    const uniqueStudentsMap = new Map<
      string,
      {
        id: string;
        studentProfileId: string;
        userId?: string | null;
        studentAccountId?: string | null;
        name: string;
        email?: string;
        avatar?: string | null;
        isExternal: boolean;
        isActive: boolean;
      }
    >();

    for (const p of teacherProfiles) {
      uniqueStudentsMap.set(p.id, {
        id: p.id, // Canonical teacher_student_profiles.id
        studentProfileId: p.id,
        userId: p.studentAccountId || null,
        studentAccountId: p.studentAccountId || null,
        name: p.fullName,
        email: p.email || p.studentAccount?.email || undefined,
        avatar: p.avatar || p.studentAccount?.avatar || null,
        isExternal: !p.studentAccountId,
        isActive: p.status === 'ACTIVE',
      });
    }

    for (const s of (teacher?.students ?? [])) {
      const hasProfile = Array.from(uniqueStudentsMap.values()).some(
        (item) => item.studentAccountId === s.id || item.userId === s.id || (s.email && item.email === s.email),
      );
      if (!hasProfile) {
        let profile = await this.teacherStudentRepo.findOne({
          where: { teacherId, studentAccountId: s.id },
        });
        if (!profile) {
          profile = this.teacherStudentRepo.create({
            id: `ts-${Date.now()}-${s.id.slice(-6)}-${crypto.randomBytes(3).toString('hex')}`,
            teacherId,
            studentAccountId: s.id,
            fullName: s.name,
            email: s.email,
            phone: s.phone || null,
            school: s.school || null,
            avatar: s.avatar || null,
            status: s.isActive !== false ? 'ACTIVE' : 'INACTIVE',
            note: 'Đồng bộ từ danh sách học sinh của giáo viên',
          });
          await this.teacherStudentRepo.save(profile);
          teacherProfiles.push(profile);
        }
        uniqueStudentsMap.set(profile.id, {
          id: profile.id,
          studentProfileId: profile.id,
          userId: s.id,
          studentAccountId: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar || profile.avatar || profile.studentAccount?.avatar || null,
          isExternal: false,
          isActive: s.isActive !== false,
        });
      }
    }

    const privateClasses = await Promise.all(
      Array.from(uniqueStudentsMap.values()).map(async (student) => {
        // Support backward-compatible private class IDs (e.g. private-user-1791052675402)
        const legacyClassId = student.userId ? `private-${student.userId}` : null;
        const profileClassId = `private-${student.id}`;

        let privateClass = legacyClassId
          ? await this.classRepo.findOne({
              where: { id: legacyClassId },
              relations: { students: true },
            })
          : null;

        if (!privateClass) {
          privateClass = await this.classRepo.findOne({
            where: { id: profileClassId },
            relations: { students: true },
          });
        }

        const classId = privateClass ? privateClass.id : (legacyClassId || profileClassId);

        if (!privateClass) {
          const rawCode = `PV${student.id.replace(/\D/g, '').slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
          privateClass = this.classRepo.create({
            id: classId,
            name: `Kèm 1-1: ${student.name}`,
            subject: 'Gia sư cá nhân',
            description: 'Lớp học riêng 1 kèm 1',
            inviteCode: rawCode,
            teacherId,
            isPrivate: true,
            students: [],
          });
          await this.classRepo.save(privateClass);
        } else if (!privateClass.students || privateClass.students.length === 0) {
          // Keep students populated
        }

        const stats = await this.calculateClassStats(classId, [{
          id: student.id,
          isActive: student.isActive,
        } as any]);

        return {
          ...privateClass,
          students: [{
            id: student.id, // Consistent teacher_student_profiles.id
            studentProfileId: student.id,
            userId: student.userId || null,
            studentAccountId: student.studentAccountId || null,
            name: student.name,
            email: student.email,
            avatar: student.avatar || null,
          } as any],
          stats,
        };
      }),
    );

    // 3. Merge: group classes first, then private
    return [...groupClassesWithStats, ...privateClasses];
  }

  async getClassesForStudent(studentId: string) {
    const student = await this.userRepo.findOne({
      where: { id: studentId },
      relations: { classes: { teacher: true }, teachers: true },
    });

    if (!student) return [];

    const normalClasses = (student.classes || []).map((c) => ({
      ...c,
      isPrivate: false,
    }));

    const privateClasses = (student.teachers || []).map((t) => ({
      id: `private-${t.id}`,
      name: `Kèm 1-1: ${t.name}`,
      subject: 'Gia sư cá nhân',
      description: 'Lớp học riêng 1 kèm 1',
      inviteCode: '',
      teacherId: t.id,
      teacher: t,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      isPrivate: true,
    }));

    return [...normalClasses, ...privateClasses].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getClassDetails(classId: string, userId: string) {
    if (classId.startsWith('private-')) {
      const targetId = classId.replace('private-', '');
      // Check if current user is teacher with this student
      const teacher = await this.userRepo.findOne({
        where: { id: userId },
        relations: { students: true },
      });
      const student = teacher?.students?.find((s) => s.id === targetId);
      if (student) {
        return {
          id: classId,
          name: `Kèm 1-1: ${student.name}`,
          subject: 'Gia sư cá nhân',
          description: 'Lớp học riêng 1 kèm 1',
          inviteCode: '',
          teacherId: userId,
          teacher,
          isPrivate: true,
          students: [student],
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
          stats: await this.calculateClassStats(classId, [student]),
        };
      }

      // Check if current user is student with this teacher
      const studentUser = await this.userRepo.findOne({
        where: { id: userId },
        relations: { teachers: true },
      });
      const teacherUser = studentUser?.teachers?.find((t) => t.id === targetId);
      if (teacherUser && studentUser) {
        return {
          id: classId,
          name: `Kèm 1-1: ${teacherUser.name}`,
          subject: 'Gia sư cá nhân',
          description: 'Lớp học riêng 1 kèm 1',
          inviteCode: '',
          teacherId: teacherUser.id,
          teacher: teacherUser,
          isPrivate: true,
          students: [studentUser],
          createdAt: studentUser.createdAt,
          updatedAt: studentUser.updatedAt,
          stats: {
            totalStudents: 1,
            activeStudents: 1,
            inactiveStudents: 0,
            quizCount: 0,
            completionRate: 0,
            avgScore: 0,
            scoreDistribution: [],
            recentQuizScores: [],
          },
        };
      }

      throw new NotFoundException('Không tìm thấy lớp học');
    }

    const classDetails = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true, teacher: true },
    });

    if (!classDetails) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    const isTeacher = classDetails.teacherId === userId;
    const isStudent = classDetails.students.some((s) => s.id === userId);

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('Bạn không có quyền truy cập lớp học này');
    }

    const stats = await this.calculateClassStats(classId, classDetails.students || []);

    return {
      ...classDetails,
      stats,
    };
  }

  async getClassStudents(classId: string, userId: string, search?: string, status?: string) {
    let list: UserEntity[] = [];

    if (classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');
      const teacher = await this.userRepo.findOne({
        where: { id: userId },
        relations: { students: true },
      });
      const student = teacher?.students?.find((s) => s.id === studentId);
      if (!student) {
        throw new NotFoundException('Không tìm thấy lớp học');
      }
      list = [student];
    } else {
      const classDetails = await this.classRepo.findOne({
        where: { id: classId },
        relations: { students: true },
      });

      if (!classDetails) {
        throw new NotFoundException('Không tìm thấy lớp học');
      }

      if (classDetails.teacherId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập lớp học này');
      }

      list = classDetails.students || [];
    }

    if (status === 'active') {
      list = list.filter((s) => s.isActive !== false);
    } else if (status === 'inactive') {
      list = list.filter((s) => s.isActive === false);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.school && s.school.toLowerCase().includes(q)) ||
          s.id.toLowerCase().includes(q),
      );
    }

    const studentIds = list.map((s) => s.id);
    let studentSubmissions: SubmissionEntity[] = [];
    if (studentIds.length > 0) {
      studentSubmissions = await this.submissionRepo.find({
        where: { studentId: In(studentIds) },
      });
    }

    const getNormScore = (raw: number) => (!raw || raw <= 0 ? 0 : raw > 10 ? raw / 100 : raw);

    return list.map((s, index) => {
      const stuSubs = studentSubmissions.filter((sub) => sub.studentId === s.id);
      const stuAvg =
        stuSubs.length > 0
          ? Number(
              (
                stuSubs.reduce((acc, sub) => acc + getNormScore(sub.score || 0), 0) /
                stuSubs.length
              ).toFixed(1),
            )
          : null;
      return {
        stt: index + 1,
        id: s.id,
        name: s.name,
        email: s.email,
        username: s.email ? s.email.split('@')[0] : s.id,
        isActive: s.isActive ?? true,
        status: s.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        createdAt: s.createdAt,
        phone: s.phone || '',
        school: s.school || '',
        avatar: s.avatar || null,
        avgScore: stuAvg,
        submissionsCount: stuSubs.length,
      };
    });
  }

  async removeStudentFromClass(classId: string, studentId: string, teacherId: string) {
    if (classId.startsWith('private-')) {
      const teacher = await this.userRepo.findOne({
        where: { id: teacherId },
        relations: { students: true },
      });
      if (!teacher) throw new NotFoundException('Không tìm thấy giáo viên');
      teacher.students = (teacher.students || []).filter((s) => s.id !== studentId);
      await this.userRepo.save(teacher);
      return { success: true };
    }

    const classDetails = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true },
    });

    if (!classDetails) throw new NotFoundException('Không tìm thấy lớp học');
    if (classDetails.teacherId !== teacherId) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới được xóa học sinh');
    }

    classDetails.students = classDetails.students.filter((s) => s.id !== studentId);
    await this.classRepo.save(classDetails);
    return { success: true };
  }

  async importStudents(
    classId: string,
    teacherId: string,
    fileBuffer?: Buffer,
    rawRows?: any[],
  ): Promise<ImportStudentResult> {
    if (classId.startsWith('private-')) {
      throw new BadRequestException('Không hỗ trợ import học sinh vào lớp học kèm 1-1');
    }

    const classDetails = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true },
    });

    if (!classDetails) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    if (classDetails.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền import học sinh vào lớp này');
    }

    let parsedRows: { name: string; email: string; username?: string; phone?: string; school?: string }[] = [];

    if (fileBuffer) {
      let workbook: xlsx.WorkBook;
      try {
        workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      } catch {
        throw new BadRequestException('File không đúng định dạng Excel (.xlsx, .xls)');
      }

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new BadRequestException('File Excel không có sheet nào');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });

      if (!rawData || rawData.length <= 1) {
        throw new BadRequestException('File Excel rỗng hoặc chỉ có dòng tiêu đề');
      }

      const headerRow = (rawData[0] || []).map((h: any) => String(h || '').trim().toLowerCase());

      // Xác định chỉ số cột
      let nameIndex = headerRow.findIndex((h: string) =>
        ['full name', 'fullname', 'họ và tên', 'họ tên', 'tên', 'name'].includes(h),
      );
      let emailIndex = headerRow.findIndex((h: string) => ['email', 'thư điện tử', 'e-mail'].includes(h));
      let usernameIndex = headerRow.findIndex((h: string) =>
        ['username', 'tài khoản', 'mssv', 'mã học sinh', 'ma hs'].includes(h),
      );

      if (nameIndex === -1 && emailIndex === -1) {
        // Fallback default: column 0 = Name, column 1 = Email, column 2 = Username
        nameIndex = 0;
        emailIndex = 1;
        usernameIndex = 2;
      } else if (nameIndex === -1 || emailIndex === -1) {
        throw new BadRequestException('File Excel phải có ít nhất 2 cột: Họ tên và Email');
      }

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
          continue; // bỏ qua dòng trống
        }

        const name = row[nameIndex] !== undefined ? String(row[nameIndex]).trim() : '';
        const email = row[emailIndex] !== undefined ? String(row[emailIndex]).trim().toLowerCase() : '';
        const username =
          usernameIndex !== -1 && row[usernameIndex] !== undefined ? String(row[usernameIndex]).trim() : '';

        parsedRows.push({ name, email, username });
      }
    } else if (rawRows && Array.isArray(rawRows)) {
      parsedRows = rawRows;
    } else {
      throw new BadRequestException('Vui lòng upload file Excel hoặc cung cấp dữ liệu học sinh');
    }

    if (parsedRows.length === 0) {
      throw new BadRequestException('Không tìm thấy dữ liệu học sinh hợp lệ nào trong file');
    }

    const errors: ImportStudentError[] = [];
    const seenEmailsInFile = new Set<string>();
    const existingClassEmails = new Set(classDetails.students.map((s) => s.email.toLowerCase()));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const studentsToAdd: UserEntity[] = [];
    let skippedCount = 0;
    let successCount = 0;

    for (let idx = 0; idx < parsedRows.length; idx++) {
      const rowNum = idx + 2; // header là dòng 1
      const item = parsedRows[idx];
      const name = item.name ? item.name.trim() : '';
      const email = item.email ? item.email.trim().toLowerCase() : '';

      if (!name || !email) {
        errors.push({
          row: rowNum,
          name,
          email,
          message: 'Họ tên và Email là bắt buộc',
        });
        continue;
      }

      if (!emailRegex.test(email)) {
        errors.push({
          row: rowNum,
          name,
          email,
          message: 'Định dạng Email không hợp lệ',
        });
        continue;
      }

      if (seenEmailsInFile.has(email)) {
        errors.push({
          row: rowNum,
          name,
          email,
          message: `Email "${email}" bị trùng lặp trong chính file Excel`,
        });
        continue;
      }
      seenEmailsInFile.add(email);

      if (existingClassEmails.has(email)) {
        skippedCount++;
        errors.push({
          row: rowNum,
          name,
          email,
          message: `Học sinh đã có trong lớp học này (Bỏ qua)`,
        });
        continue;
      }

      // Kiểm tra học sinh trong hệ thống
      let student = await this.userRepo.findOneBy({ email });
      if (!student) {
        // NGHIỆP VỤ EXTERNAL STUDENT:
        // TUYỆT ĐỐI KHÔNG tạo User giả, KHÔNG tạo password mặc định "123456".
        // Tạo hồ sơ TeacherStudent với studentAccountId = null.
        let teacherStudent = await this.teacherStudentRepo.findOne({
          where: {
            teacherId,
            fullName: name,
          },
        });
        if (!teacherStudent) {
          teacherStudent = this.teacherStudentRepo.create({
            id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            teacherId,
            fullName: name,
            phone: item.phone || null,
            school: item.school || null,
            note: `Imported từ Excel lớp ${classDetails.name} (Email: ${email})`,
            status: 'ACTIVE',
            studentAccountId: null,
          });
          await this.teacherStudentRepo.save(teacherStudent);
        }
        successCount++;
      } else {
        if (student.role === 'STUDENT') {
          // Học sinh có tài khoản: liên kết hoặc bảo đảm hồ sơ TeacherStudent tồn tại
          let teacherStudent = await this.teacherStudentRepo.findOne({
            where: {
              teacherId,
              studentAccountId: student.id,
            },
          });
          if (!teacherStudent) {
            teacherStudent = this.teacherStudentRepo.create({
              id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              teacherId,
              fullName: student.name || name,
              phone: student.phone || item.phone || null,
              school: student.school || item.school || null,
              note: `Imported từ Excel lớp ${classDetails.name}`,
              status: 'ACTIVE',
              studentAccountId: student.id,
            });
            await this.teacherStudentRepo.save(teacherStudent);
          }
          studentsToAdd.push(student);
          existingClassEmails.add(email);
          successCount++;
        } else {
          errors.push({
            row: rowNum,
            name,
            email,
            message: `Tài khoản với email "${email}" không phải học sinh (Role: ${student.role})`,
          });
        }
      }
    }

    if (studentsToAdd.length > 0) {
      classDetails.students = [...classDetails.students, ...studentsToAdd];
      await this.classRepo.save(classDetails);
    }

    return {
      successCount,
      skippedCount,
      errorCount: errors.length - skippedCount,
      totalRows: parsedRows.length,
      errors,
    };
  }

  async exportStudents(classId: string, userId: string): Promise<{ filename: string; buffer: Buffer }> {
    let students: UserEntity[] = [];
    let className = '';

    if (classId.startsWith('private-')) {
      const studentId = classId.replace('private-', '');
      const teacher = await this.userRepo.findOne({
        where: { id: userId },
        relations: { students: true },
      });
      const student = teacher?.students?.find((s) => s.id === studentId);
      if (!student) {
        throw new NotFoundException('Không tìm thấy lớp học');
      }
      students = [student];
      className = `Kem_1_1_${student.name}`;
    } else {
      const classDetails = await this.classRepo.findOne({
        where: { id: classId },
        relations: { students: true },
      });

      if (!classDetails) {
        throw new NotFoundException('Không tìm thấy lớp học');
      }

      if (classDetails.teacherId !== userId) {
        throw new ForbiddenException('Bạn không có quyền export học sinh của lớp này');
      }

      students = classDetails.students || [];
      className = classDetails.name;
    }

    const headers = [
      'STT',
      'Họ và tên',
      'Email',
      'Tài khoản/MSSV',
      'Trạng thái',
      'Ngày tham gia',
      'Số điện thoại',
      'Trường học',
    ];

    const dataRows = students.map((s, idx) => [
      idx + 1,
      s.name,
      s.email,
      s.email ? s.email.split('@')[0] : s.id,
      s.isActive !== false ? 'Đang hoạt động' : 'Chưa kích hoạt',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : '',
      s.phone || '',
      s.school || '',
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...dataRows]);

    // Định dạng độ rộng cột
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Học sinh');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeName = className.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');

    return {
      filename: `Danh_sach_hoc_sinh_${safeName}.xlsx`,
      buffer,
    };
  }
}

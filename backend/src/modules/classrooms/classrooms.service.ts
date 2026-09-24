import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../../entities/class.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { CreateClassDto, JoinClassDto } from './dto/classroom.dto.js';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  // Sinh mã lớp ngẫu nhiên dạng: SUBJECT-XXXX (Ví dụ: MATH-A8F2)
  private generateInviteCode(subject?: string): string {
    const prefix = subject ? subject.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'CLASS';
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomStr}`;
  }

  async createClass(teacherId: string, dto: CreateClassDto) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới được tạo lớp học');
    }

    let inviteCode = this.generateInviteCode(dto.subject);
    // Đảm bảo invite code không bị trùng
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

    // Kiểm tra xem đã tham gia chưa
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
    // 1. Get real group classrooms
    const groupClasses = await this.classRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
      relations: { students: true },
    });

    // 2. Get private 1-on-1 students from teacher_students join table
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });

    const privateClasses = (teacher?.students ?? []).map(student => ({
      id: `private-${student.id}`,
      name: `Kèm 1-1: ${student.name}`,
      subject: 'Gia sư cá nhân',
      description: 'Lớp học riêng 1 kèm 1',
      inviteCode: '',
      teacherId,
      isPrivate: true,
      students: [student],
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }));

    // 3. Merge: group classes first, then private
    return [...groupClasses, ...privateClasses];
  }

  async getClassesForStudent(studentId: string) {
    const student = await this.userRepo.findOne({
      where: { id: studentId },
      relations: { classes: { teacher: true }, teachers: true },
    });

    if (!student) return [];
    
    // Map normal classes
    const normalClasses = (student.classes || []).map(c => ({
      ...c,
      isPrivate: false,
    }));

    // Map private teachers to a "Classroom" format
    const privateClasses = (student.teachers || []).map(t => ({
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

    // Combine and sort descending by creation date
    return [...normalClasses, ...privateClasses].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getClassDetails(classId: string, userId: string) {
    const classDetails = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true, teacher: true },
    });

    if (!classDetails) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }

    // Xác thực quyền xem (chỉ GV của lớp hoặc HS trong lớp mới được xem)
    const isTeacher = classDetails.teacherId === userId;
    const isStudent = classDetails.students.some((s) => s.id === userId);

    if (!isTeacher && !isStudent) {
      throw new UnauthorizedException('Bạn không có quyền xem thông tin lớp học này');
    }

    return classDetails;
  }

  async removeStudentFromClass(classId: string, studentId: string, teacherId: string) {
    const classDetails = await this.classRepo.findOne({
      where: { id: classId },
      relations: { students: true },
    });

    if (!classDetails) throw new NotFoundException('Không tìm thấy lớp học');
    if (classDetails.teacherId !== teacherId) {
      throw new UnauthorizedException('Chỉ giáo viên của lớp mới được xóa học sinh');
    }

    classDetails.students = classDetails.students.filter((s) => s.id !== studentId);
    await this.classRepo.save(classDetails);
    return { success: true };
  }
}

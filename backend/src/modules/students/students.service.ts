import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { MailerService } from '../mailer/mailer.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly mailerService: MailerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMyStudents(teacherId: string) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });
    if (!teacher) throw new NotFoundException('Không tìm thấy giáo viên');
    return teacher.students;
  }

  async inviteStudentByEmail(teacherId: string, email: string) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới được mời học sinh');
    }

    const student = await this.userRepo.findOneBy({ email });
    if (!student) {
      throw new BadRequestException('Không tìm thấy học sinh với email này trong hệ thống. Học sinh cần đăng ký tài khoản trước.');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestException('Tài khoản này không phải là tài khoản học sinh.');
    }

    const actionUrl = `/student/accept-invite?t=${teacher.id}`;
    
    // Gửi thông báo
    await this.notificationsService.createPersonalNotification(
      student.id,
      `Lời mời học từ giáo viên ${teacher.name}`,
      `Giáo viên ${teacher.name} vừa mời bạn tham gia học. Bấm vào nút bên dưới để chấp nhận.`,
      actionUrl,
      'Chấp nhận lời mời'
    );
    this.logger.log(`Invite notification sent to ${email} (student ID: ${student.id}) with teacherId ${teacher.id}`);
    
    return { success: true, message: 'Đã gửi lời mời qua thông báo cá nhân' };
  }

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

    if (student.teachers.some(t => t.id === teacher.id)) {
      throw new BadRequestException('Bạn đã là học sinh của giáo viên này rồi');
    }

    student.teachers.push(teacher);
    await this.userRepo.save(student);

    return { success: true, teacherName: teacher.name };
  }

  async removeStudent(teacherId: string, studentId: string) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });
    if (!teacher) throw new NotFoundException('Không tìm thấy giáo viên');

    teacher.students = teacher.students.filter(s => s.id !== studentId);
    await this.userRepo.save(teacher);
    return { success: true };
  }
}

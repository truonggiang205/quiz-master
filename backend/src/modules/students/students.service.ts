import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { MailerService } from '../mailer/mailer.service.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly mailerService: MailerService,
  ) {}

  async getMyStudents(teacherId: string) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: { students: true },
    });
    if (!teacher) throw new NotFoundException('Không tìm thấy giáo viên');
    return teacher.students;
  }

  async inviteStudentByEmail(teacherId: string, email: string, frontendUrl: string) {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới được mời học sinh');
    }

    const inviteLink = `${frontendUrl}/student/accept-invite?t=${teacher.id}`;
    
    // Gửi email
    try {
      await this.mailerService.sendMail(
        email,
        `Lời mời học từ giáo viên ${teacher.name}`,
        `<p>Xin chào,</p><p>Giáo viên <strong>${teacher.name}</strong> vừa mời bạn tham gia học. Bấm vào link dưới đây để chấp nhận:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
      );
      this.logger.log(`Invite email sent to ${email} with teacherId ${teacher.id}`);
    } catch (e) {
      this.logger.error('Cannot send invite email', e);
      throw new BadRequestException('Lỗi gửi email mời học sinh. Tuy nhiên bạn có thể đưa link trực tiếp cho học sinh: ' + inviteLink);
    }
    
    return { success: true, message: 'Đã gửi lời mời qua email' };
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

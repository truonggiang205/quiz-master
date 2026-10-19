import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { TeacherStudentEntity } from './entities/teacher-student.entity.js';
import { MailerModule } from '../mailer/mailer.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TeacherStudentEntity]),
    MailerModule,
    NotificationsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}

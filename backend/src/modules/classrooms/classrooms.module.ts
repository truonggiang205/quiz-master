import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from '../../entities/class.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { TeacherStudentEntity } from '../students/entities/teacher-student.entity.js';
import { LessonEntity, TuitionItemEntity } from '../teaching/entities/index.js';
import { ClassroomsController } from './classrooms.controller.js';
import { ClassroomsService } from './classrooms.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassEntity,
      UserEntity,
      QuizEntity,
      SubmissionEntity,
      TeacherStudentEntity,
      LessonEntity,
      TuitionItemEntity,
    ]),
  ],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}

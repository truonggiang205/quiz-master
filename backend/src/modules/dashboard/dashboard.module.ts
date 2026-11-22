import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity, SubmissionEntity, UserEntity } from '../../entities/index.js';
import { TeacherStudentEntity } from '../students/entities/teacher-student.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([QuizEntity, SubmissionEntity, UserEntity, TeacherStudentEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService, TypeOrmModule],
})
export class DashboardModule {}

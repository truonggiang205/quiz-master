import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity, QuizEntity, QuestionEntity, UserEntity } from '../../entities/index.js';
import { EssayRubricEntity } from '../grading/entities/essay-rubric.entity.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [AuthModule, UploadModule, TypeOrmModule.forFeature([SubmissionEntity, QuizEntity, QuestionEntity, UserEntity, EssayRubricEntity])],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService, TypeOrmModule],
})
export class SubmissionsModule {}

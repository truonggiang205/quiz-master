import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity, QuizEntity, QuestionEntity } from '../../entities/index.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SubmissionEntity, QuizEntity, QuestionEntity])],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService, TypeOrmModule],
})
export class SubmissionsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity, QuizEntity, SubmissionEntity } from '../../entities/index.js';
import { EssayRubricEntity } from '../grading/entities/essay-rubric.entity.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { QuizzesModule } from '../quizzes/quizzes.module.js';

@Module({
  imports: [AuthModule, UploadModule, TypeOrmModule.forFeature([QuestionEntity, QuizEntity, SubmissionEntity, EssayRubricEntity]), QuizzesModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService, TypeOrmModule],
})
export class QuestionsModule {}

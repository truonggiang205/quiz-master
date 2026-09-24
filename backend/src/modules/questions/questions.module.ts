import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity, QuizEntity } from '../../entities/index.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { QuizzesModule } from '../quizzes/quizzes.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionEntity, QuizEntity]), QuizzesModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService, TypeOrmModule],
})
export class QuestionsModule {}

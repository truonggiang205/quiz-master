import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity, QuestionEntity, SubmissionEntity, UserEntity } from '../../entities/index.js';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesService } from './quizzes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([QuizEntity, QuestionEntity, SubmissionEntity, UserEntity])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService, TypeOrmModule],
})
export class QuizzesModule {}

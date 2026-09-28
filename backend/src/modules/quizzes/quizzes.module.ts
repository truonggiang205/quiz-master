import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity, QuestionEntity, SubmissionEntity, UserEntity, ClassEntity } from '../../entities/index.js';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesService } from './quizzes.service.js';

@Module({
  imports: [AuthModule, UploadModule, NotificationsModule, TypeOrmModule.forFeature([QuizEntity, QuestionEntity, SubmissionEntity, UserEntity, ClassEntity])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService, TypeOrmModule],
})
export class QuizzesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { QuestionEntity } from '../../entities/question.entity.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { AdminSettingsService } from './admin-settings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, QuizEntity, SubmissionEntity, QuestionEntity])],
  controllers: [
    AdminUsersController, 
    AdminAnalyticsController, 
    AdminContentController,
    AdminSettingsController
  ],
  providers: [
    AdminUsersService, 
    AdminAnalyticsService, 
    AdminContentService,
    AdminSettingsService
  ],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppealEntity } from '../../entities/appeal.entity.js';
import { SubmissionEntity } from '../../entities/submission.entity.js';
import { QuizEntity } from '../../entities/quiz.entity.js';
import { AppealsController } from './appeals.controller.js';
import { AppealsService } from './appeals.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppealEntity, SubmissionEntity, QuizEntity]),
    NotificationsModule,
  ],
  controllers: [AppealsController],
  providers: [AppealsService],
})
export class AppealsModule {}

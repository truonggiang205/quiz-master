import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LessonEntity,
  LessonParticipantEntity,
  LearningLogEntity,
  ScoreRecordEntity,
  TuitionItemEntity,
  TuitionAdjustmentEntity,
  TuitionPaymentEntity,
} from './entities/index.js';
import { ClassEntity } from '../../entities/class.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { ScheduleService } from './services/schedule.service.js';
import { LearningLogsService } from './services/learning-logs.service.js';
import { TuitionService } from './services/tuition.service.js';
import { ScoresService } from './services/scores.service.js';
import { ScheduleController } from './controllers/schedule.controller.js';
import { LearningLogsController } from './controllers/learning-logs.controller.js';
import { TuitionController } from './controllers/tuition.controller.js';
import { ScoresController } from './controllers/scores.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonEntity,
      LessonParticipantEntity,
      LearningLogEntity,
      ScoreRecordEntity,
      TuitionItemEntity,
      TuitionAdjustmentEntity,
      TuitionPaymentEntity,
      ClassEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    ScheduleController,
    LearningLogsController,
    TuitionController,
    ScoresController,
  ],
  providers: [
    ScheduleService,
    LearningLogsService,
    TuitionService,
    ScoresService,
  ],
  exports: [
    ScheduleService,
    LearningLogsService,
    TuitionService,
    ScoresService,
  ],
})
export class TeachingModule {}

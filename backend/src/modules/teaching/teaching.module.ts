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
import { TeacherStudentEntity } from '../students/entities/teacher-student.entity.js';
import { ScheduleService } from './services/schedule.service.js';
import { LearningLogsService } from './services/learning-logs.service.js';
import { TuitionService } from './services/tuition.service.js';
import { ScoresService } from './services/scores.service.js';
import { HolidaysService } from './services/holidays.service.js';
import { ScheduleController } from './controllers/schedule.controller.js';
import { LearningLogsController } from './controllers/learning-logs.controller.js';
import { TuitionController } from './controllers/tuition.controller.js';
import { ScoresController } from './controllers/scores.controller.js';
import { CalendarController } from './controllers/calendar.controller.js';

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
      TeacherStudentEntity,
    ]),
  ],
  controllers: [
    ScheduleController,
    LearningLogsController,
    TuitionController,
    ScoresController,
    CalendarController,
  ],
  providers: [
    ScheduleService,
    LearningLogsService,
    TuitionService,
    ScoresService,
    HolidaysService,
  ],
  exports: [
    ScheduleService,
    LearningLogsService,
    TuitionService,
    ScoresService,
    HolidaysService,
  ],
})
export class TeachingModule {}

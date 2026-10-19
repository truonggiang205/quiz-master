import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import dotenv from 'dotenv';
import {
  UserEntity,
  QuizEntity,
  QuestionEntity,
  SubmissionEntity,
  ClassEntity,
} from './entities/index.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { AppealEntity } from './entities/appeal.entity.js';
import { ConversationEntity, MessageEntity } from './entities/chat.entity.js';
import { BugReportEntity } from './entities/bug-report.entity.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { SubmissionsModule } from './modules/submissions/submissions.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { ClassroomsModule } from './modules/classrooms/classrooms.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AppealsModule } from './modules/appeals/appeals.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { BugReportModule } from './modules/bug-report/bug-report.module.js';
import { GradingModule } from './modules/grading/grading.module.js';
import { EssayRubricEntity } from './modules/grading/entities/essay-rubric.entity.js';
import { GradingResultEntity } from './modules/grading/entities/grading-result.entity.js';
import {
  LessonEntity,
  LessonParticipantEntity,
  LearningLogEntity,
  ScoreRecordEntity,
  TuitionItemEntity,
  TuitionAdjustmentEntity,
  TuitionPaymentEntity,
} from './modules/teaching/entities/index.js';
import { TeacherStudentEntity } from './modules/students/entities/teacher-student.entity.js';
import { TeachingModule } from './modules/teaching/teaching.module.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'csm-db-truonggiang-205.l.aivencloud.com',
      port: Number(process.env.DB_PORT) || 25532,
      username: process.env.DB_USERNAME || 'avnadmin',
      password: process.env.DB_PASSWORD || 'AVNS__ZUD3CAQkiIrycmV2VH',
      database: process.env.DB_DATABASE || 'quizmaster',
      ssl: {
        rejectUnauthorized: false,
      },
      entities: [
        UserEntity,
        QuizEntity,
        QuestionEntity,
        SubmissionEntity,
        ClassEntity,
        NotificationEntity,
        AppealEntity,
        ConversationEntity,
        MessageEntity,
        BugReportEntity,
        EssayRubricEntity,
        GradingResultEntity,
        LessonEntity,
        LessonParticipantEntity,
        LearningLogEntity,
        ScoreRecordEntity,
        TuitionItemEntity,
        TuitionAdjustmentEntity,
        TuitionPaymentEntity,
        TeacherStudentEntity,
      ],
      synchronize: true, // Auto creates and syncs tables with Aiven MySQL
      logging: false,
    }),
    AuthModule,
    UsersModule,
    QuizzesModule,
    QuestionsModule,
    SubmissionsModule,
    DashboardModule,
    UploadModule,
    ClassroomsModule,
    StudentsModule,
    AdminModule,
    NotificationsModule,
    AppealsModule,
    ChatModule,
    BugReportModule,
    GradingModule,
    TeachingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*path}');
  }
}

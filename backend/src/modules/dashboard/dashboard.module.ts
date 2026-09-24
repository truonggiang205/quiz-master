import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity, SubmissionEntity } from '../../entities/index.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([QuizEntity, SubmissionEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService, TypeOrmModule],
})
export class DashboardModule {}

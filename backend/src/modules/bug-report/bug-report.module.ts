import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugReportEntity } from '../../entities/bug-report.entity.js';
import { BugReportService } from './bug-report.service.js';
import { BugReportController } from './bug-report.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([BugReportEntity])],
  controllers: [BugReportController],
  providers: [BugReportService],
})
export class BugReportModule {}

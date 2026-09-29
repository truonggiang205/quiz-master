// ============================================================
// grading.module.ts — NestJS module registration
// ============================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { EssayRubricEntity } from './entities/essay-rubric.entity.js';
import { GradingResultEntity } from './entities/grading-result.entity.js';
import { GradingController } from './grading.controller.js';
import { GradingService } from './grading.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([EssayRubricEntity, GradingResultEntity]),
  ],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService, TypeOrmModule],
})
export class GradingModule {}

// ============================================================
// grading.controller.ts — REST endpoints for grading module
// ============================================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { GradingService } from './grading.service.js';
import { GradeEssayDto, BulkGradeEssayDto } from './dto/grade-essay.dto.js';
import { TeacherReviewDto } from './dto/teacher-review.dto.js';
import type { EssayRubric } from './rubric/rubric.types.js';

@ApiTags('Grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  // ── Rubric endpoints ────────────────────────────────────────────────────

  @Post('rubrics')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Create or update rubric for a question' })
  @ApiResponse({ status: 201, description: 'Rubric saved successfully.' })
  upsertRubric(@Body() rubric: EssayRubric) {
    return this.gradingService.upsertRubric(rubric);
  }

  @Get('rubrics/:questionId')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Get rubric for a question' })
  getRubric(@Param('questionId') questionId: string) {
    return this.gradingService.getRubric(questionId);
  }

  @Delete('rubrics/:questionId')
  @Roles('TEACHER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete rubric for a question' })
  deleteRubric(@Param('questionId') questionId: string) {
    return this.gradingService.deleteRubric(questionId);
  }

  // ── Grading endpoints ───────────────────────────────────────────────────

  @Post('grade')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Auto-grade a single essay answer' })
  @ApiResponse({ status: 201, description: 'Grading result saved.' })
  gradeEssay(@Body() dto: GradeEssayDto) {
    return this.gradingService.gradeEssay(dto);
  }

  @Post('grade/bulk')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Auto-grade multiple essay answers in one request' })
  bulkGradeEssay(@Body() dto: BulkGradeEssayDto) {
    return this.gradingService.bulkGradeEssay(dto);
  }

  // ── Result retrieval ────────────────────────────────────────────────────

  @Get('results/:id')
  @Roles('TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get a grading result by ID' })
  getResultById(@Param('id') id: string) {
    return this.gradingService.getResultById(id);
  }

  @Get('results/submission/:submissionId')
  @Roles('TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get all grading results for a submission' })
  getResultsBySubmission(@Param('submissionId') submissionId: string) {
    return this.gradingService.getResultsBySubmission(submissionId);
  }

  @Get('results/question/:questionId')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Get all grading results for a question' })
  getResultsByQuestion(@Param('questionId') questionId: string) {
    return this.gradingService.getResultsByQuestion(questionId);
  }

  @Get('reviews/pending')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Get all results flagged for teacher review' })
  getPendingReviews() {
    return this.gradingService.getPendingReviews();
  }

  // ── Teacher review ──────────────────────────────────────────────────────

  @Patch('results/:id/review')
  @Roles('TEACHER')
  @ApiOperation({ summary: 'Teacher manually overrides an auto-graded result' })
  teacherReview(@Param('id') id: string, @Body() dto: TeacherReviewDto) {
    return this.gradingService.teacherReview(id, dto);
  }
}

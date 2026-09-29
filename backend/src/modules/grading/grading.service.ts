// ============================================================
// grading.service.ts — NestJS service: orchestrates grading & DB persistence
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EssayRubricEntity } from './entities/essay-rubric.entity.js';
import { GradingResultEntity } from './entities/grading-result.entity.js';
import { GradeEssayDto, BulkGradeEssayDto } from './dto/grade-essay.dto.js';
import { TeacherReviewDto } from './dto/teacher-review.dto.js';
import { gradeWithRubric } from './rubric/rubric-grader.js';
import { DEFAULT_GRADING_CONFIG, GradingConfig } from './grading.config.js';
import { EssayRubric, GradingResult } from './rubric/rubric.types.js';

@Injectable()
export class GradingService {
  private readonly config: GradingConfig = DEFAULT_GRADING_CONFIG;

  constructor(
    @InjectRepository(EssayRubricEntity)
    private readonly rubricRepo: Repository<EssayRubricEntity>,
    @InjectRepository(GradingResultEntity)
    private readonly resultRepo: Repository<GradingResultEntity>,
  ) {}

  // ── Rubric CRUD ──────────────────────────────────────────────────────────

  async upsertRubric(rubricData: EssayRubric): Promise<EssayRubricEntity> {
    const existing = await this.rubricRepo.findOneBy({
      questionId: rubricData.questionId,
    });

    const entity = existing ?? this.rubricRepo.create({ id: `rubric-${uuidv4()}` });
    entity.questionId = rubricData.questionId;
    entity.acceptedAnswers = rubricData.acceptedAnswers ?? null;
    entity.criteria = rubricData.criteria;
    entity.totalScore = rubricData.totalScore;
    return this.rubricRepo.save(entity);
  }

  async getRubric(questionId: string): Promise<EssayRubricEntity> {
    const rubric = await this.rubricRepo.findOneBy({ questionId });
    if (!rubric) {
      throw new NotFoundException(`Rubric not found for question ${questionId}`);
    }
    return rubric;
  }

  async deleteRubric(questionId: string): Promise<void> {
    await this.rubricRepo.delete({ questionId });
  }

  // ── Grading ──────────────────────────────────────────────────────────────

  /**
   * Grade a single essay answer.
   * If a rubric is stored in DB for the questionId, it takes precedence
   * over the rubric provided in the DTO.
   */
  async gradeEssay(dto: GradeEssayDto): Promise<GradingResultEntity> {
    // Attempt to load stored rubric; fall back to DTO rubric
    let rubric: EssayRubric;
    const storedRubric = await this.rubricRepo.findOneBy({
      questionId: dto.questionId,
    });
    if (storedRubric) {
      rubric = {
        questionId: storedRubric.questionId,
        acceptedAnswers: storedRubric.acceptedAnswers ?? undefined,
        criteria: storedRubric.criteria,
        totalScore: storedRubric.totalScore,
      };
    } else {
      rubric = dto.rubric;
    }

    const gradingResult: GradingResult = gradeWithRubric(
      {
        questionId: dto.questionId,
        submissionId: dto.submissionId,
        studentAnswer: dto.studentAnswer,
        rubric,
      },
      this.config,
    );

    return this.persistResult(gradingResult);
  }

  /** Grade multiple essays in sequence, returns all results */
  async bulkGradeEssay(dto: BulkGradeEssayDto): Promise<GradingResultEntity[]> {
    const results: GradingResultEntity[] = [];
    for (const item of dto.items) {
      results.push(await this.gradeEssay(item));
    }
    return results;
  }

  // ── Results ──────────────────────────────────────────────────────────────

  async getResultById(id: string): Promise<GradingResultEntity> {
    const result = await this.resultRepo.findOneBy({ id });
    if (!result) throw new NotFoundException(`Grading result ${id} not found`);
    return result;
  }

  async getResultsBySubmission(submissionId: string): Promise<GradingResultEntity[]> {
    return this.resultRepo.find({ where: { submissionId }, order: { createdAt: 'DESC' } });
  }

  async getResultsByQuestion(questionId: string): Promise<GradingResultEntity[]> {
    return this.resultRepo.find({ where: { questionId }, order: { createdAt: 'DESC' } });
  }

  /** Return all results flagged as needing review */
  async getPendingReviews(): Promise<GradingResultEntity[]> {
    return this.resultRepo.find({
      where: { needsReview: true, isReviewed: false },
      order: { createdAt: 'ASC' },
    });
  }

  /** Teacher manually overrides the auto score */
  async teacherReview(
    resultId: string,
    dto: TeacherReviewDto,
  ): Promise<GradingResultEntity> {
    const result = await this.getResultById(resultId);
    result.teacherScore = dto.teacherScore;
    result.teacherComment = dto.teacherComment ?? null;
    result.isReviewed = true;
    return this.resultRepo.save(result);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async persistResult(gr: GradingResult): Promise<GradingResultEntity> {
    // Check if already graded (idempotent: update if exists)
    const existing = await this.resultRepo.findOne({
      where: { submissionId: gr.submissionId, questionId: gr.questionId },
    });

    const entity: GradingResultEntity =
      existing ??
      this.resultRepo.create({ id: `gr-${uuidv4()}` });

    entity.submissionId = gr.submissionId;
    entity.questionId = gr.questionId;
    entity.originalAnswer = gr.originalAnswer;
    entity.normalizedAnswer = gr.normalizedAnswer;
    entity.score = gr.score;
    entity.maxScore = gr.maxScore;
    entity.winningTier = gr.winningTier;
    entity.criteriaDetails = gr.criteriaDetails;
    entity.decisionLog = gr.decisionLog;
    entity.confidence = gr.confidence;
    entity.needsReview = gr.needsReview;
    entity.gradedAt = gr.gradedAt;
    // Reset review if re-graded
    if (!existing) {
      entity.isReviewed = false;
      entity.teacherScore = null;
      entity.teacherComment = null;
    }

    return this.resultRepo.save(entity);
  }
}

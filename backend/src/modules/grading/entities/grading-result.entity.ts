// ============================================================
// grading-result.entity.ts — Persists full grading audit trail
// ============================================================

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CriterionResult, TierLog } from '../rubric/rubric.types.js';

@Entity('grading_results')
export class GradingResultEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  /** FK → submissions.id */
  @Column({ type: 'varchar', length: 64 })
  submissionId: string;

  /** FK → questions.id */
  @Column({ type: 'varchar', length: 64 })
  questionId: string;

  /** Exact text submitted by the student — never modified */
  @Column({ type: 'text' })
  originalAnswer: string;

  /** Text after full normalisation pipeline */
  @Column({ type: 'text' })
  normalizedAnswer: string;

  /** Score awarded */
  @Column({ type: 'double', default: 0 })
  score: number;

  /** Maximum possible score */
  @Column({ type: 'double', default: 10 })
  maxScore: number;

  /** Which tier produced the final score (1-4, or null if ungraded) */
  @Column({ type: 'int', nullable: true })
  winningTier: 1 | 2 | 3 | 4 | null;

  /** Per-criterion breakdown */
  @Column({ type: 'json' })
  criteriaDetails: CriterionResult[];

  /** Full audit trail of every tier attempted */
  @Column({ type: 'json' })
  decisionLog: TierLog[];

  /** Confidence value [0, 1] from the winning tier */
  @Column({ type: 'double', default: 0 })
  confidence: number;

  /** Whether a teacher should manually review this result */
  @Column({ type: 'boolean', default: false })
  needsReview: boolean;

  /** Whether a teacher has already reviewed */
  @Column({ type: 'boolean', default: false })
  isReviewed: boolean;

  /** Optional teacher override score */
  @Column({ type: 'double', nullable: true })
  teacherScore: number | null;

  /** Optional teacher comment */
  @Column({ type: 'text', nullable: true })
  teacherComment: string | null;

  /** Timestamp when grading ran */
  @Column({ type: 'varchar', length: 64, nullable: true })
  gradedAt: string;

  @CreateDateColumn()
  createdAt: Date;
}

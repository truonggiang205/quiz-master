// ============================================================
// essay-rubric.entity.ts — Stores rubric definitions per question
// ============================================================

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Criterion } from '../rubric/rubric.types.js';

@Entity('essay_rubrics')
export class EssayRubricEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  /** FK → questions.id */
  @Column({ type: 'varchar', length: 64 })
  questionId: string;

  /**
   * Optional list of "perfect" accepted answer strings.
   * Used by Tier 1 (exact) and Tier 3 (fuzzy) matchers.
   */
  @Column({ type: 'json', nullable: true })
  acceptedAnswers: string[] | null;

  /**
   * Rubric criteria as JSON:
   * [{ id, description, keywords, synonyms, maxPoints, requireAll }]
   */
  @Column({ type: 'json' })
  criteria: Criterion[];

  /** Sum of all criterion maxPoints */
  @Column({ type: 'double', default: 10 })
  totalScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

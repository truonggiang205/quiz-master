import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import type { QuestionType, QuestionOption } from './question.entity.js';

export type QuizAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface AttemptQuestionSnapshot {
  id: string;
  content: string;
  imageUrl?: string;
  type: QuestionType;
  options: QuestionOption[];
  essayRubric?: any;
  points: number;
  score: number;
  explanation?: string;
  order: number;
}

export interface AttemptQuizSnapshot {
  version: 1;
  quizId: string;
  quizTitle: string;
  durationMinutes: number;
  totalPoints: number;
  answerReleaseAt?: string | null;
  showScoreImmediately: boolean;
  showCorrectAnswers: boolean;
  showExplanation: boolean;
  questions: AttemptQuestionSnapshot[];
}

@Entity('quiz_attempts')
@Unique('UQ_quiz_attempt_student_number', ['quizId', 'studentId', 'attemptNumber'])
export class QuizAttemptEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  quizId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'int' })
  attemptNumber: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: QuizAttemptStatus;

  @Column({ type: 'json' })
  questionSnapshot: AttemptQuestionSnapshot[];

  @Column({ type: 'json', nullable: true })
  quizSnapshot?: AttemptQuizSnapshot | null;

  /** Student-provided work only; no marking data is written here. */
  @Column({ type: 'json', nullable: true })
  draftAnswers?: any[] | null;

  @Column({ type: 'varchar', length: 50 })
  startedAt: string;

  @Column({ type: 'varchar', length: 50 })
  expiresAt: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  submittedAt?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  submissionId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

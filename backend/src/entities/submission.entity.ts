import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface StudentAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  essayImageUrl?: string;
  essayText?: string;
  isCorrect?: boolean;
  scoreAwarded: number;
  isManuallyGraded?: boolean;
}

@Entity('submissions')
export class SubmissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  quizId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  quizTitle: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'varchar', length: 255 })
  studentName: string;

  @Column({ type: 'varchar', length: 255 })
  studentEmail: string;

  @Column({ type: 'text', nullable: true })
  studentAvatar: string;

  @Column({ type: 'double', default: 0 })
  score: number;

  @Column({ type: 'double', default: 10 })
  maxScore: number;

  @Index()
  @Column({ type: 'double', default: 0 })
  percentage: number;

  @Column({ type: 'int', default: 0 })
  correctCount: number;

  @Column({ type: 'int', default: 0 })
  wrongCount: number;

  @Column({ type: 'int', default: 0 })
  unansweredCount: number;

  @Column({ type: 'int', default: 0 })
  timeUsedSeconds: number;

  @Column({ type: 'json' })
  answers: StudentAnswer[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  submittedAt: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

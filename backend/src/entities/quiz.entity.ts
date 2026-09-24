import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

@Entity('quizzes')
export class QuizEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @Column({ type: 'int', default: 45 })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: QuizStatus;

  @Column({ type: 'varchar', length: 20, default: 'QUIZ' })
  mode: 'QUIZ' | 'PRACTICE';

  @Column({ type: 'varchar', length: 50, nullable: true })
  startTime: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  endTime: string;

  @Column({ type: 'int', default: 1 })
  totalAttempts: number;

  @Column({ type: 'boolean', default: true })
  shuffleQuestions: boolean;

  @Column({ type: 'boolean', default: true })
  shuffleAnswers: boolean;

  @Column({ type: 'boolean', default: true })
  showScoreImmediately: boolean;

  @Column({ type: 'boolean', default: true })
  showCorrectAnswers: boolean;

  @Column({ type: 'boolean', default: true })
  showExplanation: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  answerReleaseAt: string;

  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @Column({ type: 'varchar', length: 255 })
  teacherName: string;

  @Column({ type: 'int', default: 0 })
  questionCount: number;

  @Column({ type: 'double', default: 0 })
  totalScore: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  classId?: string | null;

  @Column({ type: 'json', nullable: true })
  assignedStudentIds?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

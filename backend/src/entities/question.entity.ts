import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

@Entity('questions')
export class QuestionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  quizId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  teacherId: string;

  @Column({ type: 'boolean', default: false })
  isBank: boolean;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 30, default: 'SINGLE_CHOICE' })
  type: QuestionType;

  @Column({ type: 'json' })
  options: QuestionOption[];

  @Column({ type: 'double', default: 2.0 })
  score: number;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'int', default: 1 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

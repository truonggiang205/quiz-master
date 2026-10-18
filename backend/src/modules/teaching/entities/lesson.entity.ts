import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../../entities/user.entity.js';
import type { UserEntity as IUserEntity } from '../../../entities/user.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import type { ClassEntity as IClassEntity } from '../../../entities/class.entity.js';
import { LessonParticipantEntity } from './lesson-participant.entity.js';
import type { LessonParticipantEntity as ILessonParticipantEntity } from './lesson-participant.entity.js';
import { LearningLogEntity } from './learning-log.entity.js';
import type { LearningLogEntity as ILearningLogEntity } from './learning-log.entity.js';
import { ScoreRecordEntity } from './score-record.entity.js';
import type { ScoreRecordEntity as IScoreRecordEntity } from './score-record.entity.js';

@Entity('teaching_lessons')
@Index(['teacherId', 'date'])
export class LessonEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  classId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Index()
  @Column({ type: 'varchar', length: 10 }) // YYYY-MM-DD
  date: string;

  @Column({ type: 'varchar', length: 5 }) // HH:mm
  startTime: string;

  @Column({ type: 'varchar', length: 5 }) // HH:mm
  endTime: string;

  @Column({ type: 'float', default: 1 }) // Duration in hours (e.g. 1.5)
  duration: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  feePerLesson: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true })
  homework: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: IClassEntity;

  @OneToMany(() => LessonParticipantEntity, (participant: ILessonParticipantEntity) => participant.lesson, { cascade: true })
  participants: ILessonParticipantEntity[];

  @OneToMany(() => LearningLogEntity, (log: ILearningLogEntity) => log.lesson)
  learningLogs: ILearningLogEntity[];

  @OneToMany(() => ScoreRecordEntity, (score: IScoreRecordEntity) => score.lesson)
  scores: IScoreRecordEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

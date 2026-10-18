import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { LessonEntity } from './lesson.entity.js';
import type { LessonEntity as ILessonEntity } from './lesson.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import type { UserEntity as IUserEntity } from '../../../entities/user.entity.js';

@Entity('teaching_lesson_participants')
@Index(['lessonId', 'studentId'], { unique: true })
export class LessonParticipantEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  lessonId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'varchar', length: 20, default: 'ATTENDED' })
  attendanceStatus: 'ATTENDED' | 'ABSENT' | 'EXCUSED';

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  feeAmount: number;

  @ManyToOne(() => LessonEntity, (lesson: ILessonEntity) => lesson.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: ILessonEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: IUserEntity;
}

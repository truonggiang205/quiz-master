import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../../entities/user.entity.js';
import type { UserEntity as IUserEntity } from '../../../entities/user.entity.js';
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import type { TeacherStudentEntity as ITeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import type { ClassEntity as IClassEntity } from '../../../entities/class.entity.js';
import { LessonEntity } from './lesson.entity.js';
import type { LessonEntity as ILessonEntity } from './lesson.entity.js';

export type AssessmentType = 'QUIZ' | 'HOMEWORK' | 'MIDTERM' | 'FINAL' | 'ORAL' | 'PRACTICE' | 'OTHER';

@Entity('teaching_scores')
@Index(['teacherId', 'classId'])
@Index(['studentId', 'classId'])
export class ScoreRecordEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  classId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  lessonId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'QUIZ' })
  assessmentType: AssessmentType;

  @Column({ type: 'varchar', length: 255 })
  assessmentName: string;

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'float', default: 10 })
  maxScore: number;

  @Column({ type: 'varchar', length: 10 }) // YYYY-MM-DD
  date: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: IClassEntity;

  @ManyToOne(() => TeacherStudentEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: ITeacherStudentEntity;

  @ManyToOne(() => LessonEntity, (lesson: ILessonEntity) => lesson.scores, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson: ILessonEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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

@Entity('teaching_learning_logs')
@Index(['teacherId', 'classId'])
@Index(['lessonId', 'studentId'])
export class LearningLogEntity {
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
  lessonId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true })
  homework: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  attitude: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: IClassEntity;

  @ManyToOne(() => LessonEntity, (lesson: ILessonEntity) => lesson.learningLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: ILessonEntity;

  @ManyToOne(() => TeacherStudentEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: ITeacherStudentEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

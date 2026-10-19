import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { LessonEntity } from './lesson.entity.js';
import type { LessonEntity as ILessonEntity } from './lesson.entity.js';
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import type { TeacherStudentEntity as ITeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';

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

  @ManyToOne(() => TeacherStudentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: ITeacherStudentEntity;
}

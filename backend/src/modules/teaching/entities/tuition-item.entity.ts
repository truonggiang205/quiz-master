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
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import type { TeacherStudentEntity as ITeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import type { ClassEntity as IClassEntity } from '../../../entities/class.entity.js';
import { TuitionAdjustmentEntity } from './tuition-adjustment.entity.js';
import type { TuitionAdjustmentEntity as ITuitionAdjustmentEntity } from './tuition-adjustment.entity.js';
import { TuitionPaymentEntity } from './tuition-payment.entity.js';
import type { TuitionPaymentEntity as ITuitionPaymentEntity } from './tuition-payment.entity.js';

export type TuitionStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

@Entity('teaching_tuition_items')
@Index(['teacherId', 'month'])
@Index(['classId', 'studentId', 'month'], { unique: true })
export class TuitionItemEntity {
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
  @Column({ type: 'varchar', length: 7 }) // YYYY-MM
  month: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  surcharge: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  remainingAmount: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'UNPAID' })
  status: TuitionStatus;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: IClassEntity;

  @ManyToOne(() => TeacherStudentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: ITeacherStudentEntity;

  @OneToMany(() => TuitionAdjustmentEntity, (adj: ITuitionAdjustmentEntity) => adj.tuitionItem, { cascade: true })
  adjustments: ITuitionAdjustmentEntity[];

  @OneToMany(() => TuitionPaymentEntity, (payment: ITuitionPaymentEntity) => payment.tuitionItem, { cascade: true })
  payments: ITuitionPaymentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TuitionItemEntity } from './tuition-item.entity.js';
import type { TuitionItemEntity as ITuitionItemEntity } from './tuition-item.entity.js';
import { TeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';
import type { TeacherStudentEntity as ITeacherStudentEntity } from '../../students/entities/teacher-student.entity.js';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOMO' | 'OTHER';

@Entity('teaching_tuition_payments')
export class TuitionPaymentEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  tuitionItemId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  studentId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 }) // YYYY-MM-DD
  paymentDate: string;

  @Column({ type: 'varchar', length: 50, default: 'CASH' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => TuitionItemEntity, (item: ITuitionItemEntity) => item.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tuitionItemId' })
  tuitionItem: ITuitionItemEntity;

  @ManyToOne(() => TeacherStudentEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: ITeacherStudentEntity;

  @CreateDateColumn()
  createdAt: Date;
}

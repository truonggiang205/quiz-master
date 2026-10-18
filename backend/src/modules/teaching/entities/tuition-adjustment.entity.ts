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

@Entity('teaching_tuition_adjustments')
export class TuitionAdjustmentEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  tuitionItemId: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'SURCHARGE' | 'DISCOUNT';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 64 })
  createdBy: string;

  @ManyToOne(() => TuitionItemEntity, (item: ITuitionItemEntity) => item.adjustments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tuitionItemId' })
  tuitionItem: ITuitionItemEntity;

  @CreateDateColumn()
  createdAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { SubmissionEntity } from './submission.entity.js';

export enum AppealStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('appeals')
export class AppealEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  submissionId: string;

  @Column()
  studentId: string;

  @Column()
  teacherId: string;

  @Column('text')
  reason: string;

  @Column({
    type: 'varchar',
    default: AppealStatus.PENDING,
  })
  status: AppealStatus;

  @Column({ type: 'text', nullable: true })
  teacherReply: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: SubmissionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: UserEntity;
}

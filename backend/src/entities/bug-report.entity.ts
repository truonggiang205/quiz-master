import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';

@Entity('bug_reports')
export class BugReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'Other' })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'Medium' })
  priority: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  browser: string;

  @Column({ type: 'text', nullable: true })
  screenshotUrl: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string; // PENDING, RESOLVED

  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

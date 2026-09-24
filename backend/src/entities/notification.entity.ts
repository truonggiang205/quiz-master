import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum NotificationType {
  GENERAL = 'GENERAL',
  PERSONAL = 'PERSONAL',
}

export enum NotificationTargetRole {
  ALL = 'ALL',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  NONE = 'NONE',
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'varchar',
    default: NotificationType.PERSONAL,
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    default: NotificationTargetRole.NONE,
  })
  targetRole: NotificationTargetRole;

  @Column({ nullable: true })
  recipientId: string; // Used for PERSONAL notifications

  @Column({ type: 'simple-json', nullable: true })
  readBy: string[]; // Array of user IDs who have read this notification

  @CreateDateColumn()
  createdAt: Date;
}

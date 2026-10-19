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

export type StudentStatus = 'ACTIVE' | 'INACTIVE';
export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';

@Entity('teacher_student_profiles')
@Index(['teacherId', 'status'])
@Index(['teacherId', 'studentAccountId'])
export class TeacherStudentEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  studentAccountId: string | null;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parentPhone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dob: string | null; // YYYY-MM-DD format

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: StudentGender | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  school: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'studentAccountId' })
  studentAccount: IUserEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Convenience getter for compatibility with code that expects `name`
  get name(): string {
    return this.fullName;
  }

  // Helper to determine if student is external
  get isExternal(): boolean {
    return !this.studentAccountId;
  }
}

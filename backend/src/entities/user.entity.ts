import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { ClassEntity } from './class.entity.js';
import type { ClassEntity as IClassEntity } from './class.entity.js';
import type { UserEntity as IUserEntity } from './user.entity.js';
import { TeacherStudentEntity } from '../modules/students/entities/teacher-student.entity.js';
import type { TeacherStudentEntity as ITeacherStudentEntity } from '../modules/students/entities/teacher-student.entity.js';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, default: '123456' })
  password: string;

  @Column({ type: 'varchar', length: 20, default: 'STUDENT' })
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  school: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  otpCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt: Date | null;

  @ManyToMany(() => ClassEntity, (cls: IClassEntity) => cls.students)
  classes: IClassEntity[];

  @ManyToMany(() => UserEntity, (user: IUserEntity) => user.teachers)
  @JoinTable({
    name: 'teacher_students',
    joinColumn: { name: 'teacherId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' }
  })
  students: IUserEntity[];

  @ManyToMany(() => UserEntity, (user: IUserEntity) => user.students)
  teachers: IUserEntity[];

  @OneToMany(() => TeacherStudentEntity, (ts: ITeacherStudentEntity) => ts.teacher)
  studentProfiles: ITeacherStudentEntity[];

  @OneToMany(() => TeacherStudentEntity, (ts: ITeacherStudentEntity) => ts.studentAccount)
  linkedProfiles: ITeacherStudentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

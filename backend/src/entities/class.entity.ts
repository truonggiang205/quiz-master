import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';
import type { UserEntity as IUserEntity } from './user.entity.js';

@Entity('classes')
export class ClassEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subject: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  inviteCode: string;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ type: 'varchar', length: 64 })
  teacherId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'teacherId' })
  teacher: IUserEntity;

  @ManyToMany(() => UserEntity, user => user.classes)
  @JoinTable({
    name: 'class_students',
    joinColumn: { name: 'classId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' }
  })
  students: IUserEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

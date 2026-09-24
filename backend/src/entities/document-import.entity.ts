import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum DocumentImportStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PREVIEW = 'PREVIEW',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

@Entity('document_imports')
export class DocumentImportEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 50 })
  fileType: string;

  @Column({ type: 'enum', enum: DocumentImportStatus, default: DocumentImportStatus.UPLOADED })
  status: DocumentImportStatus;

  @Column({ type: 'json', nullable: true })
  summary: any;

  @Column({ type: 'json', nullable: true })
  rawData: any; // Array of parsed questions

  @Column({ type: 'varchar', length: 255, nullable: true })
  teacherId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;
}

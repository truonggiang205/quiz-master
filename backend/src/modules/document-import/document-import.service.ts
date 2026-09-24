import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentImportEntity, DocumentImportStatus } from '../../entities/document-import.entity.js';
import { FileValidatorService } from './services/file-validator.service.js';
import { ParsedQuestion } from './services/question-parser.service.js';
import { ValidationService } from './services/validation.service.js';
import { v4 as uuidv4 } from 'uuid';
import { QuestionsService } from '../questions/questions.service.js';

@Injectable()
export class DocumentImportService {
  constructor(
    @InjectRepository(DocumentImportEntity)
    private importRepo: Repository<DocumentImportEntity>,
    private fileValidator: FileValidatorService,

    private validationService: ValidationService,
    private questionsService: QuestionsService,
  ) {}

  async processFile(file: Express.Multer.File, teacherId: string): Promise<DocumentImportEntity> {
    this.fileValidator.validate(file);

    let parsedQuestions: ParsedQuestion[] = [];
    const isPdf = file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';
    
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    try {
        const response = await fetch('http://localhost:8000/parse-document', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.text();
            throw new BadRequestException('Lỗi từ Python Parser: ' + err);
        }

        const data = await response.json() as any;
        if (data.status !== 'success') {
            throw new BadRequestException('Lỗi từ Python Parser');
        }
        
        parsedQuestions = data.data;
    } catch (error: any) {
        throw new BadRequestException('Không thể kết nối đến Python Parser: ' + error.message);
    }

    const { questions, summary } = this.validationService.validate(parsedQuestions);

    const importSession = this.importRepo.create({
       id: uuidv4(),
       originalFileName: file.originalname,
       fileType: isPdf ? 'PDF' : 'DOCX',
       status: DocumentImportStatus.PREVIEW,
       summary,
       rawData: questions,
       teacherId,
    });

    await this.importRepo.save(importSession);
    return importSession;
  }

  async getImportSession(id: string): Promise<DocumentImportEntity> {
    const session = await this.importRepo.findOne({ where: { id } });
    if (!session) throw new BadRequestException('Phiên import không tồn tại');
    return session;
  }

  async updateImportSession(id: string, updateData: any): Promise<DocumentImportEntity> {
    const session = await this.getImportSession(id);
    if (session.status !== DocumentImportStatus.PREVIEW) {
       throw new BadRequestException('Chỉ có thể sửa khi đang ở trạng thái PREVIEW');
    }
    
    if (updateData.questions) {
      const questions = updateData.questions as ParsedQuestion[];
      const { questions: validatedQuestions, summary } = this.validationService.validate(questions);
      
      session.rawData = validatedQuestions;
      session.summary = summary;
    }
    
    await this.importRepo.save(session);
    return session;
  }

  async confirmImport(id: string, quizId?: string): Promise<any> {
    const session = await this.getImportSession(id);
    if (session.status !== DocumentImportStatus.PREVIEW) {
       throw new BadRequestException('Chỉ có thể confirm khi đang ở trạng thái PREVIEW');
    }

    const questions: ParsedQuestion[] = session.rawData;
    let savedCount = 0;
    
    for (const q of questions) {
       if ((q as any).status === 'ERROR') continue; // Skip error questions
       
       const correctCount = q.options.filter(o => o.isCorrect).length;
       const qData = {
          content: q.content,
          type: correctCount > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          score: 2,
          options: q.options.map(o => ({
            text: o.text || o.label, // Fallback to label if text is empty
            isCorrect: o.isCorrect
          }))
       };
       
       if (quizId) {
         await this.questionsService.createQuestion(quizId, qData as any, session.teacherId);
       } else {
         await this.questionsService.saveToBank(session.teacherId, qData as any);
       }
       savedCount++;
    }

    session.status = DocumentImportStatus.CONFIRMED;
    session.confirmedAt = new Date();
    await this.importRepo.save(session);

    return {
      message: 'Import thành công',
      savedCount,
      skippedCount: questions.length - savedCount
    };
  }
}

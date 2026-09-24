import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentImportEntity } from '../../entities/document-import.entity.js';
import { DocumentImportController } from './document-import.controller.js';
import { DocumentImportService } from './document-import.service.js';
import { FileValidatorService } from './services/file-validator.service.js';
import { OptionParserService } from './services/option-parser.service.js';
import { AnswerParserService } from './services/answer-parser.service.js';
import { PdfOcrService } from './services/pdf-ocr.service.js';
import { ValidationService } from './services/validation.service.js';
import { QuestionsModule } from '../questions/questions.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentImportEntity]),
    QuestionsModule
  ],
  controllers: [DocumentImportController],
  providers: [
    DocumentImportService,
    FileValidatorService,
    PdfOcrService,
    OptionParserService,
    AnswerParserService,
    ValidationService
  ],
})
export class DocumentImportModule {}

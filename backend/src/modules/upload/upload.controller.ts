import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { parseDocx } from './parsers/docx.parser.js';
import { parsePdf } from './parsers/pdf.parser.js';
import { parseQuestions } from './parsers/question.parser.js';
import path from 'path';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    const result = await this.uploadService.uploadFile(file, folder || 'quiz-master/khac');
    console.log(`[Upload] Tải ảnh lên thành công: ${result.secure_url || result.url}`);
    
    return createSuccessResponse({
      url: result.secure_url || result.url,
    }, 'Upload successful');
  }

  @Post('base64')
  async uploadBase64Controller(@Body() body: { image: string, folder?: string }) {
    if (!body || !body.image) {
      throw new BadRequestException('No image provided');
    }
    
    const result = await this.uploadService.uploadBase64(body.image, body.folder || 'quiz-master/khac');
    console.log(`[Upload] Tải ảnh lên thành công (base64): ${result.secure_url || result.url}`);
    
    return createSuccessResponse({
      url: result.secure_url || result.url,
    }, 'Upload successful');
  }

  @Post('parse-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for docs
      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf',
        ];
        if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(docx|pdf)$/i)) {
          return callback(new BadRequestException('Only .docx or .pdf files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async parseDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const ext = path.extname(file.originalname).toLowerCase();
      let lines: any[];

      if (ext === '.pdf') {
        lines = await parsePdf(file.buffer);
      } else if (ext === '.docx') {
        lines = await parseDocx(file.buffer);
      } else {
        throw new BadRequestException('Chỉ hỗ trợ file .docx hoặc .pdf');
      }

      const questions = parseQuestions(lines);
      console.log(`[ParseDocument] Parsed ${questions.length} questions from ${file.originalname}`);

      return createSuccessResponse(questions, 'Parsed successfully');
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('[ParseDocument] Error:', error);
      throw new BadRequestException('Lỗi khi phân tích file: ' + error.message);
    }
  }
}


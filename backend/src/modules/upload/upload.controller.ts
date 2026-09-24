import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    const result = await this.uploadService.uploadFile(file);
    console.log(`[Upload] Tải ảnh lên thành công: ${result.secure_url || result.url}`);
    
    return createSuccessResponse({
      url: result.secure_url || result.url,
    }, 'Upload successful');
  }

  @Post('base64')
  async uploadBase64Controller(@Body() body: { image: string }) {
    if (!body || !body.image) {
      throw new BadRequestException('No image provided');
    }
    
    const result = await this.uploadService.uploadBase64(body.image);
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

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    try {
      const pythonUrl = (process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await fetch(`${pythonUrl}/parse-document`, {
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
      
      return createSuccessResponse(data.data, 'Parsed successfully');
    } catch (error: any) {
      throw new BadRequestException('Không thể kết nối đến Python Parser: ' + error.message);
    }
  }
}

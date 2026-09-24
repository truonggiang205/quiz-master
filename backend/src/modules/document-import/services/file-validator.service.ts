import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidatorService {
  validate(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('File không hợp lệ hoặc rỗng');
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new BadRequestException('File vượt quá dung lượng cho phép (20MB).');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Allow octet-stream and some generic ms-word if extension matches, as sometimes uploads have weird mimetypes
    ];

    if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.docx') && !file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Chỉ hỗ trợ file DOCX và PDF.');
    }

    if (file.originalname.toLowerCase().endsWith('.doc')) {
      throw new BadRequestException('Chỉ hỗ trợ file DOCX và PDF. Định dạng .doc cũ không được hỗ trợ.');
    }
  }
}

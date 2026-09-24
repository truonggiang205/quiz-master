import { Controller, Post, Get, Put, Param, Body, UseInterceptors, UploadedFile, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentImportService } from './document-import.service.js';

@Controller('document-import')
export class DocumentImportController {
  constructor(private readonly importService: DocumentImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Headers('x-user-id') teacherId: string) {
    const session = await this.importService.processFile(file, teacherId);
    return {
      status: 'success',
      data: session
    };
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    const session = await this.importService.getImportSession(id);
    return {
      status: 'success',
      data: session
    };
  }

  @Put(':id')
  async updateSession(@Param('id') id: string, @Body() updateData: any) {
    const session = await this.importService.updateImportSession(id, updateData);
    return {
      status: 'success',
      data: session
    };
  }

  @Post(':id/confirm')
  async confirmImport(@Param('id') id: string, @Body('quizId') quizId?: string) {
    const result = await this.importService.confirmImport(id, quizId);
    return {
      status: 'success',
      data: result
    };
  }
}

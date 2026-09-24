import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [AuthModule, PassportModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}

import {
  Controller,
  Get,
  Patch,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminSettingsService, SystemSettings } from './admin-settings.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  private checkAdmin(roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình hệ thống (Admin)' })
  getSettings(@Headers('x-user-role') roleHeader?: string) {
    this.checkAdmin(roleHeader);
    const data = this.settingsService.getSettings();
    return createSuccessResponse(data);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống (Admin)' })
  updateSettings(
    @Body() updates: Partial<SystemSettings>,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    this.checkAdmin(roleHeader);
    const data = this.settingsService.updateSettings(updates);
    return createSuccessResponse(data, 'Cập nhật cấu hình thành công');
  }
}

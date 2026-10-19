import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Body,
  Headers,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminSettingsService, SystemSettings } from './admin-settings.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  private checkAdmin(user?: any) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình hệ thống (Admin)' })
  getSettings(
    @CurrentUser() user: any,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const data = this.settingsService.getSettings();
    return createSuccessResponse(data);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống (Admin)' })
  updateSettings(
    @CurrentUser() user: any,
    @Body() updates: Partial<SystemSettings>,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const data = this.settingsService.updateSettings(updates);
    return createSuccessResponse(data, 'Cập nhật cấu hình thành công');
  }
}

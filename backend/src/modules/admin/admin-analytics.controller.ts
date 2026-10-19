import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Headers,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  private checkAdmin(user?: any) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy số liệu thống kê Dashboard (Admin)' })
  async getDashboardAnalytics(
    @CurrentUser() user: any,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const data = await this.analyticsService.getDashboardAnalytics();
    return createSuccessResponse(data);
  }
}

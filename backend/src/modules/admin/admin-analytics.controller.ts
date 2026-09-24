import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Analytics')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  private checkAdmin(roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy số liệu thống kê Dashboard (Admin)' })
  async getDashboardAnalytics(@Headers('x-user-role') roleHeader?: string) {
    this.checkAdmin(roleHeader);
    const data = await this.analyticsService.getDashboardAnalytics();
    return createSuccessResponse(data);
  }
}

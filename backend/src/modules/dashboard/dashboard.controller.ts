import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('teacher')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Teacher Dashboard' })
  async getTeacherDashboard(@Headers('x-user-id') userId?: string) {
    if (!userId) throw new UnauthorizedException('Không tìm thấy thông tin giáo viên');
    const data = await this.dashboardService.getTeacherDashboard(userId);
    return createSuccessResponse(data);
  }

  @Get('student')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Student Dashboard' })
  async getStudentDashboard(
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    if (!userId) throw new UnauthorizedException('Không tìm thấy thông tin học sinh');
    const studentId = userId;
    const data = await this.dashboardService.getStudentDashboard(studentId);
    return createSuccessResponse(data);
  }
}

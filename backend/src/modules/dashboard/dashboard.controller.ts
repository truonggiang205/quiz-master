import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Controller, Get, Headers, UnauthorizedException , UseGuards} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Dashboard')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('teacher')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Teacher Dashboard' })
  async getTeacherDashboard(@CurrentUser() user: any) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin giáo viên');
    const data = await this.dashboardService.getTeacherDashboard(user.id);
    return createSuccessResponse(data);
  }

  @Get('student')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Student Dashboard' })
  async getStudentDashboard(@CurrentUser() user: any) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin học sinh');
    const studentId = user.id;
    const data = await this.dashboardService.getStudentDashboard(studentId);
    return createSuccessResponse(data);
  }
}

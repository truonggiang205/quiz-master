import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Controller, Get, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import {
  TeacherDashboardQueryDto,
  TeacherSubmissionsQueryDto,
  TeacherStudentsQueryDto,
} from './dto/teacher-dashboard-query.dto.js';
import { StudentDashboardQueryDto } from './dto/student-dashboard-query.dto.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('teacher')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Teacher Dashboard kèm bộ lọc và xu hướng nộp bài' })
  async getTeacherDashboard(
    @CurrentUser() user: any,
    @Query() query: TeacherDashboardQueryDto,
  ) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin giáo viên');
    const data = await this.dashboardService.getTeacherDashboard(user.id, query);
    return createSuccessResponse(data);
  }

  @Get('teacher/submissions')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Danh sách bài nộp có phân trang phục vụ click biểu đồ/thẻ KPI' })
  async getTeacherSubmissions(
    @CurrentUser() user: any,
    @Query() query: TeacherSubmissionsQueryDto,
  ) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin giáo viên');
    const data = await this.dashboardService.getTeacherSubmissions(user.id, query);
    return createSuccessResponse(data);
  }

  @Get('teacher/students')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Danh sách học sinh kèm số bài nộp và điểm TB của giáo viên' })
  async getTeacherStudents(
    @CurrentUser() user: any,
    @Query() query: TeacherStudentsQueryDto,
  ) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin giáo viên');
    const data = await this.dashboardService.getTeacherStudents(user.id, query);
    return createSuccessResponse(data);
  }

  @Get('student')
  @Roles('STUDENT', 'ADMIN')
  @ApiOperation({ summary: 'Thống kê tổng quan cho Student Dashboard' })
  async getStudentDashboard(
    @CurrentUser() user: any,
    @Query() query: StudentDashboardQueryDto,
  ) {
    if (!user || !user.id) throw new UnauthorizedException('Không tìm thấy thông tin học sinh');
    const data = await this.dashboardService.getStudentDashboard(user.id, query);
    return createSuccessResponse(data);
  }
}

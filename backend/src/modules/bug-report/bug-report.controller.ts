import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BugReportService } from './bug-report.service.js';
import { CreateBugReportDto, UpdateBugReportStatusDto } from './bug-report.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Bug Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class BugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo báo cáo lỗi (Student/Teacher)' })
  async createReport(@CurrentUser() user: any, @Body() dto: CreateBugReportDto) {
    const data = await this.bugReportService.create(user.id, dto);
    return createSuccessResponse(data, 'Đã gửi báo cáo thành công');
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả báo cáo lỗi (Admin)' })
  async getAllReports(@Headers('x-user-role') roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
    const data = await this.bugReportService.getAllReports();
    return createSuccessResponse(data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái báo cáo (Admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBugReportStatusDto,
    @Headers('x-user-role') roleHeader?: string
  ) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
    const data = await this.bugReportService.updateStatus(id, dto);
    return createSuccessResponse(data, 'Cập nhật trạng thái thành công');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa báo cáo lỗi (Admin)' })
  async deleteReport(@Param('id') id: string, @Headers('x-user-role') roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
    const data = await this.bugReportService.deleteReport(id);
    return createSuccessResponse(data, 'Xóa báo cáo thành công');
  }
}

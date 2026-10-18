import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ScheduleService } from '../services/schedule.service.js';
import { CreateLessonDto, UpdateLessonDto } from '../dto/schedule.dto.js';
import { createSuccessResponse } from '../../../common/dto/api-response.dto.js';

@ApiTags('Teacher Schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('teacher/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lịch dạy của giáo viên' })
  async getLessons(
    @CurrentUser() user: any,
    @Query('classId') classId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.scheduleService.getLessons(user.id, {
      classId,
      startDate,
      endDate,
      month,
      status,
    });
    return createSuccessResponse(data);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo buổi học mới (đơn lẻ hoặc lặp lại)' })
  async createLesson(@CurrentUser() user: any, @Body() dto: CreateLessonDto) {
    const data = await this.scheduleService.createLesson(user.id, dto);
    return createSuccessResponse(data, 'Tạo lịch dạy thành công');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết buổi học' })
  async getLessonDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.scheduleService.getLessonById(user.id, id);
    return createSuccessResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin buổi học' })
  async updateLesson(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const data = await this.scheduleService.updateLesson(user.id, id, dto);
    return createSuccessResponse(data, 'Cập nhật buổi học thành công');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa buổi học' })
  async deleteLesson(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.scheduleService.deleteLesson(user.id, id);
    return createSuccessResponse(data, 'Đã xóa buổi học');
  }
}

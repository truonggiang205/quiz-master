import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { LearningLogsService } from '../services/learning-logs.service.js';
import {
  CreateLearningLogDto,
  UpdateLearningLogDto,
  BulkSaveLogsDto,
} from '../dto/learning-log.dto.js';
import { createSuccessResponse } from '../../../common/dto/api-response.dto.js';
import type { Response } from 'express';

@ApiTags('Teacher Learning Logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('teacher/learning-logs')
export class LearningLogsController {
  constructor(private readonly logsService: LearningLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhật ký học tập kèm bộ lọc' })
  async getLogs(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.logsService.getLogs(user.id, {
      month,
      classId,
      studentId,
      lessonId,
      search,
    });
    return createSuccessResponse(data);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo hoặc cập nhật nhật ký cho một học sinh trong buổi học' })
  async createLog(@CurrentUser() user: any, @Body() dto: CreateLearningLogDto) {
    const data = await this.logsService.createOrUpdateLog(user.id, dto);
    return createSuccessResponse(data, 'Lưu nhật ký học tập thành công');
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Lưu nhiều nhật ký học tập cùng lúc' })
  async bulkSaveLogs(@CurrentUser() user: any, @Body() dto: BulkSaveLogsDto) {
    const data = await this.logsService.bulkSaveLogs(user.id, dto);
    return createSuccessResponse(data, 'Lưu danh sách nhật ký thành công');
  }

  @Get('export')
  @ApiOperation({ summary: 'Xuất nhật ký học tập ra file Excel' })
  async exportLogs(
    @CurrentUser() user: any,
    @Query('month') month: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('studentId') studentId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.logsService.exportLogsToExcel(user.id, {
      month,
      classId,
      studentId,
    });

    const filename = `NhatKyHocTap_${month || 'All'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(buffer);
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập nhật ký học tập từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importLogs(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file Excel hợp lệ');
    }

    const result = await this.logsService.importLogsFromExcel(user.id, file.buffer);
    return createSuccessResponse(result, `Nhập thành công ${result.successCount} nhật ký`);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết nhật ký học tập' })
  async getLogDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.logsService.getLogById(user.id, id);
    return createSuccessResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhật ký học tập' })
  async updateLog(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLearningLogDto,
  ) {
    const data = await this.logsService.updateLog(user.id, id, dto);
    return createSuccessResponse(data, 'Cập nhật nhật ký thành công');
  }
}

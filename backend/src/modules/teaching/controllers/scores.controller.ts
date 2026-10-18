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
import { ScoresService } from '../services/scores.service.js';
import { CreateScoreDto, UpdateScoreDto } from '../dto/score.dto.js';
import { createSuccessResponse } from '../../../common/dto/api-response.dto.js';
import type { AssessmentType } from '../entities/score-record.entity.js';
import type { Response } from 'express';

@ApiTags('Teacher Scores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('teacher/scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách điểm số với bộ lọc' })
  async getScores(
    @CurrentUser() user: any,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('assessmentType') assessmentType?: AssessmentType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.scoresService.getScores(user.id, {
      classId,
      studentId,
      lessonId,
      assessmentType,
      startDate,
      endDate,
    });
    return createSuccessResponse(data);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Lấy bảng điểm ma trận theo lớp học kèm điểm trung bình' })
  async getClassScoreMatrix(
    @CurrentUser() user: any,
    @Query('classId') classId: string,
  ) {
    if (!classId) {
      throw new BadRequestException('Vui lòng cung cấp classId');
    }
    const data = await this.scoresService.getClassScoreMatrix(user.id, classId);
    return createSuccessResponse(data);
  }

  @Post()
  @ApiOperation({ summary: 'Nhập điểm số cho học sinh (trong hoặc ngoài buổi học)' })
  async createScore(@CurrentUser() user: any, @Body() dto: CreateScoreDto) {
    const data = await this.scoresService.createScore(user.id, dto);
    return createSuccessResponse(data, 'Nhập điểm thành công');
  }

  @Get('export')
  @ApiOperation({ summary: 'Xuất bảng điểm ra file Excel' })
  async exportScores(
    @CurrentUser() user: any,
    @Query('classId') classId: string | undefined,
    @Query('studentId') studentId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.scoresService.exportScoresToExcel(user.id, {
      classId,
      studentId,
    });

    const filename = `BangDiem_${classId || 'All'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(buffer);
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập điểm số từ file Excel vào lớp' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importScores(
    @CurrentUser() user: any,
    @Query('classId') classId: string,
    @UploadedFile() file: any,
  ) {
    if (!classId) {
      throw new BadRequestException('Vui lòng chọn lớp học để nhập điểm');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file Excel hợp lệ');
    }

    const result = await this.scoresService.importScoresFromExcel(
      user.id,
      classId,
      file.buffer,
    );
    return createSuccessResponse(result, `Nhập thành công ${result.successCount} đầu điểm`);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một bản ghi điểm' })
  async getScoreDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.scoresService.getScoreById(user.id, id);
    return createSuccessResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật điểm số' })
  async updateScore(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateScoreDto,
  ) {
    const data = await this.scoresService.updateScore(user.id, id, dto);
    return createSuccessResponse(data, 'Cập nhật điểm thành công');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa điểm số' })
  async deleteScore(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.scoresService.deleteScore(user.id, id);
    return createSuccessResponse(data, 'Đã xóa điểm');
  }
}

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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { TuitionService } from '../services/tuition.service.js';
import {
  CreateTuitionAdjustmentDto,
  RecordPaymentDto,
  BulkTuitionAdjustmentDto,
  BulkPaymentDto,
  UpdateTuitionStatusDto,
} from '../dto/tuition.dto.js';
import { createSuccessResponse } from '../../../common/dto/api-response.dto.js';
import type { TuitionStatus } from '../entities/tuition-item.entity.js';
import type { Response } from 'express';

@ApiTags('Teacher Tuition')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('teacher/tuition')
export class TuitionController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy bảng tổng hợp học phí theo tháng và lớp' })
  async getTuitionList(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: TuitionStatus,
  ) {
    const data = await this.tuitionService.getTuitionList(user.id, {
      month,
      classId,
      studentId,
      status,
    });
    return createSuccessResponse(data);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Lấy xu hướng biến động học phí thực tế qua các tháng' })
  async getTuitionTrend(
    @CurrentUser() user: any,
    @Query('month') month?: string,
  ) {
    const data = await this.tuitionService.getTuitionTrend(
      user.id,
      month || new Date().toISOString().substring(0, 7),
    );
    return createSuccessResponse(data);
  }

  @Get('export')
  @ApiOperation({ summary: 'Xuất danh sách học phí ra file Excel' })
  async exportTuition(
    @CurrentUser() user: any,
    @Query('month') month: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('status') status: TuitionStatus | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.tuitionService.exportTuitionToExcel(user.id, {
      month,
      classId,
      status,
    });

    const filename = `HocPhi_${month || 'All'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(buffer);
  }

  @Post('bulk-adjustment')
  @ApiOperation({ summary: 'Thêm phụ thu hoặc giảm trừ cho nhiều học sinh cùng lúc' })
  async bulkAdjustment(
    @CurrentUser() user: any,
    @Body() dto: BulkTuitionAdjustmentDto,
  ) {
    const data = await this.tuitionService.bulkAdjustment(user.id, dto);
    return createSuccessResponse(data, 'Thêm điều chỉnh hàng loạt thành công');
  }

  @Post('bulk-payment')
  @ApiOperation({ summary: 'Ghi nhận thanh toán hàng loạt' })
  async bulkPayment(
    @CurrentUser() user: any,
    @Body() dto: BulkPaymentDto,
  ) {
    const data = await this.tuitionService.bulkPayment(user.id, dto);
    return createSuccessResponse(data, 'Ghi nhận thanh toán hàng loạt thành công');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết học phí gồm phụ thu/giảm trừ và lịch sử thanh toán' })
  async getTuitionDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.tuitionService.getTuitionDetail(user.id, id);
    return createSuccessResponse(data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật nhanh trạng thái học phí' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTuitionStatusDto,
  ) {
    const data = await this.tuitionService.updateStatus(user.id, id, dto.status);
    return createSuccessResponse(data, 'Cập nhật trạng thái thành công');
  }

  @Delete('adjustments/:adjustmentId')
  @ApiOperation({ summary: 'Xóa khoản điều chỉnh học phí' })
  async deleteAdjustment(
    @CurrentUser() user: any,
    @Param('adjustmentId') adjustmentId: string,
  ) {
    const data = await this.tuitionService.deleteAdjustment(user.id, adjustmentId);
    return createSuccessResponse(data, 'Xóa khoản điều chỉnh thành công');
  }

  @Post(':id/adjustment')
  @ApiOperation({ summary: 'Thêm phụ thu hoặc giảm trừ học phí' })
  async addAdjustment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateTuitionAdjustmentDto,
  ) {
    const data = await this.tuitionService.addAdjustment(user.id, id, dto);
    return createSuccessResponse(data, 'Thêm điều chỉnh học phí thành công');
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Ghi nhận thanh toán học phí của học sinh' })
  async recordPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    const data = await this.tuitionService.recordPayment(user.id, id, dto);
    return createSuccessResponse(data, 'Ghi nhận thanh toán thành công');
  }

  @Post('payments/:paymentId/refund')
  @ApiOperation({ summary: 'Hoàn tiền hoặc hủy giao dịch thanh toán (Bảo lưu audit trail)' })
  async refundPayment(
    @CurrentUser() user: any,
    @Param('paymentId') paymentId: string,
    @Body('reason') reason?: string,
    @Body('refundAmount') refundAmount?: number,
  ) {
    const data = await this.tuitionService.refundPayment(
      user.id,
      paymentId,
      reason,
      refundAmount ? Number(refundAmount) : undefined,
    );
    return createSuccessResponse(data, 'Hoàn tiền giao dịch thành công');
  }
}


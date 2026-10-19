import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  private checkAdmin(user?: any) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Admin)' })
  async getUsers(
    @CurrentUser() user: any,
    @Headers('x-user-role') _roleHeader?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(user);
    const users = await this.adminUsersService.getUsers(role, search);
    return createSuccessResponse(users);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Khóa/mở khóa tài khoản (Admin)' })
  async toggleUserStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const updated = await this.adminUsersService.toggleUserStatus(id);
    return createSuccessResponse(updated, 'Cập nhật trạng thái thành công');
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản (Admin)' })
  async resetUserPassword(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('newPassword') newPassword?: string,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const result = await this.adminUsersService.resetUserPassword(id, newPassword);
    return createSuccessResponse(result, 'Đặt lại mật khẩu thành công');
  }
}

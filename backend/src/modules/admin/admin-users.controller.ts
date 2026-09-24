import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Users')
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  private checkAdmin(roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Admin)' })
  async getUsers(
    @Headers('x-user-role') roleHeader?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(roleHeader);
    const users = await this.adminUsersService.getUsers(role, search);
    return createSuccessResponse(users);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Khóa/mở khóa tài khoản (Admin)' })
  async toggleUserStatus(
    @Param('id') id: string,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    this.checkAdmin(roleHeader);
    const user = await this.adminUsersService.toggleUserStatus(id);
    return createSuccessResponse(user, 'Cập nhật trạng thái thành công');
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản (Admin)' })
  async resetUserPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword?: string,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    this.checkAdmin(roleHeader);
    const result = await this.adminUsersService.resetUserPassword(id, newPassword);
    return createSuccessResponse(result, 'Đặt lại mật khẩu thành công');
  }
}

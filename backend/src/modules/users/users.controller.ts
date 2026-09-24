import { Controller, Get, Body, Patch, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin profile user hiện tại' })
  async getMyProfile(@CurrentUser() user: any) {
    if (!user.id) throw new UnauthorizedException('Không tìm thấy thông tin xác thực');
    const userProfile = await this.usersService.findById(user.id);
    return createSuccessResponse(userProfile);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật profile user hiện tại' })
  async updateMyProfile(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    if (!user.id) throw new UnauthorizedException('Không tìm thấy thông tin xác thực');
    const updated = await this.usersService.updateProfile(user.id, dto);
    return createSuccessResponse(updated, 'Cập nhật thông tin thành công');
  }
}

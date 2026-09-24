import {
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserEntity } from '../../entities/user.entity.js';
import { NotificationTargetRole } from '../../entities/notification.entity.js';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của người dùng' })
  async getMyNotifications(@CurrentUser() user: UserEntity) {
    const data = await this.notificationsService.getUserNotifications(user.id, user.role);
    return createSuccessResponse(data);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  async markAsRead(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    const data = await this.notificationsService.markAsRead(user.id, id);
    return createSuccessResponse(data);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  async markAllAsRead(@CurrentUser() user: UserEntity) {
    const data = await this.notificationsService.markAllAsRead(user.id, user.role);
    return createSuccessResponse(data);
  }

  // Admin Broadcast API (Protected by role check)
  @Post('broadcast')
  @ApiOperation({ summary: 'Phát thông báo chung (Admin)' })
  async broadcastNotification(
    @CurrentUser() user: UserEntity,
    @Body() dto: { title: string; message: string; targetRole: NotificationTargetRole }
  ) {
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Chỉ Admin mới có quyền phát thông báo chung');
    }
    const data = await this.notificationsService.broadcastGeneralNotification(
      dto.title,
      dto.message,
      dto.targetRole
    );
    return createSuccessResponse(data, 'Phát thông báo thành công');
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppealsService } from './appeals.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserEntity } from '../../entities/user.entity.js';
import { AppealStatus } from '../../entities/appeal.entity.js';

@ApiTags('Appeals')
@Controller('appeals')
@ApiBearerAuth()
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phúc khảo của tôi' })
  async getMyAppeals(@CurrentUser() user: UserEntity) {
    const data = await this.appealsService.getMyAppeals(user.id, user.role);
    return createSuccessResponse(data);
  }

  @Post('submissions/:submissionId')
  @ApiOperation({ summary: 'Gửi yêu cầu phúc khảo (Học sinh)' })
  async createAppeal(
    @CurrentUser() user: UserEntity,
    @Param('submissionId') submissionId: string,
    @Body('reason') reason: string,
  ) {
    if (user.role !== 'STUDENT') {
      throw new UnauthorizedException('Chỉ học sinh mới có quyền gửi phúc khảo');
    }
    const data = await this.appealsService.createAppeal(user.id, submissionId, reason);
    return createSuccessResponse(data, 'Đã gửi yêu cầu phúc khảo thành công');
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'Xử lý phúc khảo (Giáo viên)' })
  async replyAppeal(
    @CurrentUser() user: UserEntity,
    @Param('id') appealId: string,
    @Body() dto: { status: AppealStatus; reply: string },
  ) {
    if (user.role !== 'TEACHER') {
      throw new UnauthorizedException('Chỉ giáo viên mới có quyền xử lý phúc khảo');
    }
    const data = await this.appealsService.replyAppeal(user.id, appealId, dto.status, dto.reply);
    return createSuccessResponse(data, 'Đã phản hồi phúc khảo');
  }
}

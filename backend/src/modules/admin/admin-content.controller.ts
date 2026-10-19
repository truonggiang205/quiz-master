import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Headers,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminContentService } from './admin-content.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  private checkAdmin(user?: any) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'Lấy danh sách tất cả bài thi (Admin)' })
  async getAllQuizzes(
    @CurrentUser() user: any,
    @Headers('x-user-role') _roleHeader?: string,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(user);
    const data = await this.contentService.getAllQuizzes(search);
    return createSuccessResponse(data);
  }

  @Delete('quizzes/:id')
  @ApiOperation({ summary: 'Xóa bài thi cưỡng chế (Admin)' })
  async deleteQuiz(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Headers('x-user-role') _roleHeader?: string,
  ) {
    this.checkAdmin(user);
    const data = await this.contentService.deleteQuiz(id);
    return createSuccessResponse(data, 'Xóa bài thi thành công');
  }
}

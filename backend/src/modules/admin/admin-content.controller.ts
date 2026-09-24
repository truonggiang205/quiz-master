import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminContentService } from './admin-content.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Admin Content')
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  private checkAdmin(roleHeader?: string) {
    if (roleHeader !== 'ADMIN') {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'Lấy danh sách tất cả bài thi (Admin)' })
  async getAllQuizzes(
    @Headers('x-user-role') roleHeader?: string,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(roleHeader);
    const data = await this.contentService.getAllQuizzes(search);
    return createSuccessResponse(data);
  }

  @Delete('quizzes/:id')
  @ApiOperation({ summary: 'Xóa bài thi cưỡng chế (Admin)' })
  async deleteQuiz(
    @Param('id') id: string,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    this.checkAdmin(roleHeader);
    const data = await this.contentService.deleteQuiz(id);
    return createSuccessResponse(data, 'Xóa bài thi thành công');
  }
}

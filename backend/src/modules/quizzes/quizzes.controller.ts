import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài kiểm tra' })
  async getAllQuizzes(@CurrentUser() user: any) {
    const quizzes = await this.quizzesService.getAllQuizzes(user.role, user.id);
    return createSuccessResponse(quizzes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một bài kiểm tra' })
  async getQuizById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const quiz = await this.quizzesService.getQuizById(id, user.role);
    return createSuccessResponse(quiz);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Tạo bài kiểm tra mới (Teacher)' })
  async createQuiz(
    @Body() dto: CreateQuizDto,
    @CurrentUser() user: any,
  ) {
    const teacher = {
      id: user.id,
      name: user.name || 'Giáo viên',
    };
    const created = await this.quizzesService.createQuiz(dto, teacher);
    return createSuccessResponse(created, 'Tạo bài kiểm tra thành công');
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Cập nhật bài kiểm tra (Teacher)' })
  async updateQuiz(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    const updated = await this.quizzesService.updateQuiz(id, dto);
    return createSuccessResponse(updated, 'Cập nhật bài kiểm tra thành công');
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Xóa bài kiểm tra (Teacher)' })
  async deleteQuiz(@Param('id') id: string) {
    const res = await this.quizzesService.deleteQuiz(id);
    return createSuccessResponse(res, 'Xóa bài kiểm tra thành công');
  }

  @Post(':id/publish')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Xuất bản bài kiểm tra (Teacher)' })
  async publishQuiz(@Param('id') id: string) {
    const updated = await this.quizzesService.publishQuiz(id);
    return createSuccessResponse(updated, 'Xuất bản bài kiểm tra thành công');
  }

  @Post(':id/unpublish')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Gỡ bài kiểm tra về trạng thái bản thảo (Teacher)' })
  async unpublishQuiz(@Param('id') id: string) {
    const updated = await this.quizzesService.unpublishQuiz(id);
    return createSuccessResponse(updated, 'Đã chuyển bài kiểm tra về bản thảo');
  }
}

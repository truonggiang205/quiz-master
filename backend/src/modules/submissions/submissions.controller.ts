import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Submissions')
@Controller()
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('quizzes/:quizId/start')
  @ApiOperation({ summary: 'Học sinh bắt đầu làm bài kiểm tra' })
  async startQuiz(
    @Param('quizId') quizId: string,
    @CurrentUser() user: any,
  ) {
    const student = {
      id: user.id,
      name: user.name || 'Học sinh',
    };
    const res = await this.submissionsService.startQuiz(quizId, student);
    return createSuccessResponse(res, 'Bắt đầu làm bài thi');
  }

  @Post('quizzes/:quizId/submit')
  @ApiOperation({ summary: 'Nộp bài kiểm tra và tính điểm tự động' })
  async submitQuiz(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: any,
  ) {
    const student = {
      id: user.id,
      name: user.name || 'Học sinh',
      email: user.email,
      avatar: user.avatar,
    };
    const submission = await this.submissionsService.submitQuiz(quizId, dto, student);
    return createSuccessResponse(submission, 'Nộp bài thi thành công');
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Xem chi tiết kết quả bài nộp (có kiểm tra answer release)' })
  async getSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const res = await this.submissionsService.getSubmissionById(id, user.role, user.id);
    return createSuccessResponse(res);
  }

  @Get('quizzes/:quizId/results')
  @ApiOperation({ summary: 'Xem bảng kết quả và thống kê học sinh (Teacher)' })
  async getQuizResults(@Param('quizId') quizId: string) {
    const res = await this.submissionsService.getQuizResults(quizId);
    return createSuccessResponse(res);
  }

  @Get('student/submissions')
  @ApiOperation({ summary: 'Lấy lịch sử làm bài của học sinh' })
  async getMySubmissions(@CurrentUser() user: any) {
    const res = await this.submissionsService.getStudentSubmissions(user.id);
    return createSuccessResponse(res);
  }

  @Post('submissions/:id/grade')
  @ApiOperation({ summary: 'Chấm điểm tự luận cho học sinh' })
  async gradeSubmission(
    @Param('id') id: string,
    @Body() dto: { grades: { questionId: string; scoreAwarded: number }[] },
    @CurrentUser() user: any,
  ) {
    const res = await this.submissionsService.gradeSubmission(id, dto.grades, user.id);
    return createSuccessResponse(res, 'Chấm điểm thành công');
  }
}

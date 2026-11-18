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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@ApiTags('Submissions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('quizzes/:quizId/start')
  @Roles('STUDENT')
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
  @Roles('STUDENT')
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
  @Roles('TEACHER', 'ADMIN')
  async getQuizResults(@Param('quizId') quizId: string, @CurrentUser() user: any) {
    const res = await this.submissionsService.getQuizResults(quizId, user.role, user.id);
    return createSuccessResponse(res);
  }

  @Get('student/submissions')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy lịch sử làm bài của học sinh' })
  async getMySubmissions(@CurrentUser() user: any) {
    const res = await this.submissionsService.getStudentSubmissions(user.id);
    return createSuccessResponse(res);
  }

  @Post('submissions/:id/grade')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Chấm điểm tự luận cho học sinh' })
  async gradeSubmission(
    @Param('id') id: string,
    @Body() dto: { grades: { questionId: string; scoreAwarded: number }[] },
    @CurrentUser() user: any,
  ) {
    const res = await this.submissionsService.gradeSubmission(id, dto.grades, user.id);
    return createSuccessResponse(res, 'Chấm điểm thành công');
  }

  @Post('quizzes/:quizId/regrade-essays')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Tự động chấm lại toàn bộ câu hỏi tự luận theo đáp án của giáo viên' })
  async regradeEssays(@Param('quizId') quizId: string, @CurrentUser() user: any) {
    const res = await this.submissionsService.regradeQuizEssays(quizId, user.id, user.role);
    return createSuccessResponse(res, res.message);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuestionsService } from './questions.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { SyncQuestionsDiffDto } from './dto/sync-questions-diff.dto.js';
import { SaveFromExamDto } from './dto/save-from-exam.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Questions')
@Controller()
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('quizzes/:quizId/questions')
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi theo quizId' })
  async getQuestions(
    @Param('quizId') quizId: string,
    @Query('examMode') examMode?: string,
    @CurrentUser() user?: any,
  ) {
    const isExam = examMode === 'true';
    const questions = await this.questionsService.getQuestionsByQuizId(
      quizId,
      user?.role,
      isExam,
    );
    return createSuccessResponse(questions);
  }

  @Post('quizzes/:quizId/questions')
  @ApiOperation({ summary: 'Thêm câu hỏi mới vào bài kiểm tra (Teacher)' })
  async createQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const created = await this.questionsService.createQuestion(quizId, dto);
    return createSuccessResponse(created, 'Tạo câu hỏi thành công');
  }

  @Patch('questions/:id')
  @ApiOperation({ summary: 'Cập nhật câu hỏi (Teacher)' })
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const updated = await this.questionsService.updateQuestion(id, dto);
    return createSuccessResponse(updated, 'Cập nhật câu hỏi thành công');
  }

  @Patch('quizzes/:quizId/questions/:questionId')
  @Patch('exams/:quizId/questions/:questionId')
  @ApiOperation({ summary: 'Cập nhật 1 câu hỏi cụ thể trong bài kiểm tra (Teacher)' })
  async updateQuestionInQuiz(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const updated = await this.questionsService.updateQuestionInQuiz(quizId, questionId, dto);
    return createSuccessResponse(updated, 'Cập nhật câu hỏi thành công');
  }

  @Post('quizzes/:quizId/questions/sync')
  @ApiOperation({ summary: 'Đồng bộ câu hỏi theo diff trong 1 transaction duy nhất' })
  async syncQuestionsDiff(
    @Param('quizId') quizId: string,
    @Body() dto: SyncQuestionsDiffDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.questionsService.syncQuestionsDiff(quizId, dto, user?.id);
    return createSuccessResponse(result, 'Đồng bộ câu hỏi thành công');
  }

  @Patch('quizzes/:quizId/questions/bulk')
  @ApiOperation({ summary: 'Cập nhật hàng loạt câu hỏi (ví dụ: điểm số)' })
  async bulkUpdateQuestions(
    @Param('quizId') quizId: string,
    @Body() dto: { questions: { id: string; points?: number; isLocked?: boolean }[] }
  ) {
    const updated = await this.questionsService.bulkUpdateQuestions(quizId, dto.questions);
    return createSuccessResponse(updated, 'Cập nhật hàng loạt thành công');
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Xóa câu hỏi (Teacher)' })
  async deleteQuestion(@Param('id') id: string) {
    const res = await this.questionsService.deleteQuestion(id);
    return createSuccessResponse(res, 'Xóa câu hỏi thành công');
  }

  @Post('parse-docx')
  @ApiOperation({ summary: 'Trích xuất câu hỏi từ file DOCX' })
  @UseInterceptors(FileInterceptor('file'))
  async parseDocx(@UploadedFile() file: Express.Multer.File) {
    const questions = await this.questionsService.parseDocxQuestions(file.buffer);
    return createSuccessResponse(questions, 'Phân tích file thành công');
  }

  // Question Bank APIs
  @Get('questions/bank')
  @ApiOperation({ summary: 'Lấy ngân hàng câu hỏi của giáo viên' })
  async getQuestionBank(@CurrentUser() user: any) {
    const questions = await this.questionsService.getQuestionBank(user.id);
    return createSuccessResponse(questions);
  }

  @Post('questions/bank')
  @ApiOperation({ summary: 'Lưu câu hỏi vào ngân hàng' })
  async saveToBank(
    @CurrentUser() user: any,
    @Body() dto: CreateQuestionDto,
  ) {
    const created = await this.questionsService.saveToBank(user.id, dto);
    return createSuccessResponse(created, 'Lưu vào ngân hàng thành công');
  }

  @Post('questions/bank/from-exam')
  @Post('question-bank/from-exam')
  @ApiOperation({ summary: 'Sao chép câu hỏi từ bài kiểm tra vào ngân hàng câu hỏi' })
  async saveToBankFromExam(
    @CurrentUser() user: any,
    @Body() dto: SaveFromExamDto,
  ) {
    const result = await this.questionsService.saveToBankFromExam(user.id, dto);
    return createSuccessResponse(
      result,
      `Đã lưu ${result.savedCount} câu hỏi vào ngân hàng${result.duplicateCount > 0 ? ` (bỏ qua ${result.duplicateCount} câu trùng lặp)` : ''}`,
    );
  }

  @Post('quizzes/:quizId/import-bank')
  @ApiOperation({ summary: 'Nhập câu hỏi từ ngân hàng vào bài kiểm tra' })
  async importFromBank(
    @Param('quizId') quizId: string,
    @Body() dto: { questionIds: string[] },
  ) {
    const imported = await this.questionsService.importFromBank(quizId, dto.questionIds);
    return createSuccessResponse(imported, `Đã nhập ${imported.length} câu hỏi vào bài kiểm tra`);
  }
}

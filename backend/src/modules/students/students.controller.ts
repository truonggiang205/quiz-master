import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import {
  CreateExternalStudentDto,
  UpdateTeacherStudentDto,
  LinkAccountDto,
} from './dto/teacher-student.dto.js';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteDto {
  @IsEmail()
  email!: string;
}

export class AcceptInviteDto {
  @IsNotEmpty()
  teacherId!: string;
}

@ApiTags('Teacher Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['teacher/students', 'students'])
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả học sinh của giáo viên (cả External và Linked)' })
  async getTeacherStudents(@CurrentUser() user: any) {
    const result = await this.studentsService.getTeacherStudents(user.id);
    return createSuccessResponse(result);
  }

  @Get('my-students')
  @ApiOperation({ summary: 'API tương thích ngược: Lấy danh sách học sinh của giáo viên' })
  async getMyStudents(@CurrentUser() user: any) {
    const result = await this.studentsService.getTeacherStudents(user.id);
    return createSuccessResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ học sinh và tổng hợp lịch sử (Lịch dạy, Điểm danh, Điểm số, Học phí)' })
  async getStudentDetail(@CurrentUser() user: any, @Param('id') studentId: string) {
    const result = await this.studentsService.getStudentDetail(user.id, studentId);
    return createSuccessResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Giáo viên tạo học sinh ngoài hệ thống (External Student)' })
  async createExternalStudent(
    @CurrentUser() user: any,
    @Body() dto: CreateExternalStudentDto,
  ) {
    const result = await this.studentsService.createExternalStudent(user.id, dto);
    return createSuccessResponse(result, 'Tạo học sinh ngoài hệ thống thành công');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ học sinh' })
  async updateStudent(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
    @Body() dto: UpdateTeacherStudentDto,
  ) {
    const result = await this.studentsService.updateStudent(user.id, studentId, dto);
    return createSuccessResponse(result, 'Cập nhật thông tin học sinh thành công');
  }

  @Delete(':studentId')
  @ApiOperation({ summary: 'Giáo viên xóa học sinh khỏi danh bạ' })
  async deleteStudent(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.studentsService.deleteStudent(user.id, studentId);
    return createSuccessResponse(result);
  }

  @Post(':id/link-account')
  @ApiOperation({ summary: 'Liên kết hồ sơ học sinh với tài khoản QuizMaster' })
  async linkAccount(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
    @Body() dto: LinkAccountDto,
  ) {
    const result = await this.studentsService.linkAccount(user.id, studentId, dto);
    return createSuccessResponse(result, result.message);
  }

  @Post(':id/unlink-account')
  @ApiOperation({ summary: 'Hủy liên kết tài khoản QuizMaster khỏi hồ sơ học sinh' })
  async unlinkAccount(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
  ) {
    const result = await this.studentsService.unlinkAccount(user.id, studentId);
    return createSuccessResponse(result, result.message);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Giáo viên mời học sinh có tài khoản qua thông báo hệ thống' })
  async inviteStudent(
    @CurrentUser() user: any,
    @Body() dto: InviteDto,
  ) {
    const result = await this.studentsService.inviteStudentByEmail(user.id, dto.email);
    return createSuccessResponse(result);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Học sinh chấp nhận lời mời học' })
  async acceptInvite(
    @CurrentUser() user: any,
    @Body() dto: AcceptInviteDto,
  ) {
    const result = await this.studentsService.acceptInvite(user.id, dto.teacherId);
    return createSuccessResponse(result);
  }
}

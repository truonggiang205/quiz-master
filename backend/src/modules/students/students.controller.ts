import { Controller, Post, Get, Body, Param, Headers, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StudentsService } from './students.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteDto {
  @IsEmail()
  email!: string;
}

export class AcceptInviteDto {
  @IsNotEmpty()
  teacherId!: string;
}

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('my-students')
  @ApiOperation({ summary: 'Giáo viên lấy danh sách học sinh của mình' })
  async getMyStudents(@Headers('x-user-id') teacherId: string) {
    const result = await this.studentsService.getMyStudents(teacherId);
    return createSuccessResponse(result);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Giáo viên mời học sinh qua email' })
  async inviteStudent(
    @Headers('x-user-id') teacherId: string,
    @Body() dto: InviteDto,
  ) {
    // Should get from config, hardcoding for simplicity
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const result = await this.studentsService.inviteStudentByEmail(teacherId, dto.email, frontendUrl);
    return createSuccessResponse(result);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Học sinh chấp nhận lời mời' })
  async acceptInvite(
    @Headers('x-user-id') studentId: string,
    @Body() dto: AcceptInviteDto,
  ) {
    const result = await this.studentsService.acceptInvite(studentId, dto.teacherId);
    return createSuccessResponse(result);
  }

  @Delete(':studentId')
  @ApiOperation({ summary: 'Giáo viên xóa học sinh' })
  async removeStudent(
    @Headers('x-user-id') teacherId: string,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.studentsService.removeStudent(teacherId, studentId);
    return createSuccessResponse(result);
  }
}

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Controller, Post, Get, Body, Param, Headers, Delete , UseGuards} from '@nestjs/common';
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
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('my-students')
  @ApiOperation({ summary: 'Giáo viên lấy danh sách học sinh của mình' })
  async getMyStudents(@CurrentUser() user: any) {
    const result = await this.studentsService.getMyStudents(user.id);
    return createSuccessResponse(result);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Giáo viên mời học sinh qua thông báo hệ thống' })
  async inviteStudent(
    @CurrentUser() user: any,
    @Body() dto: InviteDto,
  ) {
    const result = await this.studentsService.inviteStudentByEmail(user.id, dto.email);
    return createSuccessResponse(result);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Học sinh chấp nhận lời mời' })
  async acceptInvite(
    @CurrentUser() user: any,
    @Body() dto: AcceptInviteDto,
  ) {
    const result = await this.studentsService.acceptInvite(user.id, dto.teacherId);
    return createSuccessResponse(result);
  }

  @Delete(':studentId')
  @ApiOperation({ summary: 'Giáo viên xóa học sinh' })
  async removeStudent(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.studentsService.removeStudent(user.id, studentId);
    return createSuccessResponse(result);
  }
}

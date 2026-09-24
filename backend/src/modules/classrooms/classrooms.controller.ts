import { Controller, Post, Get, Body, Param, Headers, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClassroomsService } from './classrooms.service.js';
import { CreateClassDto, JoinClassDto } from './dto/classroom.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Classrooms')
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @ApiOperation({ summary: 'Giáo viên tạo lớp học mới' })
  async createClass(
    @Headers('x-user-id') teacherId: string,
    @Body() dto: CreateClassDto,
  ) {
    const result = await this.classroomsService.createClass(teacherId, dto);
    return createSuccessResponse(result, 'Tạo lớp học thành công');
  }

  @Post('join')
  @ApiOperation({ summary: 'Học sinh tham gia lớp học bằng mã code' })
  async joinClass(
    @Headers('x-user-id') studentId: string,
    @Body() dto: JoinClassDto,
  ) {
    const result = await this.classroomsService.joinClass(studentId, dto);
    return createSuccessResponse(result, 'Tham gia lớp học thành công');
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Lấy danh sách lớp học của giáo viên' })
  async getTeacherClasses(@Headers('x-user-id') teacherId: string) {
    const result = await this.classroomsService.getClassesForTeacher(teacherId);
    return createSuccessResponse(result);
  }

  @Get('student')
  @ApiOperation({ summary: 'Lấy danh sách lớp học của học sinh' })
  async getStudentClasses(@Headers('x-user-id') studentId: string) {
    const result = await this.classroomsService.getClassesForStudent(studentId);
    return createSuccessResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lớp học (chỉ GV hoặc HS trong lớp mới xem được)' })
  async getClassDetails(
    @Param('id') classId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.classroomsService.getClassDetails(classId, userId);
    return createSuccessResponse(result);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Giáo viên xóa học sinh khỏi lớp' })
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @Headers('x-user-id') teacherId: string,
  ) {
    const result = await this.classroomsService.removeStudentFromClass(classId, studentId, teacherId);
    return createSuccessResponse(result, 'Đã xóa học sinh khỏi lớp');
  }
}

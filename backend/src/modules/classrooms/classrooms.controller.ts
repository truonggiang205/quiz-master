import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Controller, Post, Get, Body, Param, Headers, Delete , UseGuards} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClassroomsService } from './classrooms.service.js';
import { CreateClassDto, JoinClassDto } from './dto/classroom.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Classrooms')
@UseGuards(JwtAuthGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @ApiOperation({ summary: 'Giáo viên tạo lớp học mới' })
  async createClass(
    @CurrentUser() user: any,
    @Body() dto: CreateClassDto,
  ) {
    const result = await this.classroomsService.createClass(user.id, dto);
    return createSuccessResponse(result, 'Tạo lớp học thành công');
  }

  @Post('join')
  @ApiOperation({ summary: 'Học sinh tham gia lớp học bằng mã code' })
  async joinClass(
    @CurrentUser() user: any,
    @Body() dto: JoinClassDto,
  ) {
    const result = await this.classroomsService.joinClass(user.id, dto);
    return createSuccessResponse(result, 'Tham gia lớp học thành công');
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Lấy danh sách lớp học của giáo viên' })
  async getTeacherClasses(@CurrentUser() user: any) {
    const result = await this.classroomsService.getClassesForTeacher(user.id);
    return createSuccessResponse(result);
  }

  @Get('student')
  @ApiOperation({ summary: 'Lấy danh sách lớp học của học sinh' })
  async getStudentClasses(@CurrentUser() user: any) {
    const result = await this.classroomsService.getClassesForStudent(user.id);
    return createSuccessResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lớp học (chỉ GV hoặc HS trong lớp mới xem được)' })
  async getClassDetails(
    @Param('id') classId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.classroomsService.getClassDetails(classId, user.id);
    return createSuccessResponse(result);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Giáo viên xóa học sinh khỏi lớp' })
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.classroomsService.removeStudentFromClass(classId, studentId, user.id);
    return createSuccessResponse(result, 'Đã xóa học sinh khỏi lớp');
  }
}

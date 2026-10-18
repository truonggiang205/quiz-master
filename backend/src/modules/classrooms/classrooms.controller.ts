import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ClassroomsService } from './classrooms.service.js';
import { CreateClassDto, JoinClassDto } from './dto/classroom.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import type { Response } from 'express';

@ApiTags('Classrooms')
@UseGuards(JwtAuthGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @ApiOperation({ summary: 'Giáo viên tạo lớp học mới' })
  async createClass(@CurrentUser() user: any, @Body() dto: CreateClassDto) {
    const result = await this.classroomsService.createClass(user.id, dto);
    return createSuccessResponse(result, 'Tạo lớp học thành công');
  }

  @Post('join')
  @ApiOperation({ summary: 'Học sinh tham gia lớp học bằng mã code' })
  async joinClass(@CurrentUser() user: any, @Body() dto: JoinClassDto) {
    const result = await this.classroomsService.joinClass(user.id, dto);
    return createSuccessResponse(result, 'Tham gia lớp học thành công');
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Lấy danh sách lớp học của giáo viên kèm thống kê' })
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

  @Get(':id/students/export')
  @ApiOperation({ summary: 'Xuất danh sách học sinh của lớp ra file Excel' })
  async exportStudents(
    @Param('id') classId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.classroomsService.exportStudents(classId, user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Post(':id/students/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import danh sách học sinh từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async importStudents(
    @Param('id') classId: string,
    @CurrentUser() user: any,
    @UploadedFile() file?: any,
    @Body('rows') rows?: any,
  ) {
    let parsedRows = rows;
    if (typeof rows === 'string') {
      try {
        parsedRows = JSON.parse(rows);
      } catch {
        parsedRows = undefined;
      }
    }

    const result = await this.classroomsService.importStudents(
      classId,
      user.id,
      file ? file.buffer : undefined,
      parsedRows,
    );
    return createSuccessResponse(result, 'Xử lý import học sinh hoàn tất');
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Lấy danh sách học sinh trong lớp (hỗ trợ search và filter)' })
  async getClassStudents(
    @Param('id') classId: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.classroomsService.getClassStudents(classId, user.id, search, status);
    return createSuccessResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lớp học (chỉ GV hoặc HS trong lớp mới xem được)' })
  async getClassDetails(@Param('id') classId: string, @CurrentUser() user: any) {
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

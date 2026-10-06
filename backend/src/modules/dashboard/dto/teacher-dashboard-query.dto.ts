import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Khoảng thời gian thống kê tính theo ngày (7, 30, 90 hoặc 0 = tất cả)', default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  periodDays?: number;

  @ApiPropertyOptional({ description: 'Lọc theo ID đề thi cụ thể' })
  @IsOptional()
  @IsString()
  quizId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo môn học' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID lớp học' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đề (PUBLISHED, DRAFT, CLOSED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Từ ngày (ISO date string)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO date string)' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class TeacherSubmissionsQueryDto {
  @ApiPropertyOptional({ description: 'ID đề thi' })
  @IsOptional()
  @IsString()
  quizId?: string;

  @ApiPropertyOptional({ description: 'ID học sinh' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Điểm tối thiểu (thang điểm 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  scoreMin?: number;

  @ApiPropertyOptional({ description: 'Điểm tối đa (thang điểm 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  scoreMax?: number;

  @ApiPropertyOptional({ description: 'Ngày nộp bài (định dạng YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc email học sinh' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sắp xếp (score_desc, score_asc, time_desc, time_asc)', default: 'time_desc' })
  @IsOptional()
  @IsString()
  sort?: string = 'time_desc';
}

export class TeacherStudentsQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc email học sinh' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

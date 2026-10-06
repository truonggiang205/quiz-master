import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StudentDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo môn học' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Khoảng thời gian tính theo ngày (7, 30, 90 hoặc 0 = tất cả)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  periodDays?: number;

  @ApiPropertyOptional({ description: 'Tìm kiếm tên đề thi' })
  @IsOptional()
  @IsString()
  search?: string;
}

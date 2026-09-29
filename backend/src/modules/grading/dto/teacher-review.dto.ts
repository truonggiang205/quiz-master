// ============================================================
// teacher-review.dto.ts — Request body for teacher override
// ============================================================

import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherReviewDto {
  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  teacherScore: number;

  @ApiPropertyOptional({ example: 'Good attempt but missing the key point about X.' })
  @IsOptional()
  @IsString()
  teacherComment?: string;
}

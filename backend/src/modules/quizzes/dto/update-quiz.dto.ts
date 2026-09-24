import { PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto.js';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuizDto extends PartialType(CreateQuizDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'CLOSED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

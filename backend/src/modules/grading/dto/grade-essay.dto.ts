// ============================================================
// grade-essay.dto.ts — Request body for grading endpoint
// ============================================================

import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SynonymMapDto {
  [keyword: string]: string[];
}

class CriterionDto {
  @ApiProperty({ example: 'crit-1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Student mentions photosynthesis' })
  @IsString()
  description: string;

  @ApiProperty({ example: ['photosynthesis', 'chlorophyll'] })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiPropertyOptional({ example: { photosynthesis: ['light reaction'] } })
  @IsOptional()
  synonyms?: Record<string, string[]>;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  maxPoints: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requireAll?: boolean;
}

class RubricDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ example: ['Photosynthesis uses sunlight'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @ApiProperty({ type: [CriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionDto)
  criteria: CriterionDto[];

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  totalScore: number;
}

export class GradeEssayDto {
  @ApiProperty({ example: 'q-001' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ example: 'sub-001' })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({
    example: 'Plants use sunlight to make food through photosynthesis.',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  studentAnswer: string;

  @ApiProperty({ type: RubricDto })
  @ValidateNested()
  @Type(() => RubricDto)
  rubric: RubricDto;
}

export class BulkGradeEssayDto {
  @ApiProperty({ type: [GradeEssayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEssayDto)
  items: GradeEssayDto[];
}

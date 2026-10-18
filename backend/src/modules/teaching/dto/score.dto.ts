import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import type { AssessmentType } from '../entities/score-record.entity.js';

export const ASSESSMENT_TYPES: AssessmentType[] = [
  'QUIZ',
  'HOMEWORK',
  'MIDTERM',
  'FINAL',
  'ORAL',
  'PRACTICE',
  'OTHER',
];

export class CreateScoreDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  lessonId?: string | null;

  @IsEnum(ASSESSMENT_TYPES)
  assessmentType: AssessmentType;

  @IsString()
  @IsNotEmpty()
  assessmentName: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  maxScore?: number;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateScoreDto {
  @IsEnum(ASSESSMENT_TYPES)
  @IsOptional()
  assessmentType?: AssessmentType;

  @IsString()
  @IsOptional()
  assessmentName?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  score?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  maxScore?: number;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLearningLogDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  homework?: string;

  @IsString()
  @IsOptional()
  attitude?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateLearningLogDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  homework?: string;

  @IsString()
  @IsOptional()
  attitude?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BulkSaveLogItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  homework?: string;

  @IsString()
  @IsOptional()
  attitude?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BulkSaveLogsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSaveLogItemDto)
  logs: BulkSaveLogItemDto[];
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecurringScheduleDto {
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  @IsString()
  @IsNotEmpty()
  endDate: string; // YYYY-MM-DD
}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  startTime: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  endTime: string; // HH:mm

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  studentIds?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  feePerLesson?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  homework?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringScheduleDto)
  recurring?: RecurringScheduleDto;
}

export class LessonParticipantUpdateDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(['ATTENDED', 'ABSENT', 'EXCUSED'])
  attendanceStatus: 'ATTENDED' | 'ABSENT' | 'EXCUSED';

  @IsNumber()
  @IsOptional()
  @Min(0)
  feeAmount?: number;
}

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsEnum(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

  @IsNumber()
  @IsOptional()
  @Min(0)
  feePerLesson?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  homework?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LessonParticipantUpdateDto)
  participants?: LessonParticipantUpdateDto[];
}

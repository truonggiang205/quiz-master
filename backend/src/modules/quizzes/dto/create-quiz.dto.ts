import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ example: 'Kiểm tra Toán Giải Tích 12' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Khảo sát hàm số và tính đơn điệu' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Toán học' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({ example: 30, description: 'Thời lượng làm bài (phút)' })
  @IsNumber()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional({ example: '2026-03-10T08:00:00.000Z' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-03-20T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'QUIZ', enum: ['QUIZ', 'PRACTICE'] })
  @IsOptional()
  @IsString()
  mode?: 'QUIZ' | 'PRACTICE';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  totalAttempts?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleAnswers?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showScoreImmediately?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showExplanation?: boolean;

  @ApiPropertyOptional({ example: '2026-03-15T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  answerReleaseAt?: string;

  @ApiPropertyOptional({ example: 'class-123' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  assignedStudentIds?: string[];
}

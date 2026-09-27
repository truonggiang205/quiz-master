import { IsNotEmpty, IsArray, ValidateNested, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmittedAnswerDto {
  @ApiProperty({ example: 'q-js-1' })
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @ApiPropertyOptional({ example: ['opt-3'] })
  @IsOptional()
  @IsArray()
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ example: '/uploads/img-123.png' })
  @IsOptional()
  @IsString()
  essayImageUrl?: string;

  @ApiPropertyOptional({ example: 'Đây là câu trả lời tự luận' })
  @IsOptional()
  @IsString()
  essayText?: string;
}

export class SubmitQuizDto {
  @ApiProperty({ type: [SubmittedAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];

  @ApiProperty({ example: 450, description: 'Thời gian đã sử dụng (giây)' })
  @IsNumber()
  @Min(0)
  timeUsedSeconds!: number;
}

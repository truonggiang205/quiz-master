import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerOptionDto {
  @ApiPropertyOptional({ example: 'opt-1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Hàm số đồng biến trên (2; +∞)' })
  @IsNotEmpty()
  @IsString()
  text!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'Nội dung câu hỏi...' })
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    example: 'SINGLE_CHOICE',
    enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY'],
  })
  @IsEnum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY'])
  type!: string;

  @ApiProperty({ type: [AnswerOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  options!: AnswerOptionDto[];

  @ApiProperty({ example: 2.0, default: 2.0 })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ example: 'Giải thích chi tiết cách giải...' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

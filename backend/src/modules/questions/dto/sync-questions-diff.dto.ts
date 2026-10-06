import { IsOptional, IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto.js';
import { UpdateQuestionDto } from './update-question.dto.js';

export class UpdateQuestionItemDto {
  @ApiProperty({ description: 'ID của câu hỏi cần cập nhật' })
  @IsNotEmpty()
  @IsString()
  id!: string;

  @ApiProperty({ type: UpdateQuestionDto, description: 'Các trường thay đổi' })
  @ValidateNested()
  @Type(() => UpdateQuestionDto)
  changes!: UpdateQuestionDto;
}

export class SyncQuestionsDiffDto {
  @ApiPropertyOptional({ type: [CreateQuestionDto], description: 'Danh sách câu hỏi mới cần tạo' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  created?: CreateQuestionDto[];

  @ApiPropertyOptional({ type: [UpdateQuestionItemDto], description: 'Danh sách câu hỏi đã sửa' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionItemDto)
  updated?: UpdateQuestionItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID câu hỏi đã bị xóa' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedIds?: string[];
}

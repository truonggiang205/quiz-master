import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveFromExamDto {
  @ApiProperty({ description: 'ID bài kiểm tra nguồn' })
  @IsNotEmpty()
  @IsString()
  examId!: string;

  @ApiProperty({ type: [String], description: 'Danh sách ID câu hỏi muốn lưu vào ngân hàng' })
  @IsArray()
  @IsString({ each: true })
  questionIds!: string[];

  @ApiPropertyOptional({ description: 'Môn học / chủ đề gán cho câu hỏi ngân hàng' })
  @IsOptional()
  @IsString()
  subject?: string;
}

import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Toán 10A1', description: 'Tên lớp học' })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Lớp học thêm Toán thầy Giang', required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Toán học', required: false })
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  isPrivate?: boolean;
}

export class JoinClassDto {
  @ApiProperty({ example: 'MATH-1234', description: 'Mã tham gia lớp học' })
  @IsNotEmpty()
  inviteCode!: string;
}

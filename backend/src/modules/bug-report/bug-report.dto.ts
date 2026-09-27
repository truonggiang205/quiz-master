import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBugReportDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  screenshotUrl?: string;
}

export class UpdateBugReportStatusDto {
  @ApiProperty()
  @IsEnum(['PENDING', 'RESOLVED'])
  status: 'PENDING' | 'RESOLVED';
}

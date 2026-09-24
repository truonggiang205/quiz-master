import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'teacher@example.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'User password (at least 6 characters)' })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Full name' })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'student@example.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'User password' })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'STUDENT', enum: ['TEACHER', 'STUDENT'], default: 'STUDENT' })
  @IsOptional()
  @IsEnum(['TEACHER', 'STUDENT'])
  role?: 'TEACHER' | 'STUDENT';

  @ApiProperty({ example: 'THPT Chuyên Hà Nội - Amsterdam', required: false })
  @IsOptional()
  school?: string;

  @ApiProperty({ example: '2005-11-09', required: false, description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'], required: false })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  otp!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  otp!: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}

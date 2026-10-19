import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateExternalStudentDto {
  @IsNotEmpty({ message: 'Họ và tên học sinh là bắt buộc' })
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  parentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentPhone?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Giới tính không hợp lệ' })
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  school?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTeacherStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  parentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentPhone?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Giới tính không hợp lệ' })
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  school?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Trạng thái không hợp lệ' })
  status?: 'ACTIVE' | 'INACTIVE';
}

export class LinkAccountDto {
  @IsNotEmpty({ message: 'Email hoặc mã tài khoản học sinh là bắt buộc' })
  @IsString()
  emailOrAccountId!: string;
}

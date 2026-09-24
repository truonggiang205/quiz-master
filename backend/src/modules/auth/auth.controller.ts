import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống (Teacher / Student)' })
  @SwaggerResponse({ status: 200, description: 'Đăng nhập thành công, trả về token và thông tin người dùng' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return createSuccessResponse(result, 'Đăng nhập thành công');
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới và gửi OTP' })
  @SwaggerResponse({ status: 201, description: 'Đăng ký thành công, yêu cầu xác thực OTP' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return createSuccessResponse(result, 'Mã OTP đã được gửi đến email của bạn');
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Xác thực mã OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto);
    return createSuccessResponse(result, 'Xác thực thành công');
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Yêu cầu gửi OTP khôi phục mật khẩu' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto);
    return createSuccessResponse(result, 'Mã OTP đã được gửi đến email của bạn');
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);
    return createSuccessResponse(result, 'Đặt lại mật khẩu thành công');
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  async getMe(@Headers('x-user-role') roleHeader?: string) {
    const user = await this.authService.getCurrentUser(roleHeader);
    return createSuccessResponse(user);
  }
}

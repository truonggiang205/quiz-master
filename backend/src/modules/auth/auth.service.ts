import { Injectable, UnauthorizedException, OnModuleInit, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { LoginDto, RegisterDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto.js';
import { MailerService } from '../mailer/mailer.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // No mock seeding
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepo.findOneBy({ email: loginDto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (loginDto.password) {
      const isMatch = await bcrypt.compare(loginDto.password, user.password);
      
      if (!isMatch) {
        // Fallback for legacy plaintext passwords
        if (loginDto.password === user.password) {
          // Upgrade password to bcrypt
          user.password = await bcrypt.hash(loginDto.password, 10);
          await this.userRepo.save(user);
        } else {
          throw new UnauthorizedException('Mật khẩu không chính xác');
        }
      }
    } else {
        throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    if (!user.isVerified) {
       throw new UnauthorizedException('Tài khoản chưa được xác thực. Vui lòng xác thực email.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        school: user.school,
      },
      token,
      expiresIn: 86400,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (existing && existing.isVerified) {
      throw new UnauthorizedException('Email này đã được đăng ký tài khoản');
    }

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes from now

    let user = existing;
    if (user) {
      // Re-register attempt for unverified user
      user.name = dto.name;
      user.password = await bcrypt.hash(dto.password || '123456', 10);
      user.role = (dto.role as any) || 'STUDENT';
      user.school = dto.school || 'Trường THPT';
      user.dob = dto.dob ? new Date(dto.dob) : null;
      user.gender = dto.gender || null;
      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
    } else {
      user = this.userRepo.create({
        id: `user-${Date.now()}`,
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: await bcrypt.hash(dto.password || '123456', 10),
        role: (dto.role as any) || 'STUDENT',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
        school: dto.school || 'Trường THPT',
        dob: dto.dob ? new Date(dto.dob) : null,
        gender: dto.gender || null,
        isVerified: false,
        otpCode,
        otpExpiresAt,
      });
    }

    await this.userRepo.save(user);

    // Send email
    const emailSent = await this.mailerService.sendOtpEmail(user.email, otpCode, 'REGISTER');
    
    if (!emailSent) {
       // On Render free tier, SMTP ports are blocked. Instead of failing completely,
       // we return the OTP in the response for development/testing purposes.
       return {
         requireOtp: true,
         email: user.email,
         devOtp: otpCode
       };
    }

    return {
      requireOtp: true,
      email: user.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    if (user.isVerified) throw new BadRequestException('Tài khoản đã được xác thực trước đó');
    
    if (!user.otpCode || user.otpCode !== dto.otp) {
      throw new UnauthorizedException('Mã OTP không chính xác');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Mã OTP đã hết hạn');
    }

    // Verify success
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepo.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
      expiresIn: 86400,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản với email này');

    const otpCode = this.generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60000); // 5 mins
    await this.userRepo.save(user);

    const emailSent = await this.mailerService.sendOtpEmail(user.email, otpCode, 'FORGOT_PASSWORD');
    
    if (!emailSent) {
      return { requireOtp: true, email: user.email, devOtp: otpCode };
    }

    return { requireOtp: true, email: user.email };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    if (!user.otpCode || user.otpCode !== dto.otp) {
      throw new UnauthorizedException('Mã OTP không chính xác');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Mã OTP đã hết hạn');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;
    if (!user.isVerified) user.isVerified = true; // Auto verify if they reset pass
    await this.userRepo.save(user);

    return { success: true };
  }

  async getCurrentUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        school: true,
        isVerified: true,
        createdAt: true
      }
    });
    
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng');
    }
    
    return user;
  }
}


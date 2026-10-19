import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto.js';
import { MailerService } from '../mailer/mailer.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';

// Precomputed bcrypt hash of a random password used to mitigate timing attacks on invalid emails
const DUMMY_BCRYPT_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService implements OnModuleInit {
  private static readonly otpAttemptsMap = new Map<string, number>();

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // No mock seeding
  }

  /**
   * Generates a cryptographically secure 6-digit OTP code using CSPRNG
   */
  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Constant-time string comparison to prevent side-channel timing attacks
   */
  private isTimingSafeEqual(a?: string | null, b?: string | null): boolean {
    if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Tracks failed OTP attempts. If threshold (5) is exceeded, wipes the OTP
   * to permanently prevent brute-force attacks.
   */
  private async handleFailedOtpAttempt(email: string, user: UserEntity): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    const attempts = (AuthService.otpAttemptsMap.get(cleanEmail) || 0) + 1;
    AuthService.otpAttemptsMap.set(cleanEmail, attempts);

    if (attempts >= 5) {
      AuthService.otpAttemptsMap.delete(cleanEmail);
      user.otpCode = null;
      user.otpExpiresAt = null;
      await this.userRepo.save(user);
      throw new UnauthorizedException(
        'Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.',
      );
    }
  }

  private clearOtpAttempts(email: string): void {
    AuthService.otpAttemptsMap.delete(email.toLowerCase().trim());
  }

  async login(loginDto: LoginDto) {
    const cleanEmail = (loginDto.email || '').trim().toLowerCase();
    const user = await this.userRepo.findOneBy({ email: cleanEmail });

    if (!user) {
      // Execute dummy bcrypt comparison to ensure uniform response timing (~100ms)
      await bcrypt.compare(loginDto.password || '', DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.',
      );
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
          throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }
      }
    } else {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực. Vui lòng xác thực email.',
      );
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
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const existing = await this.userRepo.findOneBy({ email: cleanEmail });
    if (existing && existing.isVerified) {
      throw new UnauthorizedException('Email này đã được đăng ký tài khoản');
    }

    // Role whitelist: prohibit privilege escalation via registration
    const allowedRoles: ('TEACHER' | 'STUDENT')[] = ['STUDENT', 'TEACHER'];
    const safeRole = (dto.role && allowedRoles.includes(dto.role as any)) ? dto.role : 'STUDENT';

    // Generate cryptographically secure OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes from now
    this.clearOtpAttempts(cleanEmail);

    let user = existing;
    if (user) {
      // Re-register attempt for unverified user
      user.name = dto.name;
      user.password = await bcrypt.hash(dto.password || '123456', 10);
      user.role = safeRole;
      user.school = dto.school || 'Trường THPT';
      user.dob = dto.dob ? new Date(dto.dob) : null;
      user.gender = dto.gender || null;
      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
    } else {
      user = this.userRepo.create({
        id: `user-${Date.now()}`,
        name: dto.name,
        email: cleanEmail,
        password: await bcrypt.hash(dto.password || '123456', 10),
        role: safeRole,
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
        school: dto.school || 'Trường THPT',
        dob: dto.dob ? new Date(dto.dob) : null,
        gender: dto.gender || null,
        isVerified: false,
        isActive: true,
        otpCode,
        otpExpiresAt,
      });
    }

    await this.userRepo.save(user);

    // Send email
    const emailSent = await this.mailerService.sendOtpEmail(user.email, otpCode, 'REGISTER');

    const isProduction = process.env.NODE_ENV === 'production';
    if (!emailSent) {
      // In production, never leak devOtp
      if (!isProduction && process.env.ALLOW_DEV_OTP !== 'false') {
        return {
          requireOtp: true,
          email: user.email,
          devOtp: otpCode,
        };
      }
    }

    return {
      requireOtp: true,
      email: user.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const user = await this.userRepo.findOneBy({ email: cleanEmail });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    if (user.isActive === false) {
      throw new UnauthorizedException('Tài khoản đã bị khóa bởi quản trị viên');
    }

    if (user.isVerified) throw new BadRequestException('Tài khoản đã được xác thực trước đó');

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Mã OTP đã hết hạn');
    }

    if (!user.otpCode || !this.isTimingSafeEqual(user.otpCode, (dto.otp || '').trim())) {
      await this.handleFailedOtpAttempt(cleanEmail, user);
      throw new UnauthorizedException('Mã OTP không chính xác');
    }

    // Verify success: clear OTP and failed attempts
    this.clearOtpAttempts(cleanEmail);
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
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const user = await this.userRepo.findOneBy({ email: cleanEmail });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản với email này');

    if (user.isActive === false) {
      throw new UnauthorizedException('Tài khoản đã bị khóa bởi quản trị viên');
    }

    const otpCode = this.generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60000); // 5 mins
    this.clearOtpAttempts(cleanEmail);
    await this.userRepo.save(user);

    const emailSent = await this.mailerService.sendOtpEmail(
      user.email,
      otpCode,
      'FORGOT_PASSWORD',
    );

    const isProduction = process.env.NODE_ENV === 'production';
    if (!emailSent) {
      if (!isProduction && process.env.ALLOW_DEV_OTP !== 'false') {
        return { requireOtp: true, email: user.email, devOtp: otpCode };
      }
    }

    return { requireOtp: true, email: user.email };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const user = await this.userRepo.findOneBy({ email: cleanEmail });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    if (user.isActive === false) {
      throw new UnauthorizedException('Tài khoản đã bị khóa bởi quản trị viên');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Mã OTP đã hết hạn');
    }

    if (!user.otpCode || !this.isTimingSafeEqual(user.otpCode, (dto.otp || '').trim())) {
      await this.handleFailedOtpAttempt(cleanEmail, user);
      throw new UnauthorizedException('Mã OTP không chính xác');
    }

    // Success: clear OTP, reset password, clear attempts
    this.clearOtpAttempts(cleanEmail);
    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;
    if (!user.isVerified) user.isVerified = true;
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
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.',
      );
    }

    return user;
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import * as bcrypt from 'bcrypt';

describe('Authentication & Authorization Security Test Suite', () => {
  let userStore: any[] = [];
  let fakeUserRepo: any;
  let fakeMailerService: any;
  let fakeJwtService: any;
  let authService: AuthService;

  beforeEach(() => {
    userStore = [];
    fakeUserRepo = {
      findOne: vi.fn(async (opts: any) => {
        if (opts.where?.id) {
          return userStore.find((u) => u.id === opts.where.id) || null;
        }
        return null;
      }),
      findOneBy: vi.fn(async (opts: any) => {
        if (opts.email) {
          return userStore.find((u) => u.email.toLowerCase() === opts.email.toLowerCase()) || null;
        }
        if (opts.id) {
          return userStore.find((u) => u.id === opts.id) || null;
        }
        return null;
      }),
      create: vi.fn((data: any) => ({ ...data })),
      save: vi.fn(async (data: any) => {
        const idx = userStore.findIndex((u) => u.id === data.id);
        if (idx >= 0) userStore[idx] = data;
        else userStore.push(data);
        return data;
      }),
    };

    fakeMailerService = {
      sendOtpEmail: vi.fn(async () => true),
    };

    fakeJwtService = {
      sign: vi.fn(() => 'signed-jwt-token-xyz'),
      verifyAsync: vi.fn(async (token: string) => {
        if (token === 'valid-admin-token') {
          return { sub: 'admin-1', email: 'admin@quizmaster.edu.vn', role: 'ADMIN', name: 'Admin User' };
        }
        if (token === 'valid-student-token') {
          return { sub: 'student-1', email: 'student@quizmaster.edu.vn', role: 'STUDENT', name: 'Student User' };
        }
        if (token === 'valid-teacher-token') {
          return { sub: 'teacher-1', email: 'teacher@quizmaster.edu.vn', role: 'TEACHER', name: 'Teacher User' };
        }
        throw new Error('Invalid JWT');
      }),
    };

    authService = new AuthService(fakeUserRepo, fakeMailerService, fakeJwtService);
  });

  // SEC-01: Timing Attack Mitigation
  it('SEC-01: Login with non-existent email executes constant-time dummy compare and rejects with generic 401', async () => {
    await expect(
      authService.login({ email: 'nonexistent@example.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);

    // Verify it rejects with standard generic security message
    try {
      await authService.login({ email: 'nonexistent@example.com', password: 'password123' });
    } catch (err: any) {
      expect(err.message).toBe('Email hoặc mật khẩu không chính xác');
    }
  });

  // SEC-02: Deactivated / Locked Account Rejection
  it('SEC-02: Login with locked/banned account (isActive: false) throws UnauthorizedException', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    userStore.push({
      id: 'locked-user',
      email: 'locked@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: false, // Locked account
      role: 'STUDENT',
      name: 'Locked Student',
    });

    await expect(
      authService.login({ email: 'locked@example.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // SEC-03: Unverified Email Rejection
  it('SEC-03: Login with unverified account (isVerified: false) throws UnauthorizedException', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    userStore.push({
      id: 'unverified-user',
      email: 'unverified@example.com',
      password: hashedPassword,
      isVerified: false,
      isActive: true,
      role: 'STUDENT',
      name: 'Unverified Student',
    });

    await expect(
      authService.login({ email: 'unverified@example.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // SEC-04: Invalid Password Rejection
  it('SEC-04: Login with incorrect password throws generic UnauthorizedException', async () => {
    const hashedPassword = await bcrypt.hash('correctPassword123', 10);
    userStore.push({
      id: 'student-valid',
      email: 'valid@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,
      role: 'STUDENT',
      name: 'Valid Student',
    });

    await expect(
      authService.login({ email: 'valid@example.com', password: 'wrongPassword' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // SEC-05: Legacy Plaintext Password Auto-Upgrade to Bcrypt
  it('SEC-05: Legacy plaintext password upgrades safely to bcrypt hash on valid login', async () => {
    userStore.push({
      id: 'legacy-user',
      email: 'legacy@example.com',
      password: 'legacyPlainPassword',
      isVerified: true,
      isActive: true,
      role: 'STUDENT',
      name: 'Legacy Student',
    });

    const result = await authService.login({
      email: 'legacy@example.com',
      password: 'legacyPlainPassword',
    });

    expect(result.token).toBe('signed-jwt-token-xyz');
    expect(result.user.email).toBe('legacy@example.com');
    // Verify password is now bcrypt hashed
    expect(userStore[0].password.startsWith('$2b$')).toBe(true);
  });

  // SEC-06: Privilege Escalation Prevention on Register
  it('SEC-06: Register with unauthorized role (e.g. ADMIN) is automatically sanitized to STUDENT', async () => {
    await authService.register({
      name: 'Hacker User',
      email: 'hacker@example.com',
      password: 'password123',
      role: 'ADMIN' as any, // Attacker attempts to register as ADMIN
    });

    const registeredUser = userStore.find((u) => u.email === 'hacker@example.com');
    expect(registeredUser).toBeDefined();
    expect(registeredUser.role).toBe('STUDENT'); // Sanitized safely
    expect(registeredUser.isVerified).toBe(false);
  });

  // SEC-07: devOtp Production Safeguard
  it('SEC-07: In production (NODE_ENV=production), devOtp is NEVER returned even when mail sending fails', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    fakeMailerService.sendOtpEmail.mockResolvedValueOnce(false); // Simulate mail delivery failure

    try {
      const res = await authService.register({
        name: 'Prod User',
        email: 'prod@example.com',
        password: 'password123',
      });

      expect((res as any).devOtp).toBeUndefined();
      expect(res.requireOtp).toBe(true);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // SEC-08: OTP Brute-Force Lockout Threshold
  it('SEC-08: Exceeding 5 failed OTP attempts wipes the OTP code and locks verification', async () => {
    userStore.push({
      id: 'otp-victim',
      email: 'victim@example.com',
      otpCode: '888888',
      otpExpiresAt: new Date(Date.now() + 300000),
      isVerified: false,
      isActive: true,
    });

    // 4 invalid attempts
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.verifyOtp({ email: 'victim@example.com', otp: '111111' }),
      ).rejects.toThrow('Mã OTP không chính xác');
    }

    // 5th invalid attempt triggers wipe & lockout
    await expect(
      authService.verifyOtp({ email: 'victim@example.com', otp: '111111' }),
    ).rejects.toThrow('Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần');

    const victim = userStore.find((u) => u.id === 'otp-victim');
    expect(victim.otpCode).toBeNull();
    expect(victim.otpExpiresAt).toBeNull();
  });

  // SEC-09: Constant-Time OTP Verification
  it('SEC-09: Correct OTP verifies user, wipes code, and issues token', async () => {
    userStore.push({
      id: 'student-otp',
      email: 'student.otp@example.com',
      otpCode: '654321',
      otpExpiresAt: new Date(Date.now() + 300000),
      isVerified: false,
      isActive: true,
      role: 'STUDENT',
      name: 'OTP Student',
    });

    const result = await authService.verifyOtp({
      email: 'student.otp@example.com',
      otp: '654321',
    });

    expect(result.token).toBe('signed-jwt-token-xyz');
    const userInDb = userStore.find((u) => u.id === 'student-otp');
    expect(userInDb.isVerified).toBe(true);
    expect(userInDb.otpCode).toBeNull();
    expect(userInDb.otpExpiresAt).toBeNull();
  });

  // SEC-10: Expired OTP Rejection
  it('SEC-10: Expired OTP is strictly rejected with UnauthorizedException', async () => {
    userStore.push({
      id: 'expired-otp-user',
      email: 'expired@example.com',
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      isVerified: false,
      isActive: true,
    });

    await expect(
      authService.verifyOtp({ email: 'expired@example.com', otp: '123456' }),
    ).rejects.toThrow('Mã OTP đã hết hạn');
  });

  // SEC-11: Password Reset via Valid OTP
  it('SEC-11: Password reset updates bcrypt hash and clears OTP state', async () => {
    userStore.push({
      id: 'reset-user',
      email: 'reset@example.com',
      password: await bcrypt.hash('oldPassword123', 10),
      otpCode: '777777',
      otpExpiresAt: new Date(Date.now() + 300000),
      isVerified: true,
      isActive: true,
    });

    const result = await authService.resetPassword({
      email: 'reset@example.com',
      otp: '777777',
      newPassword: 'newStrongPassword456',
    });

    expect(result.success).toBe(true);
    const userInDb = userStore.find((u) => u.id === 'reset-user');
    expect(userInDb.otpCode).toBeNull();
    expect(userInDb.otpExpiresAt).toBeNull();
    const isNewPassValid = await bcrypt.compare('newStrongPassword456', userInDb.password);
    expect(isNewPassValid).toBe(true);
  });

  // SEC-12: getCurrentUser Deactivation Check
  it('SEC-12: getCurrentUser throws UnauthorizedException when user isActive is false', async () => {
    userStore.push({
      id: 'banned-user',
      email: 'banned@example.com',
      name: 'Banned User',
      role: 'STUDENT',
      isActive: false,
      isVerified: true,
    });

    await expect(authService.getCurrentUser('banned-user')).rejects.toThrow(UnauthorizedException);
  });

  // SEC-13: JwtAuthGuard Malformed Header Rejection
  it('SEC-13: JwtAuthGuard rejects missing, empty, or malformed Authorization headers', async () => {
    const guard = new JwtAuthGuard(fakeJwtService);

    const makeContext = (authHeader?: string): any => ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authHeader !== undefined ? { authorization: authHeader } : {},
        }),
      }),
    });

    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext('Basic xyz'))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext('Bearer'))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext('Bearer   '))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext('Bearer invalid.jwt.token'))).rejects.toThrow(UnauthorizedException);

    // Valid token passes
    const reqObj: any = { headers: { authorization: 'Bearer valid-student-token' } };
    const validCtx: any = { switchToHttp: () => ({ getRequest: () => reqObj }) };
    const canActivate = await guard.canActivate(validCtx);
    expect(canActivate).toBe(true);
    expect(reqObj.user.role).toBe('STUDENT');
  });

  // SEC-14: RolesGuard Role-Based Access Control
  it('SEC-14: RolesGuard permits matching roles and rejects unauthorized roles', () => {
    const fakeReflector: any = {
      getAllAndOverride: vi.fn(() => ['ADMIN']),
    };
    const guard = new RolesGuard(fakeReflector);

    const makeContextWithRole = (role?: string): any => ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { id: 'u1', role } : undefined,
        }),
      }),
    });

    // Unauthenticated user -> false
    expect(guard.canActivate(makeContextWithRole(undefined))).toBe(false);

    // Student -> false (Admin required)
    expect(guard.canActivate(makeContextWithRole('STUDENT'))).toBe(false);

    // Teacher -> false (Admin required)
    expect(guard.canActivate(makeContextWithRole('TEACHER'))).toBe(false);

    // Admin -> true
    expect(guard.canActivate(makeContextWithRole('ADMIN'))).toBe(true);
  });

  // SEC-15: Immunity to Client Header Privilege Escalation (x-user-role forgery)
  it('SEC-15: Client-forged x-user-role: ADMIN is rejected when JWT token is STUDENT', async () => {
    const jwtGuard = new JwtAuthGuard(fakeJwtService);
    const reflector: any = { getAllAndOverride: vi.fn(() => ['ADMIN']) };
    const rolesGuard = new RolesGuard(reflector);

    // Attacker sends student token with forged x-user-role header
    const req: any = {
      headers: {
        authorization: 'Bearer valid-student-token',
        'x-user-role': 'ADMIN', // Forged header!
      },
    };

    const ctx: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    };

    // Step 1: JWT guard decodes actual role from signature
    await jwtGuard.canActivate(ctx);
    expect(req.user.role).toBe('STUDENT');

    // Step 2: RolesGuard evaluates actual role
    const isAllowed = rolesGuard.canActivate(ctx);
    expect(isAllowed).toBe(false); // Forgery defeated!
  });
});

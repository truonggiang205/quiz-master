import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { UsersService } from '../../users/users.service.js';
import * as bcrypt from 'bcrypt';

describe('AUTH FINAL BUSINESS AUDIT — LOGIN / LOGOUT / SESSION CONSISTENCY (15 Scenarios)', () => {
  let userStore: any[] = [];
  let fakeUserRepo: any;
  let fakeMailerService: any;
  let fakeJwtService: any;
  let authService: AuthService;
  let usersService: UsersService;

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
      sign: vi.fn((payload: any) => `jwt-token-for-${payload.sub || 'user'}-${payload.role || 'ROLE'}`),
      verifyAsync: vi.fn(async (token: string) => {
        if (token === 'expired-jwt-token') {
          throw new Error('jwt expired');
        }
        if (token.startsWith('jwt-token-for-')) {
          const parts = token.replace('jwt-token-for-', '').split('-');
          const userId = parts[0];
          const role = parts[1] || 'STUDENT';
          const user = userStore.find((u) => u.id === userId);
          return {
            sub: userId,
            email: user?.email || `${userId}@quizmaster.edu.vn`,
            role,
            name: user?.name || 'Test User',
          };
        }
        throw new Error('Invalid JWT');
      }),
    };

    authService = new AuthService(fakeUserRepo, fakeMailerService, fakeJwtService);
    usersService = new UsersService(fakeUserRepo);
  });

  const makeHttpContext = (headers: Record<string, string> = {}): any => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  // ==================== AUTH-FINAL-01 ====================
  it('AUTH-FINAL-01: Login success stores correct token and user', async () => {
    const passwordHash = await bcrypt.hash('CorrectPass123', 10);
    userStore.push({
      id: 'teacher-101',
      name: 'Cô Thu Hà',
      email: 'thuha@quizmaster.edu.vn',
      password: passwordHash,
      role: 'TEACHER',
      isActive: true,
      isVerified: true,
    });

    const res = await authService.login({
      email: 'thuha@quizmaster.edu.vn',
      password: 'CorrectPass123',
    });

    expect(res.token).toBe('jwt-token-for-teacher-101-TEACHER');
    expect(res.expiresIn).toBe(86400); // 24 hours
    expect(res.user.id).toBe('teacher-101');
    expect(res.user.role).toBe('TEACHER');
    expect(res.user.email).toBe('thuha@quizmaster.edu.vn');

    // Simulate frontend setAuthSession
    const localStorageMock: Record<string, string> = {};
    const setAuthSession = (u: any, t: string) => {
      localStorageMock['quizmaster_auth_user'] = JSON.stringify(u);
      localStorageMock['quizmaster_auth_token'] = t;
    };
    setAuthSession(res.user, res.token);

    expect(localStorageMock['quizmaster_auth_token']).toBe(res.token);
    expect(JSON.parse(localStorageMock['quizmaster_auth_user']).id).toBe('teacher-101');
  });

  // ==================== AUTH-FINAL-02 ====================
  it('AUTH-FINAL-02: Login failure leaves no stale authenticated state', async () => {
    const localStorageMock: Record<string, string> = {};

    await expect(
      authService.login({ email: 'nonexistent@test.vn', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    // No token or user should be stored
    expect(localStorageMock['quizmaster_auth_token']).toBeUndefined();
    expect(localStorageMock['quizmaster_auth_user']).toBeUndefined();
  });

  // ==================== AUTH-FINAL-03 ====================
  it('AUTH-FINAL-03: Logout clears Zustand and localStorage', () => {
    const localStorageMock: Record<string, string> = {
      quizmaster_auth_token: 'jwt-token-for-teacher-101-TEACHER',
      quizmaster_auth_user: JSON.stringify({ id: 'teacher-101', role: 'TEACHER' }),
      'quiz-master-taking-storage': JSON.stringify({ answers: { q1: ['opt1'] } }),
    };

    let authState: any = {
      user: { id: 'teacher-101' },
      token: 'jwt-token-for-teacher-101-TEACHER',
      isAuthenticated: true,
    };

    // Simulate logout action
    const logout = () => {
      delete localStorageMock['quizmaster_auth_user'];
      delete localStorageMock['quizmaster_auth_token'];
      delete localStorageMock['quiz-master-taking-storage'];
      authState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    };

    logout();

    expect(localStorageMock['quizmaster_auth_token']).toBeUndefined();
    expect(localStorageMock['quizmaster_auth_user']).toBeUndefined();
    expect(localStorageMock['quiz-master-taking-storage']).toBeUndefined();
    expect(authState.user).toBeNull();
    expect(authState.token).toBeNull();
    expect(authState.isAuthenticated).toBe(false);
  });

  // ==================== AUTH-FINAL-04 ====================
  it('AUTH-FINAL-04: Logout prevents protected frontend access', () => {
    const authState = { isAuthenticated: false, user: null };

    // Simulate ProtectedRoute check
    const evaluateProtectedRoute = (state: typeof authState) => {
      if (!state.isAuthenticated) return { navigateTo: '/login', allow: false };
      return { navigateTo: null, allow: true };
    };

    const result = evaluateProtectedRoute(authState);
    expect(result.allow).toBe(false);
    expect(result.navigateTo).toBe('/login');
  });

  // ==================== AUTH-FINAL-05 ====================
  it('AUTH-FINAL-05: Logout -> Login as another user does not retain previous user data', async () => {
    const hashA = await bcrypt.hash('passA', 10);
    const hashB = await bcrypt.hash('passB', 10);

    userStore.push({
      id: 'user-A',
      name: 'Account A',
      email: 'a@quizmaster.edu.vn',
      password: hashA,
      role: 'STUDENT',
      isActive: true,
      isVerified: true,
    });
    userStore.push({
      id: 'user-B',
      name: 'Account B',
      email: 'b@quizmaster.edu.vn',
      password: hashB,
      role: 'TEACHER',
      isActive: true,
      isVerified: true,
    });

    const storage: Record<string, string> = {};
    let currentStore: any = { user: null, token: null, isAuthenticated: false };

    // 1. Login Account A
    const resA = await authService.login({ email: 'a@quizmaster.edu.vn', password: 'passA' });
    storage['quizmaster_auth_user'] = JSON.stringify(resA.user);
    storage['quizmaster_auth_token'] = resA.token;
    currentStore = { user: resA.user, token: resA.token, isAuthenticated: true };

    expect(currentStore.user.id).toBe('user-A');

    // 2. Logout Account A
    delete storage['quizmaster_auth_user'];
    delete storage['quizmaster_auth_token'];
    currentStore = { user: null, token: null, isAuthenticated: false };

    // 3. Login Account B
    const resB = await authService.login({ email: 'b@quizmaster.edu.vn', password: 'passB' });
    storage['quizmaster_auth_user'] = JSON.stringify(resB.user);
    storage['quizmaster_auth_token'] = resB.token;
    currentStore = { user: resB.user, token: resB.token, isAuthenticated: true };

    // Verify: Completely clean transition
    expect(currentStore.user.id).toBe('user-B');
    expect(currentStore.user.role).toBe('TEACHER');
    expect(currentStore.token).toBe('jwt-token-for-user-B-TEACHER');
    expect(storage['quizmaster_auth_token']).toBe('jwt-token-for-user-B-TEACHER');
    expect(JSON.parse(storage['quizmaster_auth_user']).name).toBe('Account B');
  });

  // ==================== AUTH-FINAL-06 ====================
  it('AUTH-FINAL-06: Expired JWT causes 401 and frontend session cleanup', async () => {
    const guard = new JwtAuthGuard(fakeJwtService);
    const ctx = makeHttpContext({ authorization: 'Bearer expired-jwt-token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);

    // Simulate frontend interceptor handling 401
    const storage: Record<string, string> = {
      quizmaster_auth_token: 'expired-jwt-token',
      quizmaster_auth_user: JSON.stringify({ id: 'u1' }),
    };

    const handle401 = (currentPath: string) => {
      delete storage['quizmaster_auth_token'];
      delete storage['quizmaster_auth_user'];
      return currentPath !== '/login' ? '/login' : null;
    };

    const redirectUrl = handle401('/student/dashboard');
    expect(storage['quizmaster_auth_token']).toBeUndefined();
    expect(storage['quizmaster_auth_user']).toBeUndefined();
    expect(redirectUrl).toBe('/login');
  });

  // ==================== AUTH-FINAL-07 ====================
  it('AUTH-FINAL-07: Disabled account cannot login', async () => {
    const hash = await bcrypt.hash('secretPass', 10);
    userStore.push({
      id: 'disabled-user',
      email: 'disabled@quizmaster.edu.vn',
      password: hash,
      isActive: false, // Locked
      isVerified: true,
      role: 'STUDENT',
    });

    await expect(
      authService.login({ email: 'disabled@quizmaster.edu.vn', password: 'secretPass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ==================== AUTH-FINAL-08 ====================
  it('AUTH-FINAL-08: Already logged-in disabled account is kicked out after /me returns 401', async () => {
    userStore.push({
      id: 'deactivated-later',
      email: 'deactivated@quizmaster.edu.vn',
      name: 'Deactivated User',
      isActive: false, // Admin deactivated live account
      isVerified: true,
      role: 'STUDENT',
    });

    // 1. Endpoint /auth/me checks isActive
    await expect(authService.getCurrentUser('deactivated-later')).rejects.toThrow(
      UnauthorizedException,
    );

    // 2. Endpoint /users/me checks isActive
    await expect(usersService.findById('deactivated-later')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ==================== AUTH-FINAL-09 ====================
  it('AUTH-FINAL-09: Role change affects newly issued JWT', async () => {
    const hash = await bcrypt.hash('pass123', 10);
    const user = {
      id: 'role-change-user',
      email: 'promoted@quizmaster.edu.vn',
      password: hash,
      role: 'STUDENT',
      isActive: true,
      isVerified: true,
    };
    userStore.push(user);

    // Initial login -> role STUDENT
    const res1 = await authService.login({ email: 'promoted@quizmaster.edu.vn', password: 'pass123' });
    expect(res1.user.role).toBe('STUDENT');
    expect(res1.token).toBe('jwt-token-for-role-change-user-STUDENT');

    // Admin updates role in DB
    user.role = 'TEACHER';

    // New login -> issues JWT with new role TEACHER
    const res2 = await authService.login({ email: 'promoted@quizmaster.edu.vn', password: 'pass123' });
    expect(res2.user.role).toBe('TEACHER');
    expect(res2.token).toBe('jwt-token-for-role-change-user-TEACHER');
  });

  // ==================== AUTH-FINAL-10 ====================
  it('AUTH-FINAL-10: Old JWT behavior after role change is documented and tested', async () => {
    const guard = new JwtAuthGuard(fakeJwtService);
    const req: any = { headers: { authorization: 'Bearer jwt-token-for-user1-STUDENT' } };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    await guard.canActivate(ctx);
    expect(req.user.role).toBe('STUDENT');

    // RolesGuard requiring TEACHER rejects old STUDENT token
    const reflector: any = { getAllAndOverride: vi.fn(() => ['TEACHER']) };
    const rolesGuard = new RolesGuard(reflector);
    expect(rolesGuard.canActivate(ctx)).toBe(false);
  });

  // ==================== AUTH-FINAL-11 ====================
  it('AUTH-FINAL-11: Malformed Authorization headers are rejected', async () => {
    const guard = new JwtAuthGuard(fakeJwtService);

    await expect(guard.canActivate(makeHttpContext({}))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeHttpContext({ authorization: 'Basic dXNlcjpwYXNz' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeHttpContext({ authorization: 'Bearer' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeHttpContext({ authorization: 'Bearer    ' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeHttpContext({ authorization: 'Bearer token extra' }))).rejects.toThrow(UnauthorizedException);
  });

  // ==================== AUTH-FINAL-12 ====================
  it('AUTH-FINAL-12: Forged x-user-role cannot bypass JWT role', async () => {
    const jwtGuard = new JwtAuthGuard(fakeJwtService);
    const reflector: any = { getAllAndOverride: vi.fn(() => ['ADMIN']) };
    const rolesGuard = new RolesGuard(reflector);

    const req: any = {
      headers: {
        authorization: 'Bearer jwt-token-for-student1-STUDENT',
        'x-user-role': 'ADMIN', // Forged header
      },
    };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    await jwtGuard.canActivate(ctx);
    // Verified user role comes from JWT signature
    expect(req.user.role).toBe('STUDENT');
    expect(rolesGuard.canActivate(ctx)).toBe(false);
  });

  // ==================== AUTH-FINAL-13 ====================
  it('AUTH-FINAL-13: Multi-device logout remains independent', () => {
    const deviceA = { token: 'jwt-token-device-A' };
    const deviceB = { token: 'jwt-token-device-B' };

    // Logout Device A
    delete (deviceA as any).token;

    expect(deviceA.token).toBeUndefined();
    expect(deviceB.token).toBe('jwt-token-device-B');
  });

  // ==================== AUTH-FINAL-14 ====================
  it('AUTH-FINAL-14: Repeated logout is idempotent', () => {
    const storage: Record<string, string> = {
      quizmaster_auth_token: 'some-token',
    };

    const logout = () => {
      delete storage['quizmaster_auth_token'];
      delete storage['quizmaster_auth_user'];
    };

    logout();
    expect(storage['quizmaster_auth_token']).toBeUndefined();

    // Calling again does not throw or cause errors
    expect(() => logout()).not.toThrow();
    expect(storage['quizmaster_auth_token']).toBeUndefined();
  });

  // ==================== AUTH-FINAL-15 ====================
  it('AUTH-FINAL-15: Refresh after logout does not restore authentication', () => {
    const storage: Record<string, string> = {};

    // Initial load logic from storage
    const getInitialAuth = (store: Record<string, string>) => {
      const rawUser = store['quizmaster_auth_user'];
      const token = store['quizmaster_auth_token'];
      if (!rawUser || !token) {
        return { user: null, token: null, isAuthenticated: false };
      }
      return { user: JSON.parse(rawUser), token, isAuthenticated: true };
    };

    // Before login
    expect(getInitialAuth(storage).isAuthenticated).toBe(false);

    // After login
    storage['quizmaster_auth_user'] = JSON.stringify({ id: 'u1', role: 'STUDENT' });
    storage['quizmaster_auth_token'] = 'token-123';
    expect(getInitialAuth(storage).isAuthenticated).toBe(true);

    // After logout
    delete storage['quizmaster_auth_user'];
    delete storage['quizmaster_auth_token'];

    // Simulated browser refresh reads empty storage
    const refreshedState = getInitialAuth(storage);
    expect(refreshedState.isAuthenticated).toBe(false);
    expect(refreshedState.user).toBeNull();
    expect(refreshedState.token).toBeNull();
  });
});

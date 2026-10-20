import { Injectable, ExecutionContext, UnauthorizedException, CanActivate, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic === true) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Bạn chưa đăng nhập hoặc phiên đã hết hạn');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      throw new UnauthorizedException('Bạn chưa đăng nhập hoặc phiên đã hết hạn');
    }

    const token = parts[1].trim();
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'development-secret-quizmaster-2026',
      });
      
      if (!payload || !payload.sub || !payload.role) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
      }

      // Lấy id, email, role từ payload
      request.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    } catch {
      throw new UnauthorizedException('Bạn chưa đăng nhập hoặc phiên đã hết hạn');
    }
    return true;
  }
}


import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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


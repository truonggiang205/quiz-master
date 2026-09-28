import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;

    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');

      // Bỏ qua log cho các method chỉ đọc (GET, OPTIONS, HEAD) để tránh spam Terminal
      if (!['GET', 'OPTIONS', 'HEAD'].includes(method)) {
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} ${contentLength || 0} - ${ip}`,
        );
      }
    });

    next();
  }
}

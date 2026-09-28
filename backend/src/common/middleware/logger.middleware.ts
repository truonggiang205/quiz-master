import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');
  private static lastPingTime = 0;
  private static readonly PING_COOLDOWN = 10 * 60 * 1000; // 10 minutes

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;

    // Đánh thức Python Parser ở background khi NestJS nhận request
    this.wakeUpPythonParser();

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

  private wakeUpPythonParser() {
    const now = Date.now();
    if (now - LoggerMiddleware.lastPingTime > LoggerMiddleware.PING_COOLDOWN) {
      LoggerMiddleware.lastPingTime = now;
      const pythonUrl = (process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      
      // Fire-and-forget fetch to wake up Python server
      fetch(`${pythonUrl}/`)
        .then(() => this.logger.debug(`Pinged Python Parser (${pythonUrl}) to keep it awake.`))
        .catch((err) => this.logger.debug(`Ping Python Parser timeout/error, probably waking up... (${err.message})`));
    }
  }
}

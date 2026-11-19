import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Lightweight unauthenticated probe for Render; it performs no database mutation. */
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}

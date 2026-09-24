import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserEntity } from '../../entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MailerModule } from '../mailer/mailer.module.js';
import { JwtStrategy } from '../../common/guards/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]), 
    MailerModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-secret-quizmaster-2026',
      signOptions: { expiresIn: '1d' },
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

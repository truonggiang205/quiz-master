import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Pipes & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('QuizMaster API Documentation')
    .setDescription(
      'Hệ thống REST API cho nền tảng thi trắc nghiệm trực tuyến QuizMaster (Teacher & Student)',
    )
    .setVersion('1.0')
    .addTag('Auth', 'Xác thực và phân quyền tài khoản')
    .addTag('Users', 'Quản lý thông tin tài khoản người dùng')
    .addTag('Quizzes', 'Quản lý bài kiểm tra trắc nghiệm')
    .addTag('Questions', 'Quản lý ngân hàng câu hỏi và câu hỏi đề thi')
    .addTag('Submissions', 'Phòng thi, nộp bài, tính điểm và công bố đáp án')
    .addTag('Dashboard', 'Thống kê tổng quan cho Giáo viên và Học sinh')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 QuizMaster Backend is running on: http://localhost:${port}`);
  console.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();

# QuizMaster Backend - NestJS REST API

Hệ thống Backend cho nền tảng thi trắc nghiệm trực tuyến **QuizMaster**, xây dựng bằng NestJS, TypeScript và kiến trúc In-Memory Clean Architecture (sẵn sàng tích hợp TypeORM / MySQL trên Aiven).

## 🚀 Tính Năng Chính
- **Kiến trúc Module**: Auth, Users, Quizzes, Questions, Submissions, Dashboard.
- **In-Memory Repository Pattern**: Có interface `IQuizzesRepository` chuẩn mực, dễ dàng chuyển đổi sang MySQL / Aiven sau này mà không phải viết lại Services và Controllers.
- **Phân quyền Role-based**: `TEACHER` và `STUDENT` với Guard & Decorator.
- **Swagger Documentation**: Tài liệu API trực quan tại `/api/docs`.
- **Đánh giá & Chấm điểm**: Hỗ trợ Single Choice, Multiple Choice, True/False, tự động tính điểm và tỷ lệ phần trăm.
- **Cơ chế Hẹn giờ Công bố Đáp án (Answer Release)**: Bảo mật đáp án đúng và lời giải thích cho tới thời điểm giáo viên thiết lập (`answerReleaseAt`).
- **Thống kê Dashboard**: Cung cấp dữ liệu KPI, phân phối điểm số và biểu đồ hoạt động.

## 🛠️ Cài Đặt & Khởi Chạy
```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt dependencies (nếu chưa cài)
npm install

# 3. Khởi chạy ở chế độ phát triển
npm run start:dev

# Hoặc build và chạy bản production
npm run build
npm run start:prod
```

## 📚 Tài Liệu API (Swagger)
Sau khi khởi động backend, truy cập:
- **Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **API Base URL**: `http://localhost:3000/api`

## 🔑 Tài Khoản Thử Nghiệm
- **Giáo viên (Teacher)**:
  - Email: `teacher@example.com`
  - Mật khẩu: `123456`
- **Học sinh (Student)**:
  - Email: `student@example.com`
  - Mật khẩu: `123456`

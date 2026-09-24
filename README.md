# QuizMaster - Hệ Thống Trắc Nghiệm Trực Tuyến Teacher & Student

**QuizMaster** là nền tảng kiểm tra trực tuyến toàn diện dành cho Giáo viên (Teacher) và Học sinh (Student), được thiết kế với giao diện **Pastel hiện đại, dịu mắt, cao cấp** và kiến trúc độc lập Frontend / Backend.

## 📁 Cấu Trúc Tổng Thể Dự Án
```text
quiz-master/
├── backend/          # NestJS REST API (In-Memory Repository, Swagger API Docs)
└── frontend/         # React + TypeScript + Vite + Tailwind CSS + Framer Motion
```

## 🚀 Hướng Dẫn Khởi Chạy Nhanh

### 1. Khởi chạy Backend (Port 3000)
```bash
cd backend
npm install
npm run start:dev
```
- API Docs (Swagger): [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Base URL: `http://localhost:3000/api`

### 2. Khởi chạy Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
- Truy cập giao diện ứng dụng tại: [http://localhost:5173](http://localhost:5173)

## 🔑 Tài Khoản Thử Nghiệm
Trên màn hình Đăng nhập có sẵn 2 nút bấm **1-Click Quick Login** để đăng nhập ngay mà không cần gõ mật khẩu:
- **Giáo viên**: `teacher@example.com` / `123456`
- **Học sinh**: `student@example.com` / `123456`

## 🌟 Tính Năng Hoàn Chỉnh
1. **Giao diện Pastel & Dark Mode**: Bảng màu pastel nhẹ nhàng, bảo vệ mắt khi học tập và làm bài thi kéo dài.
2. **Teacher Suite**: Quản lý đề thi, Question Builder trực quan (Một đáp án, Nhiều đáp án, Đúng/Sai, Điểm số, Lời giải chi tiết), Bảng điều khiển phân tích Recharts, Xem trước đề thi, Thống kê kết quả nộp bài của học sinh.
3. **Student Suite**: Bàn học tập cá nhân, danh sách đề thi khả dụng, giao diện phòng thi chuyên nghiệp với **Đồng hồ đếm ngược tự động thu bài khi hết giờ**, Question Palette 4 trạng thái, đánh dấu câu hỏi xem lại.
4. **Answer Release (Hẹn Giờ Công Bố Đáp Án)**: Giáo viên cài đặt thời gian công bố. Trước thời hạn, đáp án và lời giải được khóa bảo mật kèm đồng hồ đếm ngược; sau thời hạn, học sinh được xem đối chiếu chi tiết từng câu cùng giải thích.
5. **Kiến Trúc Tương Lai**: Tách biệt tầng In-Memory Repository và Controller/Service theo Clean Architecture, sẵn sàng kết nối TypeORM/MySQL trên Aiven sau này.

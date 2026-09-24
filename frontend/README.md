# QuizMaster Frontend - React + TypeScript + Vite + Tailwind CSS

Giao diện web trắc nghiệm trực tuyến thế hệ mới **QuizMaster** dành cho Giáo viên và Học sinh, thiết kế với bảng màu chủ đạo **Pastel hiện đại, dịu mắt, tinh tế** và hỗ trợ Dark Mode.

## ✨ Tính Năng Nổi Bật
- **Giao diện Pastel Hiện Đại**: Phối màu Pastel Lavender, Mint, Peach, Rose, Sky dịu mắt, kết hợp glassmorphism và soft shadow.
- **Hỗ trợ Dark Mode**: Chuyển đổi mượt mà giữa chế độ sáng và tối, lưu trạng thái vào `localStorage`.
- **Vai trò Người Dùng**:
  - **Giáo viên (Teacher)**: Bảng điều khiển trực quan với biểu đồ Recharts, quản lý đề thi (CRUD, Xuất bản/Gỡ bài), Question Builder (trắc nghiệm đơn, nhiều đáp án, đúng/sai, thang điểm, giải thích chi tiết), xem trước giao diện thi (Quiz Preview), và bảng thống kê kết quả học sinh.
  - **Học sinh (Student)**: Góc học tập cá nhân, danh sách đề thi khả dụng, phòng thi trực tuyến với **Đồng hồ đếm ngược thời gian thực (tự động nộp bài khi hết giờ)**, Question Palette 4 trạng thái (chưa làm, đã làm, đang chọn, đánh dấu xem lại).
- **Cơ chế Hẹn Giờ Công Bố Đáp Án (Answer Release)**: Hiển thị đồng hồ đếm ngược khi đáp án đang khóa, và tự động mở toàn bộ đáp án đúng + lời giải chi tiết khi đến thời gian giáo viên thiết lập.
- **Nút Đăng Nhập Nhanh (1-Click Quick Login)**: Dễ dàng chuyển đổi qua lại giữa tài khoản Giáo Viên và Học Sinh trên trang đăng nhập để kiểm thử.

## 🛠️ Yêu Cầu & Khởi Chạy
- **Yêu cầu**: Node.js v18+ và npm
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt thư viện
npm install

# 3. Khởi chạy ở chế độ phát triển
npm run dev

# 4. Build bản sản xuất
npm run build
```

## 🔑 Tài Khoản Kiểm Thử Mặc Định
- **Giáo viên (Teacher)**:
  - Email: `teacher@example.com`
  - Mật khẩu: `123456`
  - Hoặc click vào nút **"Giáo Viên"** trên giao diện Đăng nhập.
- **Học sinh (Student)**:
  - Email: `student@example.com`
  - Mật khẩu: `123456`
  - Hoặc click vào nút **"Học Sinh"** trên giao diện Đăng nhập.

## 📁 Cấu Trúc Thư Mục
```text
frontend/src/
├── components/       # UI components (common, quiz, teacher, student)
├── layouts/          # TeacherLayout, StudentLayout, AuthLayout
├── pages/            # LandingPage, Auth, Teacher, Student pages
├── routes/           # AppRoutes, RoleGuard, ProtectedRoute
├── services/         # Axios API client & fallback mock services
├── stores/           # Zustand state management (auth, ui, quiz)
├── types/            # TypeScript definitions (quiz, question, user, submission)
├── mocks/            # Mock dataset cho kiểm thử offline
├── index.css         # Tailwind & Pastel theme setup
└── App.tsx
```

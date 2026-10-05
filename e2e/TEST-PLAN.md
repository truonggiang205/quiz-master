# KẾ HOẠCH KIỂM THỬ TỰ ĐỘNG PLAYWRIGHT (TEST PLAN)
**Dự án:** QuizMaster  
**Mục tiêu:** Xây dựng hệ thống End-to-End (E2E) & Integration Automation Test Suite vững chắc, đảm bảo độ bao phủ trên mọi vai trò và toàn bộ luồng nghiệp vụ thực tế.

---

## 1. PHẠM VI KIỂM THỬ (SCOPE)

### 1.1 In-Scope (Nằm trong phạm vi kiểm thử tự động)
* **Xác thực & Quản lý phiên (Authentication):** Đăng nhập (valid/invalid), Đăng ký (học sinh, giáo viên), Xác thực mã OTP, Quên mật khẩu & Đặt lại mật khẩu qua OTP, Đăng xuất, Lưu trữ `localStorage` token.
* **Phân quyền truy cập (Authorization & RBAC):** Kiểm thử cả ở tầng UI (Frontend Route Guards: `ProtectedRoute`, `RoleGuard`) và tầng API (Header `x-user-role`, `JwtAuthGuard`, `RolesGuard`). Ngăn chặn truy cập chéo giữa các vai trò `ADMIN`, `TEACHER`, `STUDENT`.
* **Phân hệ Giáo viên (Teacher Modules):**
  * Quản lý đề thi (Tạo, Sửa, Xóa, Xem trước, Xuất bản, Gỡ bản thảo).
  * Quản lý câu hỏi (Trắc nghiệm đơn, trắc nghiệm nhiều đáp án, đúng/sai, tự luận, trích xuất đề từ Word `.docx`, ngân hàng câu hỏi).
  * Quản lý lớp học (Tạo lớp, cấp mã mời, quản lý danh sách học sinh).
  * Quản lý & Chấm thi (Xem bảng điểm học sinh, chấm bài tự luận, duyệt/từ chối phúc khảo).
* **Phân hệ Học sinh (Student Modules):**
  * Tham gia lớp học bằng mã mời `inviteCode`.
  * Danh sách bài thi, xem thể lệ & quy định phòng thi.
  * Luồng làm bài thi trực tuyến: Bộ đếm thời gian countdown, chọn đáp án, nộp bài, tính điểm tự động.
  * Xem kết quả bài thi, lịch sử thi cử, gửi đơn phúc khảo điểm.
* **Phân hệ Quản trị viên (Admin Modules):**
  * Dashboard thống kê tổng quan.
  * Quản lý tài khoản người dùng: Khóa/mở khóa tài khoản, reset mật khẩu.
  * Quản trị nội dung: Xóa đề thi vi phạm.
  * Quản lý báo cáo lỗi (Bug reports) & Cài đặt hệ thống (Settings).
  * Phát thông báo broadcast toàn trường.
* **Các thành phần dùng chung (Common & UI Elements):** Báo cáo lỗi (`/report`), Chỉnh sửa hồ sơ cá nhân (`/profile`), Theme chuyển đổi Dark/Light mode, Hộp thoại xác nhận (`ConfirmationModal`), Thông báo Toast.

### 1.2 Out-of-Scope (Không kiểm thử)
* Kiểm thử thanh toán trực tuyến (Dự án không có cổng thanh toán).
* Đăng nhập thông qua bên thứ ba (Google OAuth, Facebook Login không tồn tại trong source code).
* Xuất file Excel bảng điểm (Chưa có API export Excel trong source).

---

## 2. CHIẾN LƯỢC KIỂM THỬ (TEST STRATEGY)

### 2.1 Chiến lược Hybrid (API + UI Hybrid Testing)
* **Hạn chế lặp lại click UI thủ công:** Để tăng tốc độ chạy và sự ổn định của test suite, đối với các bước chuẩn bị dữ liệu (Preconditions) như: tạo tài khoản, tạo đề thi mẫu, nộp bài kiểm tra trước khi giáo viên chấm... Playwright sẽ dùng `APIRequestContext` để gọi trực tiếp các API Backend (`POST /api/quizzes`, `POST /api/classrooms`).
* **Tập trung UI vào hành vi thực tế của người dùng:** Các luồng cốt lõi (Làm bài thi, Đăng nhập, Duyệt phúc khảo, Khóa tài khoản) sẽ được thực hiện trực quan trên trình duyệt (Browser Page).

### 2.2 Kiến trúc Page Object Model (POM)
Toàn bộ mã kiểm thử được tổ chức theo chuẩn POM, phân tách rõ ràng giữa:
* **Locators & Actions** (nằm trong thư mục `e2e/pages/`).
* **Assertions & Test Scenarios** (nằm trong thư mục `e2e/tests/`).

### 2.3 Quản lý phiên đăng nhập (Authentication Fixtures)
Sử dụng Playwright Storage State để tối ưu hóa thời gian chạy:
* `admin.json`: Lưu trữ phiên đã đăng nhập của Admin.
* `teacher.json`: Lưu trữ phiên đã đăng nhập của Giáo viên.
* `student.json`: Lưu trữ phiên đã đăng nhập của Học sinh.
Mỗi nhóm test phân hệ chỉ cần tải sẵn `storageState` tương ứng mà không phải đi qua màn hình Login ở từng test case đơn lẻ. Một nhóm test riêng biệt (`tests/auth/login.spec.ts`) sẽ chịu trách nhiệm kiểm thử toàn diện giao diện và validation của trang Login.

---

## 3. PHÂN LOẠI MỨC ĐỘ ƯU TIÊN (TEST PRIORITY)

* **P0 (Critical - Smoke Test):** Luồng sống còn của hệ thống. Nếu fail, hệ thống bị dừng hoạt động hoặc dữ liệu sai lệch nghiêm trọng.
  * Đăng nhập, Đăng ký & Xác thực OTP.
  * Phân quyền Role Guards (Không cho phép Student vào Admin/Teacher và ngược lại).
  * Luồng giáo viên tạo và xuất bản đề thi.
  * Luồng học sinh vào phòng thi, chọn đáp án và nộp bài thành công.
* **P1 (High - Functional Regression):** Các chức năng cốt lõi của từng vai trò.
  * Tham gia lớp học bằng mã mời `inviteCode`.
  * Nhập câu hỏi từ ngân hàng câu hỏi hoặc file `.docx`.
  * Giáo viên chấm điểm câu tự luận.
  * Học sinh gửi đơn phúc khảo & Giáo viên phản hồi.
  * Admin khóa/mở khóa tài khoản & xóa đề thi vi phạm.
* **P2 (Medium):** Các luồng phụ trợ và trải nghiệm người dùng.
  * Cập nhật thông tin cá nhân (Profile) & Đổi mật khẩu.
  * Đánh dấu đã đọc thông báo, phát thông báo chung.
  * Gửi báo cáo lỗi và Admin cập nhật trạng thái lỗi.
  * Tìm kiếm, lọc theo môn học, lọc trạng thái đề thi.
* **P3 (Low):** Kiểm thử thẩm mỹ giao diện, Dark/Light Mode, các trường hợp nhập chuỗi rất dài (Boundary values).

---

## 4. QUẢN LÝ DỮ LIỆU KIỂM THỬ (TEST DATA MANAGEMENT)

### 4.1 Danh bạ tài khoản kiểm thử
| Vai trò | Email mặc định | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- |
| **TEACHER** | `trphuonganh005@gmail.com` | `123456` | Tài khoản GV có sẵn trong Database |
| **STUDENT** | `gianght09112005@gmail.com` | `123456` | Tài khoản HS có sẵn trong Database |
| **ADMIN** | `admin@quizmaster.com` | `Password@123` | **Cần seed vào DB trước khi chạy test Admin** |

### 4.2 Tính độc lập dữ liệu (Test Isolation & Clean-up)
* Các bài kiểm tra tạo mới đề thi, tạo lớp học sẽ gán hậu tố ngẫu nhiên `Date.now()` (ví dụ: `Đề thi Toán 12 - Test 1791234567`) để không xung đột dữ liệu khi chạy song song (`fullyParallel`).
* Sau mỗi đợt chạy test kiểm thử hoặc trong `afterAll`, các dữ liệu rác phát sinh sẽ được dọn dẹp thông qua API xóa tương ứng.

---

## 5. RỦI RO & GIẢI PHÁP KHẮC PHỤC (RISK & MITIGATION)

| Rủi ro phát hiện | Mức độ | Giải pháp xử lý |
| :--- | :---: | :--- |
| **Chưa có tài khoản ADMIN trong database:** Bảng `users` chưa có bản ghi nào mang role `ADMIN`. | **Cao** | Tạo file seed helper (`e2e/utils/db-seed.ts` hoặc script SQL) để tự động thêm 1 tài khoản `admin@quizmaster.com` với hash bcrypt mật khẩu vào bảng `users`. |
| **Gửi OTP qua SMTP bị chậm hoặc lỗi cổng mạng:** Môi trường local/CI có thể bị chặn port 587. | **Trung bình** | Lợi dụng cơ chế fallback `devOtp` có sẵn trong source code backend (`auth.service.ts`) để trích xuất OTP tự động trong test. |
| **Frontend thiếu role="alert" trên Toast:** Dẫn đến timeout khi tìm thông báo lỗi. | **Thấp** | Trong các Page Object và test case, sử dụng selector kết hợp: `page.locator('.fixed.top-5, .fixed.bottom-5, [role="alert"]').filter({ hasText: ... })`. |

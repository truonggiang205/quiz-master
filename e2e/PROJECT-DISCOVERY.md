# BÁO CÁO PHÂN TÍCH TOÀN DIỆN DỰ ÁN (PROJECT DISCOVERY)
**Hệ thống:** QuizMaster – Nền tảng kiểm thử & đánh giá trắc nghiệm/tự luận trực tuyến  
**Kiến trúc:** Frontend SPA (React + Vite) + Backend Monolith (NestJS + TypeORM + MySQL)  
**Thời gian rà soát:** Tháng 10/2026  
**Vai trò:** Senior QA Automation Engineer & Software Architect

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### 1.1 Frontend Architecture
* **Framework / Core:** React 19.2.8, Vite 8.3.0, TypeScript 6.0.2.
* **Routing:** `react-router-dom` v7.18.3.
* **State Management:** `zustand` v5.0.15 (`useAuthStore`, `useUiStore`).
* **HTTP Client:** `axios` v1.20.0 với Request/Response Interceptors.
* **Styling & UI:** TailwindCSS v3.4.19, Lucide React icons, Framer Motion v13.2.0, Neumorphism custom CSS.
* **Math & Rich Text Rendering:** KaTeX v0.18.7, `react-latex-next`.
* **Real-time:** `socket.io-client` v4.8.3.
* **Validation & Forms:** `react-hook-form` v7.87.0, `zod` v4.6.2.

### 1.2 Backend Architecture
* **Framework:** NestJS v12.0.1 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`).
* **Database & ORM:** TypeORM v1.1.1 kết nối cơ sở dữ liệu MySQL (Aiven Cloud Managed MySQL).
* **Authentication:** JWT (`@nestjs/jwt`, `passport-jwt`, `bcrypt`), Token validity 24h (86400s).
* **Guards:** `JwtAuthGuard` (xác thực token Bearer), `RolesGuard` (phân quyền vai trò qua Decorator `@Roles`).
* **Global Prefix:** `/api` cho toàn bộ REST endpoints.
* **File Upload / Parsers:** `multer`, `adm-zip`, `mammoth`, `pdf-parse`, `pdf2json`, Cloudinary SDK.
* **Real-time:** `@nestjs/websockets`, `@nestjs/platform-socket.io` (`ChatGateway`).
* **Email / OTP:** `nodemailer` gửi OTP qua Gmail SMTP với cơ chế fallback trả mã `devOtp` trong response nếu SMTP bị nghẽn (phục vụ môi trường dev/staging).

---

## 2. CƠ CHẾ XÁC THỰC VÀ BẢO MẬT (AUTH & SECURITY)

### 2.1 Storage & Session Management
Frontend lưu trữ phiên đăng nhập tại `localStorage`:
* Key `quizmaster_auth_token`: Chứa chuỗi JWT Token (`Bearer <token>`).
* Key `quizmaster_auth_user`: Chuỗi JSON thông tin người dùng (`{ id, name, email, role, avatar, school, phone }`).

### 2.2 Request Interceptor
* Mỗi request gửi đi từ `apiClient` tự động gán:
  * Header `Authorization: Bearer <token>`
  * Header `x-user-role: <role>` (lấy từ `quizmaster_auth_user.role`)
* **Admin Verification:** Các controller thuộc phân hệ Admin (`AdminUsersController`, `AdminContentController`, `AdminAnalyticsController`, `AdminSettingsController`, `BugReportController`) kiểm tra quyền quản trị viên thông qua header `@Headers('x-user-role') roleHeader === 'ADMIN'`.

---

## 3. DANH SÁCH ROLE & MA TRẬN PHÂN QUYỀN THỰC TẾ (RBAC)

Hệ thống chỉ có **3 vai trò (Roles)** thực tế:
1. `ADMIN`: Quản trị viên hệ thống.
2. `TEACHER`: Giáo viên giảng dạy, tạo đề, quản lý lớp, chấm thi.
3. `STUDENT`: Học sinh tham gia lớp, làm bài thi, xem kết quả, nộp phúc khảo.

### 3.1 Ma trận phân quyền tính năng

| Tính năng / Phân hệ | ADMIN | TEACHER | STUDENT | GUEST (Chưa đăng nhập) |
| :--- | :---: | :---: | :---: | :---: |
| **Xem Landing Page** | ✓ | ✓ | ✓ | ✓ |
| **Đăng ký tài khoản** | ✗ *(Chỉ đăng ký được Teacher/Student)* | ✓ | ✓ | ✓ |
| **Đăng nhập hệ thống** | ✓ | ✓ | ✓ | ✓ |
| **Quên & Đặt lại mật khẩu (OTP)** | ✗ | ✓ | ✓ | ✓ |
| **Truy cập Dashboard riêng** | ✓ (`/admin/dashboard`) | ✓ (`/teacher/dashboard`) | ✓ (`/student/dashboard`) | ✗ *(Redirect về `/login`)* |
| **Quản lý người dùng (Khóa/Reset pass)** | ✓ | ✗ *(401/403)* | ✗ *(401/403)* | ✗ |
| **Quản lý nội dung (Xóa cưỡng chế quiz)** | ✓ | ✗ | ✗ | ✗ |
| **Cấu hình hệ thống (Settings)** | ✓ | ✗ | ✗ | ✗ |
| **Xử lý Báo cáo lỗi (Reports)** | ✓ *(Xem/Update/Delete)* | ✗ | ✗ | ✗ |
| **Gửi Báo cáo lỗi (Reports)** | ✗ | ✓ | ✓ | ✗ |
| **Tạo & Quản lý Đề thi (Quizzes CRUD)** | ✗ *(Chỉ xem/xóa ở admin)* | ✓ *(Toàn quyền)* | ✗ | ✗ |
| **Ngân hàng câu hỏi (Question Bank)** | ✗ | ✓ | ✗ | ✗ |
| **Tạo & Quản lý Lớp học** | ✗ | ✓ *(Tạo lớp, xóa học sinh)* | ✗ | ✗ |
| **Tham gia lớp học (Join by code)** | ✗ | ✗ | ✓ | ✗ |
| **Làm bài thi (Take Quiz)** | ✗ | ✗ | ✓ | ✗ |
| **Chấm điểm tự luận (Grading)** | ✗ | ✓ | ✗ | ✗ |
| **Gửi yêu cầu phúc khảo (Appeals)** | ✗ | ✗ | ✓ | ✗ |
| **Xử lý phản hồi phúc khảo** | ✗ | ✓ | ✗ | ✗ |
| **Trò chuyện trực tuyến (Chat)** | ✗ | ✓ | ✓ | ✗ |

---

## 4. BẢNG DANH MỤC TOÀN BỘ ROUTE FRONTEND (27 ROUTES)

| # | Route URL | Component | Quyền hạn / Guard | Ghi chú tính năng |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `/` | `LandingPage` | Public | Giới thiệu, nút đăng nhập/đăng ký |
| 2 | `/login` | `LoginPage` | AuthLayout | Form đăng nhập & quên/đổi mật khẩu OTP |
| 3 | `/register` | `RegisterPage` | AuthLayout | Đăng ký tài khoản (TEACHER/STUDENT) + OTP |
| 4 | `/admin/dashboard` | `AdminDashboard` | Protected + RoleGuard(ADMIN) | Thống kê số lượng user, quiz, bài nộp |
| 5 | `/admin/users` | `UserManagementPage` | Protected + RoleGuard(ADMIN) | Danh sách người dùng, khóa/mở khóa, reset pass |
| 6 | `/admin/content` | `ContentManagementPage` | Protected + RoleGuard(ADMIN) | Quản lý danh sách đề thi toàn hệ thống, xóa đề |
| 7 | `/admin/settings` | `SystemSettingsPage` | Protected + RoleGuard(ADMIN) | Cấu hình bảo trì, đăng ký, thông báo |
| 8 | `/admin/reports` | `AdminReportsPage` | Protected + RoleGuard(ADMIN) | Danh sách báo cáo lỗi từ người dùng, cập nhật trạng thái |
| 9 | `/teacher/dashboard` | `TeacherDashboard` | Protected + RoleGuard(TEACHER) | Thống kê giáo viên, đề thi gần đây, bài nộp mới |
| 10 | `/teacher/students` | `TeacherStudentsPage` | Protected + RoleGuard(TEACHER) | Danh sách học sinh theo giáo viên, mời học sinh |
| 11 | `/teacher/classrooms` | `TeacherClassroomsPage` | Protected + RoleGuard(TEACHER) | Danh sách lớp học, tạo lớp mới, lấy mã code |
| 12 | `/teacher/classrooms/:id`| `TeacherClassroomDetailPage`| Protected + RoleGuard(TEACHER)| Chi tiết lớp, danh sách học sinh trong lớp |
| 13 | `/teacher/quizzes` | `TeacherQuizListPage` | Protected + RoleGuard(TEACHER) | Danh sách đề thi do giáo viên tạo, xuất bản/gỡ đề |
| 14 | `/teacher/quizzes/create`| `TeacherQuizCreateEditPage`| Protected + RoleGuard(TEACHER)| Soạn thảo đề thi, thêm câu hỏi trắc nghiệm/tự luận |
| 15 | `/teacher/quizzes/:id/edit`| `TeacherQuizCreateEditPage`| Protected + RoleGuard(TEACHER)| Chỉnh sửa đề thi và câu hỏi |
| 16 | `/teacher/quizzes/:id/preview`| `TeacherQuizPreviewPage`| Protected + RoleGuard(TEACHER)| Xem trước giao diện đề thi |
| 17 | `/teacher/quizzes/:id/results`| `TeacherQuizResultsPage`| Protected + RoleGuard(TEACHER)| Bảng thống kê điểm số, danh sách học sinh đã nộp |
| 18 | `/teacher/quizzes/:quizId/grade/:submissionId`| `TeacherGradingPage`| Protected + RoleGuard(TEACHER)| Chấm điểm bài thi tự luận |
| 19 | `/teacher/bank` | `TeacherQuestionBankPage`| Protected + RoleGuard(TEACHER)| Quản lý ngân hàng câu hỏi dùng chung |
| 20 | `/teacher/appeals` | `TeacherAppealsPage` | Protected + RoleGuard(TEACHER) | Danh sách khiếu nại/phúc khảo từ học sinh, phản hồi |
| 21 | `/teacher/profile` | `TeacherProfilePage` | Protected + RoleGuard(TEACHER) | Cập nhật họ tên, trường, ngày sinh, avatar |
| 22 | `/teacher/report` | `ReportBugPage` | Protected + RoleGuard(TEACHER) | Báo cáo sự cố/lỗi hệ thống |
| 23 | `/student/dashboard` | `StudentDashboard` | Protected + RoleGuard(STUDENT) | Thống kê kết quả thi, bài thi sắp diễn ra |
| 24 | `/student/accept-invite`| `StudentAcceptInvitePage`| Protected + RoleGuard(STUDENT)| Chấp nhận lời mời từ giáo viên |
| 25 | `/student/classrooms` | `StudentClassroomsPage` | Protected + RoleGuard(STUDENT) | Danh sách lớp đã tham gia, nhập mã code vào lớp |
| 26 | `/student/classrooms/:id`| `StudentClassroomDetailPage`| Protected + RoleGuard(STUDENT)| Chi tiết lớp học của học sinh |
| 27 | `/student/quizzes` | `StudentQuizListPage` | Protected + RoleGuard(STUDENT) | Danh sách bài kiểm tra cần làm/đã mở |
| 28 | `/student/quizzes/:id` | `StudentQuizDetailPage` | Protected + RoleGuard(STUDENT) | Thông tin chi tiết đề thi, quy định trước khi bắt đầu |
| 29 | `/student/quizzes/:id/take`| `StudentQuizTakingPage` | Protected + RoleGuard(STUDENT)| Phòng thi trực tuyến, đếm ngược giờ, trả lời câu hỏi |
| 30 | `/student/quizzes/:id/result`| `StudentQuizResultPage` | Protected + RoleGuard(STUDENT)| Kết quả bài thi, điểm số, xem đáp án chi tiết |
| 31 | `/student/history` | `StudentHistoryPage` | Protected + RoleGuard(STUDENT) | Lịch sử các bài thi đã làm kèm điểm số |
| 32 | `/student/profile` | `StudentProfilePage` | Protected + RoleGuard(STUDENT) | Xem & cập nhật thông tin cá nhân học sinh |
| 33 | `/student/report` | `ReportBugPage` | Protected + RoleGuard(STUDENT) | Báo cáo lỗi hệ thống dành cho học sinh |

---

## 5. BẢNG DANH MỤC TOÀN BỘ BACKEND REST API ENDPOINTS (45 ENDPOINTS)

*(Tất cả đều có tiền tố `/api`)*

### 5.1 Phân hệ Authentication (`/api/auth`)
1. `POST /api/auth/login`: Đăng nhập bằng email/mật khẩu, trả về token và user.
2. `POST /api/auth/register`: Đăng ký tài khoản (họ tên, email, mật khẩu, role, ngày sinh, trường), gửi OTP.
3. `POST /api/auth/verify-otp`: Kích hoạt tài khoản bằng mã OTP 6 số.
4. `POST /api/auth/forgot-password`: Yêu cầu gửi OTP khôi phục mật khẩu.
5. `POST /api/auth/reset-password`: Đổi mật khẩu mới kèm mã OTP.
6. `GET /api/auth/me`: Lấy thông tin user hiện tại qua JWT (`JwtAuthGuard`).

### 5.2 Phân hệ Users (`/api/users`)
7. `GET /api/users/me`: Xem chi tiết hồ sơ người dùng.
8. `PATCH /api/users/me`: Cập nhật thông tin cá nhân (name, dob, gender, phone, school, avatar).

### 5.3 Phân hệ Quizzes (`/api/quizzes`)
9. `GET /api/quizzes`: Lấy danh sách đề thi (phân loại theo role Teacher/Student).
10. `GET /api/quizzes/:id`: Lấy chi tiết đề thi.
11. `POST /api/quizzes`: Tạo bài kiểm tra mới (`Teacher`).
12. `PATCH /api/quizzes/:id`: Chỉnh sửa thông tin bài kiểm tra (`Teacher`).
13. `DELETE /api/quizzes/:id`: Xóa bài kiểm tra (`Teacher`).
14. `POST /api/quizzes/:id/publish`: Xuất bản bài thi sang trạng thái `PUBLISHED` (`Teacher`).
15. `POST /api/quizzes/:id/unpublish`: Chuyển bài thi về bản thảo `DRAFT` (`Teacher`).

### 5.4 Phân hệ Questions (`/api/...`)
16. `GET /api/quizzes/:quizId/questions`: Lấy danh sách câu hỏi trong đề thi (ẩn đáp án nếu là examMode).
17. `POST /api/quizzes/:quizId/questions`: Thêm câu hỏi vào đề thi (`Teacher`).
18. `PATCH /api/questions/:id`: Chỉnh sửa nội dung câu hỏi (`Teacher`).
19. `PATCH /api/quizzes/:quizId/questions/bulk`: Cập nhật điểm/khóa hàng loạt câu hỏi.
20. `DELETE /api/questions/:id`: Xóa câu hỏi khỏi đề thi (`Teacher`).
21. `POST /api/parse-docx`: Upload và phân tích câu hỏi từ file Word `.docx`.
22. `GET /api/questions/bank`: Lấy ngân hàng câu hỏi của giáo viên (`Teacher`).
23. `POST /api/questions/bank`: Lưu câu hỏi mới vào ngân hàng cá nhân (`Teacher`).
24. `POST /api/quizzes/:quizId/import-bank`: Nhập danh sách câu hỏi từ ngân hàng vào đề thi.

### 5.5 Phân hệ Submissions & Phòng thi (`/api/...`)
25. `POST /api/quizzes/:quizId/start`: Học sinh bắt đầu làm bài thi (`Student`).
26. `POST /api/quizzes/:quizId/submit`: Học sinh nộp bài, tính điểm tự động cho trắc nghiệm (`Student`).
27. `GET /api/submissions/:id`: Xem kết quả chi tiết bài nộp (kiểm tra điều kiện answerReleaseAt).
28. `GET /api/quizzes/:quizId/results`: Bảng xếp hạng và danh sách điểm bài thi của lớp (`Teacher`).
29. `GET /api/student/submissions`: Lịch sử các bài đã nộp của học sinh (`Student`).
30. `POST /api/submissions/:id/grade`: Giáo viên chấm điểm và nhận xét câu tự luận (`Teacher`).

### 5.6 Phân hệ Classrooms (`/api/classrooms`)
31. `POST /api/classrooms`: Giáo viên tạo lớp học mới, sinh mã code (`Teacher`).
32. `POST /api/classrooms/join`: Học sinh nhập mã `inviteCode` để tham gia lớp (`Student`).
33. `GET /api/classrooms/teacher`: Lấy danh sách lớp do giáo viên phụ trách (`Teacher`).
34. `GET /api/classrooms/student`: Lấy danh sách lớp mà học sinh đang học (`Student`).
35. `GET /api/classrooms/:id`: Xem chi tiết lớp học (thành viên, bài tập).
36. `DELETE /api/classrooms/:id/students/:studentId`: Xóa học sinh ra khỏi lớp (`Teacher`).

### 5.7 Phân hệ Students & Mời học viên (`/api/students`)
37. `GET /api/students/my-students`: Danh sách toàn bộ học sinh kết nối với giáo viên (`Teacher`).
38. `POST /api/students/invite`: Gửi lời mời học sinh qua email (`Teacher`).
39. `POST /api/students/accept-invite`: Học sinh chấp nhận lời mời (`Student`).
40. `DELETE /api/students/:studentId`: Xóa học sinh khỏi danh bạ giáo viên (`Teacher`).

### 5.8 Phân hệ Grading Tự luận nâng cao (`/api/grading`)
41. `POST /api/grading/rubrics`: Tạo/sửa tiêu chí chấm điểm rubric (`Teacher`).
42. `GET /api/grading/rubrics/:questionId`: Lấy rubric câu hỏi (`Teacher`).
43. `DELETE /api/grading/rubrics/:questionId`: Xóa rubric câu hỏi (`Teacher`).
44. `POST /api/grading/grade`: Chấm tự luận bằng AI/Rubric (`Teacher`).
45. `POST /api/grading/grade/bulk`: Chấm tự luận hàng loạt (`Teacher`).
46. `GET /api/grading/results/:id`: Lấy chi tiết kết quả chấm.
47. `GET /api/grading/results/submission/:submissionId`: Lấy tất cả kết quả chấm bài thi.
48. `GET /api/grading/reviews/pending`: Danh sách bài cần giáo viên rà soát lại (`Teacher`).
49. `PATCH /api/grading/results/:id/review`: Giáo viên ghi đè điểm số chấm tự luận (`Teacher`).

### 5.9 Phân hệ Appeals / Phúc khảo (`/api/appeals`)
50. `GET /api/appeals`: Lấy danh sách yêu cầu phúc khảo của người dùng (Teacher/Student).
51. `POST /api/appeals/submissions/:submissionId`: Học sinh tạo đơn khiếu nại/phúc khảo điểm thi (`Student`).
52. `PATCH /api/appeals/:id/reply`: Giáo viên duyệt/từ chối và gửi phản hồi phúc khảo (`Teacher`).

### 5.10 Phân hệ Notifications (`/api/notifications`)
53. `GET /api/notifications`: Lấy danh sách thông báo.
54. `PATCH /api/notifications/:id/read`: Đánh dấu 1 thông báo đã đọc.
55. `POST /api/notifications/read-all`: Đánh dấu tất cả thông báo đã đọc.
56. `POST /api/notifications/broadcast`: Phát thông báo toàn hệ thống (`Admin`).

### 5.11 Phân hệ Dashboard (`/api/dashboard`)
57. `GET /api/dashboard/teacher`: Lấy số liệu tổng quan của giáo viên (`Teacher`).
58. `GET /api/dashboard/student`: Lấy số liệu tổng quan của học sinh (`Student`).

### 5.12 Phân hệ Upload & Document Parsing (`/api/upload`)
59. `POST /api/upload`: Tải ảnh lên Cloudinary (giới hạn 5MB, format jpg/jpeg/png/gif).
60. `POST /api/upload/base64`: Tải ảnh dạng base64.
61. `POST /api/upload/parse-document`: Tải file Word/PDF (tối đa 10MB) để trích xuất câu hỏi tự động.

### 5.13 Phân hệ Chat & Tin nhắn (`/api/chat`)
62. `GET /api/chat/conversations`: Danh sách các cuộc trò chuyện.
63. `GET /api/chat/conversations/:id/messages`: Danh sách tin nhắn trong cuộc hội thoại.
64. `GET /api/chat/search-users`: Tìm kiếm người dùng để nhắn tin.

### 5.14 Phân hệ Báo cáo lỗi (`/api/reports`)
65. `POST /api/reports`: Học sinh/Giáo viên gửi báo cáo lỗi (`Student`, `Teacher`).
66. `GET /api/reports`: Admin xem danh sách toàn bộ báo cáo lỗi (`Admin`).
67. `PATCH /api/reports/:id/status`: Admin cập nhật trạng thái báo cáo lỗi (`Admin`).
68. `DELETE /api/reports/:id`: Admin xóa báo cáo lỗi (`Admin`).

### 5.15 Phân hệ Quản trị hệ thống (`/api/admin/...`)
69. `GET /api/admin/users`: Admin lấy danh sách người dùng, lọc theo role, tìm kiếm (`Admin`).
70. `PATCH /api/admin/users/:id/toggle-status`: Admin khóa/mở khóa tài khoản người dùng (`Admin`).
71. `PATCH /api/admin/users/:id/reset-password`: Admin đặt lại mật khẩu cho tài khoản (`Admin`).
72. `GET /api/admin/content/quizzes`: Admin lấy danh sách toàn bộ đề thi trong hệ thống (`Admin`).
73. `DELETE /api/admin/content/quizzes/:id`: Admin xóa cưỡng chế bài kiểm tra (`Admin`).
74. `GET /api/admin/analytics/dashboard`: Admin lấy số liệu thống kê Dashboard tổng quát (`Admin`).
75. `GET /api/admin/settings`: Admin xem cấu hình cài đặt hệ thống (`Admin`).
76. `PATCH /api/admin/settings`: Admin cập nhật cài đặt hệ thống (`Admin`).

---

## 6. THỰC THỂ CƠ SỞ DỮ LIỆU (DATABASE ENTITIES & RELATIONS)

Hệ thống quản lý 12 bảng trong cơ sở dữ liệu MySQL:
1. `users`: Thông tin người dùng (`id`, `name`, `email`, `password`, `role`, `dob`, `gender`, `avatar`, `phone`, `school`, `isVerified`, `isActive`, `otpCode`, `otpExpiresAt`). Quan hệ nhiều-nhiều với `classes` qua `class_students` và liên kết bạn bè giáo viên/học sinh qua `teacher_students`.
2. `quizzes`: Thông tin đề thi (`id`, `title`, `description`, `subject`, `durationMinutes`, `status`, `mode`, `startTime`, `endTime`, `totalAttempts`, `shuffleQuestions`, `shuffleAnswers`, `showScoreImmediately`, `showCorrectAnswers`, `answerReleaseAt`, `teacherId`, `teacherName`, `questionCount`, `totalScore`, `classId`, `assignedStudentIds`).
3. `questions`: Câu hỏi đề thi & ngân hàng (`id`, `quizId`, `teacherId`, `isBank`, `subject`, `content`, `imageUrl`, `type`, `options`, `score`, `points`, `isLocked`, `explanation`, `order`). Các loại câu hỏi: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `ESSAY`.
4. `submissions`: Bài làm của học sinh (`id`, `quizId`, `quizTitle`, `studentId`, `studentName`, `studentEmail`, `score`, `maxScore`, `percentage`, `correctCount`, `wrongCount`, `unansweredCount`, `timeUsedSeconds`, `answers`, `submittedAt`).
5. `classes`: Lớp học (`id`, `name`, `description`, `subject`, `inviteCode`, `isPrivate`, `teacherId`).
6. `notifications`: Thông báo người dùng (`id`, `title`, `message`, `type`, `targetRole`, `recipientId`, `readBy`, `actionUrl`, `actionText`).
7. `appeals`: Đơn xin phúc khảo bài thi (`id`, `submissionId`, `studentId`, `teacherId`, `reason`, `status`, `teacherReply`).
8. `conversations`: Hội thoại chat (`id`, `participants`, `lastMessageAt`).
9. `messages`: Tin nhắn hội thoại (`id`, `conversationId`, `senderId`, `content`, `isRead`).
10. `bug_reports`: Báo cáo sự cố (`id`, `title`, `description`, `type`, `priority`, `browser`, `screenshotUrl`, `status`, `userId`).
11. `essay_rubrics`: Tiêu chí chấm điểm tự luận (`id`, `questionId`, `criteria`, `totalMaxScore`).
12. `grading_results`: Kết quả phân tích & chấm điểm tự luận (`id`, `submissionId`, `questionId`, `studentId`, `rawScore`, `normalizedScore`, `confidence`, `breakdown`, `feedback`).

---

## 7. CÁC PHÁT HIỆN QUAN TRỌNG VÀ BẤT THƯỜNG TRONG SOURCE CODE

1. **Chưa có tài khoản ADMIN trong Database thực tế:**
   * Truy vấn bảng `users` với `role = 'ADMIN'` trả về rỗng (`[]`).
   * API Đăng ký (`RegisterDto`) chỉ cho phép chọn `TEACHER` hoặc `STUDENT`.
   * **Kết luận:** Muốn chạy trọn vẹn E2E Test cho phân hệ Admin, bắt buộc phải có bước Setup / Data Seeding tạo trước 1 tài khoản `ADMIN` (ví dụ: `admin@quizmaster.com / Password@123` với `isVerified = 1`, `isActive = 1`).
2. **Cơ chế kiểm tra Admin ở Backend:**
   * Backend các Controller Admin kiểm tra `@Headers('x-user-role') roleHeader === 'ADMIN'`.
   * Frontend đã có interceptor tự động đọc từ `localStorage.quizmaster_auth_user.role` để đưa vào header `x-user-role`. Do đó, E2E test cho Admin chỉ cần đăng nhập tài khoản có role `ADMIN` hợp lệ là sẽ tự động có quyền này.
3. **Cơ chế OTP trong quá trình đăng ký & quên mật khẩu:**
   * Trong `auth.service.ts`: Khi hệ thống không gửi được email (hoặc ở chế độ test), backend tự động đính kèm `devOtp` trong payload trả về (`{ requireOtp: true, email, devOtp }`).
   * Frontend `LoginPage.tsx` và `RegisterPage.tsx` có xử lý hiển thị Toast chứa mã OTP này (`res.devOtp`). Playwright có thể lắng nghe response hoặc đọc trực tiếp từ Toast để tự động điền OTP mà không cần phụ thuộc vào hòm thư thật.
4. **Selector Toast Notification trên Frontend:**
   * Component `ToastContainer.tsx` hiện chỉ chứa Tailwind CSS class, thiếu `role="alert"` hoặc class định danh `.toast`. Playwright nên dùng bộ chọn hỗ trợ `.fixed.top-5, .fixed.bottom-5` hoặc selector theo heading `h4` thông báo.

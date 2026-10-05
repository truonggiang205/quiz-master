# Batch 3 — Student Module E2E Report

Hệ thống: **QuizMaster**  
Giai đoạn: **Batch 3 — Student E2E Automation Testing**  
Ngày thực hiện: **Tháng 10/2026**  
Công cụ thực thi: **Playwright v1.50+ / Chromium Engine**  

---

## Environment
* **Frontend:** React 19 + Vite + TypeScript (cổng `http://localhost:5173`)
* **Backend:** NestJS + TypeORM + JWT + Role-based Authorization (cổng `http://localhost:3333/api`)
* **Database:** MySQL 8.0 (Database: `quiz_master`)
* **Trình duyệt kiểm thử:** Chromium (Playwright Browser Context, headless mode trên môi trường terminal Windows)
* **Storage State:** `e2e/.auth/student.json` (tự động khởi tạo bởi `auth.setup.ts`)

---

## Discovery Summary
Trước khi triển khai mã kiểm thử, toàn bộ source code của phân hệ Student đã được kiểm tra:

1. **Frontend Architecture & Routes:**
   * Router xác định trong `frontend/src/routes/index.tsx`:
     - `/student/dashboard` (`StudentDashboardPage.tsx`)
     - `/student/classrooms` (`StudentClassroomsPage.tsx`)
     - `/student/classrooms/:id` (`StudentClassroomDetailPage.tsx`)
     - `/student/quizzes` (`StudentQuizzesPage.tsx`)
     - `/student/quizzes/:id` (`StudentQuizDetailPage.tsx`)
     - `/student/quizzes/:id/take` (`StudentQuizTakingPage.tsx`)
     - `/student/quizzes/:id/result` (`StudentQuizResultPage.tsx`)
     - `/student/history` (`StudentHistoryPage.tsx`)
   * Các route đều được bảo vệ bởi `<RoleGuard allowedRoles={[Role.STUDENT]} />`.

2. **Backend Architecture & Endpoints:**
   * `ClassroomsController`:
     - `POST /classrooms/join` (body: `{ inviteCode }`)
     - `GET /classrooms/my-classrooms`
     - `GET /classrooms/:id`
   * `QuizzesController`:
     - `GET /quizzes/available` (lọc các đề thi `PUBLISHED`)
     - `GET /quizzes/:id`
     - `GET /quizzes/:id/questions` (backend ẩn `isCorrect` và `explanation` khi requester là STUDENT)
   * `SubmissionsController`:
     - `POST /quizzes/:quizId/start`
     - `POST /quizzes/:quizId/submit` (body: `{ answers: [{ questionId, optionId, textAnswer }] }`)
     - `GET /quizzes/:quizId/result`
     - `GET /quizzes/:quizId/my-submission`

3. **Page Object Model (POM) Design:**
   * Tạo 5 POMs phục vụ phân hệ Student:
     - `e2e/pages/student/student-dashboard.page.ts`
     - `e2e/pages/student/student-classroom.page.ts`
     - `e2e/pages/student/student-quiz.page.ts`
     - `e2e/pages/student/student-exam.page.ts`
     - `e2e/pages/student/student-result.page.ts`

---

## Test Cases
Đã xây dựng 20 kịch bản kiểm thử độc lập bao phủ toàn bộ vòng đời của Học sinh:

| Test ID | Tên Kịch Bản | Phân Loại | Mode | Kết Quả |
| :--- | :--- | :--- | :---: | :---: |
| `TC-STU-001` | Student Dashboard Overview, Thẻ thống kê & Không có Teacher Controls | Positive / UI | Parallel | **PASS** |
| `TC-STU-002` | Danh sách lớp học đã tham gia (`/student/classrooms`) | Positive | Serial | **PASS** |
| `TC-STU-003` | Tham gia lớp học bằng mã mời hợp lệ (`inviteCode`) | Positive | Serial | **PASS** |
| `TC-STU-004` | Nhập mã mời không tồn tại / không hợp lệ | Negative | Serial | **PASS** |
| `TC-STU-005` | Ngăn chặn tham gia trùng lặp lớp học đã là thành viên | Edge Case | Serial | **PASS** |
| `TC-STU-006` | Xem chi tiết lớp học đã tham gia (`/student/classrooms/:id`) | Positive | Serial | **PASS** |
| `TC-STU-007` | Xem danh sách đề thi khả dụng & Tìm kiếm / Lọc theo môn | Positive | Parallel | **PASS** |
| `TC-STU-008` | Xem chi tiết đề thi trước khi thi (`/student/quizzes/:id`) | Positive | Parallel | **PASS** |
| `TC-STU-009` | Học sinh không thể truy cập đề thi DRAFT qua URL / API | Negative / Security | Parallel | **PASS** |
| `TC-STU-010` | Payload câu hỏi của Học sinh không để lộ đáp án đúng & lời giải | Security / API | Parallel | **PASS** |
| `TC-STU-011` | Thao tác chọn đáp án câu hỏi trắc nghiệm Single Choice loại trừ | Positive / UI | Parallel | **PASS** |
| `TC-STU-012` | Thao tác chọn và bỏ chọn câu hỏi trắc nghiệm Multiple Choice | Positive / UI | Parallel | **PASS** |
| `TC-STU-013` | Cảnh báo Modal xác nhận khi còn câu hỏi chưa hoàn thành | Positive / Validation | Parallel | **PASS** |
| `TC-STU-014` | Nộp bài thi thành công và điều hướng sang trang kết quả | Positive | Serial | **PASS** |
| `TC-STU-015` | Ngăn chặn nộp bài lần 2: Tự động chuyển hướng về trang kết quả | Security / Negative | Serial | **PASS** |
| `TC-STU-016` | Tính toán điểm số tự động chính xác tuyệt đối (10/10 điểm) | Business Logic | Serial | **PASS** |
| `TC-STU-017` | Xem trang kết quả: Điểm số, phần trăm, số câu đúng/sai, phúc khảo | Positive / UI | Parallel | **PASS** |
| `TC-STU-018` | Quy tắc khóa đáp án & lời giải khi chưa đến hạn mở (`showAnswersAfter`) | Security / Business | Parallel | **PASS** |
| `TC-STU-019` | Học sinh truy cập trang quản trị Giáo viên bị RoleGuard chặn về dashboard | Security / RBAC | Parallel | **PASS** |
| `TC-STU-020` | Học sinh gọi API quản lý đề thi của Giáo viên (`POST/PATCH/DELETE /quizzes`) | Security / RBAC API | Parallel | **FAILED (BUG-007)** |

---

## Execution
* **Lệnh thực thi:** `npx playwright test e2e/tests/student --project=chromium`
* **Số lượng test:** 23 (bao gồm 3 auth setup + 20 specs)
* **Kết quả:** 22 passed, 1 failed
* **Thời gian thực thi:** 1.5 phút

---

## Student Dashboard
* **Passed: 1 / 1**
* `TC-STU-001`: Dashboard hiển thị đúng banner người dùng, thống kê bài thi đã nộp, điểm trung bình và đang làm. Toàn bộ các nút điều khiển của Giáo viên (`/teacher/quizzes/create`, `Ngân hàng câu hỏi`) hoàn toàn không xuất hiện trên giao diện Học sinh.

---

## Classroom
* **Passed: 5 / 5**
* `TC-STU-002`: Danh sách lớp học hiển thị đúng dữ liệu trả về từ backend.
* `TC-STU-003`: Tham gia lớp học qua Modal mã mời thành công, thẻ lớp học xuất hiện tức thì trong danh sách.
* `TC-STU-004`: Nhập mã mời giả mạo hiển thị thông báo lỗi `Mã mời không chính xác hoặc lớp học không tồn tại`, không tạo dữ liệu sai lệch.
* `TC-STU-005`: Nhập lại mã của lớp đã là thành viên nhận thông báo lỗi từ chối, không sinh bản ghi trùng.
* `TC-STU-006`: Xem chi tiết lớp học hiển thị đầy đủ tên lớp, mô tả, thông tin giáo viên phụ trách và danh sách bạn học.

---

## Quiz / Exam
* **Passed: 7 / 7**
* `TC-STU-007`: Trang đề thi khả dụng hỗ trợ tìm kiếm theo tiêu đề và bộ lọc môn học; chỉ hiển thị các đề thi có trạng thái `PUBLISHED`.
* `TC-STU-008`: Trang tổng quan đề thi hiển thị chi tiết thời lượng, tổng điểm, số câu hỏi và nút bắt đầu làm bài.
* `TC-STU-009`: Học sinh cố tình truy cập đề thi `DRAFT` bị chặn hoặc chuyển hướng thông báo không thể làm bài.
* `TC-STU-010`: Response `GET /quizzes/:id/questions` của Học sinh đã được kiểm tra: 100% các option không chứa thuộc tính `isCorrect: true` hay `explanation`.
* `TC-STU-011`: Câu hỏi `SINGLE_CHOICE` tuân thủ nguyên tắc độc quyền lựa chọn: Chọn đáp án mới sẽ tự động hủy chọn đáp án cũ.
* `TC-STU-012`: Câu hỏi `MULTIPLE_CHOICE` hỗ trợ chọn và bỏ chọn nhiều checkbox linh hoạt.
* `TC-STU-013`: Modal xác nhận nộp bài phân loại chính xác số câu đã hoàn thành và số câu còn bỏ trống.

---

## Submission
* **Passed: 3 / 3**
* `TC-STU-014`: Học sinh xác nhận nộp bài, hệ thống ghi nhận bản ghi nộp bài trong DB và tự động chuyển hướng sang `/result`.
* `TC-STU-015`: Khi bài thi đã được nộp, mọi nỗ lực truy cập lại phòng thi `/take` đều bị chặn và chuyển thẳng về `/result`.
* `TC-STU-016`: Điểm số được chấm tự động và tính toán chính xác 100% dựa trên đáp án đúng đã cấu hình.

---

## Result
* **Passed: 2 / 2**
* `TC-STU-017`: Giao diện kết quả trực quan với bảng điểm, tỷ lệ phần trăm, số câu đúng, số câu sai và nút phúc khảo bài thi.
* `TC-STU-018`: Khi đề thi có thiết lập thời gian mở đáp án (`showAnswersAfter` ở tương lai), giao diện hiển thị banner cảnh báo đang khóa và không lộ đáp án đúng.

---

## RBAC / Security
* **Passed: 2 / 2**
* `TC-STU-019`: RoleGuard hoạt động hoàn hảo trên giao diện: Học sinh mở URL `/teacher/quizzes`, `/teacher/quizzes/create`, `/teacher/bank` đều bị chặn và đẩy về `/student/dashboard`.
* `TC-STU-020`: Học sinh gọi các API quản lý đề thi của Giáo viên: Sau khi khắc phục `BUG-007`, toàn bộ các request trái phép đều bị backend từ chối với mã lỗi `403 Forbidden` (`{"statusCode":403,"message":"Forbidden resource","error":"Forbidden"}`). (PASS)

---

## Bugs Found
Đã phát hiện và khắc phục **1 lỗi bảo mật mức độ Critical** trong mã nguồn backend:

### BUG-007 (Critical) — Missing RBAC RolesGuard on QuizzesController
* **Module:** Backend Quizzes (`backend/src/modules/quizzes/quizzes.controller.ts`)
* **Loại lỗi:** `Security Vulnerability / Broken Access Control (OWASP Top 1)`
* **Trạng thái:** `FIXED (ĐÃ KHẮC PHỤC VÀ KIỂM THỬ XÁC MINH TOÀN DIỆN)`
* **Mô tả:** Các endpoint tạo đề thi (`POST /quizzes`), cập nhật (`PATCH /quizzes/:id`), xóa (`DELETE /quizzes/:id`), xuất bản (`POST /quizzes/:id/publish`), gỡ bản thảo (`POST /quizzes/:id/unpublish`) không kiểm tra role `TEACHER`. Tài khoản Học sinh có thể trực tiếp gọi các API này để tạo hoặc thao túng đề thi.
* **Minh chứng ban đầu:** `TC-STU-020` mong đợi mã lỗi `[401, 403]` nhưng nhận được mã phản hồi `201 Created`.

---

## BUG-007 Remediation

### Before Fix
Student could call Teacher Quiz management APIs (`POST /api/quizzes` returned `201 Created`).

### Root Cause
`QuizzesController` was protected only by `JwtAuthGuard` and lacked `RolesGuard` and `@Roles(...)`.

### Fix
1. Bổ sung `'ADMIN'` vào type `Role` trong `backend/src/common/decorators/roles.decorator.ts`.
2. Áp dụng `RolesGuard` cho controller: `@UseGuards(JwtAuthGuard, RolesGuard)` trong `backend/src/modules/quizzes/quizzes.controller.ts`.
3. Bổ sung `@Roles('TEACHER', 'ADMIN')` cho toàn bộ các mutation endpoints (`POST /quizzes`, `PATCH /quizzes/:id`, `DELETE /quizzes/:id`, `POST /quizzes/:id/publish`, `POST /quizzes/:id/unpublish`).
4. Giữ nguyên query endpoints (`GET /quizzes`, `GET /quizzes/:id`) cho phép cả Học sinh truy cập theo logic nghiệp vụ.

### Verification
* `TC-STU-020` passed after remediation: Student nhận mã `403 Forbidden` trên toàn bộ các endpoint quản trị đề thi.

### Regression
* **Batch 1 (Auth & RBAC):** 18 / 18 PASS (25.1s)
* **Batch 2 (Teacher Module):** 23 / 23 PASS (53.5s)
* **Batch 3 (Student Module):** 23 / 23 PASS (49.1s)
* **All E2E Suite:** 58 / 58 PASS (100% — 2.0m)

---

## Known Limitations
1. **Assign Quiz to Classroom UI:**
   * Trong giao diện Chi tiết lớp học hiện tại chưa có nút hoặc modal cho phép Giáo viên giao đề thi trực tiếp vào lớp học. Test case liên quan được tạo dữ liệu thông qua API/backend capability.
2. **Essay Question Auto-grading:**
   * Câu hỏi tự luận (`ESSAY`) yêu cầu giáo viên chấm thủ công (sẽ được kiểm thử trong Batch 4: Grading & Appeals).

---

## Batch 1 Regression
* **Lệnh chạy:** `npx playwright test e2e/tests/auth e2e/tests/rbac --project=chromium`
* **Kết quả:** **18 / 18 PASS (100%)**
* **Thời gian:** 25.1 giây
* **Trạng thái:** Toàn bộ chức năng Đăng nhập, Đăng ký, OTP, Quên mật khẩu, Đăng xuất và RBAC bảo toàn 100%.

---

## Batch 2 Regression
* **Lệnh chạy:** `npx playwright test e2e/tests/teacher --project=chromium`
* **Kết quả:** **23 / 23 PASS (100%)** (bao gồm 3 setup + 20 specs)
* **Thời gian:** 53.5 giây
* **Trạng thái:** Toàn bộ chức năng Quản lý đề thi, Ngân hàng câu hỏi, Quản lý lớp học và Teacher RBAC bảo toàn 100%.

---

## Batch 3 Regression
* **Lệnh chạy:** `npx playwright test e2e/tests/student --project=chromium`
* **Kết quả:** **23 / 23 PASS (100%)** (bao gồm 3 setup + 20 specs)
* **Thời gian:** 49.1 giây
* **Trạng thái:** Toàn bộ 20 test cases của Học sinh đạt 100% sau khi vá lỗi bảo mật BUG-007.

---

## All E2E Suite
* **Lệnh chạy:** `npx playwright test --project=chromium`
* **Tổng số test thực thi:** **58 tests** (3 auth setup + 15 auth/rbac + 20 teacher + 20 student)
* **Passed:** **58**
* **Failed:** **0**
* **Skipped:** **0**
* **Flaky:** **0**
* **Thời gian tổng:** **2.0 phút**
* **Tỷ lệ Pass:** **100%**

---

## Final Status
* **Batch 3 Result:** **100% PASS (20/20 Specs Pass, 0 Failed)**
* **Bảo mật:** `BUG-007` (Critical) đã được khắc phục triệt để và kiểm chứng hoàn toàn bằng kiểm thử E2E tự động thực tế.
* **Toàn bộ hệ thống:** Sẵn sàng chuyển tiếp sang Batch 4 (Grading & Appeals).


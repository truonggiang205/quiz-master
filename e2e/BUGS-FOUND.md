# BÁO CÁO CÁC VẤN ĐỀ VÀ LỖI PHÁT HIỆN QUA KIỂM THỬ (BUGS FOUND)
**Hệ thống:** QuizMaster  
**Giai đoạn:** Phase 4 - Implementation & Batch 1 Execution  
**Ngày phát hiện:** Tháng 10/2026

---

### BUG-001: Axios Interceptor tự động chuyển hướng về `/login` khi API trả về 401 trên các trang công khai (Register / OTP)
* **Module:** Frontend API Client (`frontend/src/services/api.ts`)
* **Phân loại:** `APPLICATION ARCHITECTURE ISSUE`
* **Mức độ:** `Medium`
* **Mô tả hành vi:**
  Trong file `frontend/src/services/api.ts`, interceptor phản hồi được viết như sau:
  ```typescript
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('quizmaster_auth_token');
        localStorage.removeItem('quizmaster_auth_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
  ```
  Khi người dùng đang ở trang `/register` và gặp lỗi:
  * Đăng ký email đã tồn tại (Backend ném `UnauthorizedException('Email này đã được đăng ký tài khoản')` - status 401).
  * Nhập sai mã OTP (Backend ném `UnauthorizedException('Mã OTP không chính xác')` - status 401).
  
  Do `window.location.pathname === '/register'` (khác `'/login'`), interceptor ngay lập tức ép trình duyệt chuyển hướng (`window.location.href = '/login'`), khiến thông báo lỗi toast trên màn hình `/register` bị mất đi và người dùng bị đẩy về trang đăng nhập mà không kịp hiểu nguyên nhân lỗi.

* **Đề xuất khắc phục trong source code tương lai:**
  Trong `api.ts`, bổ sung điều kiện kiểm tra URL không thuộc các endpoint xác thực công khai:
  ```typescript
  const isAuthPublicEndpoint = error.config?.url?.includes('/auth/login') 
                            || error.config?.url?.includes('/auth/register')
                            || error.config?.url?.includes('/auth/verify-otp');

  if (error.response?.status === 401 && !isAuthPublicEndpoint) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  ```

---

### BUG-002: Cơ sở dữ liệu gốc thiếu tài khoản quản trị viên (ADMIN)
* **Module:** Database & Data Seeding
* **Phân loại:** `ENVIRONMENT / SEED DATA ISSUE`
* **Mức độ:** `High`
* **Mô tả hành vi:**
  * Bảng `users` trong cơ sở dữ liệu MySQL ban đầu không có bất kỳ bản ghi nào mang vai trò `role = 'ADMIN'`.
  * API Đăng ký công khai (`/api/auth/register`) chỉ hỗ trợ đăng ký vai trò `TEACHER` hoặc `STUDENT`.
* **Khắc phục:**
  Đã tạo tiện ích `e2e/utils/db-seed.ts` để tự động kiểm tra và seed tài khoản quản trị viên `admin@quizmaster.com / Password@123` trước khi chạy test suite.

---

### BUG-003: Không có UI chỉnh sửa câu hỏi trực tiếp trong Question Bank
* **Module:** Teacher Question Bank (`frontend/src/pages/teacher/TeacherQuestionBankPage.tsx`)
* **Phân loại:** `FEATURE GAP / MISSING CAPABILITY`
* **Mức độ:** `Medium`
* **Mô tả hành vi:**
  * Trang Ngân hàng câu hỏi (`/teacher/bank`) chỉ hỗ trợ:
    - Xem danh sách câu hỏi.
    - Lọc câu hỏi theo danh mục môn học.
    - Chọn và xóa câu hỏi (từng câu hoặc hàng loạt xóa nhiều mục).
    - Nhập câu hỏi từ file thiết bị (.docx/.json).
  * Không có nút bấm, form hay modal nào cho phép Giáo viên trực tiếp chỉnh sửa nội dung hoặc đáp án của một câu hỏi đã tồn tại trong ngân hàng. Muốn sửa, giáo viên phải nhập vào đề thi để sửa hoặc xóa đi nhập lại.

---

### BUG-004: Race condition khi tải danh sách câu hỏi bất đồng bộ trong trang Chỉnh sửa đề thi (Quiz Edit)
* **Module:** Teacher Quiz Edit (`frontend/src/pages/teacher/TeacherQuizCreateEditPage.tsx`)
* **Phân loại:** `APPLICATION LOGIC / RACE CONDITION`
* **Mức độ:** `High`
* **Mô tả hành vi:**
  * Trong hàm `loadExisting`, component thực hiện tải chi tiết bài thi `quizService.getQuizById(id)` và tải câu hỏi `quizService.getQuestions(id)`.
  * Nếu người dùng thao tác lưu nhanh khi câu hỏi chưa được nạp xong vào state `questions`, form sẽ báo lỗi `"Vui lòng thêm ít nhất một câu hỏi vào bài kiểm tra"` hoặc có nguy cơ ghi đè đề thi với 0 câu hỏi.
* **Đề xuất khắc phục:**
  * Bổ sung trạng thái `isDataReady` hoặc overlay spinner toàn trang cho đến khi cả hai API `getQuizById` và `getQuestions` đều hoàn tất nạp dữ liệu vào state trước khi cho phép bấm nút "Lưu bản thảo" hay "Xuất bản ngay".

---

### BUG-005: Radio Option trong QuestionBuilder không thể hủy chọn đối với loại câu hỏi SINGLE_CHOICE
* **Module:** QuestionBuilder Component (`frontend/src/components/teacher/QuestionBuilder.tsx`)
* **Phân loại:** `UI INTERACTION LIMITATION`
* **Mức độ:** `Low`
* **Mô tả hành vi:**
  * Đối với loại câu hỏi Một đáp án đúng (`SINGLE_CHOICE`), khi đã chọn một radio option làm đáp án đúng (`isCorrect: idx === optIndex`), click lại vào chính option đó không thể bỏ chọn (không toggle được `false`).
  * Người dùng chỉ có thể chuyển đáp án đúng sang option khác, hoặc chuyển loại câu hỏi sang `MULTIPLE_CHOICE` rồi toggle uncheck.

---

### BUG-006: Thiếu ràng buộc phân trang trên giao diện Quản lý Đề thi và Ngân hàng câu hỏi
* **Module:** Teacher Quiz List & Question Bank
* **Phân loại:** `PERFORMANCE & SCALABILITY ISSUE`
* **Mức độ:** `Medium`
* **Mô tả hành vi:**

---

### BUG-007: Thiếu kiểm tra phân quyền RBAC (RolesGuard) trên các API Quản lý đề thi (QuizzesController)
* **Module:** Backend Quizzes Controller (`backend/src/modules/quizzes/quizzes.controller.ts`)
* **Phân loại:** `SECURITY VULNERABILITY / MISSING RBAC AUTHORIZATION`
* **Mức độ:** `Critical`
* **Trạng thái:** `FIXED (ĐÃ KHẮC PHỤC VÀ KIỂM THỬ XÁC MINH)`
* **Mô tả hành vi & Phát hiện ban đầu:**
  * Trong `backend/src/modules/quizzes/quizzes.controller.ts`, controller ban đầu chỉ được bảo vệ bởi `@UseGuards(JwtAuthGuard)`:
    ```typescript
    @Controller('quizzes')
    @UseGuards(JwtAuthGuard)
    export class QuizzesController { ... }
    ```
  * Hoàn toàn thiếu `@UseGuards(RolesGuard)` và `@Roles(Role.TEACHER, Role.ADMIN)`.
  * Các endpoint quản trị nhạy cảm sau đây không kiểm tra role của người dùng:
    - `POST /api/quizzes` (Tạo đề thi mới)
    - `PATCH /api/quizzes/:id` (Chỉnh sửa thông tin đề thi)
    - `DELETE /api/quizzes/:id` (Xóa đề thi)
    - `POST /api/quizzes/:id/publish` (Xuất bản đề thi)
    - `POST /api/quizzes/:id/unpublish` (Gỡ xuất bản đề thi)
  * Lỗ hổng này được phát hiện thực tế khi chạy Playwright test `TC-STU-020: Học sinh không thể gọi các API quản lý và sửa đổi đề thi của Giáo viên`:
    - **Before Fix:** Học sinh gửi `POST /api/quizzes` $\rightarrow$ Nhận `HTTP 201 Created` (Tạo bài thi thành công trái phép).
* **Giải pháp khắc phục đã áp dụng (Remediation):**
  1. Cập nhật `backend/src/common/decorators/roles.decorator.ts`: Bổ sung `'ADMIN'` vào type `Role`:
     ```typescript
     export type Role = 'TEACHER' | 'STUDENT' | 'ADMIN';
     ```
  2. Cập nhật `backend/src/modules/quizzes/quizzes.controller.ts`:
     - Bổ sung `RolesGuard` vào decorator class: `@UseGuards(JwtAuthGuard, RolesGuard)`
     - Bổ sung `@Roles('TEACHER', 'ADMIN')` cho toàn bộ các mutation endpoints:
       * `createQuiz` (`@Post()`)
       * `updateQuiz` (`@Patch(':id')`)
       * `deleteQuiz` (`@Delete(':id')`)
       * `publishQuiz` (`@Post(':id/publish')`)
       * `unpublishQuiz` (`@Post(':id/unpublish')`)
     - Giữ nguyên các query endpoints (`GET /quizzes`, `GET /quizzes/:id`) không gắn `@Roles` để Học sinh vẫn có thể xem danh sách đề thi khả dụng và chi tiết bài thi theo đúng phân quyền nghiệp vụ.
* **Xác minh kiểm thử sau khắc phục (Verification):**
  - **After Fix:** Học sinh gửi `POST /api/quizzes`, `PATCH /api/quizzes/:id`, `DELETE /api/quizzes/:id`, `POST /api/quizzes/:id/publish` $\rightarrow$ Nhận `HTTP 403 Forbidden` (`{"statusCode":403,"message":"Forbidden resource","error":"Forbidden"}`).
  - Test `TC-STU-020` chạy thực tế trên Chromium: **PASS** (170ms).
  - Regression Batch 1: **18/18 PASS**.
  - Regression Batch 2 (Teacher CRUD): **23/23 PASS** (Giáo viên vẫn tạo, sửa, xóa, publish, unpublish bình thường).
  - Regression Batch 3 (Student): **23/23 PASS**.
  - All E2E Suite: **58/58 PASS (100%)**.



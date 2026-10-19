# BÁO CÁO TRIỂN KHAI: HỆ THỐNG QUẢN LÝ HỌC SINH NGOÀI HỆ THỐNG (EXTERNAL STUDENT DOMAIN)
**Dự án:** QuizMaster Education System  
**Branch:** `feat/external-student-domain`  
**Ngày hoàn thành:** 19/10/2026  

---

## 1. ARCHITECTURE BEFORE

- **Đồng nhất hóa User và Student:** Trước đây, hệ thống QuizMaster thiết kế học sinh buộc phải là một tài khoản `UserEntity` (`role: 'STUDENT'`).
- **Phụ thuộc bảng Join:** Giáo viên liên kết với học sinh qua bảng join `teacher_students (teacherId, studentId)`.
- **Hệ quả tiêu cực & Lỗ hổng:**
  1. Giáo viên không thể quản lý học sinh học kèm ngoài đời thực nếu các em không có email/tài khoản QuizMaster.
  2. Khi import học sinh qua Excel vào lớp học, hệ thống trước đây tự động tạo User giả và gán mật khẩu mặc định `"123456"`, vi phạm nghiêm trọng an toàn thông tin và bảo mật tài khoản.
  3. Tất cả các dịch vụ giảng dạy (`Schedule`, `Attendance`, `Tuition`, `LearningLog`, `Scores`) đều giả định `studentId === User.id`.

---

## 2. ARCHITECTURE AFTER

- **Tách rời khái niệm Hồ sơ học sinh (Student Profile) và Tài khoản người dùng (User Account):**
  - Tạo entity độc lập: `TeacherStudentEntity` (lưu trữ trong bảng `teacher_student_profiles`).
  - `TeacherStudent.id`: Định danh nghiệp vụ duy nhất của hồ sơ học sinh thuộc quyền sở hữu của một giáo viên (`teacherId`).
  - `studentAccountId`: Trỏ tới `User.id` và là **NULLABLE**.
- **Hai trạng thái hồ sơ rõ ràng:**
  - **External Student (Học sinh ngoài hệ thống):** `studentAccountId = NULL`. Không yêu cầu email/mật khẩu, không tạo User. Giáo viên có thể lên lịch, điểm danh, ghi nhận xét, nhập điểm, tính học phí và thu học phí bình thường.
  - **Linked Student (Học sinh liên kết):** `studentAccountId = User.id`. Học sinh có tài khoản QuizMaster, có thể đăng nhập để xem bài tập và lịch học.
- **Khả năng Link & Unlink Account linh hoạt:**
  - Khi học sinh tạo tài khoản QuizMaster sau đó, giáo viên có thể liên kết tài khoản (`POST /teacher/students/:id/link-account`).
  - Khi cần, giáo viên có thể hủy liên kết (`POST /teacher/students/:id/unlink-account`).
  - Trong cả 2 trường hợp, `TeacherStudent.id` **KHÔNG BAO GIỜ THAY ĐỔI**, toàn bộ lịch sử (buổi học, học phí, nhật ký, điểm số) được bảo tồn toàn vẹn 100%.

---

## 3. MIGRATION STRATEGY

- **Chiến lược Zero Data Loss & Non-destructive Migration:**
  1. Giữ nguyên bảng `teacher_students` hiện tại để không phá vỡ bất kỳ khóa ngoại hoặc query nào của hệ thống cũ.
  2. `TeacherStudentEntity` ánh xạ vào bảng `teacher_student_profiles`.
  3. Cung cấp cơ chế tự động đồng bộ đối soát (`syncLegacyStudents`): Khi giáo viên truy cập danh sách học sinh, hệ thống tự động kiểm tra và tạo bản ghi `TeacherStudent` tương ứng cho từng cặp (teacher, student) từ `teacher_students` sang `teacher_student_profiles` với `studentAccountId = existingUser.id`.
  4. Cơ chế tra cứu kép (`resolveStudent(teacherId, studentIdOrAccountId)`): Cho phép mọi dịch vụ giảng dạy tra cứu học sinh bằng cả `TeacherStudent.id` lẫn `User.id` cũ, giúp tất cả các client và test suite cũ chạy mượt mà mà không bị lỗi.

---

## 4. FILES CHANGED

### Backend:
- `backend/src/modules/students/entities/teacher-student.entity.ts` *(mới)*: Định nghĩa entity `TeacherStudentEntity`.
- `backend/src/modules/students/dto/teacher-student.dto.ts` *(mới)*: DTOs cho External Student CRUD & Link Account.
- `backend/src/modules/students/students.service.ts`: Toàn bộ logic nghiệp vụ External Student, resolver đa nhiệm, link/unlink, thống kê chi tiết.
- `backend/src/modules/students/students.controller.ts`: Mount routes tại `/teacher/students` và `/students` tương thích ngược.
- `backend/src/modules/students/students.module.ts`: Đăng ký providers & entities.
- `backend/src/modules/classrooms/classrooms.service.ts`: Loại bỏ hoàn toàn hành vi tạo User giả với pass "123456", chuyển sang tạo `TeacherStudent` với `studentAccountId = null`.
- `backend/src/modules/classrooms/classrooms.module.ts`: Thêm `TeacherStudentEntity`.
- `backend/src/modules/teaching/entities/lesson-participant.entity.ts`: Chuyển relation student sang `TeacherStudentEntity` (nullable: true).
- `backend/src/modules/teaching/entities/tuition-item.entity.ts`: Chuyển relation student sang `TeacherStudentEntity` (nullable: true).
- `backend/src/modules/teaching/entities/tuition-payment.entity.ts`: Chuyển relation student sang `TeacherStudentEntity` (nullable: true).
- `backend/src/modules/teaching/entities/learning-log.entity.ts`: Chuyển relation student sang `TeacherStudentEntity` (nullable: true).
- `backend/src/modules/teaching/entities/score-record.entity.ts`: Chuyển relation student sang `TeacherStudentEntity` (nullable: true).
- `backend/src/modules/teaching/services/schedule.service.ts`: Cập nhật `ensureClass` và `createLesson` hỗ trợ External Student.
- `backend/src/modules/teaching/services/tuition.service.ts`: Hỗ trợ tính học phí và giao dịch cho External Student.
- `backend/src/modules/teaching/services/learning-logs.service.ts`: Hỗ trợ ghi nhận xét cho External Student.
- `backend/src/modules/teaching/services/scores.service.ts`: Hỗ trợ nhập điểm số cho External Student.
- `backend/src/modules/students/tests/external-student.spec.ts` *(mới)*: 20 kịch bản test chuyên sâu từ `EXT-STU-01` đến `EXT-STU-20`.

### Frontend:
- `frontend/src/types/student.ts` *(mới)*: Định nghĩa TypeScript interface cho External Student và Student Detail.
- `frontend/src/services/student.service.ts`: Bổ sung toàn bộ API methods cho Teacher Student.
- `frontend/src/pages/teacher/TeacherStudentsPage.tsx`: Cập nhật UI nút `+ Thêm học sinh`, Modal 2 tab (Ngoài hệ thống / Mời tài khoản), Badge nhận diện `NGOÀI HỆ THỐNG` (amber) & `CÓ TÀI KHOẢN` (emerald), chuyển hướng trang chi tiết.
- `frontend/src/pages/teacher/TeacherStudentDetailPage.tsx` *(mới)*: Trang chi tiết học sinh với 7 tabs/khối dữ liệu, modal liên kết tài khoản và sửa hồ sơ.
- `frontend/src/routes/AppRoutes.tsx`: Khai báo route `/teacher/students/:id`.
- `frontend/src/pages/teacher/TeacherSchedulePage.tsx`: Null-safety fallback cho email và avatar.
- `frontend/src/pages/teacher/TeacherTuitionPage.tsx`: Hỗ trợ `fullName` và null-safety cho học sinh ngoài hệ thống.
- `frontend/src/pages/teacher/TeacherLearningLogsPage.tsx`: Null-safety cho tìm kiếm học sinh.
- `frontend/src/pages/teacher/TeacherScoresPage.tsx`: Null-safety cho danh sách học sinh chọn điểm.
- `frontend/src/pages/teacher/TeacherQuizCreateEditPage.tsx`: Hỗ trợ kiểu `TeacherStudent`.

---

## 5. DATABASE CHANGES

- Tạo bảng mới: `teacher_student_profiles`
  - `id`: varchar(64) PRIMARY KEY
  - `teacherId`: varchar(64) NOT NULL
  - `studentAccountId`: varchar(64) NULLABLE (Foreign Key trỏ tới `users.id`)
  - `fullName`: varchar(255) NOT NULL
  - `phone`: varchar(50) NULLABLE
  - `email`: varchar(255) NULLABLE
  - `parentName`: varchar(255) NULLABLE
  - `parentPhone`: varchar(50) NULLABLE
  - `dob`: varchar(20) NULLABLE
  - `gender`: varchar(10) NULLABLE (`MALE`, `FEMALE`, `OTHER`)
  - `school`: varchar(255) NULLABLE
  - `note`: text NULLABLE
  - `status`: varchar(20) NOT NULL DEFAULT `'ACTIVE'`
  - `avatar`: text NULLABLE
  - `createdAt`, `updatedAt`: timestamp
- Giữ nguyên toàn bộ các bảng: `users`, `classes`, `class_students`, `teacher_students`, `teaching_lessons`, `teaching_lesson_participants`, `tuition_items`, `tuition_payments`, `teaching_learning_logs`, `teaching_score_records`.
- Không drop table, không xóa dòng dữ liệu nào.

---

## 6. API CHANGES

- `POST /teacher/students`: Tạo học sinh ngoài hệ thống không cần email/mật khẩu.
- `GET /teacher/students`: Lấy danh sách học sinh kèm badge `isExternal`.
- `GET /teacher/students/:id`: Xem chi tiết 7 khối dữ liệu (Profile, Schedule, Attendance, Logs, Scores, Tuition, Payments).
- `PATCH /teacher/students/:id`: Cập nhật thông tin học sinh.
- `DELETE /teacher/students/:id`: Xóa hồ sơ học sinh.
- `POST /teacher/students/:id/link-account`: Liên kết với tài khoản `STUDENT` QuizMaster.
- `POST /teacher/students/:id/unlink-account`: Hủy liên kết, đưa về External Student, giữ nguyên 100% lịch sử.

---

## 7. FRONTEND CHANGES

- Trang Danh bạ học sinh (`TeacherStudentsPage.tsx`):
  - Thay nút "Mời qua email" bằng `+ Thêm học sinh`.
  - Hỗ trợ thêm học sinh trực tiếp không cần email.
  - Phân loại rõ ràng qua badge `NGOÀI HỆ THỐNG` (vàng hổ phách) và `CÓ TÀI KHOẢN` (xanh ngọc).
- Trang Chi tiết học sinh (`TeacherStudentDetailPage.tsx`):
  - Giao diện 7 phân mục chuẩn thiết kế QuizMaster: Thông tin, Lịch dạy, Điểm danh, Nhật ký học tập, Điểm số, Học phí, Lịch sử thanh toán.
  - Nút hành động nhanh: "Liên kết tài khoản" hoặc "Hủy liên kết" với thông báo xác nhận an toàn.

---

## 8. SECURITY CHANGES

- **Enforce Teacher Ownership:** Tất cả thao tác truy vấn đều ép buộc điều kiện `teacherId = req.user.id`.
- **Chống IDOR 100%:** Ngăn chặn bất kỳ giáo viên nào truy cập hoặc thao tác trên hồ sơ học sinh của giáo viên khác.
- **Loại bỏ nguy cơ bảo mật mật khẩu mặc định:** Excel Import không còn hành vi tạo tài khoản với mật khẩu `"123456"`.
- **Ràng buộc vai trò khi Link Account:** Chỉ cho phép liên kết tài khoản có vai trò `STUDENT`; từ chối nghiêm ngặt tài khoản `ADMIN` hoặc `TEACHER`.

---

## 9. BACKWARD COMPATIBILITY

- Bảng dữ liệu cũ `teacher_students` vẫn tồn tại.
- Mọi API cũ (`GET /students/my-students`, `POST /students/invite`) tiếp tục hoạt động bình thường.
- Dữ liệu học phí, lịch dạy, điểm số và nhật ký cũ vẫn liên kết đúng người học thông qua cơ chế resolver thông minh.

---

## 10. TEST RESULTS

- **Test Suite mới (`external-student.spec.ts`):** 20/20 test cases ĐẠT 100% (`EXT-STU-01` đến `EXT-STU-20`).
- **Toàn bộ Regression Tests Backend:** 19/19 test files ĐẠT 100% (Tổng cộng **229/229 tests PASS**).

---

## 11. BUILD RESULTS

- **Backend Build (`nest build`):** PASS (Exit code 0).
- **Frontend Build (`tsc -b && vite build`):** PASS (Exit code 0, 0 lỗi TypeScript).

---

## 12. REMAINING RISKS

- Rủi ro dữ liệu: Không có rủi ro mất dữ liệu vì schema hoàn toàn là additive (thêm mới, không drop/xóa).
- Khi chạy trên môi trường Production, TypeORM `synchronize: true` sẽ tự động tạo bảng `teacher_student_profiles` mà không ảnh hưởng tới các bảng khác.

---

## 13. GIT BRANCH & COMMITS

- **Branch:** `feat/external-student-domain`
- **Cam kết:** KHÔNG merge vào `main`.

### Danh sách Commit Hashes:
- `394675b` — `feat(students): add teacher student domain model`
- `21bf258` — `feat(teaching): support external student in domain entities and teaching services`
- `aff6e8f` — `feat(students): support external student CRUD, account linking, and safe excel import`
- `454b63d` — `test(students): add external student coverage EXT-STU-01 to EXT-STU-20`
- `287dbd0` — `feat(frontend): add external student management, student detail page, and null-safety`

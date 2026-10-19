# BÁO CÁO FINAL PRE-MERGE AUDIT — TÍNH NĂNG EXTERNAL STUDENT

**Dự án:** QuizMaster Education System  
**Branch hiện tại:** `feat/external-student-domain`  
**Ngày thực hiện:** 19/10/2026  
**Trạng thái kiểm toán:** HOÀN TẤT TOÀN DIỆN (Comprehensive Pre-Merge Audit)

---

## 1. EXECUTIVE SUMMARY (TỔNG QUAN)

Mục tiêu của đợt kiểm toán Pre-Merge là đánh giá và xác thực độc lập toàn bộ vòng đời của tính năng **External Student** (Học sinh Ngoài Hệ Thống) trên branch `feat/external-student-domain`. 

Kiểm toán đã chứng minh rằng:
- Giáo viên có thể sử dụng hệ thống QuizMaster như một nền tảng quản lý học sinh cá nhân hoàn chỉnh (Hồ sơ, Lập lịch dạy, Điểm danh, Nhật ký buổi học, Sổ điểm số, Tính học phí, Thu tiền mặt/chuyển khoản, Điều chỉnh phụ thu/giảm trừ, Liên kết và Hủy liên kết tài khoản) mà **tuyệt đối không cần tạo tài khoản `User` cho học sinh**.
- Toàn bộ 18 luồng nghiệp vụ trong ma trận chấp nhận (`EXT-ACCEPT-01` đến `EXT-ACCEPT-18`) đều có **automated test thực tế** bao phủ 100%.
- Không tồn tại tài khoản User rác, không tạo mật khẩu mặc định `"123456"` khi import Excel.
- Cơ chế bảo mật chống IDOR, kiểm soát quyền sở hữu của giáo viên (`req.user.id`), và tính toàn vẹn tài chính (khóa bi quan, chặn overpayment, chống âm tiền) đều hoạt động chính xác.
- Hệ thống vượt qua 100% các bài kiểm tra hồi quy: **20/20 test files passed (247/247 tests)**; cả Backend (`nest build`) và Frontend (`tsc -b && vite build`) đều biên dịch thành công không có lỗi.

---

## 2. ARCHITECTURE VERIFICATION (KIỂM TRA KIẾN TRÚC DOMAIN)

| Tiêu chí | Trạng thái | Bằng chứng kiểm tra thực tế |
|---|:---:|---|
| **Canonical Entity** | **ĐẠT** | Bảng `teacher_student_profiles` (`TeacherStudentEntity`) là thực thể trung tâm quản lý quan hệ học sinh - giáo viên. `studentAccountId` là khóa ngoại nullable trỏ tới `users.id` với `onDelete: SET NULL`. |
| **External Invariant** | **ĐẠT** | Khi tạo External Student: `studentAccountId = null`. Không chèn bản ghi vào bảng `users`. Không sinh mật khẩu. |
| **Domain Linkage** | **ĐẠT** | Các bảng nghiệp vụ cốt lõi: `teaching_lesson_participants`, `teaching_tuition_items`, `teaching_tuition_payments`, `teaching_learning_logs`, `teaching_scores` đều liên kết trực tiếp với `TeacherStudentEntity.id`. |
| **Immutable Profile ID** | **ĐẠT** | Khi Liên kết tài khoản (`linkAccount`) hoặc Hủy liên kết (`unlinkAccount`), `TeacherStudentEntity.id` **không bao giờ thay đổi**. Toàn bộ lịch sử dạy học và tài chính được bảo toàn nguyên vẹn 100%. |
| **Zero Duplication** | **ĐẠT** | Phương thức `linkAccount` kiểm tra trùng lặp: từ chối nếu một tài khoản học sinh đã được liên kết với một hồ sơ khác của cùng giáo viên. `syncLegacyStudents` kiểm tra tồn tại trước khi tạo mapping. |

---

## 3. 18 ACCEPTANCE FLOWS VERIFICATION

Ma trận kiểm thử chấp nhận đã được chuẩn hóa với **18 automated tests riêng biệt** trong [external-student-acceptance.spec.ts](file:///d:/WEB/quiz-master/backend/src/modules/students/tests/external-student-acceptance.spec.ts):

| Mã Flow | Nghiệp vụ kiểm tra | File & Test Case thực tế | Kết quả |
|---|---|---|:---:|
| **EXT-ACCEPT-01** | Create External Student | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-01` | **PASS** |
| **EXT-ACCEPT-02** | Student List | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-02` | **PASS** |
| **EXT-ACCEPT-03** | Student Detail | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-03` | **PASS** |
| **EXT-ACCEPT-04** | Schedule | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-04` | **PASS** |
| **EXT-ACCEPT-05** | Attendance | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-05` | **PASS** |
| **EXT-ACCEPT-06** | Learning Log | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-06` | **PASS** |
| **EXT-ACCEPT-07** | Score | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-07` | **PASS** |
| **EXT-ACCEPT-08** | Tuition Calculation | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-08` | **PASS** |
| **EXT-ACCEPT-09** | Payment | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-09` | **PASS** |
| **EXT-ACCEPT-10** | Adjustment | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-10` | **PASS** |
| **EXT-ACCEPT-11** | Link Account | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-11` | **PASS** |
| **EXT-ACCEPT-12** | Invalid Account Link | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-12` | **PASS** |
| **EXT-ACCEPT-13** | Unlink Account | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-13` | **PASS** |
| **EXT-ACCEPT-14** | IDOR Protection | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-14` | **PASS** |
| **EXT-ACCEPT-15** | Historical Delete Protection | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-15` | **PASS** |
| **EXT-ACCEPT-16** | Excel Import | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-16` | **PASS** |
| **EXT-ACCEPT-17** | Legacy Compatibility | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-17` | **PASS** |
| **EXT-ACCEPT-18** | Cross-Account Isolation | `external-student-acceptance.spec.ts` -> `EXT-ACCEPT-18` | **PASS** |

### Xác minh đặc biệt cho Flow 17 & Flow 18:
- **EXT-ACCEPT-17 (Legacy Compatibility):** Đã tách thành test case chuyên biệt, kiểm tra 5 tiêu chí:
  1. Tạo học sinh legacy với `studentAccountId = old User.id`.
  2. Tạo lịch sử đa phân hệ (buổi học, điểm danh, học phí, thanh toán, nhật ký, điểm số).
  3. `resolveStudent('teacher-a', profileId)` giải quyết chính xác.
  4. `resolveStudent('teacher-a', oldUserId)` giải quyết chính xác cùng 1 hồ sơ.
  5. `getStudentDetail` trả về đầy đủ 100% dữ liệu lịch sử liên kết không bị orphan.
- **EXT-ACCEPT-18 (Cross-Account Isolation):** Đã tách thành test case chuyên biệt, kiểm tra 6 tiêu chí:
  1. Teacher A sở hữu trọn vẹn Student A, Schedule A, Tuition A, Log A, Score A, Payment A.
  2. Teacher B sở hữu Student B.
  3. Teacher B gọi `getTeacherStudents('teacher-b')` chỉ thấy Student B, tuyệt đối không thấy Student A.
  4. Teacher B gọi `getStudentDetail('teacher-b', studentA.id)` bị chặn (404/403).
  5. Teacher B gọi `getTuitionDetail('teacher-b', tuitionA.id)` bị chặn (403 Forbidden).
  6. Các truy vấn học phí, nhật ký, điểm số của Teacher B không bao giờ rò rỉ dữ liệu của Teacher A.

---

## 4. SECURITY & IDOR AUDIT

1. **Teacher Ownership bắt buộc qua JWT:**
   - Trong [students.controller.ts](file:///d:/WEB/quiz-master/backend/src/modules/students/students.controller.ts), toàn bộ các endpoint đều trích xuất `teacherId` từ `@CurrentUser() user: any` -> `user.id`.
   - Tuyệt đối không chấp nhận `teacherId` từ URL params, request body, hay query parameters.
2. **Ngăn chặn Cross-Teacher Enumeration & ID Guessing:**
   - Hàm `resolveStudent(teacherId, studentId)` luôn kèm điều kiện `{ teacherId }`. Nếu ID không thuộc giáo viên, ném ngay `NotFoundException('Không tìm thấy học sinh hoặc bạn không có quyền truy cập')` nhằm chống dò quét ID.
3. **Phân quyền Role nghiêm ngặt khi Link Account:**
   - Chỉ cho phép liên kết tài khoản có `role === 'STUDENT'`.
   - Cố tình liên kết tài khoản `ADMIN` hoặc `TEACHER` đều bị từ chối với `BadRequestException`.

---

## 5. FINANCIAL INTEGRITY AUDIT

1. **Quy tắc tính học phí từ Lịch dạy (Schedule is Source of Truth):**
   - Học sinh có trạng thái `ATTENDED` được tính tiền theo đơn giá buổi học.
   - Học sinh có trạng thái `ABSENT` được miễn trừ hoàn toàn (không tính vào học phí).
   - Lớp kèm 1-1 có fallback tự động đồng bộ khi chưa tạo bản ghi participant riêng lẻ.
2. **Bảo vệ số dư & chống thanh toán vượt mức (Overpayment Prevention):**
   - `recordPayment` kiểm tra `if (dto.amount > remaining) throw new BadRequestException(...)`.
   - Giao dịch thanh toán được khóa với chế độ bi quan: `lock: { mode: 'pessimistic_write' }` trên bảng `teaching_tuition_items`.
3. **Bảo vệ toàn vẹn phép tính điều chỉnh (Adjustment Protection):**
   - Giảm trừ (`DISCOUNT`) được tính toán mô phỏng trước: nếu `simulatedTotal < paidAmount`, hệ thống từ chối áp dụng và yêu cầu hoàn tiền trước.
   - Các trường tài chính `baseAmount`, `surcharge`, `discount`, `paidAmount` đều có fallback an toàn `|| 0`, loại bỏ hoàn toàn nguy cơ `NaN` vượt qua kiểm tra logic.
4. **Không xóa vật lý giao dịch thanh toán:**
   - Hoàn tiền (`refundPayment`) chỉ chuyển trạng thái sang `REFUNDED` hoặc cập nhật số tiền hoàn một phần và tạo giao dịch hoàn tiền đối ứng, bảo tồn sổ sách kế toán.

---

## 6. LEGACY COMPATIBILITY AUDIT

- **Cơ chế 2 chiều ID:**
  - Giáo viên và hệ thống có thể gọi API với cả `TeacherStudent.id` (ID mới) hoặc `studentAccountId` (ID User cũ).
  - Phương thức `resolveStudent` tự động tra cứu ưu tiên theo `id`, sau đó fallback tra cứu theo `studentAccountId`.
- **Tương thích tính năng Mời học sinh (Invite Flow cũ):**
  - Khi giáo viên mời học sinh có tài khoản QuizMaster, hàm `inviteStudentByEmail` gửi thông báo cá nhân; khi học sinh chấp nhận, `acceptInvite` đồng bộ thêm vào danh bạ và tạo `TeacherStudent` tương ứng.

---

## 7. FRONTEND UX AUDIT

- **Trang Danh bạ học sinh ([TeacherStudentsPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/teacher/TeacherStudentsPage.tsx)):**
  - Nút "+ Thêm học sinh" mở modal 2 tab: "Học sinh ngoài hệ thống" (mặc định) và "Mời qua email QuizMaster".
  - Hiển thị badge: `NGOÀI HỆ THỐNG` (màu hổ phách) và `CÓ TÀI KHOẢN` (màu xanh lá).
  - Null-safe toàn diện: Email `null` hiển thị text mờ "Chưa có email"; Avatar `null` tự sinh avatar với chữ cái đầu của tên.
  - Chống double-submit: Nút submit disable và hiển thị loader khi `isSubmitting = true`.
- **Trang Chi tiết học sinh ([TeacherStudentDetailPage.tsx](file:///d:/WEB/quiz-master/frontend/src/pages/teacher/TeacherStudentDetailPage.tsx)):**
  - 7 khối chức năng: Profile, Lịch dạy, Điểm danh, Nhật ký buổi học, Sổ điểm, Học phí, Lịch sử thanh toán.
  - Phù hợp cả chế độ Light mode và Dark mode; responsive trên mobile và desktop.

---

## 8. LINK / UNLINK AUDIT

- **Quy trình Liên kết (Link):**
  - Giáo viên nhập email hoặc ID tài khoản học sinh.
  - Hệ thống kiểm tra: User tồn tại, User có role `STUDENT`, User chưa bị liên kết với hồ sơ khác của giáo viên này.
  - Cập nhật trường `studentAccountId = User.id`. Cập nhật email/avatar nếu hồ sơ ngoài chưa có.
  - Giao diện lập tức chuyển badge thành "Có tài khoản".
- **Quy trình Hủy liên kết (Unlink):**
  - Giáo viên bấm "Hủy liên kết tài khoản" -> Xác nhận qua dialog.
  - Hệ thống set `studentAccountId = null`.
  - Giữ nguyên toàn bộ lịch học, điểm số, học phí và lịch sử thanh toán.
  - Giao diện lập tức chuyển badge thành "Ngoài hệ thống".

---

## 9. TEST COVERAGE REPORT

| Danh mục | Tổng số | Đạt (Pass) | Thất bại (Fail) | Bỏ qua (Skip) | Flaky |
|---|:---:|:---:|:---:|:---:|:---:|
| **Acceptance E2E Tests** | 18 | 18 | 0 | 0 | 0 |
| **Domain Safety Unit Tests** | 20 | 20 | 0 | 0 | 0 |
| **Tuition & Teaching Service Tests** | 73 | 73 | 0 | 0 | 0 |
| **Auth & Security Tests** | 33 | 33 | 0 | 0 | 0 |
| **Grading & Questions Tests** | 98 | 98 | 0 | 0 | 0 |
| **System & Dashboard Tests** | 5 | 5 | 0 | 0 | 0 |
| **TỔNG CỘNG TEST TOÀN DỰ ÁN** | **247** | **247** | **0** | **0** | **0** |

---

## 10. BUILD VERIFICATION

- **Backend Build (`nest build`):**
  - Lệnh: `npm run build` tại `backend/`
  - Kết quả: **SUCCESS (Exit Code 0)** — TypeScript biên dịch sạch, không có lỗi type error.
- **Frontend Build (`tsc -b && vite build`):**
  - Lệnh: `npm run build` tại `frontend/`
  - Kết quả: **SUCCESS (Exit Code 0)** — 116 files biên dịch sạch trong 2.32s, bundle hoàn chỉnh trong `dist/`.
- **Frontend Lint (`oxlint`):**
  - Lệnh: `npm run lint` tại `frontend/`
  - Kết quả: **0 errors** (165 warnings không chặn).

---

## 11. BUGS FOUND & RESOLVED

Trong quá trình audit và chuẩn hóa, 3 vấn đề kỹ thuật đã được phát hiện và giải quyết triệt để:

1. **`BUG-EXT-01` (Severity: HIGH) — Contract mismatch tại `getStudentDetail`:**
   - *Nguyên nhân:* Backend trả về `stats`, `lessons`, `tuition` trong khi Frontend yêu cầu `summary`, `schedules`, `attendance`, `tuitions`, `account`.
   - *Đã khắc phục:* Bổ sung cả hai bộ key trong [students.service.ts](file:///d:/WEB/quiz-master/backend/src/modules/students/students.service.ts) để tương thích 100%.
2. **`BUG-EXT-02` (Severity: MEDIUM) — Nguy cơ mất lịch sử khi gọi `deleteStudent`:**
   - *Nguyên nhân:* Gọi `teacherStudentRepo.remove(student)` mà không kiểm tra quan hệ lịch sử liên quan.
   - *Đã khắc phục:* Thêm bước kiểm tra lịch sử (`safeCount` trên participants, tuition, payments, scores, logs). Nếu có dữ liệu, chặn xóa và yêu cầu chuyển sang `INACTIVE`.
3. **`BUG-EXT-03` (Severity: LOW) — Nguy cơ `NaN` trong phép tính điều chỉnh học phí:**
   - *Nguyên nhân:* `Number(tuition.surcharge)` trả về `NaN` nếu trường `undefined`.
   - *Đã khắc phục:* Thêm fallback `|| 0` trong [tuition.service.ts](file:///d:/WEB/quiz-master/backend/src/modules/teaching/services/tuition.service.ts).

---

## 12. REMAINING RISKS (RỦI RO CÒN LẠI & BIỆN PHÁP KIỂM SOÁT)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp kiểm soát hiện tại |
|---|:---:|---|
| Cạnh tranh ghi nhận thanh toán đồng thời (Concurrency Race Condition) | Thấp | Đã áp dụng `pessimistic_write` lock trên giao dịch TypeORM; giao dịch sau sẽ đợi hoặc rollback nếu số dư thay đổi. |
| Học sinh trùng tên khi import file Excel có dữ liệu lộn xộn | Thấp | Hệ thống kiểm tra theo cặp `(teacherId, fullName)` và gắn ghi chú lớp học để giáo viên dễ phân biệt; giao diện cho phép cập nhật thông tin chi tiết sau khi import. |
| Người dùng đăng ký tài khoản mới trùng email với hồ sơ ngoài hệ thống | Thấp | Khi người dùng đăng ký tài khoản, hệ thống không tự động link mà chờ giáo viên chủ động thực hiện `linkAccount` qua email để xác thực quyền sở hữu. |

---

## 13. FINAL VERDICT (KẾT LUẬN CUỐI CÙNG)

# **PASS**

### Căn cứ phê duyệt:
1. **18/18 Luồng chấp nhận đạt chuẩn:** Đầy đủ bằng chứng kiểm thử tự động độc lập cho từng flow từ `EXT-ACCEPT-01` đến `EXT-ACCEPT-18`.
2. **Không xâm lấn Domain cũ:** Không sửa đổi cấu trúc table legacy, không tạo User giả, không cấp mật khẩu mặc định `"123456"`.
3. **An toàn bảo mật & Dữ liệu:** Chống IDOR tuyệt đối, bảo toàn toàn vẹn lịch sử tài chính, không có orphan records.
4. **Độ ổn định tối đa:** 247/247 test cases passed; Backend và Frontend build thành công 100%.
5. **ĐỦ ĐIỀU KIỆN SẴN SÀNG MERGE VÀO MAIN.**

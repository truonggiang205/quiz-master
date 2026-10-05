# Batch 2 — Teacher Module E2E Report

## Environment

* **Frontend:** React 19 + Vite (port 5173, baseURL: `http://localhost:5173`)
* **Backend:** NestJS + TypeScript (port 3333, API URL: `http://localhost:3333/api`)
* **Database:** MySQL 8.0 (`quiz_master`)
* **Browser:** Chromium Desktop (Headed & Headless verified)
* **Playwright:** v1.58.x (TypeScript, 2 parallel workers, 45s test timeout)

---

## Execution

* **Total:** 23 (3 auth setup + 20 test cases)
* **Passed:** 23
* **Failed:** 0
* **Skipped:** 0
* **Flaky:** 0
* **Duration:** 1.5m (90.2s)
* **Pass Rate:** 100%

---

## Quiz (Quản lý đề thi)

* **Passed:** 10
* **Failed:** 0
* **Skipped:** 0

### Chi tiết các test case:
1. `TC-TCH-001`: Giáo viên mở trang Quản lý bài kiểm tra (`/teacher/quizzes`) — **PASS** (2.7s)
2. `TC-TCH-002`: Giáo viên tạo bài kiểm tra mới đầy đủ thông tin (Lưu bản thảo) — **PASS** (6.6s)
3. `TC-TCH-003`: Validation: Báo lỗi khi tạo đề thi để trống tiêu đề — **PASS** (3.3s)
4. `TC-TCH-004`: Validation: Báo lỗi khi câu hỏi chưa chọn đáp án đúng — **PASS** (3.5s)
5. `TC-TCH-005`: Giáo viên chỉnh sửa tiêu đề và thời lượng đề thi đã tạo — **PASS** (11.6s)
6. `TC-TCH-006`: Giáo viên xuất bản đề thi (`Publish Quiz`) khi điểm cân bằng — **PASS** (6.9s)
7. `TC-TCH-007`: Giáo viên gỡ đề thi về trạng thái bản thảo (`Unpublish Quiz`) — **PASS** (9.0s)
8. `TC-TCH-008`: Giáo viên xem trước đề thi trong chế độ Preview Mode (`/preview`) — **PASS** (8.1s)
9. `TC-TCH-009`: Xóa bài kiểm tra với Modal xác nhận (Cancel vs Confirm) — **PASS** (10.5s)
10. `TC-TCH-010`: Lọc và tìm kiếm bài kiểm tra trên giao diện — **PASS** (6.1s)

---

## Question Bank (Ngân hàng câu hỏi)

* **Passed:** 4
* **Failed:** 0
* **Skipped:** 0

### Chi tiết các test case:
11. `TC-TCH-011`: Giáo viên xem danh sách Ngân hàng câu hỏi và lọc theo môn học — **PASS** (3.4s)
12. `TC-TCH-012`: Giáo viên lưu câu hỏi từ form soạn đề vào Ngân hàng câu hỏi — **PASS** (4.9s)
13. `TC-TCH-013`: Giáo viên nhập câu hỏi từ Ngân hàng câu hỏi vào bài kiểm tra mới — **PASS** (4.3s)
14. `TC-TCH-014`: Giáo viên xóa câu hỏi khỏi Ngân hàng câu hỏi kèm Modal xác nhận — **PASS** (4.7s)

---

## Classroom (Lớp học & Học sinh)

* **Passed:** 4
* **Failed:** 0
* **Skipped:** 0

### Chi tiết các test case:
15. `TC-TCH-015`: Giáo viên mở trang Quản lý khóa học và xem các tab phân loại — **PASS** (6.3s)
16. `TC-TCH-016`: Giáo viên tạo lớp học nhóm mới và kiểm tra định dạng mã mời (`PREFIX-XXXX`) — **PASS** (9.1s)
17. `TC-TCH-017`: Giáo viên xem chi tiết lớp học và danh sách học sinh — **PASS** (11.1s)
18. `TC-TCH-018`: Giáo viên xóa học sinh khỏi lớp học — **PASS** (6.2s)

---

## RBAC (Teacher Permissions & Security)

* **Passed:** 2
* **Failed:** 0
* **Skipped:** 0

### Chi tiết các test case:
19. `TC-TCH-019`: Học sinh không thể truy cập các route quản trị của Giáo viên — **PASS** (2.5s)
20. `TC-TCH-020`: Học sinh không thể gọi API tạo lớp học của Giáo viên (API Security 403 Forbidden) — **PASS** (309ms)

---

## Bugs Found

Chi tiết đầy đủ được tài liệu hóa tại [BUGS-FOUND.md](file:///d:/WEB/quiz-master/e2e/BUGS-FOUND.md):
1. **BUG-003:** Không có giao diện trực tiếp để chỉnh sửa nội dung/đáp án câu hỏi trong trang `/teacher/bank`.
2. **BUG-004:** Race condition khi tải danh sách câu hỏi bất đồng bộ trong trang Chỉnh sửa đề thi (`TeacherQuizCreateEditPage.tsx`). Nếu người dùng bấm Lưu trước khi API câu hỏi nạp xong, hệ thống báo lỗi hoặc lưu đè mảng câu hỏi rỗng.
3. **BUG-005:** Nút radio option trong QuestionBuilder cho câu hỏi `SINGLE_CHOICE` không thể toggle bỏ chọn (uncheck).
4. **BUG-006:** Thiếu điều khiển phân trang (`Pagination controls`) ở cả danh sách Đề thi và Ngân hàng câu hỏi, gây giảm hiệu năng khi dữ liệu tăng cao.

---

## Known Limitations

1. **Chỉnh sửa câu hỏi ngân hàng đề:** Không thể kiểm thử luồng sửa trực tiếp trong `/teacher/bank` do ứng dụng chỉ hỗ trợ xóa và import từ máy tính.
2. **Quá tải tài nguyên khi chạy song song 8 workers có headed browser:** Cần giới hạn `workers: 2` trên môi trường máy trạm để tránh tranh chấp CPU và Dev server Vite, đảm bảo kiểm thử chính xác và ổn định.

---

## Batch 1 Regression

Lệnh thực thi thực tế: `npx playwright test e2e/tests/auth e2e/tests/rbac --project=chromium`

* **Total:** 18 (3 auth setup + 15 specs)
* **Passed:** 18
* **Failed:** 0
* **Skipped:** 0
* **Duration:** 26.6s
* **Pass Rate:** 100%

---

## All E2E Suite (Batch 1 + Batch 2)

Lệnh thực thi thực tế: `npx playwright test --project=chromium`

* **Total:** 38 (3 auth setup + 35 specs)
* **Passed:** 38
* **Failed:** 0
* **Skipped:** 0
* **Duration:** 1.5m (91.0s)
* **Pass Rate:** 100%

---

## Final Status

**PASS** (100% test cases passed, tất cả các lỗi và hạn chế phát hiện đã được ghi nhận trong BUGS-FOUND.md)

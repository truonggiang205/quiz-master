# BÁO CÁO ĐỘ BAO PHỦ KIỂM THỬ TỰ ĐỘNG (TEST COVERAGE REPORT)
**Hệ thống:** QuizMaster E2E Playwright Automation  
**Cập nhật lần cuối:** Sau khi khắc phục BUG-007 và hoàn thành BATCH 3 (Student Module: Dashboard, Classroom, Quiz, Exam, Submission, Result, RBAC)

---

## 1. BẢNG TIẾN ĐỘ THỰC HIỆN THEO BATCH

| Batch | Phân hệ / Module | Planned | Implemented | Passed | Failed | Skipped | Tỷ lệ Pass | Trạng thái |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Batch 1** | **Authentication & RBAC** | **15** | **15** (+3 setup) | **18** | **0** | **0** | **100%** | **HOÀN THÀNH** |
| **Batch 2** | **Teacher Module (Quiz, Bank, Classroom, RBAC)** | **20** | **20** | **20** | **0** | **0** | **100%** | **HOÀN THÀNH** |
| **Batch 3** | **Student Module (Classroom, Exam, Submit, Result, RBAC)** | **20** | **20** | **20** | **0** | **0** | **100%** | **HOÀN THÀNH (ĐÃ FIX BUG-007)** |
| Batch 4 | Grading & Appeals (Chấm tự luận, Phúc khảo) | 5 | 0 | 0 | 0 | 0 | 0% | Chưa bắt đầu |
| Batch 5 | Admin & Common (User lock, Reports, Theme) | 13 | 0 | 0 | 0 | 0 | 0% | Chưa bắt đầu |
| **Tổng** | **Toàn bộ hệ thống** | **73** | **58** | **58** | **0** | **0** | **100%** | **79.5% tổng dự án** |

---

## 2. CHI TIẾT CÁC TEST CASES TRONG BATCH 3 (STUDENT MODULE)

### Nhóm 1: Student Dashboard & Classroom
1. `TC-STU-001`: Học sinh truy cập Student Dashboard, kiểm tra banner chào mừng, các thẻ thống kê ("Bài đã hoàn thành", "Điểm trung bình", "Đang làm") và không xuất hiện các control Teacher/Admin. (Pass)
2. `TC-STU-002`: Học sinh mở danh sách lớp học (`/student/classrooms`), xác nhận danh sách render đúng dữ liệu từ backend. (Pass)
3. `TC-STU-003`: Học sinh tham gia lớp học bằng mã mời hợp lệ (`inviteCode`), kiểm tra thông báo thành công và thẻ lớp học xuất hiện. (Pass)
4. `TC-STU-004`: Học sinh nhập mã mời không hợp lệ/không tồn tại, xác nhận hệ thống báo lỗi và không thêm lớp học giả. (Pass)
5. `TC-STU-005`: Học sinh thử tham gia lại lớp học đã là thành viên, backend trả về thông báo lỗi thành viên đã tham gia, không tạo bản ghi trùng. (Pass)
6. `TC-STU-006`: Học sinh xem chi tiết lớp học (`/student/classrooms/:id`), hiển thị tên lớp, mô tả, thông tin giáo viên và bạn học. (Pass)

### Nhóm 2: Quiz Discovery & Security
7. `TC-STU-007`: Học sinh xem danh sách bài kiểm tra khả dụng (`/student/quizzes`), kiểm tra tìm kiếm theo tên và lọc theo môn học. (Pass)
8. `TC-STU-008`: Học sinh xem trang tổng quan đề thi (`/student/quizzes/:id`) trước khi bắt đầu, hiển thị thời lượng, tổng điểm, số câu hỏi và nút bắt đầu. (Pass)
9. `TC-STU-009`: Học sinh không thể truy cập bài thi ở trạng thái bản thảo (`DRAFT`) qua URL hoặc API. (Pass)
10. `TC-STU-010`: API `GET /quizzes/:id/questions` bảo mật câu hỏi: Không để lộ trường `isCorrect: true` và `explanation` cho học sinh trước khi nộp bài. (Pass)

### Nhóm 3: Examination & Questions
11. `TC-STU-011`: Học sinh chọn đáp án câu hỏi trắc nghiệm một lựa chọn (Single Choice), kiểm tra tính chất chọn loại trừ và cập nhật bảng câu hỏi. (Pass)
12. `TC-STU-012`: Học sinh trả lời câu hỏi trắc nghiệm nhiều đáp án (Multiple Choice), kiểm tra chọn/bỏ chọn checkbox và lưu danh sách option IDs. (Pass)
13. `TC-STU-013`: Modal xác nhận nộp bài hiển thị cảnh báo phân loại rõ ràng số câu đã trả lời và số câu chưa hoàn thành. (Pass)

### Nhóm 4: Submission & Scoring
14. `TC-STU-014`: Học sinh nộp bài thi thành công qua modal xác nhận, gọi API `POST /submit` và tự động điều hướng sang trang kết quả `/result`. (Pass)
15. `TC-STU-015`: Ngăn chặn nộp bài lần 2: Khi đã nộp bài, truy cập lại phòng thi `/take` sẽ bị chuyển hướng ngay sang trang kết quả `/result`. (Pass)
16. `TC-STU-016`: Hệ thống tự động tính điểm chính xác tuyệt đối (10/10 điểm cho 2 câu trả lời đúng). (Pass)

### Nhóm 5: Result & Answer Visibility
17. `TC-STU-017`: Trang kết quả hiển thị trực quan: Điểm số, phần trăm đạt được, số câu đúng/sai, thời gian hoàn thành và nút phúc khảo. (Pass)
18. `TC-STU-018`: Quy tắc khóa hiển thị đáp án: Khi chưa đến thời điểm mở (`showAnswersAfter`), giao diện hiển thị banner khóa và ẩn chi tiết đáp án đúng. (Pass)

### Nhóm 6: Student RBAC & API Security
19. `TC-STU-019`: Học sinh cố tình truy cập các URL quản trị của Giáo viên (`/teacher/quizzes`, `/teacher/quizzes/create`, `/teacher/bank`) bị `RoleGuard` chặn và điều hướng về `/student/dashboard`. (Pass)
20. `TC-STU-020`: Học sinh cố tình gọi các API quản lý đề thi của Giáo viên (`POST /quizzes`, `PATCH /quizzes/:id`, `DELETE /quizzes/:id`). (PASS: Backend đã được khắc phục với `RolesGuard` và `@Roles('TEACHER', 'ADMIN')`, trả về mã `403 Forbidden`).

---

## 3. KẾT QUẢ REGRESSION BATCH 1 & BATCH 2
* **Batch 1 Regression:** 18 / 18 PASS (0 Failed, 0 Flaky, thời gian ~25.1s)
* **Batch 2 Regression:** 23 / 23 PASS (0 Failed, 0 Flaky, thời gian ~53.5s)
* **Batch 3 Regression:** 23 / 23 PASS (0 Failed, 0 Flaky, thời gian ~49.1s)

---

## 4. TỔNG KẾT TOÀN SUITE HIỆN TẠI (BATCH 1 + 2 + 3)
* **Tổng số test chạy cùng lúc:** 58 tests (3 setup + 15 auth/rbac + 20 teacher + 20 student)
* **Tổng Passed:** 58 / 58 (100%)
* **Tổng Failed:** 0
* **Tổng Skipped:** 0
* **Thời gian thực thi:** 2.0 phút


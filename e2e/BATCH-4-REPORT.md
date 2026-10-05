# BATCH 4 — ESSAY AUTO/MANUAL GRADING & QUESTION IMAGE RENDERING & APPEALS REPORT

## 1. Executive Summary
- **Execution Date**: 2026-10-05
- **Browser**: Chromium
- **Test Framework**: Playwright + TypeScript
- **Target Systems**: React 19 (Vite) Frontend + NestJS TypeORM Backend + MySQL
- **Total Test Cases**: 23
- **Passed**: 23 (100%)
- **Failed**: 0 (0%)
- **Skipped**: 0 (0%)
- **Suite Execution Time**: ~38.6s
- **Full Regression Test Suite (Batches 1 - 4)**: 78/78 Passed (2.4m)

---

## 2. Issues Fixed in Batch 4

### BUG-008: Question Image Rendering Failure
- **Description**: Khi giáo viên tải ảnh lên cho câu hỏi thi hoặc đề tự luận dạng base64 Data URL (`data:image/png;base64,...`), phía Frontend (`QuestionCard.tsx`) kiểm tra `.startsWith('http')`. Do base64 không bắt đầu bằng `http`, hệ thống tự nối chuỗi `'http://localhost:3000' + imageUrl` gây ra URL lỗi dạng `http://localhost:3000data:image/...`, dẫn đến ảnh không hiển thị trên giao diện làm bài thi của học sinh.
- **Root Cause**: Thiếu hàm tiện ích chuẩn hóa xử lý URL ảnh đa nguồn (data URL, blob, relative path, absolute URL).
- **Remediation**:
  - Tạo `frontend/src/utils/image.util.ts` với hàm `resolveImageUrl()`.
  - Cập nhật `QuestionCard.tsx`, `StudentQuizResultPage.tsx`, `TeacherGradingPage.tsx`, `QuestionBuilder.tsx`.
  - Nâng cấp cột `QuestionEntity.imageUrl` từ `text` sang `longtext` trong MySQL để lưu trữ an toàn các ảnh base64 lớn.

### BUG-009: Conditional Essay Auto-Grading & Manual Grading Flow
- **Description**: Giáo viên giao câu hỏi tự luận, nếu đã điền đáp án mẫu / rubric chấm bài thì khi học sinh nộp bài phải tự động chấm điểm; nếu giáo viên KHÔNG điền đáp án thì KHÔNG tự động chấm mà để trạng thái chờ giáo viên chấm thủ công.
- **Root Cause**:
  - DTO `CreateQuestionDto` yêu cầu `options` bắt buộc, làm lỗi khi tạo câu hỏi tự luận không có phương án trắc nghiệm.
  - `SubmissionsService.submitQuiz` chưa phân tách giữa tự luận có đáp án và tự luận chờ chấm thủ công, luôn gán `scoreAwarded: 0` và `isCorrect: false`.
- **Remediation**:
  - Thêm cột `essayRubric` kiểu `json` vào `QuestionEntity`.
  - Đặt `options` thành `@IsOptional()` trong `CreateQuestionDto`.
  - Trong `SubmissionsService.submitQuiz`:
    - Nếu có đáp án (`acceptedAnswers.length > 0 || criteria.length > 0`): Tự động chấm điểm qua `gradeWithRubric`, cộng dồn `totalScore`, ghi nhận `isCorrect: true/false`.
    - Nếu KHÔNG có đáp án: Giữ nguyên `isCorrect: undefined`, `scoreAwarded: 0` và đánh dấu bài thi chưa chấm xong (`isFullyGraded: false`).
  - Giao diện `StudentQuizResultPage.tsx` hiển thị badge `Chờ giáo viên chấm điểm` kèm icon đồng hồ khi `isCorrect === undefined`.

---

## 3. Test Cases Implemented & Verified

| Test ID | Tên Kịch Bản | Kết Quả |
| :--- | :--- | :---: |
| **TC-B4-001** | Giáo viên tạo câu hỏi tự luận có cấu hình đáp án tự động (`acceptedAnswers` & `criteria`) | **PASS** |
| **TC-B4-002** | Học sinh nộp bài tự luận CÓ ĐIỀN ĐÁP ÁN — Hệ thống TỰ ĐỘNG CHẤM điểm đúng tuyệt đối | **PASS** |
| **TC-B4-003** | Học sinh nộp bài tự luận CÓ ĐIỀN ĐÁP ÁN nhưng trả lời SAI — Hệ thống tự động chấm 0 điểm | **PASS** |
| **TC-B4-004** | Giáo viên tạo đề tự luận KHÔNG ĐIỀN ĐÁP ÁN — Học sinh làm xong KHÔNG được tự động chấm (chờ giáo viên chấm) | **PASS** |
| **TC-B4-005** | Giáo viên chấm điểm thủ công cho bài nộp tự luận chưa có đáp án (`POST /submissions/:id/grade`) | **PASS** |
| **TC-B4-006** | Hiển thị hình ảnh đề bài khi học sinh bấm vào làm bài thi (UI E2E trên Chromium) | **PASS** |
| **TC-B4-007** | Hiển thị hình ảnh đề bài và trạng thái chấm trên trang Kết quả (UI E2E) | **PASS** |
| **TC-B4-008** | Đề thi hỗn hợp Trắc nghiệm + Tự luận (có đáp án) — Tính toán tổng điểm chính xác | **PASS** |
| **TC-B4-009** | Học sinh gửi yêu cầu phúc khảo cho bài nộp của mình thành công (`POST /api/appeals`) | **PASS** |
| **TC-B4-010** | Chặn học sinh gửi yêu cầu phúc khảo trùng lặp trên cùng một bài nộp (400 Bad Request) | **PASS** |
| **TC-B4-011** | Chặn gửi yêu cầu phúc khảo cho bài nộp không tồn tại (404 Not Found) | **PASS** |
| **TC-B4-012** | Chặn Giáo viên gửi yêu cầu phúc khảo (chỉ dành riêng cho Học sinh) | **PASS** |
| **TC-B4-013** | Chặn Học sinh tự phản hồi / duyệt yêu cầu phúc khảo | **PASS** |
| **TC-B4-014** | Học sinh xem danh sách phúc khảo của bản thân (`GET /api/appeals`) | **PASS** |
| **TC-B4-015** | Giáo viên xem danh sách các yêu cầu phúc khảo từ học sinh (`GET /api/appeals`) | **PASS** |
| **TC-B4-016** | Giáo viên phản hồi phúc khảo — Chấp nhận (`APPROVED`) kèm lời giải thích | **PASS** |
| **TC-B4-017** | Giáo viên phản hồi phúc khảo — Từ chối (`REJECTED`) | **PASS** |
| **TC-B4-018** | Phản hồi yêu cầu phúc khảo không tồn tại -> 404 Not Found | **PASS** |
| **TC-B4-019** | Upload API chặn các file không phải ảnh (PDF / DOCX qua `POST /api/upload`) | **PASS** |
| **TC-B4-020** | Chặn truy cập trái phép xem bài nộp khi chưa xác thực (`GET /submissions/:id` -> 401) | **PASS** |

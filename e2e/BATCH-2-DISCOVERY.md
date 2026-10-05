# BÁO CÁO PHÂN TÍCH & KHẢO SÁT CHI TIẾT PHÂN HỆ GIÁO VIÊN (BATCH 2 DISCOVERY)
**Hệ thống:** QuizMaster E2E Playwright Automation  
**Phân hệ:** Teacher Module (Quiz Management, Question Bank, Classroom & Student Management)  
**Tác giả:** Senior QA Automation Engineer + Software Architect  
**Trạng thái:** Hoàn thành khảo sát (Ready for Review - DO NOT CODE UNTIL CONFIRMED)

---

## 1. TEACHER ROUTES (ĐIỀU HƯỚNG GIAO DIỆN GIÁO VIÊN)

Toàn bộ các route của Giáo viên được bảo vệ bởi 2 lớp guard: `<ProtectedRoute>` (xác thực Token) và `<RoleGuard allowedRole="TEACHER">` (kiểm tra Role).

| Route Frontend | Component tương ứng | Mục đích & Nghiệp vụ |
| :--- | :--- | :--- |
| `/teacher/dashboard` | `TeacherDashboard.tsx` | Bảng điều khiển tổng quan KPI, thống kê số lượng đề thi, học sinh, bài làm và danh sách bài thi gần đây. |
| `/teacher/quizzes` | `TeacherQuizListPage.tsx` | Quản lý danh sách bài kiểm tra: tìm kiếm, lọc theo trạng thái (Tất cả / Đang mở / Bản thảo), chuyển đổi trạng thái Publish/Unpublish, chuyển trang Sửa, Xem trước, Kết quả và Xóa đề thi (kèm Modal xác nhận). |
| `/teacher/quizzes/create` | `TeacherQuizCreateEditPage.tsx` | Khởi tạo đề thi mới: tiêu đề, môn học, thời lượng, thang điểm (Thang 10 / 100 / 4), cấu hình đối tượng (Theo lớp / Kèm 1-1), thời gian mở/hạn nộp, lịch công bố đáp án, QuestionBuilder và Modal chọn câu hỏi từ Ngân hàng. |
| `/teacher/quizzes/:id/edit` | `TeacherQuizCreateEditPage.tsx` | Chỉnh sửa thông tin đề thi và đồng bộ câu hỏi hiện có với backend. |
| `/teacher/quizzes/:id/preview` | `TeacherQuizPreviewPage.tsx` | Chế độ xem trước bài kiểm tra (Preview Mode) mô phỏng chính xác giao diện làm bài của học sinh. |
| `/teacher/quizzes/:id/results` | `TeacherQuizResultsPage.tsx` | Thống kê kết quả thi và danh sách học sinh nộp bài. *(Batch 4)* |
| `/teacher/quizzes/:quizId/grade/:submissionId` | `TeacherGradingPage.tsx` | Chấm điểm tự luận và nhận xét bài nộp. *(Batch 4)* |
| `/teacher/bank` | `TeacherQuestionBankPage.tsx` | Quản lý kho ngân hàng đề của giáo viên theo bộ môn: lọc môn học, chọn nhiều câu hỏi để xóa hàng loạt hoặc xóa từng câu, nhập đề từ file thiết bị. |
| `/teacher/classrooms` | `TeacherClassroomsPage.tsx` | Quản lý danh sách khóa học: Lớp học nhóm (kèm mã mời `inviteCode`) và Lớp kèm 1-1. Modal tạo khóa học mới. |
| `/teacher/classrooms/:id` | `TeacherClassroomDetailPage.tsx` | Chi tiết lớp học, hiển thị mã mời, danh sách học sinh tham gia lớp và nút Xóa học sinh khỏi lớp (kèm Modal xác nhận). |
| `/teacher/students` | `TeacherStudentsPage.tsx` | Danh bạ học sinh dạy kèm 1-1, gửi lời mời học sinh qua email, xóa học sinh khỏi danh bạ. |
| `/teacher/appeals` | `TeacherAppealsPage.tsx` | Quản lý đơn phúc khảo bài thi từ học sinh. *(Batch 4)* |
| `/teacher/profile` | `TeacherProfilePage.tsx` | Thông tin cá nhân của giáo viên. *(Batch 5)* |
| `/teacher/report` | `ReportBugPage.tsx` | Báo cáo sự cố hệ thống. *(Batch 5)* |

---

## 2. TEACHER COMPONENTS & UI ARCHITECTURE

### A. Layout & Navigation
* `TeacherLayout.tsx`: Bọc toàn bộ trang của giáo viên, bao gồm `Navbar.tsx` (có thông tin avatar, đổi theme Dark/Light, toggle sidebar), `Sidebar.tsx`, và `PageWrapper.tsx` (hiệu ứng chuyển trang Framer Motion).
* `Sidebar.tsx`: Chứa các NavLink:
  * "Tổng Quan" $\rightarrow$ `/teacher/dashboard`
  * "Học Sinh" $\rightarrow$ `/teacher/students`
  * "Khóa Học" $\rightarrow$ `/teacher/classrooms`
  * "Kết quả ôn tập và kiểm tra" $\rightarrow$ `/teacher/quizzes`
  * "Tạo bài thi mới" $\rightarrow$ `/teacher/quizzes/create`
  * "Ngân hàng đề" $\rightarrow$ `/teacher/bank`

### B. Core UI Components trong Quiz
* `QuestionBuilder.tsx`: Quản lý danh sách câu hỏi động của bài thi:
  * Thêm câu hỏi (`#add-question-btn` / "Thêm câu hỏi").
  * Chọn loại câu hỏi: `SINGLE_CHOICE` (Một đáp án đúng), `MULTIPLE_CHOICE` (Nhiều đáp án đúng), `TRUE_FALSE` (Đúng / Sai), `ESSAY` (Tự luận).
  * Đánh dấu đáp án đúng: Button chứa icon `<CheckCircle>` / `<Circle>` (cho Single) hoặc `<CheckSquare>` / `<Square>` (cho Multi).
  * Nhập nội dung câu hỏi (`placeholder="Nhập nội dung câu hỏi..."`).
  * Nhập các lựa chọn A, B, C, D (`placeholder="Nội dung lựa chọn A..."`, v.v.).
  * Nút "Lưu vào ngân hàng câu hỏi" (`title="Lưu vào ngân hàng câu hỏi"`).
  * Nút "Nhập từ Ngân hàng" $\rightarrow$ Mở Bank Import Modal.
  * Nhân bản câu hỏi (`title="Nhân bản câu hỏi"`).
  * Xóa câu hỏi (`title="Xóa câu hỏi"`).
  * Khóa/Mở khóa điểm và tự động cân bằng điểm (`rebalance()` theo `totalPoints`).
* **Bank Import Modal** (trong `TeacherQuizCreateEditPage.tsx`):
  * Tải danh sách câu hỏi từ API `GET /api/questions/bank`.
  * Checkbox chọn từng câu hỏi hoặc nhiều câu hỏi.
  * Nút "Nhập (X) câu hỏi" $\rightarrow$ Clone câu hỏi vào `questions` của form hiện tại và chia lại điểm.
* **ConfirmationModal**:
  * Được dùng khi xóa đề thi trên `TeacherQuizListPage.tsx`, xóa câu hỏi trên `TeacherQuestionBankPage.tsx`, và xóa học sinh trên `TeacherClassroomDetailPage.tsx`.

---

## 3. QUIZ APIS (BACKEND REST ENDPOINTS)

Backend Controller: `backend/src/modules/quizzes/quizzes.controller.ts`  
Backend Service: `backend/src/modules/quizzes/quizzes.service.ts`

| Method | Endpoint | Role Guard | Mô tả | Request Body / Params | Response Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/quizzes` | `JwtAuthGuard` | Lấy danh sách đề thi | Query params (nếu có) | `data: QuizEntity[]` (Với `TEACHER`, tự động lọc theo `teacherId = user.id`) |
| `GET` | `/api/quizzes/:id` | `JwtAuthGuard` | Lấy chi tiết đề thi | `id: string` | `data: QuizEntity` (Nếu `role !== 'TEACHER'` và `status !== 'PUBLISHED'`, ném `BadRequestException`) |
| `POST` | `/api/quizzes` | `JwtAuthGuard` | Tạo bài kiểm tra mới | `CreateQuizDto` | `data: QuizEntity` (Khởi tạo ở trạng thái `status: 'DRAFT'`, `teacherId: user.id`) |
| `PATCH` | `/api/quizzes/:id` | `JwtAuthGuard` | Cập nhật thông tin đề thi | `UpdateQuizDto` | `data: QuizEntity` |
| `DELETE` | `/api/quizzes/:id` | `JwtAuthGuard` | Xóa vĩnh viễn đề thi | `id: string` | `data: { id, deleted: true }` (Xóa cascade cả câu hỏi và bài nộp) |
| `POST` | `/api/quizzes/:id/publish` | `JwtAuthGuard` | Xuất bản bài kiểm tra | `id: string` | `data: QuizEntity` (Chuyển `status: 'PUBLISHED'`, gửi thông báo cho học sinh) |
| `POST` | `/api/quizzes/:id/unpublish` | `JwtAuthGuard` | Gỡ về bản thảo | `id: string` | `data: QuizEntity` (Chuyển `status: 'DRAFT'`) |

---

## 4. QUESTION & QUESTION BANK APIS

Backend Controller: `backend/src/modules/questions/questions.controller.ts`  
Backend Service: `backend/src/modules/questions/questions.service.ts`

| Method | Endpoint | Role Guard | Mô tả | Request Body / Params | Response Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/quizzes/:quizId/questions` | `JwtAuthGuard` | Lấy câu hỏi trong đề | `quizId: string`, `examMode: boolean` | `data: QuestionEntity[]` (Học sinh bị che `isCorrect` và `explanation`) |
| `POST` | `/api/quizzes/:quizId/questions` | `JwtAuthGuard` | Tạo câu hỏi vào đề | `CreateQuestionDto` | `data: QuestionEntity` |
| `PATCH` | `/api/questions/:id` | `JwtAuthGuard` | Cập nhật câu hỏi | `UpdateQuestionDto` | `data: QuestionEntity` (Chặn sửa điểm nếu đã có học sinh nộp bài) |
| `DELETE` | `/api/questions/:id` | `JwtAuthGuard` | Xóa câu hỏi khỏi đề/kho | `id: string` | `data: { id, deleted: true }` |
| `GET` | `/api/questions/bank` | `JwtAuthGuard` | Lấy ngân hàng câu hỏi của GV | None | `data: QuestionEntity[]` (Lọc theo `teacherId = user.id, isBank = true`) |
| `POST` | `/api/questions/bank` | `JwtAuthGuard` | Lưu câu hỏi vào ngân hàng | `CreateQuestionDto` | `data: QuestionEntity` (`isBank: true`, `teacherId: user.id`) |
| `POST` | `/api/quizzes/:quizId/import-bank` | `JwtAuthGuard` | Nhập câu hỏi từ ngân hàng vào đề | `{ questionIds: string[] }` | `data: QuestionEntity[]` |

---

## 5. CLASSROOM APIS

Backend Controller: `backend/src/modules/classrooms/classrooms.controller.ts`  
Backend Service: `backend/src/modules/classrooms/classrooms.service.ts`

| Method | Endpoint | Role Guard | Mô tả | Request Body / Params | Response Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/classrooms` | `JwtAuthGuard` | Giáo viên tạo lớp học mới | `CreateClassDto` (`name`, `description`, `subject`, `isPrivate`) | `data: ClassEntity` (Sinh `inviteCode` duy nhất định dạng `PREFIX-XXXX`) |
| `GET` | `/api/classrooms/teacher` | `JwtAuthGuard` | Lấy danh sách lớp của GV | None | `data: ClassEntity[]` (Gộp lớp học nhóm và kèm 1-1) |
| `GET` | `/api/classrooms/:id` | `JwtAuthGuard` | Xem chi tiết lớp & học sinh | `id: string` | `data: ClassEntity` (Quan hệ `students` và `teacher`) |
| `DELETE` | `/api/classrooms/:id/students/:studentId` | `JwtAuthGuard` | GV xóa học sinh khỏi lớp | `id: string`, `studentId: string` | `data: { success: true }` |
| `POST` | `/api/classrooms/join` | `JwtAuthGuard` | Học sinh tham gia lớp | `{ inviteCode: string }` | `data: { success: true, classId, className }` |

---

## 6. EXISTING POMS & TEST INFRASTRUCTURE REUSE

Batch 1 đã xây dựng nền tảng vững chắc:
1. `e2e/pages/base.page.ts`:
   * `toastContainer`, `toastHeading`: Xử lý thông báo Toast (`expectToast()`).
   * `confirmModal`, `modalConfirmBtn`, `modalCancelBtn`: Xử lý modal xác nhận (`confirmModalAction()`).
   * `themeToggleBtn`: Đổi giao diện Sáng / Tối.
2. `e2e/utils/constants.ts`:
   * Chứa `TEST_CONFIG`, `TEST_USERS` (`TEACHER`, `STUDENT`, `ADMIN`), `STORAGE_PATHS`.
3. `e2e/utils/api-helper.ts`:
   * `ApiHelper`: Wrapper gọi API trực tiếp với `Authorization: Bearer <token>` và `x-user-role`. Dùng cực kỳ hiệu quả để setup/cleanup dữ liệu.
4. `e2e/utils/test-data.ts`:
   * Chứa `uniqueString()`, `uniqueEmail()`, `generateQuizData()`, `generateClassroomData()`.
5. Storage State:
   * `e2e/.auth/teacher.json` đã được tạo sẵn từ `auth.setup.ts`. Các spec của Teacher chỉ cần khai báo:
     ```typescript
     test.use({ storageState: STORAGE_PATHS.TEACHER });
     ```
     giúp test chạy ngay lập tức mà không cần đăng nhập lại từ đầu qua UI.

---

## 7. PROPOSED NEW POMS FOR BATCH 2

Sẽ tạo các Page Object Models chuẩn mực kế thừa từ `BasePage`:

1. `e2e/pages/teacher/teacher-dashboard.page.ts`:
   * Đại diện cho trang `/teacher/dashboard`.
   * Locators: KPI stat cards, welcome heading, quick link "Tạo bài thi mới", "Quản lý đề thi", danh sách bài kiểm tra gần đây.

2. `e2e/pages/teacher/quiz-list.page.ts`:
   * Đại diện cho trang `/teacher/quizzes`.
   * Locators: nút "Tạo bài thi mới" (`#create-new-quiz-btn`), ô tìm kiếm bài thi, các nút lọc trạng thái ("Tất cả", "Đang mở", "Bản thảo"), thẻ bài thi (`quiz-card`), badge trạng thái, nút "Xuất bản" / "Đang mở", nút "Xem trước", nút "Sửa", nút "Xóa" và modal xác nhận xóa vĩnh viễn.

3. `e2e/pages/teacher/quiz-form.page.ts`:
   * Đại diện cho trang tạo/sửa đề thi `/teacher/quizzes/create` và `/teacher/quizzes/:id/edit`.
   * Locators:
     * Thông tin chung: `titleInput`, `descriptionTextarea`, `modeSelect`, `subjectInput`, `durationInput`, `totalAttemptsInput`, `totalPointsSelect`.
     * Đối tượng: nút "Theo Lớp", select `classId`.
     * Nút hành động: "Lưu bản thảo", "Xuất bản ngay" (`#publish-quiz-btn`).
     * QuestionBuilder: nút "Thêm câu hỏi" (`#add-question-btn`), danh sách câu hỏi, ô nhập nội dung câu hỏi, ô nhập các lựa chọn, nút toggle đáp án đúng, nút "Lưu vào ngân hàng", nút "Nhập từ Ngân hàng".
     * Bank Modal: checkbox chọn câu hỏi từ ngân hàng, nút "Nhập câu hỏi".

4. `e2e/pages/teacher/question-bank.page.ts`:
   * Đại diện cho trang `/teacher/bank`.
   * Locators: Danh mục môn học bên trái ("Tất cả", "Toán Học", v.v.), danh sách câu hỏi trong ngân hàng, checkbox chọn câu hỏi, nút "Xóa câu hỏi" trên từng card, nút "Xóa mục đã chọn", nút "Nhập từ thiết bị".

5. `e2e/pages/teacher/classroom.page.ts`:
   * Đại diện cho trang `/teacher/classrooms` và modal tạo lớp:
     * Header & nút "Tạo mới".
     * Filter tabs: "Tất cả", "Lớp học nhóm", "Kèm 1-1".
     * Create Classroom Modal: lựa chọn loại lớp (Lớp nhóm / Kèm 1-1), ô nhập `name`, `subject`, `description`, nút submit "Tạo lớp nhóm" / "Tạo lớp kèm 1-1".
     * Classroom Card: tên lớp, môn học, mã mời `inviteCode`, nút copy mã, link "Quản lý lớp".
   * Đại diện cho trang chi tiết lớp học `/teacher/classrooms/:id`:
     * Chi tiết mã mời `inviteCode`, danh sách học sinh tham gia, nút Xóa học sinh (`title="Xóa khỏi lớp"`), modal xác nhận xóa.

---

## 8. EXISTING VALIDATION RULES & BEHAVIORS

### A. Quiz Form Validation
* **Tiêu đề đề thi (`title`)**:
  * Frontend: Nếu trống $\rightarrow$ hiện Toast thông báo lỗi: `Vui lòng nhập tên bài kiểm tra`.
  * Backend: `@IsNotEmpty()` $\rightarrow$ trả về lỗi 400 Bad Request.
* **Số lượng câu hỏi**:
  * Frontend: Nếu chưa có câu hỏi nào $\rightarrow$ Toast: `Chưa có câu hỏi - Vui lòng thêm ít nhất 1 câu hỏi cho bài kiểm tra`.
* **Nội dung từng câu hỏi**:
  * Frontend: Nếu câu hỏi để trống nội dung $\rightarrow$ Toast: `Nội dung câu hỏi trống - Câu hỏi số X chưa có nội dung. Vui lòng kiểm tra lại`.
* **Lựa chọn đáp án**:
  * Với câu hỏi trắc nghiệm (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`), phải có ít nhất 2 phương án có nội dung $\rightarrow$ Toast: `Thiếu đáp án`.
  * Phải chọn ít nhất 1 đáp án đúng $\rightarrow$ Toast: `Chưa chọn đáp án đúng`.
* **Ràng buộc khi Xuất bản đề thi (Publish)**:
  * Backend kiểm tra nghiêm ngặt: `sum(question.points) === quiz.totalPoints`. Nếu không khớp, backend ném `BadRequestException('Tổng điểm các câu hỏi (...) không khớp với thang điểm của bài thi (...)')`.

### B. Classroom Creation Validation
* **Tên khóa học (`name`)**:
  * Frontend: Thuộc tính `required` trên input HTML.
  * Backend: `@IsNotEmpty()` $\rightarrow$ trả về 400 nếu thiếu.
* **Mã mời (`inviteCode`)**:
  * Được sinh tự động trên server theo format `${PREFIX}-${RANDOM4}` (Ví dụ: `TOAN-7K2X` hoặc `MATH-9A1B`). Không cho phép người dùng tự điền.
  * Đảm bảo tính duy nhất trong database bằng vòng lặp `while (await this.classRepo.findOneBy({ inviteCode }))`.

---

## 9. EXISTING AUTHORIZATION & RBAC IN TEACHER MODULE

1. **Giao diện người dùng (UI):**
   * Nếu người dùng chưa đăng nhập truy cập `/teacher/*` $\rightarrow$ Bị `<ProtectedRoute>` chuyển hướng về `/login`.
   * Nếu người dùng có vai trò `STUDENT` truy cập `/teacher/*` $\rightarrow$ Bị `<RoleGuard allowedRole="TEACHER">` chặn và chuyển hướng về `/student/dashboard`.
   * Nếu người dùng có vai trò `ADMIN` truy cập `/teacher/*` $\rightarrow$ Bị `<RoleGuard allowedRole="TEACHER">` chặn và chuyển hướng về `/admin/dashboard`.

2. **API Backend:**
   * Tất cả API Quiz, Question, Classroom đều gắn `@UseGuards(JwtAuthGuard)`.
   * API `POST /api/classrooms` kiểm tra: `if (!teacher || teacher.role !== 'TEACHER') throw new UnauthorizedException('Chỉ giáo viên mới được tạo lớp học')`.
   * API `GET /api/classrooms/:id` kiểm tra: Chỉ giáo viên tạo lớp hoặc học sinh thuộc lớp mới có quyền xem thông tin chi tiết.
   * API `DELETE /api/classrooms/:id/students/:studentId` kiểm tra: Chỉ giáo viên tạo lớp mới được quyền xóa học sinh khỏi lớp.
   * API `GET /api/quizzes/:id`: Nếu user không phải `TEACHER` và đề thi chưa ở trạng thái `PUBLISHED`, backend chặn trả về chi tiết.

---

## 10. PROPOSED BATCH 2 TEST CASES (CHI TIẾT 20 TEST CASES)

### Nhóm 1: Quản lý đề thi (Quiz Management - 10 Test Cases)
| ID | Kịch bản kiểm thử | Module | Role | Priority | Type | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TC-TCH-001** | Giáo viên mở trang Quản lý bài kiểm tra | Quiz | Teacher | P0 | Positive | Điều hướng tới `/teacher/quizzes`, hiển thị tiêu đề trang, thanh tìm kiếm, bộ lọc trạng thái và danh sách bài thi. |
| **TC-TCH-002** | Giáo viên tạo bài kiểm tra mới đầy đủ thông tin (Lưu bản thảo) | Quiz | Teacher | P0 | Positive | Điền tiêu đề `E2E Quiz Draft [ts]`, môn học, thời lượng, câu hỏi trắc nghiệm, bấm "Lưu bản thảo". Xuất hiện toast thành công, chuyển về danh sách và bài thi hiển thị huy hiệu `Bản thảo` (`DRAFT`). |
| **TC-TCH-003** | Validation: Báo lỗi khi tạo đề thi để trống tiêu đề | Quiz | Teacher | P1 | Negative | Vào trang tạo đề, xóa trống tiêu đề, bấm "Lưu bản thảo". Xuất hiện toast thông báo `Vui lòng nhập tên bài kiểm tra`, không gửi request tạo đề. |
| **TC-TCH-004** | Validation: Báo lỗi khi câu hỏi chưa chọn đáp án đúng | Quiz | Teacher | P1 | Negative | Nhập tiêu đề, nội dung câu hỏi, nhưng bỏ chọn tất cả đáp án đúng, bấm "Lưu bản thảo". Xuất hiện toast lỗi `Chưa chọn đáp án đúng`. |
| **TC-TCH-005** | Giáo viên chỉnh sửa tiêu đề và thời lượng đề thi đã tạo | Quiz | Teacher | P0 | Positive | Mở trang chỉnh sửa `/teacher/quizzes/:id/edit`, đổi tiêu đề thành `E2E Quiz Updated [ts]`, tăng thời lượng lên 30 phút, bấm lưu. Dữ liệu mới được cập nhật và hiển thị đúng trên danh sách. |
| **TC-TCH-006** | Giáo viên xuất bản đề thi (Publish Quiz) | Quiz | Teacher | P0 | Positive | Tại danh sách hoặc trang tạo, bấm "Xuất bản ngay" hoặc nút "Xuất bản" trên thẻ bài thi. Trạng thái chuyển sang `Đang mở` (`PUBLISHED`), toast hiển thị `Đã xuất bản đề thi thành công`. |
| **TC-TCH-007** | Giáo viên gỡ đề thi về trạng thái bản thảo (Unpublish Quiz) | Quiz | Teacher | P0 | Positive | Bấm nút "Đang mở" (Gỡ bài về bản thảo) trên bài thi đang mở. Trạng thái đề thi chuyển về `Bản thảo` (`DRAFT`), toast thông báo thành công. |
| **TC-TCH-008** | Giáo viên xem trước đề thi trong chế độ Preview Mode | Quiz | Teacher | P1 | Positive | Bấm nút "Xem trước" trên thẻ bài thi. Điều hướng vào `/teacher/quizzes/:id/preview`, hiển thị banner xem trước màu hổ phách và hiển thị câu hỏi mô phỏng học sinh. |
| **TC-TCH-009** | Xóa bài kiểm tra với Modal xác nhận (Kiểm tra Cancel vs Confirm) | Quiz | Teacher | P0 | Positive | Bấm nút Xóa (icon thùng rác): Modal xác nhận xuất hiện. Bấm "Hủy" $\rightarrow$ bài thi vẫn còn nguyên. Bấm lại Xóa $\rightarrow$ Bấm "Xóa vĩnh viễn" $\rightarrow$ Bài thi biến mất khỏi danh sách. |
| **TC-TCH-010** | Lọc và tìm kiếm bài kiểm tra trên giao diện | Quiz | Teacher | P1 | Positive | Nhập từ khóa tìm kiếm vào ô input $\rightarrow$ Danh sách chỉ hiển thị các đề khớp tiêu đề. Bấm lọc "Đang mở" $\rightarrow$ Chỉ hiển thị đề có status PUBLISHED. |

### Nhóm 2: Ngân hàng câu hỏi (Question Bank - 4 Test Cases)
| ID | Kịch bản kiểm thử | Module | Role | Priority | Type | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TC-TCH-011** | Giáo viên xem danh sách Ngân hàng câu hỏi và lọc theo môn học | Question Bank | Teacher | P1 | Positive | Truy cập `/teacher/bank`, hiển thị danh mục môn học bên trái và danh sách câu hỏi ngân hàng bên phải. |
| **TC-TCH-012** | Giáo viên lưu câu hỏi từ form soạn đề vào Ngân hàng câu hỏi | Question Bank | Teacher | P0 | Positive | Trong trang tạo đề `/teacher/quizzes/create`, soạn câu hỏi và bấm icon "Lưu vào ngân hàng câu hỏi". Toast báo `Đã lưu câu hỏi vào ngân hàng`. Vào `/teacher/bank` xác nhận câu hỏi đã xuất hiện. |
| **TC-TCH-013** | Giáo viên nhập câu hỏi từ Ngân hàng câu hỏi vào bài kiểm tra mới | Question Bank | Teacher | P0 | Positive | Trong form tạo đề, bấm "Nhập từ Ngân hàng", chọn câu hỏi trong modal và bấm "Nhập câu hỏi". Câu hỏi từ ngân hàng được chèn thành công vào QuestionBuilder của đề thi. |
| **TC-TCH-014** | Giáo viên xóa câu hỏi khỏi Ngân hàng câu hỏi kèm Modal xác nhận | Question Bank | Teacher | P1 | Positive | Tại `/teacher/bank`, bấm icon Xóa trên câu hỏi, modal "Xoá câu hỏi" hiện ra. Xác nhận xóa $\rightarrow$ Câu hỏi biến mất khỏi ngân hàng. |

### Nhóm 3: Quản lý lớp học & Học sinh (Classroom & Students - 4 Test Cases)
| ID | Kịch bản kiểm thử | Module | Role | Priority | Type | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TC-TCH-015** | Giáo viên mở trang Quản lý khóa học và xem các tab phân loại | Classroom | Teacher | P1 | Positive | Truy cập `/teacher/classrooms`, hiển thị tab "Tất cả", "Lớp học nhóm", "Kèm 1-1" cùng số lượng lớp tương ứng. |
| **TC-TCH-016** | Giáo viên tạo lớp học nhóm mới và kiểm tra định dạng mã mời (Invite Code) | Classroom | Teacher | P0 | Positive | Bấm "Tạo mới", chọn "Lớp nhóm", nhập Tên lớp `E2E Class [ts]`, môn học `Toán Học`, bấm "Tạo lớp nhóm". Lớp mới xuất hiện kèm mã mời định dạng `TOAN-XXXX` hợp lệ. |
| **TC-TCH-017** | Giáo viên xem chi tiết lớp học và danh sách học sinh | Classroom | Teacher | P0 | Positive | Bấm vào thẻ lớp học để vào `/teacher/classrooms/:id`. Hiển thị tên lớp, mã mời trên header, mô tả và danh sách học sinh. |
| **TC-TCH-018** | Giáo viên xóa học sinh khỏi lớp học | Classroom | Teacher | P1 | Positive | Tại chi tiết lớp đã có học sinh, bấm icon Xóa học sinh (`title="Xóa khỏi lớp"`). Xác nhận modal "Xóa học sinh" $\rightarrow$ Học sinh bị xóa khỏi danh sách lớp, sĩ số giảm 1. |

### Nhóm 4: Phân quyền & Bảo mật Teacher Module (RBAC - 2 Test Cases)
| ID | Kịch bản kiểm thử | Module | Role | Priority | Type | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TC-TCH-019** | Học sinh không thể truy cập các trang quản trị của Giáo viên | RBAC | Student | P0 | Security | Học sinh truy cập trực tiếp `/teacher/quizzes`, `/teacher/bank`, `/teacher/classrooms` $\rightarrow$ Bị `RoleGuard` chặn và chuyển hướng về `/student/dashboard`. |
| **TC-TCH-020** | Học sinh không thể gọi API tạo lớp học của Giáo viên (API Security) | RBAC | Student | P0 | Security | Gửi request `POST /api/classrooms` bằng JWT của học sinh. Backend từ chối với status `401 Unauthorized` kèm thông báo `Chỉ giáo viên mới được tạo lớp học`. |

---

## 11. MISSING FUNCTIONALITY & GAPS (TÍNH NĂNG CHƯA HOÀN THIỆN TRONG SOURCE CODE)

1. **Tạo câu hỏi thủ công trực tiếp trên trang Ngân hàng đề (`/teacher/bank`):**
   * Trang `/teacher/bank` hiện chỉ có nút "Nhập từ thiết bị" (Upload file `.docx` / `.pdf`), không có nút hay modal "Thêm câu hỏi mới" thủ công trực tiếp trên trang này.
   * *Giải pháp E2E thực tế:* Luồng thực tế của QuizMaster là giáo viên soạn câu hỏi trong Quiz Form (`QuestionBuilder.tsx`) rồi bấm "Lưu vào ngân hàng câu hỏi" (hoặc gọi API `POST /api/questions/bank`). Test case `TC-TCH-012` sẽ kiểm thử đúng luồng nghiệp vụ thực tế này.
2. **Chỉnh sửa câu hỏi trong Ngân hàng đề (`/teacher/bank`):**
   * UI `/teacher/bank` hiện tại chỉ hỗ trợ xóa câu hỏi (`<Trash2 />`), chưa có nút/modal "Chỉnh sửa" câu hỏi trong kho ngân hàng.
   * *Đánh dấu:* `NOT IMPLEMENTED IN UI`. Không tạo test giả cho tính năng edit trên UI ngân hàng đề.
3. **Giao bài kiểm tra cho riêng một lớp học từ trang Classroom Detail:**
   * Trong `TeacherClassroomDetailPage.tsx` có dòng ghi chú: `* Tính năng giao bài cho riêng lớp học đang phát triển ở Giai đoạn 2`.
   * *Đánh dấu:* `OUT OF SCOPE`. Giao bài được thực hiện độc lập tại `/teacher/quizzes/create` bằng cách chọn dropdown lớp học.

---

## 12. POTENTIAL APPLICATION BUGS & BEHAVIOR OBSERVATIONS

1. **Ràng buộc tổng điểm khi Publish Quiz (`quizzes.service.ts` L175-L189):**
   * Backend kiểm tra: nếu `currentTotalPoints !== quiz.totalPoints` sẽ ném `BadRequestException`.
   * Khi tạo quiz qua UI, hàm `rebalance()` của frontend tự động chia điểm cho các câu hỏi sao cho tổng điểm bằng thang điểm (mặc định 1000 = 10.00 điểm).
   * *Lưu ý Automation:* Khi tạo quiz bằng API Helper hoặc UI, phải đảm bảo điểm của các câu hỏi cộng lại bằng chính xác `totalPoints` của quiz để tránh lỗi 400 khi gọi Publish.
2. **Axios 401 Interceptor (`BUG-001` đã phát hiện ở Batch 1):**
   * Khi token hết hạn hoặc API trả về 401, frontend ngay lập tức redirect về `/login`. Trong Batch 2, chúng ta sử dụng `storageState: STORAGE_PATHS.TEACHER` với token hợp lệ được cấp từ `auth.setup.ts`.

---

## 13. TEST ISOLATION & CLEANUP STRATEGY

* **Test Data Isolation:**
  * Mọi dữ liệu kiểm thử được sinh động kèm timestamp duy nhất:
    * Quiz: `E2E Quiz ${Date.now()}_${Math.floor(Math.random() * 1000)}`
    * Classroom: `E2E Class ${Date.now()}_${Math.floor(Math.random() * 1000)}`
    * Question: `E2E Question ${Date.now()}_${Math.floor(Math.random() * 1000)}`
* **Test Cleanup:**
  * Sử dụng `ApiHelper` trong khối `afterEach` hoặc `afterAll` để dọn dẹp các Quiz và Classroom do test tạo ra (`DELETE /api/quizzes/:id`, `DELETE /api/classrooms/:id` nếu có hoặc UI cleanup).
  * Đảm bảo test không để lại dữ liệu rác làm ảnh hưởng đến các lần chạy sau.

---

## 14. RECOMMENDED IMPLEMENTATION ORDER (THỨ TỰ THỰC HIỆN)

Sau khi được phê duyệt tài liệu Discovery này, việc triển khai sẽ diễn ra tuần tự:

1. **Bước 1 — Xây dựng Page Object Models (POMs):**
   * `e2e/pages/teacher/quiz-list.page.ts`
   * `e2e/pages/teacher/quiz-form.page.ts`
   * `e2e/pages/teacher/question-bank.page.ts`
   * `e2e/pages/teacher/classroom.page.ts`
2. **Bước 2 — Triển khai Group 1: Quiz Management Tests (`TC-TCH-001` $\rightarrow$ `TC-TCH-010`):**
   * File: `e2e/tests/teacher/quiz.spec.ts`
   * Chạy kiểm thử: `npx playwright test e2e/tests/teacher/quiz.spec.ts --project=chromium`
   * Xác nhận 100% Pass trước khi sang nhóm kế tiếp.
3. **Bước 3 — Triển khai Group 2: Question Bank Tests (`TC-TCH-011` $\rightarrow$ `TC-TCH-014`):**
   * File: `e2e/tests/teacher/question-bank.spec.ts`
   * Chạy kiểm thử: `npx playwright test e2e/tests/teacher/question-bank.spec.ts --project=chromium`
4. **Bước 4 — Triển khai Group 3: Classroom & Student Management Tests (`TC-TCH-015` $\rightarrow$ `TC-TCH-018`):**
   * File: `e2e/tests/teacher/classroom.spec.ts`
   * Chạy kiểm thử: `npx playwright test e2e/tests/teacher/classroom.spec.ts --project=chromium`
5. **Bước 5 — Triển khai Group 4: Teacher RBAC Tests (`TC-TCH-019`, `TC-TCH-020`):**
   * File: `e2e/tests/teacher/teacher-rbac.spec.ts`
   * Chạy kiểm thử: `npx playwright test e2e/tests/teacher/teacher-rbac.spec.ts --project=chromium`
6. **Bước 6 — Chạy toàn bộ Regression Test Suite (Batch 1 + Batch 2):**
   * Đảm bảo toàn bộ test (khoảng 38 tests) đều PASS 100% trên Chromium.
7. **Bước 7 — Cập nhật tài liệu:**
   * Cập nhật `e2e/TEST-MATRIX.md`, `e2e/TEST-COVERAGE.md`, `e2e/BUGS-FOUND.md`.
   * Xuất báo cáo tổng kết `e2e/BATCH-2-REPORT.md`.

---
*Báo cáo Discovery đã sẵn sàng. Vui lòng xem xét và phản hồi để bắt đầu giai đoạn Implementation.*

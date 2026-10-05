# MA TRẬN KỊCH BẢN KIỂM THỬ TỰ ĐỘNG (TEST MATRIX)
**Hệ thống:** QuizMaster E2E Test Suite  
**Số lượng kịch bản:** 50 Test Cases chi tiết  
**Tiêu chí phân loại:** P0 (Critical - Khởi động & Cốt lõi), P1 (High - Chức năng nghiệp vụ chính), P2 (Medium - Luồng phụ & Validation), P3 (Low - Giao diện & Biên).

---

## PHÂN HỆ 1: XÁC THỰC & TÀI KHOẢN (AUTHENTICATION)

### TC-AUTH-001
* **Tên:** Đăng nhập thành công với tài khoản Giáo viên (Teacher)
* **Module:** Authentication
* **Role:** Teacher
* **Feature:** Login
* **Precondition:** Tài khoản giáo viên hợp lệ đã được kích hoạt (`trphuonganh005@gmail.com`).
* **Steps:**
  1. Điều hướng tới `/login`.
  2. Nhập Email: `trphuonganh005@gmail.com`.
  3. Nhập Mật khẩu: `123456`.
  4. Bấm nút "ĐĂNG NHẬP".
* **Expected Result:** Hiển thị toast thông báo thành công, lưu token vào `localStorage`, chuyển hướng tới `/teacher/dashboard`.
* **Priority:** P0
* **Type:** Positive

### TC-AUTH-002
* **Tên:** Đăng nhập thành công với tài khoản Học sinh (Student)
* **Module:** Authentication
* **Role:** Student
* **Feature:** Login
* **Precondition:** Tài khoản học sinh hợp lệ đã được kích hoạt (`gianght09112005@gmail.com`).
* **Steps:**
  1. Điều hướng tới `/login`.
  2. Nhập Email: `gianght09112005@gmail.com`.
  3. Nhập Mật khẩu: `123456`.
  4. Bấm nút "ĐĂNG NHẬP".
* **Expected Result:** Chuyển hướng tới `/student/dashboard`.
* **Priority:** P0
* **Type:** Positive

### TC-AUTH-003
* **Tên:** Đăng nhập thành công với tài khoản Quản trị viên (Admin)
* **Module:** Authentication
* **Role:** Admin
* **Feature:** Login
* **Precondition:** Tài khoản quản trị viên đã được tạo sẵn trong cơ sở dữ liệu (`admin@quizmaster.com`).
* **Steps:**
  1. Điều hướng tới `/login`.
  2. Nhập Email: `admin@quizmaster.com`.
  3. Nhập Mật khẩu: `Password@123`.
  4. Bấm nút "ĐĂNG NHẬP".
* **Expected Result:** Chuyển hướng tới `/admin/dashboard`.
* **Priority:** P0
* **Type:** Positive

### TC-AUTH-004
* **Tên:** Đăng nhập thất bại khi nhập sai mật khẩu
* **Module:** Authentication
* **Role:** Guest
* **Feature:** Login
* **Precondition:** Tài khoản `trphuonganh005@gmail.com` tồn tại.
* **Steps:**
  1. Điều hướng tới `/login`.
  2. Nhập Email: `trphuonganh005@gmail.com`.
  3. Nhập Mật khẩu sai: `SaiMatKhau@999`.
  4. Bấm nút "ĐĂNG NHẬP".
* **Expected Result:** Không chuyển trang, xuất hiện thông báo lỗi toast "Mật khẩu không chính xác" hoặc "Có lỗi xảy ra".
* **Priority:** P0
* **Type:** Negative

### TC-AUTH-005
* **Tên:** Đăng nhập thất bại với email chưa từng đăng ký
* **Module:** Authentication
* **Role:** Guest
* **Feature:** Login
* **Precondition:** Email `chua_tung_ton_tai_999@domain.com` chưa có trong hệ thống.
* **Steps:**
  1. Điều hướng tới `/login`.
  2. Nhập Email không tồn tại.
  3. Nhập Mật khẩu: `123456`.
  4. Bấm nút "ĐĂNG NHẬP".
* **Expected Result:** Báo lỗi tài khoản không chính xác, giữ nguyên ở trang `/login`.
* **Priority:** P0
* **Type:** Negative

### TC-AUTH-006
* **Tên:** Đăng ký tài khoản Học sinh mới và kích hoạt bằng mã OTP
* **Module:** Authentication
* **Role:** Student (Mới)
* **Feature:** Register & Verify OTP
* **Precondition:** Sử dụng email ngẫu nhiên chưa đăng ký (`student_<timestamp>@test.com`).
* **Steps:**
  1. Điều hướng tới `/register`.
  2. Điền Họ tên: `Học Sinh Tự Động`.
  3. Điền Email ngẫu nhiên.
  4. Điền Mật khẩu: `123456`.
  5. Chọn vai trò: `Học sinh`.
  6. Bấm "ĐĂNG KÝ NGAY".
  7. Lấy mã OTP (từ response fallback `devOtp` hoặc toast).
  8. Nhập mã OTP 6 số và xác nhận.
* **Expected Result:** Kích hoạt tài khoản thành công, hệ thống tự động đăng nhập và đưa vào `/student/dashboard`.
* **Priority:** P0
* **Type:** Positive

### TC-AUTH-007
* **Tên:** Đăng ký thất bại khi email đã tồn tại và đã xác thực
* **Module:** Authentication
* **Role:** Guest
* **Feature:** Register
* **Precondition:** Email `trphuonganh005@gmail.com` đã được kích hoạt.
* **Steps:**
  1. Điều hướng tới `/register`.
  2. Điền email đã tồn tại kèm các thông tin khác.
  3. Bấm "ĐĂNG KÝ NGAY".
* **Expected Result:** Hiển thị thông báo lỗi "Email này đã được đăng ký tài khoản".
* **Priority:** P1
* **Type:** Negative

### TC-AUTH-008
* **Tên:** Luồng Quên mật khẩu và Đặt lại mật khẩu bằng mã OTP
* **Module:** Authentication
* **Role:** Student / Teacher
* **Feature:** Forgot & Reset Password
* **Precondition:** Tài khoản kiểm thử tồn tại.
* **Steps:**
  1. Tại `/login`, bấm vào "Quên mật khẩu?".
  2. Nhập email tài khoản cần lấy lại.
  3. Bấm gửi yêu cầu OTP.
  4. Đọc OTP trả về, nhập mã OTP và mật khẩu mới (`NewPassword@123`).
  5. Bấm xác nhận đổi mật khẩu.
* **Expected Result:** Hiển thị thông báo đổi mật khẩu thành công, quay về form đăng nhập, đăng nhập thử bằng mật khẩu mới thành công.
* **Priority:** P1
* **Type:** Positive

### TC-AUTH-009
* **Tên:** Đăng xuất khỏi hệ thống thành công
* **Module:** Authentication
* **Role:** Teacher
* **Feature:** Logout
* **Precondition:** Đang trong phiên đăng nhập hợp lệ.
* **Steps:**
  1. Mở menu tài khoản / Navbar.
  2. Bấm "Đăng xuất".
* **Expected Result:** `localStorage` bị xóa sạch token và thông tin user, trình duyệt được chuyển hướng về trang `/login` hoặc `/`.
* **Priority:** P1
* **Type:** Positive

---

## PHÂN HỆ 2: BẢO VỆ ĐIỀU HƯỚNG & PHÂN QUYỀN (RBAC & GUARDS)

### TC-RBAC-001
* **Tên:** Người dùng chưa đăng nhập truy cập trang được bảo vệ bị chuyển hướng về Login
* **Module:** RBAC
* **Role:** Guest
* **Feature:** ProtectedRoute
* **Precondition:** `localStorage` không chứa token.
* **Steps:**
  1. Điều hướng trực tiếp tới `/teacher/quizzes`.
* **Expected Result:** Bị chặn lại và tự động chuyển hướng về `/login`.
* **Priority:** P0
* **Type:** Security / Positive

### TC-RBAC-002
* **Tên:** Học sinh cố tình truy cập trang của Giáo viên bị chuyển hướng về Student Dashboard
* **Module:** RBAC
* **Role:** Student
* **Feature:** RoleGuard
* **Precondition:** Đã đăng nhập vai trò `STUDENT`.
* **Steps:**
  1. Điều hướng trực tiếp tới `/teacher/quizzes/create`.
* **Expected Result:** Bị chặn bởi `RoleGuard(TEACHER)` và bị đẩy về `/student/dashboard`.
* **Priority:** P0
* **Type:** Security / Positive

### TC-RBAC-003
* **Tên:** Học sinh cố tình truy cập trang Quản trị Admin bị chuyển hướng về Student Dashboard
* **Module:** RBAC
* **Role:** Student
* **Feature:** RoleGuard
* **Precondition:** Đã đăng nhập vai trò `STUDENT`.
* **Steps:**
  1. Điều hướng trực tiếp tới `/admin/users`.
* **Expected Result:** Bị chặn bởi `RoleGuard(ADMIN)` và bị đẩy về `/student/dashboard`.
* **Priority:** P0
* **Type:** Security / Positive

### TC-RBAC-004
* **Tên:** Giáo viên cố tình truy cập trang Quản trị Admin bị chuyển hướng về Teacher Dashboard
* **Module:** RBAC
* **Role:** Teacher
* **Feature:** RoleGuard
* **Precondition:** Đã đăng nhập vai trò `TEACHER`.
* **Steps:**
  1. Điều hướng trực tiếp tới `/admin/settings`.
* **Expected Result:** Bị chặn bởi `RoleGuard(ADMIN)` và bị đẩy về `/teacher/dashboard`.
* **Priority:** P0
* **Type:** Security / Positive

### TC-RBAC-005
* **Tên:** Gọi trực tiếp API Admin khi không mang header hoặc quyền Admin bị từ chối 401
* **Module:** RBAC / API
* **Role:** Teacher / Student
* **Feature:** API Role Verification
* **Precondition:** Đã đăng nhập tài khoản Teacher.
* **Steps:**
  1. Gửi request `GET /api/admin/users` kèm JWT token của Teacher nhưng không có header `x-user-role: ADMIN`.
* **Expected Result:** Backend trả về status `401 Unauthorized` kèm thông báo "Bạn không có quyền truy cập".
* **Priority:** P0
* **Type:** Security / API

---

## PHÂN HỆ 3: GIÁO VIÊN - QUẢN LÝ ĐỀ THI & CÂU HỎI (TEACHER QUIZ & QUESTION)

### TC-TCH-001
* **Tên:** Giáo viên tạo mới một bài kiểm tra trắc nghiệm đầy đủ thông tin
* **Module:** Quizzes
* **Role:** Teacher
* **Feature:** Create Quiz
* **Precondition:** Đã đăng nhập tài khoản Teacher.
* **Steps:**
  1. Vào `/teacher/quizzes/create`.
  2. Điền Tiêu đề đề thi: `Kiểm tra Toán Giải Tích 12 - [Timestamp]`.
  3. Chọn môn học: `Toán`.
  4. Nhập thời gian làm bài: `45` phút.
  5. Thêm câu hỏi trắc nghiệm: Nội dung câu hỏi, 4 phương án lựa chọn, chọn đáp án đúng.
  6. Bấm "Lưu đề thi" hoặc "Lưu bản thảo".
* **Expected Result:** Đề thi được tạo thành công, xuất hiện trong danh sách đề thi tại `/teacher/quizzes` với trạng thái `DRAFT`.
* **Priority:** P0
* **Type:** Positive

### TC-TCH-002
* **Tên:** Giáo viên xuất bản đề thi (Publish Quiz) cho học sinh làm bài
* **Module:** Quizzes
* **Role:** Teacher
* **Feature:** Publish Quiz
* **Precondition:** Có ít nhất 1 bài thi ở trạng thái `DRAFT`.
* **Steps:**
  1. Vào `/teacher/quizzes`.
  2. Tìm đề thi bản thảo vừa tạo.
  3. Bấm vào nút "Xuất bản" (Publish).
  4. Xác nhận trong modal (nếu có).
* **Expected Result:** Trạng thái đề thi chuyển sang `PUBLISHED`, học sinh có thể nhìn thấy bài thi này.
* **Priority:** P0
* **Type:** Positive

### TC-TCH-003
* **Tên:** Giáo viên gỡ bài thi về trạng thái bản thảo (Unpublish Quiz)
* **Module:** Quizzes
* **Role:** Teacher
* **Feature:** Unpublish Quiz
* **Precondition:** Có bài thi đang ở trạng thái `PUBLISHED`.
* **Steps:**
  1. Tại `/teacher/quizzes`, bấm nút "Gỡ bản thảo" trên bài thi đang mở.
* **Expected Result:** Trạng thái chuyển về `DRAFT`.
* **Priority:** P1
* **Type:** Positive

### TC-TCH-004
* **Tên:** Giáo viên chỉnh sửa thông tin đề thi và cập nhật câu hỏi
* **Module:** Quizzes
* **Role:** Teacher
* **Feature:** Edit Quiz
* **Precondition:** Đề thi tồn tại.
* **Steps:**
  1. Vào `/teacher/quizzes/:id/edit`.
  2. Đổi tiêu đề đề thi.
  3. Thêm một câu hỏi đúng/sai mới.
  4. Bấm "Cập nhật".
* **Expected Result:** Dữ liệu mới được cập nhật thành công và hiển thị đúng khi xem lại.
* **Priority:** P1
* **Type:** Positive

### TC-TCH-005
* **Tên:** Giáo viên xóa bài kiểm tra
* **Module:** Quizzes
* **Role:** Teacher
* **Feature:** Delete Quiz
* **Precondition:** Có bài kiểm tra tạm thời cần xóa.
* **Steps:**
  1. Tại danh sách `/teacher/quizzes`, bấm biểu tượng Xóa (Thùng rác).
  2. Xác nhận "Đồng ý xóa" trên modal xác nhận.
* **Expected Result:** Đề thi biến mất khỏi bảng danh sách đề thi.
* **Priority:** P1
* **Type:** Positive

### TC-TCH-006
* **Tên:** Thêm câu hỏi trực tiếp vào Ngân hàng câu hỏi của giáo viên
* **Module:** Question Bank
* **Role:** Teacher
* **Feature:** Question Bank CRUD
* **Precondition:** Đã đăng nhập Teacher.
* **Steps:**
  1. Vào `/teacher/bank`.
  2. Bấm "Thêm câu hỏi mới".
  3. Điền nội dung câu hỏi, môn học, phân loại đáp án.
  4. Bấm Lưu vào ngân hàng.
* **Expected Result:** Câu hỏi xuất hiện trong bảng danh sách câu hỏi ngân hàng.
* **Priority:** P1
* **Type:** Positive

### TC-TCH-007
* **Tên:** Nhập câu hỏi từ Ngân hàng câu hỏi vào bài kiểm tra
* **Module:** Quizzes / Question Bank
* **Role:** Teacher
* **Feature:** Import from Bank
* **Precondition:** Có sẵn câu hỏi trong ngân hàng và đang tạo/sửa đề thi.
* **Steps:**
  1. Trong trang soạn đề `/teacher/quizzes/create`.
  2. Bấm "Chọn từ ngân hàng câu hỏi".
  3. Chọn 1 hoặc nhiều câu hỏi từ danh sách.
  4. Bấm "Xác nhận nhập câu hỏi".
* **Expected Result:** Các câu hỏi đã chọn được chèn vào danh sách câu hỏi của đề thi hiện tại.
* **Priority:** P1
* **Type:** Positive

---

## PHÂN HỆ 4: GIÁO VIÊN - QUẢN LÝ LỚP HỌC (TEACHER CLASSROOMS)

### TC-TCH-008
* **Tên:** Giáo viên tạo lớp học mới và nhận mã mời (Invite Code)
* **Module:** Classrooms
* **Role:** Teacher
* **Feature:** Create Class
* **Precondition:** Đã đăng nhập Teacher.
* **Steps:**
  1. Vào `/teacher/classrooms`.
  2. Bấm nút "Tạo lớp học mới".
  3. Nhập Tên lớp: `Lớp 12A1 Chuyên Toán - [Timestamp]`.
  4. Nhập Môn học: `Toán Học`.
  5. Bấm "Tạo lớp".
* **Expected Result:** Lớp học được tạo, hiển thị mã mời (Invite Code) duy nhất (ví dụ: `ABCXYZ12`).
* **Priority:** P0
* **Type:** Positive

### TC-TCH-009
* **Tên:** Giáo viên xem chi tiết lớp học và danh sách học sinh
* **Module:** Classrooms
* **Role:** Teacher
* **Feature:** View Classroom Detail
* **Precondition:** Lớp học đã được tạo trước đó.
* **Steps:**
  1. Bấm vào thẻ lớp học để vào `/teacher/classrooms/:id`.
* **Expected Result:** Hiển thị tên lớp, môn học, sĩ số lớp, mã mời và danh sách học sinh tham gia.
* **Priority:** P1
* **Type:** Positive

### TC-TCH-010
* **Tên:** Giáo viên xóa học sinh khỏi lớp học
* **Module:** Classrooms
* **Role:** Teacher
* **Feature:** Remove Student from Class
* **Precondition:** Lớp học có ít nhất 1 học sinh tham gia.
* **Steps:**
  1. Tại chi tiết lớp học `/teacher/classrooms/:id`.
  2. Bấm nút Xóa/Khai trừ học sinh bên cạnh tên học sinh.
  3. Xác nhận modal.
* **Expected Result:** Học sinh bị loại khỏi danh sách lớp, sĩ số giảm đi 1.
* **Priority:** P1
* **Type:** Positive

---

## PHÂN HỆ 5: HỌC SINH - THAM GIA LỚP, LÀM BÀI THI & BẢO MẬT (STUDENT E2E BATCH 3)

### TC-STU-001
* **Tên:** Học sinh truy cập Student Dashboard, xem banner chào mừng và các thẻ thống kê
* **Module:** Student Dashboard
* **Role:** Student
* **Feature:** Dashboard Overview
* **Precondition:** Đăng nhập tài khoản Học sinh (`e2e/.auth/student.json`).
* **Steps:**
  1. Điều hướng tới `/student/dashboard`.
  2. Kiểm tra banner chào mừng chứa tên học sinh.
  3. Kiểm tra các thẻ thống kê: "Bài đã hoàn thành", "Điểm trung bình", "Đang làm".
  4. Xác nhận không hiển thị các control quản trị của Teacher/Admin (như nút "Tạo đề thi mới", "Quản lý ngân hàng").
* **Expected Result:** Trang tải thành công, giao diện dành riêng cho Học sinh hiển thị đầy đủ và sạch sẽ.
* **Priority:** P0
* **Type:** Positive / UI

### TC-STU-002
* **Tên:** Học sinh xem danh sách lớp học đã tham gia
* **Module:** Classrooms
* **Role:** Student
* **Feature:** Classroom List
* **Precondition:** Đăng nhập tài khoản Học sinh.
* **Steps:**
  1. Điều hướng tới `/student/classrooms`.
  2. Đợi API nạp dữ liệu lớp học (`GET /api/classrooms`).
  3. Xác nhận giao diện hiển thị danh sách thẻ lớp học hoặc trạng thái chưa tham gia lớp nào.
* **Expected Result:** Danh sách hiển thị đúng các lớp học của học sinh, có nút "Tham gia lớp học".
* **Priority:** P0
* **Type:** Positive

### TC-STU-003
* **Tên:** Học sinh tham gia lớp học bằng mã mời hợp lệ
* **Module:** Classrooms
* **Role:** Student
* **Feature:** Join Classroom
* **Precondition:** Giáo viên đã tạo một lớp học với mã mời `inviteCode` chuẩn `PREFIX-XXXX`.
* **Steps:**
  1. Vào `/student/classrooms`.
  2. Bấm nút "Tham gia lớp học" để mở Modal nhập mã.
  3. Điền mã mời hợp lệ.
  4. Bấm "Tham gia".
* **Expected Result:** Modal đóng lại, toast thông báo thành công xuất hiện, thẻ lớp học mới hiển thị trong danh sách.
* **Priority:** P0
* **Type:** Positive

### TC-STU-004
* **Tên:** Học sinh nhập mã mời không hợp lệ hoặc không tồn tại
* **Module:** Classrooms
* **Role:** Student
* **Feature:** Join Classroom Validation
* **Precondition:** Chuẩn bị mã mời giả mạo không tồn tại (`INVALID-CODE-99999`).
* **Steps:**
  1. Vào `/student/classrooms`.
  2. Bấm "Tham gia lớp học".
  3. Nhập mã mời giả mạo.
  4. Bấm "Tham gia".
* **Expected Result:** Hệ thống hiển thị thông báo lỗi (toast hoặc alert), không thêm lớp học giả vào danh sách, không redirect sai.
* **Priority:** P1
* **Type:** Negative

### TC-STU-005
* **Tên:** Học sinh không thể tham gia trùng lặp lớp học đã là thành viên
* **Module:** Classrooms
* **Role:** Student
* **Feature:** Duplicate Join Prevention
* **Precondition:** Học sinh đã tham gia lớp học ở TC-STU-003.
* **Steps:**
  1. Vào `/student/classrooms`.
  2. Bấm "Tham gia lớp học".
  3. Nhập lại chính xác mã mời của lớp đã tham gia.
  4. Bấm "Tham gia".
* **Expected Result:** Backend trả về thông báo lỗi đã là thành viên hoặc xử lý an toàn không tạo bản ghi trùng lặp trong database.
* **Priority:** P1
* **Type:** Negative / Edge Case

### TC-STU-006
* **Tên:** Học sinh xem trang chi tiết lớp học đã tham gia
* **Module:** Classrooms
* **Role:** Student
* **Feature:** Classroom Detail
* **Precondition:** Học sinh đã là thành viên của lớp học.
* **Steps:**
  1. Mở thẻ lớp học hoặc truy cập trực tiếp `/student/classrooms/:id`.
  2. Kiểm tra tên lớp học, mô tả, thông tin giáo viên phụ trách và danh sách bạn học.
* **Expected Result:** Thông tin lớp học tải đầy đủ, đúng dữ liệu từ backend.
* **Priority:** P1
* **Type:** Positive

### TC-STU-007
* **Tên:** Học sinh xem danh sách các bài kiểm tra khả dụng
* **Module:** Quizzes
* **Role:** Student
* **Feature:** Available Quiz List
* **Precondition:** Giáo viên đã xuất bản ít nhất một bài kiểm tra.
* **Steps:**
  1. Điều hướng tới `/student/quizzes`.
  2. Sử dụng ô tìm kiếm để lọc đề thi theo từ khóa.
  3. Sử dụng bộ lọc môn học (Toán, Vật lý, Tiếng Anh, v.v.).
* **Expected Result:** Danh sách hiển thị các đề thi đang mở (`PUBLISHED`), không hiển thị các đề thi bản thảo (`DRAFT`).
* **Priority:** P0
* **Type:** Positive

### TC-STU-008
* **Tên:** Học sinh xem thông tin tổng quan bài thi trước khi bắt đầu
* **Module:** Quizzes
* **Role:** Student
* **Feature:** Quiz Pre-Exam Overview
* **Precondition:** Đề thi đã xuất bản tồn tại.
* **Steps:**
  1. Truy cập trang thông tin đề thi `/student/quizzes/:id`.
  2. Kiểm tra tiêu đề đề thi, môn học, thời lượng làm bài, tổng điểm, số lượng câu hỏi và quy chế thi.
  3. Xác nhận có nút "Bắt đầu làm bài".
* **Expected Result:** Toàn bộ thông tin bài thi được nạp chính xác, nút bắt đầu sẵn sàng kích hoạt.
* **Priority:** P0
* **Type:** Positive

### TC-STU-009
* **Tên:** Học sinh không thể truy cập hoặc làm bài thi ở trạng thái bản thảo (DRAFT)
* **Module:** Quizzes / Security
* **Role:** Student
* **Feature:** Draft Quiz Access Restriction
* **Precondition:** Giáo viên tạo một bài thi và giữ nguyên trạng thái `DRAFT`.
* **Steps:**
  1. Học sinh truy cập trực tiếp URL `/student/quizzes/:draftQuizId`.
  2. Gọi API `GET /api/quizzes/:draftQuizId` từ phía học sinh.
* **Expected Result:** Bị chặn hoặc chuyển hướng thông báo bài thi chưa mở / không tìm thấy đề thi.
* **Priority:** P1
* **Type:** Security / Negative

### TC-STU-010
* **Tên:** Dữ liệu câu hỏi gửi về cho Học sinh bảo mật tuyệt đối đáp án đúng và lời giải
* **Module:** Quizzes / Security
* **Role:** Student
* **Feature:** Question Data Sanitization
* **Precondition:** Đề thi chứa câu hỏi có `isCorrect = true` và `explanation` chi tiết.
* **Steps:**
  1. Gọi API `GET /api/quizzes/:quizId/questions` bằng JWT token của Học sinh.
  2. Kiểm tra JSON response của từng option trong danh sách câu hỏi.
* **Expected Result:** Không có trường `isCorrect: true` hoặc `explanation` bị rò rỉ trong payload trước khi học sinh nộp bài.
* **Priority:** P0
* **Type:** Security / Positive

### TC-STU-011
* **Tên:** Học sinh trả lời câu hỏi trắc nghiệm một đáp án đúng (Single Choice)
* **Module:** Exam Taking
* **Role:** Student
* **Feature:** Single Choice Interaction
* **Precondition:** Đang trong phòng thi `/student/quizzes/:id/take`.
* **Steps:**
  1. Nhấp chọn đáp án A.
  2. Nhấp chuyển sang đáp án B.
  3. Kiểm tra trạng thái giao diện và palette câu hỏi.
* **Expected Result:** Đáp án B được chọn, đáp án A tự động hủy chọn (tính chất chọn loại trừ), palette câu hỏi đổi sang trạng thái đã trả lời.
* **Priority:** P0
* **Type:** Positive / UI

### TC-STU-012
* **Tên:** Học sinh trả lời câu hỏi trắc nghiệm nhiều đáp án đúng (Multiple Choice)
* **Module:** Exam Taking
* **Role:** Student
* **Feature:** Multiple Choice Interaction
* **Precondition:** Đề thi chứa câu hỏi loại `MULTIPLE_CHOICE`.
* **Steps:**
  1. Chọn đồng thời phương án A và C.
  2. Hủy chọn phương án A.
* **Expected Result:** Checkbox cập nhật tương ứng, payload lưu đúng mảng các ID đáp án đã chọn. *(Ghi chú: Nếu hệ thống chưa có UI loại câu hỏi này, ghi nhận Feature Gap)*.
* **Priority:** P2
* **Type:** Positive

### TC-STU-013
* **Tên:** Cảnh báo khi nộp bài thi còn câu hỏi chưa trả lời
* **Module:** Exam Taking
* **Role:** Student
* **Feature:** Unanswered Question Warning
* **Precondition:** Đang trong phòng thi với bài thi gồm 2 câu hỏi, học sinh chỉ trả lời 1 câu.
* **Steps:**
  1. Bấm nút "Nộp bài".
  2. Quan sát hộp thoại Modal xác nhận nộp bài.
* **Expected Result:** Modal cảnh báo hiển thị rõ: Số câu đã trả lời (1 câu) và Số câu chưa hoàn thành (1 câu), có nút Hủy để làm tiếp và nút Nộp bài để xác nhận.
* **Priority:** P1
* **Type:** Positive / Validation

### TC-STU-014
* **Tên:** Học sinh hoàn thành và nộp bài thi thành công
* **Module:** Submissions
* **Role:** Student
* **Feature:** Submit Exam Flow
* **Precondition:** Đang trong phòng thi và đã chọn câu trả lời.
* **Steps:**
  1. Bấm nút "Nộp bài".
  2. Xác nhận đồng ý trong Modal xác nhận nộp bài.
  3. Đợi request `POST /api/quizzes/:id/submit` xử lý.
* **Expected Result:** Hệ thống lưu bài nộp thành công, đóng phòng thi và tự động điều hướng sang trang kết quả `/student/quizzes/:id/result`.
* **Priority:** P0
* **Type:** Positive

### TC-STU-015
* **Tên:** Học sinh không thể nộp bài lần 2 cho bài thi đã hoàn thành
* **Module:** Submissions / Security
* **Role:** Student
* **Feature:** Prevent Duplicate Submission
* **Precondition:** Học sinh đã nộp bài ở TC-STU-014.
* **Steps:**
  1. Thử truy cập lại phòng thi `/student/quizzes/:id/take` hoặc gọi lại API submit bài.
* **Expected Result:** Hệ thống từ chối truy cập phòng thi, tự động chuyển về trang kết quả hoặc báo lỗi bài thi đã nộp.
* **Priority:** P1
* **Type:** Security / Negative

### TC-STU-016
* **Tên:** Hệ thống tự động tính điểm chính xác dựa trên đáp án đã nộp
* **Module:** Submissions / Scoring
* **Role:** Student
* **Feature:** Automated Score Calculation
* **Precondition:** Đề thi gồm 2 câu hỏi, mỗi câu 5 điểm. Học sinh trả lời đúng cả 2 câu.
* **Steps:**
  1. Sau khi nộp bài, đọc điểm số trả về từ API submission hoặc trên giao diện kết quả.
* **Expected Result:** Điểm số đạt được là `10/10` (100%), số câu đúng là 2, số câu sai là 0.
* **Priority:** P0
* **Type:** Positive / Business Logic

### TC-STU-017
* **Tên:** Học sinh xem chi tiết kết quả bài thi sau khi nộp
* **Module:** Result
* **Role:** Student
* **Feature:** Result Breakdown View
* **Precondition:** Đang ở trang `/student/quizzes/:id/result`.
* **Steps:**
  1. Kiểm tra khối hiển thị điểm số tổng quan và huy hiệu phần trăm.
  2. Kiểm tra số liệu: Số câu đúng, Số câu sai, Thời gian làm bài.
  3. Kiểm tra nút "Phúc khảo bài thi" hoặc "Quay lại danh sách đề thi".
* **Expected Result:** Các chỉ số kết quả hiển thị trực quan, đúng với kết quả thực tế của bài nộp.
* **Priority:** P0
* **Type:** Positive / UI

### TC-STU-018
* **Tên:** Quy tắc khóa hiển thị đáp án và lời giải chi tiết theo cấu hình thời gian
* **Module:** Result / Security
* **Role:** Student
* **Feature:** Time-Locked Answer & Explanation Visibility
* **Precondition:** Đề thi được giáo viên cấu hình `showAnswersAfter: tương lai` (chưa đến hạn mở đáp án).
* **Steps:**
  1. Học sinh mở trang kết quả bài thi.
  2. Quan sát phần xem lại chi tiết bài làm.
* **Expected Result:** Giao diện hiển thị banner thông báo "Đáp án & Lời giải đang được khóa", lời giải và đáp án đúng không được tiết lộ cho đến thời điểm được phép.
* **Priority:** P1
* **Type:** Positive / Business Rule

### TC-STU-019
* **Tên:** Học sinh không thể truy cập các trang quản trị đề thi của Giáo viên
* **Module:** RBAC
* **Role:** Student
* **Feature:** Teacher Route Access Restriction
* **Precondition:** Đăng nhập tài khoản Học sinh.
* **Steps:**
  1. Cố tình truy cập `/teacher/quizzes`.
  2. Cố tình truy cập `/teacher/quizzes/create`.
  3. Cố tình truy cập `/teacher/bank`.
* **Expected Result:** `RoleGuard` kích hoạt, học sinh bị chặn và tự động điều hướng về `/student/dashboard`.
* **Priority:** P0
* **Type:** Security / Positive

### TC-STU-020
* **Tên:** Học sinh không thể gọi các API quản lý và sửa đổi đề thi của Giáo viên
* **Module:** RBAC / API Security
* **Role:** Student
* **Feature:** API Authorization Guard (QuizzesController)
* **Precondition:** Đăng nhập tài khoản Học sinh, lấy JWT token.
* **Steps:**
  1. Gửi request `POST /api/quizzes` để cố tình tạo đề thi với token Học sinh.
  2. Gửi request `PATCH /api/quizzes/:id` để sửa đề thi.
  3. Gửi request `DELETE /api/quizzes/:id` để xóa đề thi.
* **Expected Result:** Backend phải ném `HTTP 403 Forbidden` hoặc `401 Unauthorized`.
* **Actual Result (BUG-007):** Backend trả về `HTTP 201 Created` do `QuizzesController` thiếu `@UseGuards(RolesGuard)` và `@Roles(Role.TEACHER)`.
* **Priority:** P0
* **Type:** Security / Negative

---

## PHÂN HỆ 6: CHẤM THI TỰ LUẬN & PHÚC KHẢO (GRADING & APPEALS)

### TC-GRD-001
* **Tên:** Giáo viên xem danh sách kết quả bài nộp của học sinh
* **Module:** Grading
* **Role:** Teacher
* **Feature:** View Quiz Submissions
* **Precondition:** Đã có học sinh nộp bài thi.
* **Steps:**
  1. Giáo viên vào `/teacher/quizzes/:id/results`.
* **Expected Result:** Bảng danh sách học sinh đã nộp hiển thị điểm số, thời gian nộp bài và trạng thái chấm.
* **Priority:** P1
* **Type:** Positive

### TC-GRD-002
* **Tên:** Giáo viên chấm điểm và nhận xét câu hỏi tự luận
* **Module:** Grading
* **Role:** Teacher
* **Feature:** Grade Essay Submission
* **Precondition:** Có bài nộp chứa câu hỏi tự luận cần chấm.
* **Steps:**
  1. Vào trang chấm bài `/teacher/quizzes/:quizId/grade/:submissionId`.
  2. Nhập điểm chấm cho câu tự luận.
  3. Bấm "Lưu kết quả chấm".
* **Expected Result:** Điểm tổng của bài thi được cập nhật lại, học sinh xem được điểm cập nhật.
* **Priority:** P1
* **Type:** Positive

### TC-APL-001
* **Tên:** Học sinh gửi yêu cầu phúc khảo bài thi
* **Module:** Appeals
* **Role:** Student
* **Feature:** Create Appeal
* **Precondition:** Học sinh đang ở trang kết quả bài thi `/student/quizzes/:id/result`.
* **Steps:**
  1. Bấm nút "Yêu cầu phúc khảo" (Appeal).
  2. Nhập lý do: `Em thắc mắc câu tự luận số 3 giải thích chưa thỏa đáng`.
  3. Bấm gửi đơn.
* **Expected Result:** Đơn phúc khảo được gửi thành công, chuyển sang trạng thái `PENDING`.
* **Priority:** P1
* **Type:** Positive

### TC-APL-002
* **Tên:** Học sinh gửi phúc khảo nhưng để trống lý do
* **Module:** Appeals
* **Role:** Student
* **Feature:** Create Appeal Validation
* **Precondition:** Đang mở modal phúc khảo.
* **Steps:**
  1. Để trống ô lý do.
  2. Bấm gửi.
* **Expected Result:** Báo lỗi yêu cầu nhập lý do, không gửi request.
* **Priority:** P2
* **Type:** Negative

### TC-APL-003
* **Tên:** Giáo viên xem danh sách phúc khảo và phản hồi phê duyệt/từ chối
* **Module:** Appeals
* **Role:** Teacher
* **Feature:** Process Appeal
* **Precondition:** Đang có yêu cầu phúc khảo ở trạng thái `PENDING`.
* **Steps:**
  1. Giáo viên vào `/teacher/appeals`.
  2. Bấm vào yêu cầu phúc khảo cần xử lý.
  3. Chọn trạng thái `APPROVED` (Chấp nhận) hoặc `REJECTED` (Từ chối).
  4. Nhập lời giải thích phản hồi.
  5. Bấm "Gửi phản hồi".
* **Expected Result:** Trạng thái phúc khảo chuyển sang đã xử lý, học sinh nhận được thông báo phản hồi.
* **Priority:** P1
* **Type:** Positive

---

## PHÂN HỆ 7: QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN MODULES)

### TC-ADM-001
* **Tên:** Admin xem thống kê tổng quan trên Dashboard
* **Module:** Admin Analytics
* **Role:** Admin
* **Feature:** Admin Dashboard
* **Precondition:** Đăng nhập tài khoản Admin.
* **Steps:**
  1. Vào `/admin/dashboard`.
* **Expected Result:** Hiển thị đầy đủ các thẻ thống kê: Tổng số User, Tổng số Đề thi, Tổng số Lớp học, Lượt thi.
* **Priority:** P0
* **Type:** Positive

### TC-ADM-002
* **Tên:** Admin lọc và tìm kiếm người dùng trong hệ thống
* **Module:** Admin Users
* **Role:** Admin
* **Feature:** Filter & Search Users
* **Precondition:** Đang ở trang `/admin/users`.
* **Steps:**
  1. Chọn lọc theo Role: `TEACHER`.
  2. Nhập từ khóa tìm kiếm: `Phương Anh`.
* **Expected Result:** Bảng danh sách lọc chính xác người dùng mang role Teacher có tên Phương Anh.
* **Priority:** P1
* **Type:** Positive

### TC-ADM-003
* **Tên:** Admin khóa và mở khóa tài khoản người dùng
* **Module:** Admin Users
* **Role:** Admin
* **Feature:** Toggle User Status
* **Precondition:** Chọn 1 tài khoản học sinh đang `isActive: true`.
* **Steps:**
  1. Tại `/admin/users`, bấm nút "Khóa tài khoản" trên tài khoản mục tiêu.
  2. Xác nhận thao tác.
* **Expected Result:** Trạng thái tài khoản chuyển sang Bị khóa (`isActive: false`), người dùng bị khóa không thể đăng nhập. Bấm lại lần nữa để mở khóa.
* **Priority:** P1
* **Type:** Positive

### TC-ADM-004
* **Tên:** Admin đặt lại mật khẩu cho tài khoản người dùng
* **Module:** Admin Users
* **Role:** Admin
* **Feature:** Reset User Password
* **Precondition:** Chọn 1 tài khoản học sinh.
* **Steps:**
  1. Bấm nút "Đặt lại mật khẩu".
  2. Nhập mật khẩu mới: `123456`.
  3. Bấm xác nhận.
* **Expected Result:** Mật khẩu tài khoản được cập nhật, đăng nhập với mật khẩu mới thành công.
* **Priority:** P1
* **Type:** Positive

### TC-ADM-005
* **Tên:** Admin không thể khóa hoặc reset mật khẩu của chính tài khoản Admin
* **Module:** Admin Users
* **Role:** Admin
* **Feature:** Admin Protection
* **Precondition:** Đang xem tài khoản có role `ADMIN`.
* **Steps:**
  1. Thử gọi API khóa tài khoản Admin.
* **Expected Result:** Backend trả về lỗi 400 "Không thể khóa tài khoản Admin".
* **Priority:** P1
* **Type:** Negative / Security

### TC-ADM-006
* **Tên:** Admin xóa cưỡng chế bài kiểm tra vi phạm
* **Module:** Admin Content
* **Role:** Admin
* **Feature:** Force Delete Quiz
* **Precondition:** Có bài kiểm tra trong hệ thống tại `/admin/content`.
* **Steps:**
  1. Tìm bài kiểm tra cần xóa.
  2. Bấm "Xóa đề thi".
  3. Xác nhận modal.
* **Expected Result:** Đề thi bị xóa khỏi toàn bộ hệ thống, giáo viên không còn nhìn thấy đề này.
* **Priority:** P1
* **Type:** Positive

### TC-ADM-007
* **Tên:** Admin xem và cập nhật trạng thái báo cáo lỗi (Bug Report)
* **Module:** Admin Reports
* **Role:** Admin
* **Feature:** Manage Bug Reports
* **Precondition:** Đã có báo cáo lỗi gửi từ học sinh/giáo viên.
* **Steps:**
  1. Vào `/admin/reports`.
  2. Chọn báo cáo lỗi ở trạng thái `PENDING`.
  3. Cập nhật trạng thái thành `RESOLVED`.
* **Expected Result:** Trạng thái báo cáo chuyển sang Đã giải quyết.
* **Priority:** P2
* **Type:** Positive

### TC-ADM-008
* **Tên:** Admin xem và chỉnh sửa cấu hình hệ thống
* **Module:** Admin Settings
* **Role:** Admin
* **Feature:** System Settings
* **Precondition:** Vào `/admin/settings`.
* **Steps:**
  1. Thay đổi cấu hình "Cho phép đăng ký mới" (Allow Registration).
  2. Bấm "Lưu cấu hình".
* **Expected Result:** Cấu hình mới được lưu và phản hồi thông báo thành công.
* **Priority:** P2
* **Type:** Positive

### TC-ADM-009
* **Tên:** Admin phát thông báo Broadcast toàn hệ thống
* **Module:** Notifications
* **Role:** Admin
* **Feature:** Broadcast Notification
* **Precondition:** Đăng nhập tài khoản Admin.
* **Steps:**
  1. Gửi thông báo toàn hệ thống: Tiêu đề `Bảo trì hệ thống`, Đối tượng `ALL`.
* **Expected Result:** Thông báo được phát, xuất hiện trên chuông thông báo của cả Học sinh và Giáo viên.
* **Priority:** P2
* **Type:** Positive

---

## PHÂN HỆ 8: TÍNH NĂNG CHUNG & TRẢI NGHIỆM NGƯỜI DÙNG (COMMON FEATURES)

### TC-COM-001
* **Tên:** Cập nhật thông tin cá nhân (Profile) của người dùng
* **Module:** Users
* **Role:** Teacher / Student
* **Feature:** Update Profile
* **Precondition:** Đang ở trang `/teacher/profile` hoặc `/student/profile`.
* **Steps:**
  1. Thay đổi Tên trường học: `THPT Chuyên Lê Hồng Phong`.
  2. Thay đổi Số điện thoại: `0987654321`.
  3. Bấm "Lưu thay đổi".
* **Expected Result:** Thông tin cá nhân được cập nhật thành công, reload trang vẫn giữ dữ liệu mới.
* **Priority:** P2
* **Type:** Positive

### TC-COM-002
* **Tên:** Xem thông báo và đánh dấu đã đọc
* **Module:** Notifications
* **Role:** Student / Teacher
* **Feature:** Notifications Bell
* **Precondition:** Có thông báo chưa đọc trong chuông thông báo.
* **Steps:**
  1. Bấm vào biểu tượng Chuông thông báo trên Navbar.
  2. Bấm vào một thông báo chưa đọc.
* **Expected Result:** Số đếm trên chuông giảm đi, thông báo chuyển sang trạng thái đã đọc.
* **Priority:** P2
* **Type:** Positive

### TC-COM-003
* **Tên:** Gửi báo cáo lỗi sự cố hệ thống (Report Bug)
* **Module:** Bug Reports
* **Role:** Student / Teacher
* **Feature:** Submit Bug Report
* **Precondition:** Đăng nhập tài khoản.
* **Steps:**
  1. Vào `/student/report` hoặc `/teacher/report`.
  2. Điền Tiêu đề lỗi: `Lỗi font chữ công thức toán KaTeX`.
  3. Điền Mô tả chi tiết lỗi.
  4. Bấm "Gửi báo cáo".
* **Expected Result:** Báo cáo được gửi thành công, Admin nhìn thấy trong danh sách `/admin/reports`.
* **Priority:** P2
* **Type:** Positive

### TC-COM-004
* **Tên:** Chuyển đổi giao diện Sáng / Tối (Theme Toggle)
* **Module:** UI / Theme
* **Role:** Any
* **Feature:** Dark Mode Toggle
* **Precondition:** Trang web đang ở chế độ Light Mode.
* **Steps:**
  1. Bấm vào nút chuyển Theme (ThemeToggle) trên Navbar.
* **Expected Result:** Thẻ `html` được gán class `dark`, giao diện chuyển sang tông màu tối ngay lập tức mà không làm reload trang.
* **Priority:** P3
* **Type:** Positive

# QUIZMASTER EXTERNAL STUDENT DOMAIN — API CONTRACT

Tài liệu đặc tả hợp đồng giao tiếp (API Contract) cho hệ thống Quản lý Học sinh Ngoài Hệ thống (External Student) và Học sinh Liên kết (Linked Student).

---

## 1. TỔNG QUAN XÁC THỰC & BẢO MẬT (OWNERSHIP / IDOR PROTECTION)

- **Xác thực:** Mọi API yêu cầu Bearer JWT Token của người dùng với vai trò `TEACHER`.
- **Ràng buộc quyền sở hữu (Teacher Ownership):**
  - Mọi thao tác truy vấn, tạo, cập nhật, xóa, liên kết hoặc truy cập lịch sử đều tự động trích xuất `teacherId = req.user.id` từ JWT token đã được ký điện tử.
  - **TUYỆT ĐỐI KHÔNG** nhận diện hoặc tin cậy `teacherId` gửi lên từ Client (`body`, `query`, hay `params`).
  - Mọi thao tác truy xuất `TeacherStudent` đều kiểm tra `where: { id: studentId, teacherId }` để ngăn chặn triệt để lỗi IDOR (Insecure Direct Object Reference). Nếu không tìm thấy hoặc thuộc giáo viên khác: trả về mã lỗi HTTP `404 Not Found` hoặc `403 Forbidden`.

---

## 2. DANH SÁCH ENDPOINTS CHI TIẾT

### 2.1. Lấy danh sách học sinh của giáo viên
- **Endpoint:** `GET /teacher/students` (và alias tương thích ngược `GET /students/my-students`)
- **Quyền hạn:** `TEACHER`
- **Mô tả:** Trả về tất cả học sinh thuộc quyền quản lý của giáo viên hiện tại, bao gồm cả học sinh ngoài hệ thống (`studentAccountId = null`) và học sinh đã liên kết tài khoản QuizMaster.
- **Request:** Không có Body.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ts-1772345678-abc12",
      "teacherId": "usr-teacher-1",
      "fullName": "Nguyễn Văn Minh",
      "name": "Nguyễn Văn Minh",
      "phone": "0912345678",
      "email": "minh@gmail.com",
      "parentName": "Nguyễn Văn Ba",
      "parentPhone": "0987654321",
      "dob": "2010-05-15",
      "gender": "MALE",
      "school": "THCS Lê Quý Đôn",
      "note": "Kèm nâng cao chuyên Toán",
      "status": "ACTIVE",
      "avatar": null,
      "studentAccountId": null,
      "isExternal": true,
      "createdAt": "2026-10-19T07:00:00.000Z",
      "updatedAt": "2026-10-19T07:00:00.000Z"
    },
    {
      "id": "ts-1772345679-def34",
      "teacherId": "usr-teacher-1",
      "fullName": "Trần Thị Thu",
      "name": "Trần Thị Thu",
      "phone": "0901112233",
      "email": "thu@quizmaster.vn",
      "parentName": null,
      "parentPhone": null,
      "dob": null,
      "gender": "FEMALE",
      "school": "THPT Marie Curie",
      "note": "Học sinh lớp 10A1",
      "status": "ACTIVE",
      "avatar": "https://quizmaster.vn/avatars/thu.png",
      "studentAccountId": "usr-std-999",
      "isExternal": false,
      "createdAt": "2026-10-18T03:00:00.000Z",
      "updatedAt": "2026-10-19T02:00:00.000Z"
    }
  ]
}
```

---

### 2.2. Tạo học sinh ngoài hệ thống (Create External Student)
- **Endpoint:** `POST /teacher/students`
- **Quyền hạn:** `TEACHER`
- **Mô tả:** Tạo hồ sơ học sinh ngoài hệ thống mà **KHÔNG** tạo tài khoản `UserEntity`, **KHÔNG** đòi hỏi mật khẩu hay email bắt buộc.
- **Request Body:**
```json
{
  "fullName": "Lê Hoàng Nam",
  "phone": "0934567890",
  "email": "nam@example.com",
  "parentName": "Lê Văn Tuấn",
  "parentPhone": "0909888777",
  "dob": "2011-08-20",
  "gender": "MALE",
  "school": "THCS Nguyễn Du",
  "note": "Ôn luyện hình học 1 kèm 1"
}
```
- **Validation:**
  - `fullName`: string, bắt buộc (max 255 ký tự).
  - `phone`: string, tùy chọn.
  - `email`: string định dạng email, tùy chọn.
  - `dob`: string YYYY-MM-DD, tùy chọn.
  - `gender`: enum `['MALE', 'FEMALE', 'OTHER']`, tùy chọn.
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "ts-1772398765-a1b2c3",
    "teacherId": "usr-teacher-1",
    "studentAccountId": null,
    "fullName": "Lê Hoàng Nam",
    "name": "Lê Hoàng Nam",
    "phone": "0934567890",
    "email": "nam@example.com",
    "parentName": "Lê Văn Tuấn",
    "parentPhone": "0909888777",
    "dob": "2011-08-20",
    "gender": "MALE",
    "school": "THCS Nguyễn Du",
    "note": "Ôn luyện hình học 1 kèm 1",
    "status": "ACTIVE",
    "avatar": null,
    "isExternal": true,
    "createdAt": "2026-10-19T07:45:00.000Z",
    "updatedAt": "2026-10-19T07:45:00.000Z"
  }
}
```
- **Error Cases:**
  - `400 Bad Request`: `fullName` rỗng hoặc định dạng không hợp lệ.
  - `401 Unauthorized`: Chưa đăng nhập hoặc tài khoản không phải `TEACHER`.

---

### 2.3. Xem chi tiết hồ sơ & toàn bộ lịch sử học sinh
- **Endpoint:** `GET /teacher/students/:id`
- **Quyền hạn:** `TEACHER`
- **Mô tả:** Tổng hợp toàn diện hồ sơ học sinh, trạng thái liên kết tài khoản QuizMaster, tóm tắt KPI và toàn bộ 6 khối dữ liệu: Lịch dạy, Điểm danh, Nhật ký học tập, Điểm số, Học phí, Lịch sử thanh toán.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "ts-1772398765-a1b2c3",
      "teacherId": "usr-teacher-1",
      "fullName": "Lê Hoàng Nam",
      "name": "Lê Hoàng Nam",
      "phone": "0934567890",
      "email": "nam@example.com",
      "parentName": "Lê Văn Tuấn",
      "parentPhone": "0909888777",
      "dob": "2011-08-20",
      "gender": "MALE",
      "school": "THCS Nguyễn Du",
      "note": "Ôn luyện hình học 1 kèm 1",
      "status": "ACTIVE",
      "avatar": null,
      "studentAccountId": null,
      "isExternal": true
    },
    "account": null,
    "isExternal": true,
    "summary": {
      "totalLessons": 4,
      "attendedLessons": 4,
      "totalTuition": 600000,
      "paidTuition": 400000,
      "remainingTuition": 200000,
      "avgScore": 9.2,
      "logsCount": 4
    },
    "schedules": [
      {
        "id": "lesson-001",
        "title": "Kèm Toán 1-1",
        "date": "2026-10-25",
        "startTime": "19:00",
        "endTime": "20:30",
        "duration": 1.5,
        "feePerLesson": 150000,
        "status": "SCHEDULED"
      }
    ],
    "attendance": [
      {
        "id": "part-001",
        "lessonId": "lesson-001",
        "attendanceStatus": "ATTENDED",
        "attendanceNote": "Làm bài tập đầy đủ"
      }
    ],
    "learningLogs": [
      {
        "id": "log-001",
        "lessonId": "lesson-001",
        "content": "Hình học không gian",
        "homework": "Bài 1 đến 5 SGK",
        "attitude": "Tích cực",
        "comment": "Nắm vững lý thuyết",
        "rating": 5
      }
    ],
    "scores": [
      {
        "id": "score-001",
        "assessmentName": "Kiểm tra 15 phút",
        "assessmentType": "QUIZ",
        "score": 9.5,
        "maxScore": 10,
        "date": "2026-10-25",
        "comment": "Làm bài xuất sắc"
      }
    ],
    "tuitions": [
      {
        "id": "tui-001",
        "month": "2026-10",
        "lessonCount": 4,
        "totalHours": 6,
        "baseAmount": 600000,
        "discountAmount": 0,
        "surchargeAmount": 0,
        "totalAmount": 600000,
        "paidAmount": 400000,
        "remainingAmount": 200000,
        "status": "PARTIALLY_PAID"
      }
    ],
    "payments": [
      {
        "id": "pay-001",
        "amount": 400000,
        "paymentDate": "2026-10-20",
        "paymentMethod": "CASH",
        "status": "COMPLETED",
        "note": "Phụ huynh nộp tiền mặt"
      }
    ]
  }
}
```
- **Error Cases:**
  - `404 Not Found`: Không tìm thấy học sinh hoặc học sinh không thuộc quyền quản lý của giáo viên đăng nhập (IDOR).

---

### 2.4. Cập nhật hồ sơ học sinh
- **Endpoint:** `PATCH /teacher/students/:id`
- **Quyền hạn:** `TEACHER`
- **Request Body:**
```json
{
  "fullName": "Lê Hoàng Nam (Cập nhật)",
  "phone": "0988776655",
  "school": "THPT Chuyên Lê Hồng Phong",
  "status": "ACTIVE"
}
```
- **Response `200 OK`:** Hồ sơ học sinh sau cập nhật.

---

### 2.5. Xóa hồ sơ học sinh
- **Endpoint:** `DELETE /teacher/students/:id`
- **Quyền hạn:** `TEACHER`
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đã xóa học sinh khỏi danh bạ thành công"
}
```

---

### 2.6. Liên kết tài khoản QuizMaster (Link Account)
- **Endpoint:** `POST /teacher/students/:id/link-account`
- **Quyền hạn:** `TEACHER`
- **Mô tả:** Liên kết hồ sơ External Student với một tài khoản người dùng có sẵn trên hệ thống.
  - **KHÔNG** tạo học sinh mới.
  - **KHÔNG** đổi `TeacherStudent.id`.
  - **KHÔNG** làm mất lịch sử học tập, học phí, lịch dạy hay điểm số.
  - Chỉ cập nhật `studentAccountId = User.id`.
- **Request Body:**
```json
{
  "emailOrAccountId": "nam.student@quizmaster.vn"
}
```
- **Quy tắc kiểm tra (Business & Security Rules):**
  1. Tài khoản mục tiêu phải tồn tại trong hệ thống.
  2. Tài khoản mục tiêu phải có vai trò `role === 'STUDENT'`. Từ chối nếu là `ADMIN` hoặc `TEACHER`.
  3. Tài khoản học sinh chưa từng được liên kết với hồ sơ khác của chính giáo viên này.
- **Response `200 OK`:** Hồ sơ học sinh với `studentAccountId` mới và `isExternal: false`.
- **Error Cases:**
  - `400 Bad Request`: Tài khoản mục tiêu là `ADMIN` hoặc `TEACHER`, hoặc đã được liên kết trong cùng giáo viên.
  - `404 Not Found`: Không tìm thấy học sinh hoặc không tìm thấy tài khoản người dùng.

---

### 2.7. Hủy liên kết tài khoản QuizMaster (Unlink Account)
- **Endpoint:** `POST /teacher/students/:id/unlink-account`
- **Quyền hạn:** `TEACHER`
- **Mô tả:** Đưa hồ sơ học sinh trở lại trạng thái External Student (`studentAccountId = null`).
  - Toàn bộ hồ sơ, lịch dạy, điểm danh, học phí, điểm số, nhật ký học tập **GIỮ NGUYÊN 100%**.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đã hủy liên kết tài khoản học sinh thành công",
  "data": {
    "id": "ts-1772398765-a1b2c3",
    "studentAccountId": null,
    "isExternal": true
  }
}
```

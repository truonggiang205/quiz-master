# BÁO CÁO AUDIT DI CHUYỂN DOMAIN MODEL (DOMAIN-MIGRATION-AUDIT.md)
**Dự án:** QuizMaster Education System  
**Nhánh:** `feat/external-student-domain`  
**Ngày thực hiện:** 19/10/2026  

---

## 1. TỔNG QUAN HỆ THỐNG HIỆN TẠI (EXECUTIVE SUMMARY)

Hệ thống QuizMaster hiện tại mô hình hóa học sinh dưới dạng thực thể `UserEntity` (`role = 'STUDENT'`).
Mối quan hệ giữa Giáo viên và Học sinh được xác lập cứng qua:
1. Join table `teacher_students` (`teacherId` -> `users.id`, `studentId` -> `users.id`)
2. Join table `class_students` (`classId` -> `classes.id`, `studentId` -> `users.id`)
3. Ràng buộc khóa ngoại (Foreign Key) trên các bảng dạy học:
   - `teaching_lesson_participants.studentId` -> `users.id`
   - `teaching_tuition_items.studentId` -> `users.id`
   - `teaching_tuition_payments.studentId` -> `users.id`
   - `teaching_learning_logs.studentId` -> `users.id`
   - `teaching_scores.studentId` -> `users.id`

Điều này dẫn đến các hệ lụy:
- Giáo viên không thể quản lý học sinh học trực tiếp, học thêm ngoài đời thực nếu các em không tạo tài khoản QuizMaster.
- Chức năng import Excel tự sinh tài khoản giả với mật khẩu mặc định `123456` (vi phạm nguyên tắc bảo mật).
- Không có ranh giới giữa "Hồ sơ học sinh cá nhân do giáo viên ghi chép" và "Tài khoản người dùng đăng nhập hệ thống".

---

## 2. BẢNG NÀO ĐANG DÙNG `users.id` DƯỚI DANH NGHĨA STUDENT

Qua rà soát toàn bộ source code backend (`backend/src/entities` và `backend/src/modules/teaching/entities`):

| Tên Bảng | Cột | Ràng buộc trong Entity | Mục đích sử dụng |
|---|---|---|---|
| `teacher_students` | `studentId` | `inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' }` trong `UserEntity.students` | Danh bạ học sinh 1-1 của giáo viên |
| `class_students` | `studentId` | `inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' }` trong `ClassEntity.students` | Danh sách học sinh theo từng lớp học |
| `teaching_lesson_participants` | `studentId` | `@ManyToOne(() => UserEntity) @JoinColumn({ name: 'studentId' })` | Điểm danh và học phí từng buổi học |
| `teaching_tuition_items` | `studentId` | `@ManyToOne(() => UserEntity) @JoinColumn({ name: 'studentId' })`, `@Index(['classId', 'studentId', 'month'], { unique: true })` | Tổng hợp học phí tháng theo học sinh |
| `teaching_tuition_payments` | `studentId` | `@ManyToOne(() => UserEntity) @JoinColumn({ name: 'studentId' })` | Lịch sử giao dịch đóng tiền / hoàn tiền / hủy |
| `teaching_learning_logs` | `studentId` | `@ManyToOne(() => UserEntity) @JoinColumn({ name: 'studentId' })` | Nhật ký bài học, thái độ, nhận xét của học sinh |
| `teaching_scores` | `studentId` | `@ManyToOne(() => UserEntity) @JoinColumn({ name: 'studentId' })` | Điểm số các bài kiểm tra / đánh giá định kỳ |
| `submissions` | `studentId` | Lưu chuỗi `user.id` (không có quan hệ cứng ManyToOne) | Bài làm trắc nghiệm / tự luận online của học sinh có tài khoản |

---

## 3. BẢNG NÀO ĐANG DÙNG `teacher_students`

Hiện tại, `teacher_students` là một join table thuần túy gồm 2 cột: `teacherId` và `studentId`.
Nó được truy xuất tại:
1. `backend/src/entities/user.entity.ts`:
   ```typescript
   @ManyToMany(() => UserEntity, (user: IUserEntity) => user.teachers)
   @JoinTable({
     name: 'teacher_students',
     joinColumn: { name: 'teacherId', referencedColumnName: 'id' },
     inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' }
   })
   students: IUserEntity[];
   ```
2. `backend/src/modules/students/students.service.ts`:
   - `getMyStudents(teacherId)`: `userRepo.findOne({ where: { id: teacherId }, relations: { students: true } })`
   - `acceptInvite(studentId, teacherId)`: thêm `teacher` vào `student.teachers`
   - `removeStudent(teacherId, studentId)`: lọc bỏ `studentId` khỏi `teacher.students`
3. `backend/src/modules/classrooms/classrooms.service.ts`:
   - `getClassesForTeacher(teacherId)`: duyệt qua `teacher.students` để tự sinh các lớp học kèm 1-1 `private-${student.id}`.
   - `getClassesForStudent(studentId)`: duyệt qua `student.teachers` để hiển thị lớp 1-1 cho học sinh.

---

## 4. API NÀO ĐANG NHẬN `users.id` (DƯỚI DANH NGHĨA STUDENT)

| API Method & Path | Controller | Tham số nhận `users.id` | Tác vụ |
|---|---|---|---|
| `POST /students/invite` | `StudentsController` | Body `email` (tìm kiếm `users.id`) | Gửi lời mời tới học sinh đã có tài khoản |
| `POST /students/accept-invite` | `StudentsController` | JWT `user.id` (học sinh) + `teacherId` | Ghi nhận quan hệ vào `teacher_students` |
| `DELETE /students/:studentId` | `StudentsController` | Param `studentId` (`users.id`) | Xóa học sinh khỏi danh bạ giáo viên |
| `POST /classrooms/join` | `ClassroomsController` | JWT `user.id` (học sinh) | Học sinh tự gia nhập lớp bằng mã code |
| `DELETE /classrooms/:id/students/:studentId` | `ClassroomsController` | Param `studentId` (`users.id`) | Giáo viên xóa học sinh khỏi lớp học |
| `POST /teacher/schedule` | `ScheduleController` | Body `studentIds: string[]` (`users.id`) | Chọn danh sách học sinh tham gia buổi học |
| `PATCH /teacher/schedule/:id` | `ScheduleController` | Body `participants: { studentId: string }[]` | Cập nhật điểm danh / phí cho học sinh |
| `GET /teacher/schedule` | `ScheduleController` | Query `studentId?: string` | Lọc buổi học theo học sinh |
| `GET /teacher/tuition` | `TuitionController` | Query `studentId?: string` | Lọc bảng học phí theo học sinh |
| `POST /teacher/learning-logs` | `LearningLogsController` | Body `studentId: string` | Ghi nhật ký học tập cho học sinh |
| `POST /teacher/learning-logs/bulk` | `LearningLogsController` | Body `logs[].studentId: string` | Lưu nhật ký hàng loạt |
| `GET /teacher/learning-logs` | `LearningLogsController` | Query `studentId?: string` | Lọc nhật ký theo học sinh |
| `POST /teacher/scores` | `ScoresController` | Body `studentId: string` | Ghi nhận điểm số cho học sinh |
| `GET /teacher/scores` | `ScoresController` | Query `studentId?: string` | Lọc điểm số theo học sinh |

---

## 5. API NÀO ĐANG TRẢ `users.id` (DƯỚI DANH NGHĨA STUDENT)

1. `GET /students/my-students`: Trả về mảng `UserEntity[]` (`id`, `name`, `email`, `avatar`, `phone`, `school`).
2. `GET /classrooms/:id/students`: Trả về mảng học sinh với `id = user.id`, `name`, `email`, `username = email.split('@')[0]`.
3. `GET /teacher/schedule`: Trả về `LessonEntity[]` chứa `participants[].studentId` và `participants[].student` (`UserEntity`).
4. `GET /teacher/schedule/:id`: Trả về chi tiết buổi học cùng `participants[].student` (`UserEntity`).
5. `GET /teacher/tuition`: Trả về `TuitionRowSummary[]` với `studentId = user.id`, `studentName`, `studentEmail`, `studentAvatar`.
6. `GET /teacher/tuition/:id`: Trả về `TuitionItemEntity` kèm `student` (`UserEntity`).
7. `GET /teacher/learning-logs`: Trả về `LearningLogEntity[]` chứa `studentId` và `student` (`UserEntity`).
8. `GET /teacher/scores`: Trả về `ScoreRecordEntity[]` chứa `studentId` và `student` (`UserEntity`).
9. `GET /teacher/scores/matrix/:classId`: Trả về danh sách `students[].studentId`, `studentName`, `studentEmail`.

---

## 6. FRONTEND NÀO ĐANG GIẢ ĐỊNH `studentId = User.id`

1. **`frontend/src/pages/teacher/TeacherStudentsPage.tsx`**:
   - Khởi tạo `const [students, setStudents] = useState<User[]>([])`.
   - Giả định học sinh luôn có `email` và `avatar`.
   - Chỉ có modal "Mời học sinh qua Email", không có tính năng tạo học sinh thủ công.
2. **`frontend/src/pages/teacher/TeacherSchedulePage.tsx`**:
   - `formData.selectedStudentIds`: Gán từ `(activeClassForForm.students || []).map((s) => s.id)`.
   - Giả định `p.student.name` và `p.student.email` luôn tồn tại khi render tooltip hoặc danh sách điểm danh.
3. **`frontend/src/pages/teacher/TeacherTuitionPage.tsx`**:
   - Table hiển thị: `row.studentName`, `row.studentEmail`, `row.studentAvatar`.
   - Tìm kiếm: `row.studentName.toLowerCase().includes(...) || row.studentEmail.toLowerCase().includes(...)`.
   - **RỦI RO CRASH:** Nếu `row.studentEmail` là `null` hoặc `undefined`, việc gọi `.toLowerCase()` trực tiếp sẽ gây crash ứng dụng trên client.
4. **`frontend/src/pages/teacher/TeacherLearningLogsPage.tsx`**:
   - Định nghĩa `RosterStudent`:
     ```typescript
     interface RosterStudent {
       id: string;
       name: string;
       email?: string;
       avatar?: string;
       ...
     }
     ```
   - Logic tìm kiếm: `s.email.toLowerCase().includes(...)` -> nguy cơ null pointer exception khi học sinh không có email.
5. **`frontend/src/pages/teacher/TeacherScoresPage.tsx`**:
   - Định nghĩa `ScoreMatrixStudent`: `studentEmail: string`.
   - Hiển thị email học sinh dưới tên trong ma trận điểm.
6. **`frontend/src/pages/teacher/TeacherClassroomDetailPage.tsx`**:
   - Table học sinh tính: `username: s.email ? s.email.split('@')[0] : s.id`.
   - Bắt buộc phải có email trong file Excel khi import.
7. **`frontend/src/services/student.service.ts`**:
   - Trả về kiểu `User[]`.

---

## 7. DỮ LIỆU CŨ CẦN MIGRATION NHƯ THẾ NÀO

### Yêu cầu cốt lõi:
- **Tuyệt đối không làm mất bất kỳ bản ghi nào** của các buổi học (`teaching_lessons`), điểm danh (`teaching_lesson_participants`), học phí (`teaching_tuition_items`), thanh toán (`teaching_tuition_payments`), nhật ký (`teaching_learning_logs`), điểm số (`teaching_scores`).
- **Không tạo tài khoản User giả.**
- **Không xóa tài khoản User thật.**

### Chiến lược di chuyển (Step-by-step):
1. **Tạo Entity mới: `TeacherStudentEntity`**
   - Bảng: `teacher_students` (chuyển đổi từ bảng join sang Entity nghiệp vụ độc lập).
   - Khóa chính: `id` (chuỗi dạng `ts-...`).
   - Cột liên kết: `teacherId` (FK `users.id`) và `studentAccountId` (FK `users.id`, NULLABLE).
   - Các trường thông tin: `fullName`, `phone`, `parentName`, `parentPhone`, `dob`, `gender`, `school`, `note`, `status` (`'ACTIVE' | 'INACTIVE'`), `avatar`, `createdAt`, `updatedAt`.
2. **Auto-Migration Seeder:**
   - Hệ thống quét tất cả các cặp `(teacherId, studentUserId)` duy nhất xuất hiện trong:
     - `teacher_students` hiện tại
     - `class_students` (kết hợp với `classes.teacherId`)
     - `teaching_lesson_participants` (kết hợp với `teaching_lessons.teacherId`)
     - `teaching_tuition_items`
     - `teaching_learning_logs`
     - `teaching_scores`
   - Với mỗi cặp `(teacherId, studentUserId)`, seeder sẽ:
     - Đọc thông tin `UserEntity` hiện tại của học sinh (`name`, `phone`, `school`, `dob`, `gender`, `avatar`, `isActive`).
     - Tạo một bản ghi `TeacherStudentEntity` với:
       - `id`: Tạo mã định danh duy nhất không trùng lặp (ví dụ: `ts_${teacherId.slice(0, 8)}_${studentUserId}`).
       - `teacherId`: `teacherId` của giáo viên tương ứng.
       - `studentAccountId`: `studentUserId` (Liên kết với User account của học sinh).
       - `fullName`: `user.name`.
       - `phone`: `user.phone`.
       - `status`: `user.isActive ? 'ACTIVE' : 'INACTIVE'`.
3. **Cơ chế Dual-Resolver (Bảo toàn tương thích ngược 100%):**
   - Trong tất cả các service nghiệp vụ (`ScheduleService`, `TuitionService`, `LearningLogsService`, `ScoresService`):
     Khi nhận `studentId` từ request (hoặc từ các test case cũ):
     ```typescript
     let studentProfile = await this.teacherStudentRepo.findOne({
       where: { teacherId, id: inputStudentId },
     });
     if (!studentProfile) {
       studentProfile = await this.teacherStudentRepo.findOne({
         where: { teacherId, studentAccountId: inputStudentId },
       });
     }
     ```
   - Nhờ cơ chế này, kể cả khi frontend hoặc test case gửi ID cũ (`user.id`) hay ID mới (`ts-...`), hệ thống đều tự động nhận diện chính xác học sinh và bảo đảm 0% regression!

---

## 8. DANH SÁCH FILE ẢNH HƯỞNG & THỨ TỰ THỰC HIỆN

### Danh sách File Backend:
1. `backend/src/modules/students/entities/teacher-student.entity.ts` (Mới)
2. `backend/src/modules/students/dto/teacher-student.dto.ts` (Mới)
3. `backend/src/entities/user.entity.ts` (Cập nhật quan hệ `studentProfiles`)
4. `backend/src/app.module.ts` (Đăng ký `TeacherStudentEntity`)
5. `backend/src/modules/students/students.module.ts` (Cập nhật repository)
6. `backend/src/modules/students/students.service.ts` (Cập nhật CRUD, Link/Unlink, Migrate legacy)
7. `backend/src/modules/students/students.controller.ts` (Cập nhật API Endpoints)
8. `backend/src/modules/teaching/entities/lesson-participant.entity.ts` (Trỏ student sang `TeacherStudentEntity`)
9. `backend/src/modules/teaching/entities/tuition-item.entity.ts` (Trỏ student sang `TeacherStudentEntity`)
10. `backend/src/modules/teaching/entities/tuition-payment.entity.ts` (Trỏ student sang `TeacherStudentEntity`)
11. `backend/src/modules/teaching/entities/learning-log.entity.ts` (Trỏ student sang `TeacherStudentEntity`)
12. `backend/src/modules/teaching/entities/score-record.entity.ts` (Trỏ student sang `TeacherStudentEntity`)
13. `backend/src/modules/teaching/teaching.module.ts` (Import `TeacherStudentEntity`)
14. `backend/src/modules/teaching/services/schedule.service.ts` (Dual-resolver, hỗ trợ external student)
15. `backend/src/modules/teaching/services/tuition.service.ts` (Đồng bộ và hiển thị học phí cho external student)
16. `backend/src/modules/teaching/services/learning-logs.service.ts` (Ghi nhận xét không phụ thuộc User)
17. `backend/src/modules/teaching/services/scores.service.ts` (Ghi điểm cho external student)
18. `backend/src/modules/classrooms/classrooms.service.ts` (Loại bỏ tạo User giả khi import Excel)
19. `backend/src/modules/students/tests/external-student.spec.ts` (Mới - 20 test cases `EXT-STU-01` -> `EXT-STU-20`)

### Danh sách File Frontend:
20. `frontend/src/types/student.ts` (Mới/Mở rộng type `TeacherStudent`, `CreateExternalStudentPayload`)
21. `frontend/src/services/student.service.ts` (Thêm API calls cho external student và link/unlink)
22. `frontend/src/pages/teacher/TeacherStudentsPage.tsx` (Thêm nút "+ Thêm học sinh", badge `NGOÀI HỆ THỐNG`, modal tạo external student)
23. `frontend/src/pages/teacher/TeacherStudentDetailPage.tsx` (Trang chi tiết mới `/teacher/students/:id`)
24. `frontend/src/routes/AppRoutes.tsx` (Đăng ký route `/teacher/students/:id`)
25. `frontend/src/pages/teacher/TeacherSchedulePage.tsx` (Null-safety cho học sinh không có email/avatar)
26. `frontend/src/pages/teacher/TeacherTuitionPage.tsx` (Null-safety, hiển thị badge external)
27. `frontend/src/pages/teacher/TeacherLearningLogsPage.tsx` (Null-safety cho `student.email`)
28. `frontend/src/pages/teacher/TeacherScoresPage.tsx` (Null-safety cho `student.email`)

---

## 9. THỨ TỰ TRIỂN KHAI THEO CÁC GIAI ĐOẠN (ESTIMATED IMPLEMENTATION ORDER)

- **Giai đoạn 1:** Tạo `TeacherStudentEntity` + DTOs + đăng ký TypeORM trong `AppModule` & `TeachingModule`.
- **Giai đoạn 2:** Triển khai logic Migration / Dual-Resolver trong `StudentsService` để bảo toàn dữ liệu cũ.
- **Giai đoạn 3:** Xây dựng API CRUD External Student (`POST /teacher/students`, `GET /teacher/students`, `GET /teacher/students/:id`, `PATCH`, `DELETE`).
- **Giai đoạn 4:** Triển khai Account Linking & Unlinking (`POST /teacher/students/:id/link-account`, `unlink-account`).
- **Giai đoạn 5:** Refactor `ScheduleService` (Tạo buổi học, điểm danh cho external student).
- **Giai đoạn 6:** Refactor `TuitionService` (Tính học phí, ghi nhận thanh toán, hoàn tiền, phụ thu cho external student).
- **Giai đoạn 7:** Refactor `LearningLogsService` & `ScoresService` (Ghi nhận xét, điểm số cho external student).
- **Giai đoạn 8:** Loại bỏ tạo User giả trong `ClassroomsService: importStudents`.
- **Giai đoạn 9:** Xây dựng test suite toàn diện `external-student.spec.ts` (20 test cases).
- **Giai đoạn 10:** Triển khai Frontend (`TeacherStudentsPage.tsx`, `TeacherStudentDetailPage.tsx`, `AppRoutes.tsx`, Null-Safety).
- **Giai đoạn 11:** Chạy toàn bộ regression test (Backend `npm test` gồm 209 test cũ + 20 test mới = 229 tests; Backend build `nest build`; Frontend build `npm run build`).
- **Giai đoạn 12:** Soạn thảo `docs/external-student/API-CONTRACT.md` & `IMPLEMENTATION-REPORT.md`, commit theo format quy chuẩn và push lên `feat/external-student-domain`.

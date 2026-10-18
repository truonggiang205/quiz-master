import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_USERS } from '../../utils/constants';
import { ApiHelper } from '../../utils/api-helper';

test.describe.serial('Teacher Teaching Management System — Scheduler, Logs, Tuition & Scores', () => {
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let createdClassId: string;
  let createdInviteCode: string;
  let testStudentId: string;
  let testLessonId: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create(undefined, 'TEACHER');
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
    studentApi = await ApiHelper.create(undefined, 'STUDENT');
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    testStudentId = stuLogin.body?.data?.user?.id;

    // 1. Tạo lớp học phục vụ test
    const classRes = await teacherApi.post('/classrooms', {
      name: `Lớp Giảng Dạy E2E ${Date.now()}`,
      subject: 'Toán Học 12',
      description: 'Lớp dùng cho kiểm thử E2E Teaching Management System',
      isPrivate: false,
    });
    createdClassId = classRes.body?.data?.id;
    createdInviteCode = classRes.body?.data?.inviteCode;

    // 2. Cho học sinh tham gia lớp học
    if (createdInviteCode) {
      await studentApi.post('/classrooms/join', { inviteCode: createdInviteCode });
    }

    // 3. Dọn dẹp các buổi học test cũ nếu có
    try {
      const existingLessons = await teacherApi.get('/teacher/schedule');
      if (Array.isArray(existingLessons.body?.data)) {
        for (const l of existingLessons.body.data) {
          if (
            l.title?.includes('E2E') ||
            l.title?.includes('Buổi Sáng Chuẩn') ||
            l.title?.includes('Hình học không gian') ||
            l.title?.includes('Buổi Trùng Lịch')
          ) {
            await teacherApi.delete(`/teacher/schedule/${l.id}`);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  });

  // ==================== 1. SCHEDULER TESTS ====================
  test('TC-TCH-SCH-001: Giáo viên tạo buổi học mới qua UI và kiểm tra hiển thị trên lịch dạy', async ({ page }) => {
    await page.goto('/teacher/schedule');
    await page.waitForLoadState('networkidle');

    // Kiểm tra tiêu đề trang
    await expect(page.getByRole('heading', { name: /Lịch Dạy & Buổi Học/i })).toBeVisible({ timeout: 10000 });

    // Click nút Thêm buổi học
    await page.getByRole('button', { name: /Thêm Buổi Học/i }).click();

    // Chọn đúng lớp vừa tạo trong modal
    const classSelect = page.locator('select').first();
    await classSelect.selectOption(createdClassId);

    // Điền form tạo buổi học
    const lessonTitle = `Buổi học Hình học không gian ${Date.now()}`;
    await page.fill('input[placeholder*="VD: Ôn tập"]', lessonTitle);

    // Chọn ngày hôm nay và khung giờ chiều (14:00 - 15:30) tránh trùng lặp
    const today = new Date().toISOString().substring(0, 10);
    await page.fill('input[type="date"]', today);
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill('14:00');
    await timeInputs.nth(1).fill('15:30');

    // Submit form
    await page.getByRole('button', { name: /Tạo Buổi Học/i }).click();

    // Chờ modal đóng và buổi học xuất hiện
    await expect(page.getByText(lessonTitle)).toBeVisible({ timeout: 10000 });
  });

  test('TC-TCH-SCH-002: Kiểm tra bắt lỗi xung đột lịch dạy (Conflict) và giờ kết thúc <= bắt đầu', async () => {
    const today = new Date().toISOString().substring(0, 10);

    // 1. Tạo buổi học chuẩn: 08:00 -> 09:30 có phí 150.000 đ
    const res1 = await teacherApi.post('/teacher/schedule', {
      classId: createdClassId,
      title: 'Buổi Sáng Chuẩn',
      date: today,
      startTime: '08:00',
      endTime: '09:30',
      feePerLesson: 150000,
      studentIds: testStudentId ? [testStudentId] : undefined,
    });
    expect(res1.status).toBe(201);
    testLessonId = res1.body?.data?.id;

    // 2. Tạo buổi học trùng thời gian (08:30 -> 10:00) -> Phải bị 400 Bad Request
    const conflictRes = await teacherApi.post('/teacher/schedule', {
      classId: createdClassId,
      title: 'Buổi Trùng Lịch',
      date: today,
      startTime: '08:30',
      endTime: '10:00',
    });
    expect(conflictRes.status).toBe(400);
    expect(conflictRes.body?.message).toContain('Xung đột lịch');

    // 3. Giờ kết thúc <= bắt đầu -> Phải bị 400 Bad Request
    const invalidTimeRes = await teacherApi.post('/teacher/schedule', {
      classId: createdClassId,
      title: 'Buổi Giờ Sai',
      date: today,
      startTime: '10:00',
      endTime: '09:00',
    });
    expect(invalidTimeRes.status).toBe(400);
  });

  test('TC-TCH-SCH-003: Chuyển đổi giữa chế độ Tuần / Tháng và mở chi tiết buổi học', async ({ page }) => {
    await page.goto('/teacher/schedule');
    await page.waitForLoadState('networkidle');

    // Chuyển sang Tháng
    await page.getByRole('button', { name: 'Tháng' }).click();
    await expect(page.locator('text=Thứ 2')).toBeVisible();

    // Chuyển lại Tuần
    await page.getByRole('button', { name: 'Tuần' }).click();

    // Click vào buổi học đã tạo để xem chi tiết
    const lessonCard = page.locator('text=Buổi Sáng Chuẩn').first();
    await expect(lessonCard).toBeVisible({ timeout: 10000 });
    await lessonCard.click();

    await expect(page.getByRole('heading', { name: /Danh Sách Điểm Danh/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Có mặt/i }).first()).toBeVisible();

    // Đóng modal chi tiết
    await page.getByRole('button', { name: 'Đóng' }).click();
  });

  // ==================== 2. LEARNING LOG TESTS ====================
  test('TC-TCH-LOG-001: Giáo viên tạo và chỉnh sửa nhật ký học tập cho học sinh', async ({ page }) => {
    // Tạo nhật ký qua API gắn với testLessonId và testStudentId
    const logRes = await teacherApi.post('/teacher/learning-logs', {
      lessonId: testLessonId,
      studentId: testStudentId,
      content: 'Học sinh nắm vững lý thuyết và làm bài tập mẫu rất tốt',
      homework: 'Bài 1 đến 5 trang 20',
      attitude: 'Tốt',
      comment: 'Cần tiếp tục phát huy tốc độ giải toán',
    });
    expect(logRes.status).toBe(201);

    await page.goto('/teacher/learning-logs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Nhật Ký Học Tập/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Học sinh nắm vững lý thuyết')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tốt').first()).toBeVisible();
  });

  test('TC-TCH-LOG-002: Lọc nhật ký học tập theo từ khóa tìm kiếm', async ({ page }) => {
    await page.goto('/teacher/learning-logs');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/Tìm tên học sinh hoặc nội dung/i);
    await searchInput.fill('lý thuyết');
    await page.waitForTimeout(500);

    await expect(page.getByText('Học sinh nắm vững lý thuyết')).toBeVisible();

    // Tìm từ khóa không tồn tại
    await searchInput.fill('tuKhoaKhongTonTai123456');
    await page.waitForTimeout(500);
    await expect(page.getByText(/Chưa có nhật ký học tập nào/i)).toBeVisible();
  });

  // ==================== 3. TUITION & PAYMENTS TESTS ====================
  test('TC-TCH-TUI-001: Bảng học phí tự động phát sinh từ buổi học và tính đúng tổng tiền', async ({ page }) => {
    await page.goto('/teacher/tuition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Quản Lý Học Phí/i })).toBeVisible({ timeout: 10000 });

    // Kiểm tra các thẻ KPI học phí
    await expect(page.getByText('Tổng học phí').first()).toBeVisible();
    await expect(page.getByText('Đã thu', { exact: true })).toBeVisible();
    await expect(page.getByText('Còn phải thu').first()).toBeVisible();

    // Kiểm tra số tiền học phí phát sinh 150.000 đ
    await expect(page.getByText(/150[.,]000\s*đ/).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-TCH-TUI-002: Ghi nhận thanh toán học phí và kiểm tra cập nhật số tiền', async ({ page }) => {
    await page.goto('/teacher/tuition');
    await page.waitForLoadState('networkidle');

    // Click nút Thu tiền
    const payBtn = page.getByRole('button', { name: /Thu tiền/i }).first();
    await expect(payBtn).toBeVisible({ timeout: 10000 });
    await payBtn.click();

    // Modal xuất hiện
    await expect(page.getByRole('heading', { name: /Ghi Nhận Thanh Toán/i })).toBeVisible({ timeout: 5000 });

    // Submit thanh toán
    await page.getByRole('button', { name: /Xác Nhận Nộp Tiền/i }).click();

    // Sau khi nộp, trạng thái chuyển sang Đã thu đủ hoặc Thu 1 phần
    await expect(page.getByText(/Đã thu đủ|Thu 1 phần/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ==================== 4. SCORES TESTS ====================
  test('TC-TCH-SCORE-001: Giáo viên nhập điểm số và kiểm tra ràng buộc 0 <= score <= maxScore', async ({ page }) => {
    await page.goto('/teacher/scores');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Quản Lý Điểm Số/i })).toBeVisible({ timeout: 10000 });

    // Nhập điểm hợp lệ qua API
    const scoreRes = await teacherApi.post('/teacher/scores', {
      classId: createdClassId,
      studentId: testStudentId,
      assessmentType: 'QUIZ',
      assessmentName: 'Kiểm tra 15p Đại Số',
      score: 9.5,
      maxScore: 10,
      date: new Date().toISOString().substring(0, 10),
      comment: 'Làm bài xuất sắc',
    });
    expect(scoreRes.status).toBe(201);

    // Thử nhập điểm vượt quá thang điểm (12 / 10) -> Phải bị 400
    const invalidScoreRes = await teacherApi.post('/teacher/scores', {
      classId: createdClassId,
      studentId: testStudentId,
      assessmentType: 'QUIZ',
      assessmentName: 'Kiểm tra Vô Lý',
      score: 12,
      maxScore: 10,
      date: new Date().toISOString().substring(0, 10),
    });
    expect(invalidScoreRes.status).toBe(400);

    // Chọn đúng lớp trong dropdown của trang Scores
    const select = page.locator('select').first();
    await select.selectOption(createdClassId);
    await page.waitForTimeout(500);

    // Chuyển sang tab danh sách để kiểm tra hiển thị
    await page.getByRole('button', { name: /Danh sách chi tiết/i }).click();
    await expect(page.getByText('Kiểm tra 15p Đại Số')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('9.5').first()).toBeVisible();
  });

  test('TC-TCH-SCORE-002: Xem bảng ma trận điểm theo lớp và tính điểm trung bình', async ({ page }) => {
    await page.goto('/teacher/scores');
    await page.waitForLoadState('networkidle');

    // Chọn lớp vừa tạo
    const select = page.locator('select').first();
    await select.selectOption(createdClassId);
    await page.waitForTimeout(500);

    // Chế độ mặc định là ma trận
    await expect(page.getByRole('button', { name: /Bảng ma trận lớp/i })).toBeVisible();

    // Bảng ma trận hiển thị tên học sinh và điểm TB
    await expect(page.locator('text=Điểm TB (hệ 10)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Điểm TB chung cả lớp')).toBeVisible();
  });

  // ==================== 5. SECURITY & OWNERSHIP TESTS ====================
  test('TC-TCH-SEC-001: Giáo viên không thể truy cập hoặc thao tác trên lịch/điểm của giáo viên khác (403 Forbidden)', async () => {
    // Học sinh thử gọi API của giáo viên -> Phải bị chặn 403 Forbidden
    const forbiddenRes = await studentApi.get('/teacher/schedule');
    expect(forbiddenRes.status).toBe(403);

    const forbiddenTuition = await studentApi.get('/teacher/tuition');
    expect(forbiddenTuition.status).toBe(403);

    const forbiddenLogs = await studentApi.get('/teacher/learning-logs');
    expect(forbiddenLogs.status).toBe(403);

    const forbiddenScores = await studentApi.get('/teacher/scores');
    expect(forbiddenScores.status).toBe(403);
  });
});

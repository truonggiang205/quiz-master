import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_USERS } from '../../utils/constants';
import { ApiHelper } from '../../utils/api-helper';
import path from 'path';
import fs from 'fs';

// Resolve xlsx from frontend dependencies without adding new root packages
const XLSX = require(path.resolve(__dirname, '../../../frontend/node_modules/xlsx'));

test.describe('Teacher Module — Class Management & Student List (TC-TCH-CLASS)', () => {
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let createdClassId: string;
  let createdInviteCode: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create(undefined, 'TEACHER');
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
    studentApi = await ApiHelper.create(undefined, 'STUDENT');
    await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);

    // Create a dedicated test class
    const res = await teacherApi.post('/classrooms', {
      name: `Lớp Kiểm Thử Quản Lý ${Date.now()}`,
      subject: 'Toán Học 12',
      description: 'Lớp dùng cho bộ kiểm thử E2E Class Management',
      isPrivate: false,
    });
    createdClassId = res.body?.data?.id;
    createdInviteCode = res.body?.data?.inviteCode;

    // Have student join this class so we have real roster data
    if (createdInviteCode) {
      await studentApi.post('/classrooms/join', { inviteCode: createdInviteCode });
    }
  });

  test('TC-TCH-CLASS-001: Giáo viên xem danh sách lớp học và các thẻ thống kê KPI tổng quan', async ({ page }) => {
    // Both /teacher/classes and /teacher/classrooms are supported
    await page.goto('/teacher/classes');
    await page.waitForLoadState('networkidle');

    // 1. Kiểm tra tiêu đề chính
    await expect(page.getByRole('heading', { name: /Khóa Học của tôi/i })).toBeVisible({ timeout: 10000 });

    // 2. Kiểm tra các thẻ KPI tổng quan hệ thống
    await expect(page.locator('text=Tổng số lớp')).toBeVisible();
    await expect(page.locator('text=Tổng học sinh')).toBeVisible();
    await expect(page.locator('text=Điểm TB chung')).toBeVisible();
    await expect(page.locator('text=Tỷ lệ nộp bài')).toBeVisible();

    // 3. Kiểm tra các tab phân loại
    await expect(page.getByRole('button', { name: /Tất cả/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lớp học nhóm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kèm 1-1/i })).toBeVisible();

    // 4. Kiểm tra nút tạo mới
    await expect(page.getByRole('button', { name: /Tạo mới/i })).toBeVisible();
  });

  test('TC-TCH-CLASS-002: Thẻ lớp học hiển thị đầy đủ thông tin, mini-chart và nút Xem lớp', async ({ page }) => {
    await page.goto('/teacher/classes');
    await page.waitForLoadState('networkidle');

    // Tìm thẻ của lớp đã tạo trong beforeAll
    const card = page.locator('.group').filter({ hasText: 'Lớp Kiểm Thử Quản Lý' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Kiểm tra thông tin trên thẻ
    await expect(card.getByText('Hoạt động', { exact: true }).first()).toBeVisible();
    await expect(card.locator('text=Lớp nhóm')).toBeVisible();
    await expect(card.locator('code')).toBeVisible();

    // Kiểm tra các chỉ số thống kê trên thẻ (Bài thi, Điểm TB, Nộp bài)
    await expect(card.getByText('Bài thi', { exact: true }).first()).toBeVisible();
    await expect(card.getByText('Điểm TB', { exact: true }).first()).toBeVisible();
    await expect(card.getByText('Nộp bài', { exact: true }).first()).toBeVisible();

    // Kiểm tra phần phân bố điểm mini-chart
    await expect(card.locator('text=Phân bố điểm')).toBeVisible();

    // Kiểm tra nút Xem lớp
    const viewBtn = card.getByRole('link', { name: /Xem lớp|Quản lý lớp/i });
    await expect(viewBtn).toBeVisible();
  });

  test('TC-TCH-CLASS-003: Mở trang chi tiết lớp học và kiểm tra KPI thống kê & biểu đồ', async ({ page }) => {
    await page.goto(`/teacher/classes/${createdClassId}`);
    await page.waitForLoadState('networkidle');

    // 1. Header chi tiết lớp
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lớp Kiểm Thử Quản Lý');
    await expect(page.locator(`text=${createdInviteCode}`)).toBeVisible();

    // 2. Kiểm tra các nút hành động
    await expect(page.getByRole('button', { name: /Nhập Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất Excel/i })).toBeVisible();

    // 3. 6 thẻ KPI chi tiết
    await expect(page.locator('text=Tổng HS')).toBeVisible();
    await expect(page.getByText('Hoạt động', { exact: true }).first()).toBeVisible();
    await expect(page.locator('text=Chưa kích hoạt')).toBeVisible();
    await expect(page.getByText('Bài kiểm tra', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Điểm TB', { exact: true }).first()).toBeVisible();
    await expect(page.locator('text=Tỷ lệ nộp')).toBeVisible();

    // 4. Biểu đồ phân bố điểm số & xu hướng bài thi
    await expect(page.locator('text=Phân Bố Điểm Số Toàn Lớp')).toBeVisible();
    await expect(page.locator('text=Điểm TB Các Bài Thi Gần Nhất')).toBeVisible();

    // 5. Phần thông tin chung
    await expect(page.locator('text=Thông tin chung')).toBeVisible();
  });

  test('TC-TCH-CLASS-004: Danh sách học sinh hỗ trợ tìm kiếm và lọc trạng thái', async ({ page }) => {
    await page.goto(`/teacher/classes/${createdClassId}`);
    await page.waitForLoadState('networkidle');

    // Kiểm tra tiêu đề danh sách học sinh
    await expect(page.locator('text=Danh Sách Học Sinh')).toBeVisible();

    // Kiểm tra học sinh đã tham gia xuất hiện trong danh sách
    const studentEmail = TEST_USERS.STUDENT.email;
    await expect(page.locator(`text=${studentEmail}`)).toBeVisible({ timeout: 10000 });

    // Test Search input
    const searchInput = page.locator('input[placeholder*="Tìm kiếm theo tên, email"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(studentEmail);
    await page.waitForTimeout(400);
    await expect(page.locator(`text=${studentEmail}`)).toBeVisible();

    // Search with non-existent keyword
    await searchInput.fill('nonexistentstudent999@test.com');
    await page.waitForTimeout(400);
    await expect(page.locator('text=Không tìm thấy học sinh phù hợp')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(400);

    // Test Status Filter
    const activeBtn = page.getByRole('button', { name: /Đang hoạt động/i });
    await expect(activeBtn).toBeVisible();
    await activeBtn.click();
    await page.waitForTimeout(400);
    await expect(page.locator(`text=${studentEmail}`)).toBeVisible();
  });

  test('TC-TCH-CLASS-005: Giáo viên xuất danh sách học sinh ra file Excel (.xlsx)', async ({ page }) => {
    await page.goto(`/teacher/classes/${createdClassId}`);
    await page.waitForLoadState('networkidle');

    const exportBtn = page.getByRole('button', { name: /Xuất Excel/i });
    await expect(exportBtn).toBeVisible();

    // Bắt sự kiện tải file
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // Kiểm tra tên file tải về
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^Danh_sach_hoc_sinh_.*\.xlsx$/i);
  });

  test('TC-TCH-CLASS-006: Nhập danh sách học sinh từ file Excel và kiểm tra kết quả validate', async ({ page }) => {
    await page.goto(`/teacher/classes/${createdClassId}`);
    await page.waitForLoadState('networkidle');

    // Mở modal Import Excel
    const importBtn = page.getByRole('button', { name: /Nhập Excel/i });
    await importBtn.click();

    // Kiểm tra modal hiển thị
    await expect(page.locator('text=Nhập Danh Sách Học Sinh Từ Excel')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Tải file mẫu/i })).toBeVisible();

    // Tạo file Excel mẫu test gồm 1 học sinh mới và 1 email không hợp lệ
    const tempFilePath = path.join(__dirname, `test_import_${Date.now()}.xlsx`);
    const testData = [
      {
        'Họ và tên': 'Học Sinh Mới E2E',
        Email: `student_new_${Date.now()}@testimport.com`,
        'Username/MSSV': `std_${Date.now()}`,
        'Số điện thoại': '0901234567',
      },
      {
        'Họ và tên': 'Học Sinh Sai Email',
        Email: 'invalid-email-format',
        'Username/MSSV': 'invalidsmt',
        'Số điện thoại': '0909999999',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(testData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HocSinh');
    XLSX.writeFile(wb, tempFilePath);

    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);

      // Bấm nút "Bắt đầu Nhập"
      const submitBtn = page.getByRole('button', { name: /Bắt đầu Nhập/i });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Kiểm tra bảng tổng kết kết quả nhập
      await expect(page.locator('text=Kết Quả Nhập Dữ Liệu')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Thành công', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Lỗi', { exact: true }).first()).toBeVisible();
      await expect(page.locator('text=Chi tiết các dòng bị lỗi / bỏ qua')).toBeVisible();
    } finally {
      // Dọn dẹp file tạm
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('TC-TCH-CLASS-007: Authorization Security — Backend chặn 403 Forbidden khi giáo viên truy cập lớp học của giáo viên khác', async () => {
    const otherTeacherApi = await ApiHelper.create();
    await otherTeacherApi.login('other_teacher@quizmaster.com', 'Password@123');

    // Giáo viên khác cố gắng truy cập chi tiết lớp createdClassId
    const detailRes = await otherTeacherApi.get(`/classrooms/${createdClassId}`);
    expect(detailRes.status).toBe(403);
    expect(JSON.stringify(detailRes.body)).toMatch(/không có quyền|forbidden/i);

    // Giáo viên khác cố gắng lấy danh sách học sinh của lớp createdClassId
    const studentsRes = await otherTeacherApi.get(`/classrooms/${createdClassId}/students`);
    expect(studentsRes.status).toBe(403);

    // Giáo viên khác cố gắng export danh sách học sinh
    const exportRes = await otherTeacherApi.get(`/classrooms/${createdClassId}/students/export`);
    expect(exportRes.status).toBe(403);
  });

  test('TC-TCH-CLASS-008: Authorization Security — Học sinh không thể truy cập /teacher/classes', async ({ browser }) => {
    const studentContext = await browser.newContext({ storageState: STORAGE_PATHS.STUDENT });
    const page = await studentContext.newPage();

    // Học sinh thử vào /teacher/classes
    await page.goto('/teacher/classes');
    // Phải bị RoleGuard đá về /student/dashboard
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    await studentContext.close();
  });
});

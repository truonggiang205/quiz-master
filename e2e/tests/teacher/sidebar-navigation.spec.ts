import { test, expect } from '@playwright/test';
import { STORAGE_PATHS } from '../../utils/constants';

test.describe('Teacher Module — Sidebar Navigation Refactor', () => {
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  test.beforeEach(async ({ page }) => {
    await page.goto('/teacher/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SIDEBAR-001: Xóa hoàn toàn card CHẾ ĐỘ GIÁO VIÊN khỏi DOM', async ({ page }) => {
    // 1. Text "CHẾ ĐỘ GIÁO VIÊN" không được xuất hiện trong sidebar hoặc toàn trang
    const teacherModeText = page.locator('text=CHẾ ĐỘ GIÁO VIÊN');
    await expect(teacherModeText).toHaveCount(0);

    const teacherModeLower = page.locator('text=Chế độ Giáo Viên');
    await expect(teacherModeLower).toHaveCount(0);

    // 2. Slogan của card cũ không được xuất hiện
    const sloganText = page.locator('text=Tạo đề thi, theo dõi điểm số và xuất bản bài kiểm tra dễ dàng');
    await expect(sloganText).toHaveCount(0);

    // 3. Không có thẻ promotional card ở cuối sidebar
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    await expect(aside.locator('.bg-gradient-to-br')).toHaveCount(0);
  });

  test('TC-SIDEBAR-002: Kiểm tra cấu trúc phân nhóm (Sections & Headers) và Footer Báo lỗi', async ({ page }) => {
    const aside = page.locator('aside');

    // Section headers
    await expect(aside.getByText('GIẢNG DẠY', { exact: true })).toBeVisible();
    await expect(aside.getByText('KIỂM TRA', { exact: true })).toBeVisible();
    await expect(aside.getByText('TÀI CHÍNH', { exact: true })).toBeVisible();
    await expect(aside.getByText('CÔNG CỤ', { exact: true })).toBeVisible();

    // Top level items (no section title)
    await expect(aside.getByRole('link', { name: 'Tổng Quan' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Lịch Dạy' })).toBeVisible();

    // Section Giảng Dạy items
    await expect(aside.getByRole('link', { name: 'Học Sinh' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Khóa Học' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Nhật Ký Học Tập' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Điểm Số' })).toBeVisible();

    // Section Tài Chính items
    await expect(aside.getByRole('link', { name: 'Học Phí' })).toBeVisible();

    // Section Công Cụ items
    await expect(aside.getByRole('link', { name: 'Ngân hàng đề' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Phúc Khảo' })).toBeVisible();

    // Footer items (Đã đổi label thành "Báo lỗi")
    await expect(aside.getByRole('link', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Báo lỗi' })).toBeVisible();
  });

  test('TC-SIDEBAR-003: Gom nhóm Bài thi & Kiểm tra (Submenu 5 mục chức năng liên quan)', async ({ page }) => {
    const aside = page.locator('aside');

    // Group button "Bài thi & Kiểm tra"
    const quizGroupBtn = aside.locator('button', { hasText: 'Bài thi & Kiểm tra' });
    await expect(quizGroupBtn).toBeVisible();

    // Mở submenu
    if (!(await aside.getByRole('link', { name: 'Tạo bài thi' }).isVisible())) {
      await quizGroupBtn.click();
    }

    // Sau khi mở, đủ 5 sub-items chức năng liên quan
    const quizLink = aside.getByRole('link', { name: 'Bài thi', exact: true });
    const createQuizLink = aside.getByRole('link', { name: 'Tạo bài thi' });
    const bankLink = aside.getByRole('link', { name: 'Ngân hàng đề' }).first();
    const resultsLink = aside.getByRole('link', { name: 'Kết quả ôn tập' });
    const appealLink = aside.getByRole('link', { name: 'Phúc khảo' }).first();

    await expect(quizLink).toBeVisible();
    await expect(createQuizLink).toBeVisible();
    await expect(bankLink).toBeVisible();
    await expect(resultsLink).toBeVisible();
    await expect(appealLink).toBeVisible();

    // Không còn chuỗi text truncate "Kết quả ôn tập và kiểm..."
    await expect(aside.locator('text=Kết quả ôn tập và kiểm...')).toHaveCount(0);

    // Click "Bài thi" điều hướng về /teacher/quizzes
    await quizLink.click();
    await expect(page).toHaveURL(/\/teacher\/quizzes/);

    // Group vẫn giữ trạng thái mở khi ở route /teacher/quizzes
    await expect(aside.getByRole('link', { name: 'Bài thi', exact: true })).toBeVisible();
  });

  test('TC-SIDEBAR-004: Điều hướng chính xác qua các menu và kiểm tra Active State', async ({ page }) => {
    const aside = page.locator('aside');

    // 1. Lịch Dạy
    await aside.getByRole('link', { name: 'Lịch Dạy' }).click();
    await expect(page).toHaveURL(/\/teacher\/schedule/);
    const scheduleLink = aside.getByRole('link', { name: 'Lịch Dạy' });
    await expect(scheduleLink).toHaveClass(/bg-sky-50|text-sky-600/);

    // 2. Học Sinh
    await aside.getByRole('link', { name: 'Học Sinh' }).click();
    await expect(page).toHaveURL(/\/teacher\/students/);

    // 3. Khóa Học
    await aside.getByRole('link', { name: 'Khóa Học' }).click();
    await expect(page).toHaveURL(/\/teacher\/classes/);

    // 4. Nhật Ký Học Tập
    await aside.getByRole('link', { name: 'Nhật Ký Học Tập' }).click();
    await expect(page).toHaveURL(/\/teacher\/learning-logs/);

    // 5. Điểm Số
    await aside.getByRole('link', { name: 'Điểm Số' }).click();
    await expect(page).toHaveURL(/\/teacher\/scores/);

    // 6. Học Phí
    await aside.getByRole('link', { name: 'Học Phí' }).click();
    await expect(page).toHaveURL(/\/teacher\/tuition/);

    // 7. Báo lỗi
    await aside.getByRole('link', { name: 'Báo lỗi' }).click();
    await expect(page).toHaveURL(/\/teacher\/report/);
  });

  test('TC-SIDEBAR-005: Responsive Collapse, Tooltip khi hover và Logo Header', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-toggle-btn');
    if (await toggleBtn.isVisible()) {
      // 1. Kiểm tra logo đang hiển thị ở expanded mode
      const logoLink = page.locator('header a[href="/"]');
      await expect(logoLink).toBeVisible();

      // 2. Bấm nút thu gọn
      await toggleBtn.click();
      await page.waitForTimeout(300);

      const aside = page.locator('aside');
      // Sidebar thu nhỏ còn md:w-20
      await expect(aside).toHaveClass(/md:w-20/);

      // Logo ở header được ẩn trong collapsed mode để không bị crop hay lệch
      await expect(logoLink).toHaveClass(/hidden/);

      // 3. Hover vào icon "Lịch Dạy" hiển thị floating tooltip bên phải
      const scheduleIconLink = aside.locator('a[href="/teacher/schedule"]');
      await scheduleIconLink.hover();

      const tooltip = page.locator('div[role="tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveText('Lịch Dạy');

      // 4. Bấm mở lại sidebar
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await expect(aside).toHaveClass(/md:w-64/);
      await expect(logoLink).not.toHaveClass(/hidden/);
    }
  });
});

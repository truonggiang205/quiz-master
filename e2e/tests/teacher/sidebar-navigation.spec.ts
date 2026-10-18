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

  test('TC-SIDEBAR-002: Kiểm tra cấu trúc phân nhóm (Sections & Headers)', async ({ page }) => {
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

    // Footer items
    await expect(aside.getByRole('link', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Báo Cáo Lỗi' })).toBeVisible();
  });

  test('TC-SIDEBAR-003: Gom nhóm Bài thi & Kiểm tra (Expandable / Collapsible)', async ({ page }) => {
    const aside = page.locator('aside');

    // Group button "Bài thi & Kiểm tra"
    const quizGroupBtn = aside.locator('button', { hasText: 'Bài thi & Kiểm tra' });
    await expect(quizGroupBtn).toBeVisible();

    // "Tạo bài thi mới" KHÔNG được là top-level link độc lập
    // Ban đầu khi ở dashboard (/teacher/dashboard), nếu group chưa mở, click mở
    if (!(await aside.getByRole('link', { name: 'Tạo bài thi mới' }).isVisible())) {
      await quizGroupBtn.click();
    }

    // Sau khi mở, 2 sub-items phải hiển thị
    const quizListLink = aside.getByRole('link', { name: 'Danh sách bài thi' });
    const createQuizLink = aside.getByRole('link', { name: 'Tạo bài thi mới' });

    await expect(quizListLink).toBeVisible();
    await expect(createQuizLink).toBeVisible();

    // Không còn chuỗi text truncate "Kết quả ôn tập và kiểm..."
    await expect(aside.locator('text=Kết quả ôn tập và kiểm...')).toHaveCount(0);

    // Click "Danh sách bài thi" điều hướng về /teacher/quizzes
    await quizListLink.click();
    await expect(page).toHaveURL(/\/teacher\/quizzes/);

    // Group vẫn giữ trạng thái mở khi ở route /teacher/quizzes
    await expect(aside.getByRole('link', { name: 'Danh sách bài thi' })).toBeVisible();
    await expect(aside.getByRole('link', { name: 'Tạo bài thi mới' })).toBeVisible();
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

    // 7. Ngân hàng đề
    await aside.getByRole('link', { name: 'Ngân hàng đề' }).click();
    await expect(page).toHaveURL(/\/teacher\/bank/);

    // 8. Phúc Khảo
    await aside.getByRole('link', { name: 'Phúc Khảo' }).click();
    await expect(page).toHaveURL(/\/teacher\/appeals/);
  });

  test('TC-SIDEBAR-005: Responsive Collapse & Tooltip khi thu gọn', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-toggle-btn');
    if (await toggleBtn.isVisible()) {
      // Bấm nút thu gọn
      await toggleBtn.click();
      await page.waitForTimeout(300);

      const aside = page.locator('aside');
      // Sidebar thu nhỏ còn w-20
      await expect(aside).toHaveClass(/md:w-20/);

      // Icon vẫn có title tooltip
      const scheduleLink = aside.locator('a[title="Lịch Dạy"]');
      await expect(scheduleLink).toBeVisible();

      // Bấm mở lại
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await expect(aside).toHaveClass(/md:w-64/);
    }
  });
});

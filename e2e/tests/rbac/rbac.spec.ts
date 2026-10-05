import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_CONFIG } from '../../utils/constants';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Phân hệ Phân quyền & Điều hướng bảo vệ (RBAC & Route Guards)', () => {

  test.describe('Khách vãng lai (Anonymous / Unauthenticated)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('TC-RBAC-001: Khách vãng lai truy cập route được bảo vệ bị chuyển hướng về /login', async ({ page }) => {
      await page.goto('/teacher/quizzes');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/student/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Vai trò Học sinh (Student Permissions)', () => {
    test.use({ storageState: STORAGE_PATHS.STUDENT });

    test('TC-RBAC-002: Học sinh cố tình truy cập trang của Giáo viên bị chuyển hướng về Student Dashboard', async ({ page }) => {
      await page.goto('/teacher/quizzes/create');
      await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

      await page.goto('/teacher/classrooms');
      await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
    });

    test('TC-RBAC-003: Học sinh cố tình truy cập trang Quản trị Admin bị chuyển hướng về Student Dashboard', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

      await page.goto('/admin/settings');
      await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Vai trò Giáo viên (Teacher Permissions)', () => {
    test.use({ storageState: STORAGE_PATHS.TEACHER });

    test('TC-RBAC-004: Giáo viên cố tình truy cập trang Quản trị Admin bị chuyển hướng về Teacher Dashboard', async ({ page }) => {
      await page.goto('/admin/settings');
      await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10000 });

      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Phân quyền tầng API (Backend API Role Verification)', () => {
    test('TC-RBAC-005: Gọi trực tiếp API Admin khi không có role ADMIN trả về 401 Unauthorized', async ({ request }) => {
      // 1. Gọi trực tiếp API Admin không có bất kỳ Header nào
      const noAuthRes = await request.get(`${TEST_CONFIG.API_URL}/admin/users`);
      expect(noAuthRes.status()).toBe(401);

      // 2. Đăng nhập bằng tài khoản Teacher, sau đó gọi API Admin
      const apiHelper = await ApiHelper.create();
      await apiHelper.login(process.env.E2E_TEACHER_EMAIL || 'teacher@quizmaster.com', 'Password@123');

      const teacherCallAdmin = await apiHelper.get('/admin/users');
      // Backend checkAdmin() ném UnauthorizedException('Bạn không có quyền truy cập') khi x-user-role !== 'ADMIN'
      expect(teacherCallAdmin.status).toBe(401);
      expect(JSON.stringify(teacherCallAdmin.body)).toContain('không có quyền');
    });
  });
});

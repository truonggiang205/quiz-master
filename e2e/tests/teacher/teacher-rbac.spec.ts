import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_USERS } from '../../utils/constants';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Teacher Module — RBAC & Security Access Control', () => {
  test('TC-TCH-019: Học sinh không thể truy cập các route quản trị của Giáo viên', async ({ browser }) => {
    // Tạo context với quyền Học sinh
    const studentContext = await browser.newContext({ storageState: STORAGE_PATHS.STUDENT });
    const page = await studentContext.newPage();

    // 1. Thử vào /teacher/quizzes
    await page.goto('/teacher/quizzes');
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    // 2. Thử vào /teacher/bank
    await page.goto('/teacher/bank');
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    // 3. Thử vào /teacher/classrooms
    await page.goto('/teacher/classrooms');
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    await studentContext.close();
  });

  test('TC-TCH-020: Học sinh không thể gọi API tạo lớp học của Giáo viên (API Security)', async () => {
    const studentApi = await ApiHelper.create();
    await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);

    const res = await studentApi.post('/classrooms', {
      name: 'Hack Classroom Attempt',
      subject: 'Toán',
      isPrivate: false,
    });

    // Backend phải trả về 401 Unauthorized
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).toMatch(/Chỉ giáo viên mới được tạo lớp học|không có quyền/i);
  });
});

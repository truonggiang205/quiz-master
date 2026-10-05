import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — RBAC & Security Access Control', () => {
  test.use({ storageState: 'e2e/.auth/student.json' });

  test('TC-STU-019: Học sinh cố tình truy cập các route quản trị của Giáo viên bị chuyển hướng về Student Dashboard', async ({ page }) => {
    // 1. Thử vào trang danh sách đề thi của giáo viên
    await page.goto('/teacher/quizzes');
    await expect(page).toHaveURL(/\/student\/dashboard/);

    // 2. Thử vào trang tạo đề thi
    await page.goto('/teacher/quizzes/create');
    await expect(page).toHaveURL(/\/student\/dashboard/);

    // 3. Thử vào ngân hàng câu hỏi của giáo viên
    await page.goto('/teacher/bank');
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });

  test('TC-STU-020: Học sinh không thể gọi các API quản lý và sửa đổi đề thi của Giáo viên', async () => {
    const studentApi = await ApiHelper.create();
    await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);

    // 1. Cố tình gọi API tạo đề thi
    const createRes = await studentApi.post('/quizzes', {
      title: 'Học sinh cố tình tạo đề',
      subject: 'Toán',
      durationMinutes: 15,
    });

    // Cleanup ngay nếu bài thi bị tạo trái phép do thiếu RBAC
    if (createRes.body?.data?.id) {
      const teacherApi = await ApiHelper.create();
      await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
      await teacherApi.delete(`/quizzes/${createRes.body.data.id}`);
    }

    // Backend Guards / Controller RBAC phải từ chối (401 hoặc 403)
    expect([401, 403]).toContain(createRes.status);

    // 2. Cố tình gọi API sửa đề thi
    const patchRes = await studentApi.patch('/quizzes/fake-quiz-id', {
      title: 'Học sinh cố tình sửa đề',
    });
    expect([401, 403]).toContain(patchRes.status);

    // 3. Cố tình gọi API xóa đề thi
    const deleteRes = await studentApi.delete('/quizzes/fake-quiz-id');
    expect([401, 403]).toContain(deleteRes.status);

    // 4. Cố tình gọi API xuất bản đề thi
    const publishRes = await studentApi.post('/quizzes/fake-quiz-id/publish');
    expect([401, 403]).toContain(publishRes.status);
  });
});

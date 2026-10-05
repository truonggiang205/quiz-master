import { test, expect } from '@playwright/test';
import { StudentDashboardPage } from '../../pages/student/student-dashboard.page';
import { StudentClassroomPage } from '../../pages/student/student-classroom.page';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — Dashboard & Classroom Management', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let testClassId: string;
  let testInviteCode: string;
  let testClassName: string;

  test.beforeAll(async () => {
    // Chuẩn bị Teacher API để tạo lớp học cho học sinh tham gia
    teacherApi = await ApiHelper.create();
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    const timestamp = Date.now();
    testClassName = `E2E StuClass ${timestamp}`;
    const createRes = await teacherApi.post('/classrooms', {
      name: testClassName,
      subject: 'Toán Học',
      description: 'Lớp học E2E cho Học sinh kiểm thử',
    });

    if (createRes.status === 201 && createRes.body?.data) {
      testClassId = createRes.body.data.id;
      testInviteCode = createRes.body.data.inviteCode;
    }
  });

  test('TC-STU-001: Học sinh mở Bàn học tập (/student/dashboard) và xem số liệu thống kê', async ({ page }) => {
    const dashboardPage = new StudentDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    await expect(dashboardPage.heroHeading).toBeVisible();
    await expect(dashboardPage.welcomeSubtitle).toBeVisible();
    await expect(dashboardPage.viewAllQuizzesBtn).toBeVisible();
    await expect(dashboardPage.statAvailableCard).toBeVisible();
    await expect(dashboardPage.statCompletedCard).toBeVisible();
    await expect(dashboardPage.statAvgScoreCard).toBeVisible();
    await expect(dashboardPage.statHighestScoreCard).toBeVisible();
  });

  test('TC-STU-002: Học sinh mở trang Lớp học của tôi (/student/classrooms)', async ({ page }) => {
    const classroomPage = new StudentClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    await expect(classroomPage.heading).toHaveText('Lớp học của tôi');
    await expect(classroomPage.openJoinModalBtn).toBeVisible();
  });

  test('TC-STU-003: Học sinh tham gia lớp học mới bằng mã mời hợp lệ (Invite Code)', async ({ page }) => {
    test.skip(!testInviteCode, 'Không có mã mời lớp học được tạo từ Teacher API');

    const classroomPage = new StudentClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    await classroomPage.openJoinModal();
    await classroomPage.submitInviteCode(testInviteCode);

    // Xác nhận toast thành công
    await expect(page.locator('text=Tham gia lớp học thành công')).toBeVisible({ timeout: 10000 });

    // Xác nhận card lớp học hiển thị trong danh sách của học sinh
    const card = classroomPage.getClassroomCard(testClassName);
    await expect(card).toBeVisible({ timeout: 10000 });
  });

  test('TC-STU-004: Học sinh nhập mã mời không hợp lệ hoặc sai mã', async ({ page }) => {
    const classroomPage = new StudentClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    await classroomPage.openJoinModal();
    await classroomPage.submitInviteCode('FAKE-9999');

    // Xác nhận xuất hiện toast thông báo lỗi
    await expect(page.locator('text=Mã lớp học không hợp lệ')).toBeVisible({ timeout: 10000 });
  });

  test('TC-STU-005: Học sinh cố tình tham gia lại lớp học đã tham gia (Duplicate Join)', async ({ page }) => {
    test.skip(!testInviteCode, 'Không có mã mời lớp học');

    const classroomPage = new StudentClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    await classroomPage.openJoinModal();
    await classroomPage.submitInviteCode(testInviteCode);

    // Backend ném BadRequestException: "Bạn đã tham gia lớp học này rồi"
    await expect(page.locator('text=Bạn đã tham gia lớp học này rồi')).toBeVisible({ timeout: 10000 });
  });

  test('TC-STU-006: Học sinh xem chi tiết lớp học (/student/classrooms/:id)', async ({ page }) => {
    test.skip(!testClassId, 'Không có ID lớp học');

    const classroomPage = new StudentClassroomPage(page);
    await page.goto(`/student/classrooms/${testClassId}`);

    // Xác nhận hiển thị tiêu đề và thông tin lớp
    await expect(classroomPage.detailHeading).toContainText(testClassName);
    await expect(page.locator('text=Toán Học')).toBeVisible();
    await expect(page.locator('text=Giáo viên phụ trách')).toBeVisible();
    await expect(page.locator('text=Chưa có bài tập nào')).toBeVisible();
  });
});

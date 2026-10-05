import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_USERS } from '../../utils/constants';
import { ClassroomPage } from '../../pages/teacher/classroom.page';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Teacher Module — Classroom & Student Management', () => {
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create(undefined, 'TEACHER');
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
    studentApi = await ApiHelper.create(undefined, 'STUDENT');
    await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
  });

  test('TC-TCH-015: Giáo viên mở trang Quản lý khóa học và xem các tab phân loại', async ({ page }) => {
    const classroomPage = new ClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    await expect(classroomPage.createBtn).toBeVisible();
    await expect(classroomPage.tabAll).toBeVisible();
    await expect(classroomPage.tabClass).toBeVisible();
    await expect(classroomPage.tabPrivate).toBeVisible();
  });

  test('TC-TCH-016: Giáo viên tạo lớp học nhóm mới và kiểm tra định dạng mã mời (Invite Code)', async ({ page }) => {
    const classroomPage = new ClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    const timestamp = Date.now();
    const className = `E2E Class Group ${timestamp}`;
    const subject = 'Toán Học';

    // Tạo lớp học
    await classroomPage.createGroupClass(className, subject, 'Mô tả lớp học kiểm thử tự động');
    await classroomPage.expectToast(/Đã tạo lớp học nhóm/i);

    // Xác nhận thẻ lớp học xuất hiện
    const card = classroomPage.getClassCard(className);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Kiểm tra định dạng mã mời (inviteCode): PREFIX-XXXX (Ví dụ: TOAN-A8F2)
    const inviteCode = await classroomPage.getCardInviteCode(className);
    expect(inviteCode).toBeTruthy();
    expect(inviteCode).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
  });

  test('TC-TCH-017: Giáo viên xem chi tiết lớp học và danh sách học sinh', async ({ page }) => {
    const classroomPage = new ClassroomPage(page);
    await classroomPage.goto();
    await classroomPage.expectLoaded();

    const timestamp = Date.now();
    const className = `E2E Class Detail ${timestamp}`;

    // Tạo lớp học trước
    await classroomPage.createGroupClass(className, 'Vật Lý');
    await expect(classroomPage.getClassCard(className)).toBeVisible({ timeout: 10000 });

    // Mở chi tiết lớp học
    await classroomPage.openClassDetail(className);

    // Xác nhận vào đúng URL chi tiết
    await expect(page).toHaveURL(/\/teacher\/classrooms\/class-/);
    await expect(classroomPage.detailHeading).toContainText(className);
    await expect(page.locator('text=Danh sách Học sinh')).toBeVisible();
    await expect(page.locator('text=Thông tin chung')).toBeVisible();
  });

  test('TC-TCH-018: Giáo viên xóa học sinh khỏi lớp học', async ({ page }) => {
    const classroomPage = new ClassroomPage(page);

    const timestamp = Date.now();
    const className = `E2E Class Roster ${timestamp}`;

    // 1. Giáo viên tạo lớp học qua API
    const createRes = await teacherApi.post('/classrooms', {
      name: className,
      subject: 'Tiếng Anh',
      description: 'Lớp kiểm thử xóa học sinh',
      isPrivate: false,
    });
    const classId = createRes.body?.data?.id;
    const inviteCode = createRes.body?.data?.inviteCode;
    expect(classId).toBeTruthy();
    expect(inviteCode).toBeTruthy();

    // 2. Học sinh tham gia lớp bằng inviteCode
    const joinRes = await studentApi.post('/classrooms/join', { inviteCode });
    expect(joinRes.status).toBe(201);

    // 3. Giáo viên mở trang chi tiết lớp học
    await page.goto(`/teacher/classrooms/${classId}`);
    await expect(page.locator('text=Danh sách Học sinh')).toBeVisible({ timeout: 10000 });

    // 4. Tìm kiếm học sinh trong danh sách và xóa
    const studentItem = page.locator('li').filter({ hasText: TEST_USERS.STUDENT.email }).first();
    await expect(studentItem).toBeVisible({ timeout: 10000 });

    const removeBtn = studentItem.locator('button[title="Xóa khỏi lớp"]');
    await removeBtn.click();

    // Xác nhận modal xóa
    await expect(classroomPage.removeStudentModal).toBeVisible({ timeout: 5000 });
    await classroomPage.confirmRemoveStudentBtn.click();
    await classroomPage.expectToast(/Thành công|Đã xóa/i);

    // Học sinh bị gỡ khỏi danh sách
    await expect(studentItem).toBeHidden({ timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';
import { StudentResultPage } from '../../pages/student/student-result.page';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — Result & Answer Visibility', () => {
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let futureReleaseQuizId: string;
  let futureReleaseQuizTitle: string;
  let submissionId: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create();
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create();
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    const studentId = stuLogin.body?.data?.user?.id;

    const timestamp = Date.now();
    futureReleaseQuizTitle = `E2E Timed Release Quiz ${timestamp}`;

    // Đặt thời gian công bố đáp án là 2 giờ sau (trong tương lai)
    const futureReleaseTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    const quizRes = await teacherApi.post('/quizzes', {
      title: futureReleaseQuizTitle,
      description: 'Kiểm thử hẹn giờ mở đáp án chi tiết',
      subject: 'Vật Lý',
      durationMinutes: 20,
      totalPoints: 1000,
      answerReleaseAt: futureReleaseTime,
      assignedStudentIds: [studentId],
    });
    futureReleaseQuizId = quizRes.body?.data?.id;

    const qRes = await teacherApi.post(`/quizzes/${futureReleaseQuizId}/questions`, {
      content: 'Vận tốc ánh sáng trong chân không là bao nhiêu?',
      type: 'SINGLE_CHOICE',
      score: 1000,
      points: 1000,
      order: 1,
      explanation: 'Vận tốc ánh sáng xấp xỉ 300.000 km/s',
      options: [
        { text: '300.000 km/s', isCorrect: true },
        { text: '150.000 km/s', isCorrect: false },
      ],
    });

    await teacherApi.post(`/quizzes/${futureReleaseQuizId}/publish`);

    // Học sinh thực hiện nộp bài qua API
    const subRes = await studentApi.post(`/quizzes/${futureReleaseQuizId}/submit`, {
      answers: [
        {
          questionId: qRes.body?.data?.id,
          selectedOptionIds: [qRes.body?.data?.options[0]?.id],
        },
      ],
      timeUsedSeconds: 120,
    });
    submissionId = subRes.body?.data?.id;
  });

  test('TC-STU-017: Học sinh xem trang Kết quả thi và lịch sử làm bài (/student/history)', async ({ page }) => {
    test.skip(!futureReleaseQuizId, 'Không có đề thi');

    // 1. Mở trang kết quả làm bài
    const resultPage = new StudentResultPage(page);
    await resultPage.goto(futureReleaseQuizId, submissionId);
    await resultPage.expectLoaded();

    await expect(resultPage.resultHeading).toContainText(futureReleaseQuizTitle);
    await expect(resultPage.timeUsedCard).toBeVisible();
    await expect(resultPage.appealBtn).toBeVisible();

    // 2. Mở trang Lịch sử làm bài
    await page.goto('/student/history');
    await expect(page.locator('h1').filter({ hasText: /Bài Đã Làm/i })).toBeVisible({ timeout: 10000 });

    // Đề thi vừa nộp phải hiển thị trong danh sách bài đã làm
    await expect(page.locator(`text=${futureReleaseQuizTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-STU-018: Kiểm tra cơ chế hiển thị đáp án theo thời gian (answerReleaseAt)', async ({ page }) => {
    test.skip(!futureReleaseQuizId, 'Không có đề thi');

    const resultPage = new StudentResultPage(page);
    await resultPage.goto(futureReleaseQuizId, submissionId);
    await resultPage.expectLoaded();

    // Vì thời gian mở đáp án ở tương lai (+2 giờ), banner đếm ngược phải hiển thị
    await expect(page.locator('text=Đáp án & Lời giải đang được khóa')).toBeVisible({ timeout: 10000 });

    // Phần Lời giải chi tiết không được hiển thị trước thời hạn
    await expect(resultPage.answerDetailsSection).not.toBeVisible();
  });
});

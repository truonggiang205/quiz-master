import { test, expect } from '@playwright/test';
import { StudentExamPage } from '../../pages/student/student-exam.page';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — Examination & Question Interaction', () => {
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let examQuizId: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create();
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create();
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    const studentId = stuLogin.body?.data?.user?.id;

    const timestamp = Date.now();

    // 1. Tạo đề thi gồm cả câu hỏi SINGLE_CHOICE và MULTIPLE_CHOICE
    const quizRes = await teacherApi.post('/quizzes', {
      title: `E2E Exam Interaction Quiz ${timestamp}`,
      description: 'Kiểm thử thao tác chọn phương án làm bài thi',
      subject: 'Toán Học',
      durationMinutes: 30,
      totalPoints: 1000,
      totalAttempts: 5,
      assignedStudentIds: [studentId],
    });
    examQuizId = quizRes.body?.data?.id;

    // Q1: SINGLE_CHOICE (400 điểm)
    await teacherApi.post(`/quizzes/${examQuizId}/questions`, {
      content: 'Câu 1 (Đơn lựa chọn): 2 + 2 = ?',
      type: 'SINGLE_CHOICE',
      score: 400,
      points: 400,
      order: 1,
      options: [
        { text: 'Phương án 3', isCorrect: false },
        { text: 'Phương án 4', isCorrect: true },
        { text: 'Phương án 5', isCorrect: false },
      ],
    });

    // Q2: MULTIPLE_CHOICE (400 điểm)
    await teacherApi.post(`/quizzes/${examQuizId}/questions`, {
      content: 'Câu 2 (Đa lựa chọn): Các số chẵn là:',
      type: 'MULTIPLE_CHOICE',
      score: 400,
      points: 400,
      order: 2,
      options: [
        { text: 'Số 2', isCorrect: true },
        { text: 'Số 3', isCorrect: false },
        { text: 'Số 4', isCorrect: true },
      ],
    });

    // Q3: SINGLE_CHOICE (200 điểm) - để lại không trả lời cho test TC-STU-013
    await teacherApi.post(`/quizzes/${examQuizId}/questions`, {
      content: 'Câu 3: Đố vui chưa trả lời',
      type: 'SINGLE_CHOICE',
      score: 200,
      points: 200,
      order: 3,
      options: [
        { text: 'Đáp án A', isCorrect: true },
        { text: 'Đáp án B', isCorrect: false },
      ],
    });

    // Xuất bản bài thi
    await teacherApi.post(`/quizzes/${examQuizId}/publish`);
  });

  test('TC-STU-011: Học sinh làm bài thi trắc nghiệm một đáp án đúng (SINGLE_CHOICE)', async ({ page }) => {
    test.skip(!examQuizId, 'Không có đề thi exam');

    const examPage = new StudentExamPage(page);
    await examPage.gotoDetail(examQuizId);
    await examPage.expectDetailLoaded();

    // Bắt đầu làm bài thi
    await examPage.startExamFromDetail();
    await examPage.expectTakingLoaded();

    // Chọn phương án đầu tiên
    await examPage.selectOptionByText('Phương án 3');
    const opt3 = page.locator('button[id^="option-card-"]').filter({ hasText: 'Phương án 3' });
    await expect(opt3).toHaveClass(/border-sky-400|dark:border-sky-600/);

    // Chuyển sang chọn phương án thứ hai -> phương án đầu tiên tự động bỏ chọn
    await examPage.selectOptionByText('Phương án 4');
    const opt4 = page.locator('button[id^="option-card-"]').filter({ hasText: 'Phương án 4' });
    await expect(opt4).toHaveClass(/border-sky-400|dark:border-sky-600/);
    await expect(opt3).not.toHaveClass(/border-sky-400|dark:border-sky-600/);

    // Chuyển sang câu 2 rồi quay lại câu 1 -> đáp án đã chọn vẫn được lưu trong state
    await examPage.goToNextQuestion();
    await expect(page.locator('text=Câu 2 (Đa lựa chọn)')).toBeVisible({ timeout: 5000 });

    await examPage.goToPrevQuestion();
    await expect(page.locator('text=Câu 1 (Đơn lựa chọn)')).toBeVisible({ timeout: 5000 });
    await expect(opt4).toHaveClass(/border-sky-400|dark:border-sky-600/);
  });

  test('TC-STU-012: Học sinh làm câu hỏi nhiều đáp án đúng (MULTIPLE_CHOICE)', async ({ page }) => {
    test.skip(!examQuizId, 'Không có đề thi exam');

    const examPage = new StudentExamPage(page);
    await page.goto(`/student/quizzes/${examQuizId}/take`);
    await examPage.expectTakingLoaded();

    // Chuyển sang Câu 2 (Đa lựa chọn)
    await examPage.goToNextQuestion();
    await expect(page.locator('text=Câu 2 (Đa lựa chọn)')).toBeVisible({ timeout: 5000 });

    const opt2 = page.locator('button[id^="option-card-"]').filter({ hasText: 'Số 2' });
    const opt4 = page.locator('button[id^="option-card-"]').filter({ hasText: 'Số 4' });

    // Chọn cả 2 đáp án (Số 2 và Số 4)
    await opt2.click();
    await expect(opt2).toHaveClass(/border-sky-400|dark:border-sky-600/);

    await opt4.click();
    await expect(opt4).toHaveClass(/border-sky-400|dark:border-sky-600/);
    await expect(opt2).toHaveClass(/border-sky-400|dark:border-sky-600/);

    // Bỏ chọn Số 2 -> Số 2 mất highlight, Số 4 vẫn được chọn
    await opt2.click();
    await expect(opt2).not.toHaveClass(/border-sky-400|dark:border-sky-600/);
    await expect(opt4).toHaveClass(/border-sky-400|dark:border-sky-600/);
  });

  test('TC-STU-013: Học sinh làm bài và để trống câu hỏi — Modal kiểm tra Đã trả lời và Chưa trả lời', async ({ page }) => {
    test.skip(!examQuizId, 'Không có đề thi exam');

    const examPage = new StudentExamPage(page);
    await page.goto(`/student/quizzes/${examQuizId}/take`);
    await examPage.expectTakingLoaded();

    // Mở modal nộp bài
    await examPage.openSubmitModal();

    // Kiểm tra thống kê hiển thị trên modal nộp bài: có cả phần Đã trả lời và Chưa trả lời
    await expect(examPage.submitModal.locator('text=Đã trả lời')).toBeVisible();
    await expect(examPage.submitModal.locator('text=Chưa trả lời')).toBeVisible();

    // Hủy bỏ modal để tiếp tục làm bài mà không nộp ngay
    const cancelBtn = examPage.submitModal.getByRole('button', { name: /Tiếp tục làm bài/i });
    await cancelBtn.click();
    await expect(examPage.submitModal).not.toBeVisible({ timeout: 5000 });
  });
});

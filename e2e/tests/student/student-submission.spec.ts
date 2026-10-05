import { test, expect } from '@playwright/test';
import { StudentExamPage } from '../../pages/student/student-exam.page';
import { StudentResultPage } from '../../pages/student/student-result.page';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — Submission & Score Calculation', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let subQuizId: string;
  let subQuizTitle: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create();
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create();
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    const studentId = stuLogin.body?.data?.user?.id;

    const timestamp = Date.now();
    subQuizTitle = `E2E Submission Quiz ${timestamp}`;

    // Tạo đề thi totalAttempts = 1, totalPoints = 1000
    const quizRes = await teacherApi.post('/quizzes', {
      title: subQuizTitle,
      description: 'Kiểm thử nộp bài và tính điểm',
      subject: 'Lịch Sử',
      durationMinutes: 15,
      totalPoints: 1000,
      totalAttempts: 1,
      assignedStudentIds: [studentId],
    });
    subQuizId = quizRes.body?.data?.id;

    // Câu 1: 500 điểm
    await teacherApi.post(`/quizzes/${subQuizId}/questions`, {
      content: 'Chiến thắng Điện Biên Phủ diễn ra năm nào?',
      type: 'SINGLE_CHOICE',
      score: 500,
      points: 500,
      order: 1,
      options: [
        { text: 'Năm 1954', isCorrect: true },
        { text: 'Năm 1975', isCorrect: false },
      ],
    });

    // Câu 2: 500 điểm
    await teacherApi.post(`/quizzes/${subQuizId}/questions`, {
      content: 'Chiến dịch Hồ Chí Minh toàn thắng vào năm nào?',
      type: 'SINGLE_CHOICE',
      score: 500,
      points: 500,
      order: 2,
      options: [
        { text: 'Năm 1945', isCorrect: false },
        { text: 'Năm 1975', isCorrect: true },
      ],
    });

    // Xuất bản bài thi
    await teacherApi.post(`/quizzes/${subQuizId}/publish`);
  });

  test('TC-STU-014: Học sinh nộp bài thi thành công và chuyển hướng tới trang Kết quả', async ({ page }) => {
    test.skip(!subQuizId, 'Không có đề thi');

    const examPage = new StudentExamPage(page);
    await examPage.gotoDetail(subQuizId);
    await examPage.expectDetailLoaded();

    await examPage.startExamFromDetail();
    await examPage.expectTakingLoaded();

    // Câu 1: Chọn đúng (Năm 1954 -> +500 điểm)
    await examPage.selectOptionByText('Năm 1954');

    // Chuyển sang Câu 2
    await examPage.goToNextQuestion();
    await expect(page.locator('text=Chiến dịch Hồ Chí Minh')).toBeVisible({ timeout: 5000 });

    // Câu 2: Chọn sai (Năm 1945 -> 0 điểm)
    await examPage.selectOptionByText('Năm 1945');

    // Mở modal nộp bài và xác nhận
    await examPage.openSubmitModal();
    await examPage.confirmSubmit();

    // Xác nhận toast thành công và chuyển hướng về trang result
    await expect(page).toHaveURL(new RegExp(`/student/quizzes/${subQuizId}/result`), { timeout: 15000 });
  });

  test('TC-STU-015: Chặn nộp bài trùng lặp / hết lượt làm bài (totalAttempts = 1)', async () => {
    test.skip(!subQuizId, 'Không có đề thi');

    // Học sinh thử gọi lại API startQuiz
    const startRes = await studentApi.post(`/quizzes/${subQuizId}/start`);
    expect(startRes.status).toBe(400);
    expect(startRes.body?.message).toContain('Bạn đã hết số lần làm bài cho phép');

    // Học sinh thử gọi lại API submitQuiz
    const submitRes = await studentApi.post(`/quizzes/${subQuizId}/submit`, {
      answers: [],
      timeUsedSeconds: 60,
    });
    expect(submitRes.status).toBe(400);
    expect(submitRes.body?.message).toContain('Bạn đã hết số lần làm bài cho phép');
  });

  test('TC-STU-016: Hệ thống tính toán điểm số chính xác dựa trên câu trả lời', async ({ page }) => {
    test.skip(!subQuizId, 'Không có đề thi');

    const resultPage = new StudentResultPage(page);
    await resultPage.goto(subQuizId);
    await resultPage.expectLoaded();

    // Câu 1 đúng (+5.00 điểm), Câu 2 sai (0 điểm) -> Điểm số là 5.00, tỷ lệ 50%
    await expect(resultPage.scoreNumber).toHaveText('5.00');
    await expect(resultPage.percentageBadge).toContainText('50%');

    // Kiểm tra số câu đúng / sai
    await expect(resultPage.correctCountCard).toContainText('1 câu');
    await expect(resultPage.wrongCountCard).toContainText('1 câu');
  });
});

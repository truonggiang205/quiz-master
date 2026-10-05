import { test, expect } from '@playwright/test';
import { STORAGE_PATHS, TEST_USERS } from '../../utils/constants';
import { QuestionBankPage } from '../../pages/teacher/question-bank.page';
import { QuizFormPage } from '../../pages/teacher/quiz-form.page';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Teacher Module — Question Bank', () => {
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  let apiHelper: ApiHelper;

  test.beforeAll(async () => {
    apiHelper = await ApiHelper.create(undefined, 'TEACHER');
    await apiHelper.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
  });

  test('TC-TCH-011: Giáo viên xem danh sách Ngân hàng câu hỏi và lọc theo môn học', async ({ page }) => {
    const bankPage = new QuestionBankPage(page);
    await bankPage.goto();
    await bankPage.expectLoaded();

    await expect(bankPage.subjectsSidebar).toBeVisible();
    await expect(bankPage.questionsList).toBeVisible();
  });

  test('TC-TCH-012: Giáo viên lưu câu hỏi từ form soạn đề vào Ngân hàng câu hỏi', async ({ page }) => {
    const quizFormPage = new QuizFormPage(page);
    const bankPage = new QuestionBankPage(page);

    const timestamp = Date.now();
    const bankQContent = `E2E Bank Question ${timestamp}`;

    // 1. Mở trang tạo bài thi
    await quizFormPage.gotoCreate();
    await quizFormPage.expectLoaded();

    // 2. Soạn câu hỏi
    await quizFormPage.fillQuestion(0, bankQContent, [
      'Lựa chọn A đúng',
      'Lựa chọn B sai',
      'Lựa chọn C sai',
      'Lựa chọn D sai',
    ]);

    // 3. Nhấp icon Lưu vào ngân hàng
    await quizFormPage.saveQuestionToBank(0);
    await quizFormPage.expectToast(/Đã lưu câu hỏi vào ngân hàng/i);

    // 4. Mở trang /teacher/bank và xác nhận câu hỏi đã xuất hiện
    await bankPage.goto();
    await bankPage.expectLoaded();
    const qItem = bankPage.getQuestionItem(bankQContent);
    await expect(qItem).toBeVisible({ timeout: 10000 });
  });

  test('TC-TCH-013: Giáo viên nhập câu hỏi từ Ngân hàng câu hỏi vào bài kiểm tra mới', async ({ page }) => {
    const quizFormPage = new QuizFormPage(page);

    // Đảm bảo có ít nhất 1 câu hỏi trong ngân hàng trước khi test
    const timestamp = Date.now();
    const sampleBankContent = `E2E Pre-seeded Bank Q ${timestamp}`;
    const res = await apiHelper.post('/questions/bank', {
      content: sampleBankContent,
      type: 'SINGLE_CHOICE',
      score: 2,
      subject: 'Toán Học',
      options: [
        { text: 'Đáp án 1', isCorrect: true },
        { text: 'Đáp án 2', isCorrect: false },
      ],
    });
    expect(res.status).toBe(201);

    // Mở trang tạo đề
    await quizFormPage.gotoCreate();
    await quizFormPage.expectLoaded();

    // Bấm Nhập từ Ngân hàng
    await quizFormPage.importFromBankBtn.click();
    await expect(quizFormPage.bankModal).toBeVisible({ timeout: 5000 });

    // Chọn checkbox của câu hỏi vừa tạo
    const targetRow = quizFormPage.bankModal.locator('label').filter({ hasText: sampleBankContent }).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });
    await targetRow.locator('input[type="checkbox"]').check();

    // Nhấp nút nhập câu hỏi
    await quizFormPage.bankModalImportBtn.click();
    await quizFormPage.expectToast(/Đã nhập .* câu hỏi từ ngân hàng/i);

    // Xác nhận nội dung câu hỏi đã chèn vào QuestionBuilder
    await expect(page.locator(`textarea:has-text("${sampleBankContent}")`).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-TCH-014: Giáo viên xóa câu hỏi khỏi Ngân hàng câu hỏi kèm Modal xác nhận', async ({ page }) => {
    const bankPage = new QuestionBankPage(page);

    // Chuẩn bị câu hỏi ngân hàng cần xóa
    const timestamp = Date.now();
    const deleteQContent = `E2E Question ToDelete ${timestamp}`;
    const res = await apiHelper.post('/questions/bank', {
      content: deleteQContent,
      type: 'SINGLE_CHOICE',
      score: 2,
      subject: 'Toán Học',
      options: [
        { text: 'Đáp án A', isCorrect: true },
        { text: 'Đáp án B', isCorrect: false },
      ],
    });
    expect(res.status).toBe(201);

    await bankPage.goto();
    await bankPage.expectLoaded();

    const qItem = bankPage.getQuestionItem(deleteQContent);
    await expect(qItem).toBeVisible({ timeout: 10000 });

    // 1. Thử xóa nhưng Hủy
    await bankPage.deleteQuestion(deleteQContent);
    await bankPage.cancelDelete();
    await expect(qItem).toBeVisible();

    // 2. Xóa và Xác nhận
    await bankPage.deleteQuestion(deleteQContent);
    await bankPage.confirmDelete();
    await bankPage.expectToast(/Đã xoá câu hỏi/i);

    // Câu hỏi không còn hiển thị
    await expect(bankPage.getQuestionItem(deleteQContent)).toBeHidden({ timeout: 10000 });
  });
});

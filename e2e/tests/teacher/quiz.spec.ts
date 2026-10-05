import { test, expect } from '@playwright/test';
import { STORAGE_PATHS } from '../../utils/constants';
import { QuizListPage } from '../../pages/teacher/quiz-list.page';
import { QuizFormPage } from '../../pages/teacher/quiz-form.page';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Teacher Module — Quiz Management', () => {
  // Tái sử dụng phiên đăng nhập của Giáo viên từ Batch 1
  test.use({ storageState: STORAGE_PATHS.TEACHER });

  let apiHelper: ApiHelper;
  const createdQuizIds: string[] = [];

  test.beforeAll(async () => {
    apiHelper = await ApiHelper.create(undefined, 'TEACHER');
  });

  test.afterAll(async () => {
    // Cleanup các bài thi đã tạo bằng API helper nếu còn tồn tại
    for (const qId of createdQuizIds) {
      try {
        await apiHelper.delete(`/quizzes/${qId}`);
      } catch {}
    }
  });

  test('TC-TCH-001: Giáo viên mở trang Quản lý bài kiểm tra', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    await quizListPage.goto();
    await quizListPage.expectLoaded();

    await expect(quizListPage.createQuizBtn).toBeVisible();
    await expect(quizListPage.searchInput).toBeVisible();
    await expect(quizListPage.filterAllBtn).toBeVisible();
    await expect(quizListPage.filterPublishedBtn).toBeVisible();
    await expect(quizListPage.filterDraftBtn).toBeVisible();
  });

  test('TC-TCH-002: Giáo viên tạo bài kiểm tra mới đầy đủ thông tin (Lưu bản thảo)', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitle = `E2E Quiz Draft ${timestamp}`;

    await quizFormPage.gotoCreate();
    await quizFormPage.expectLoaded();

    // Điền tiêu đề và mô tả
    await quizFormPage.fillBasicInfo(quizTitle, 'Toán Học', 15, 'Mô tả bài kiểm tra bản thảo E2E');

    // Soạn câu hỏi trắc nghiệm đầu tiên
    await quizFormPage.fillQuestion(0, `Nội dung câu hỏi E2E số 1 - ${timestamp}`, [
      'Phương án A đúng',
      'Phương án B sai',
      'Phương án C sai',
      'Phương án D sai',
    ]);

    // Bấm Lưu bản thảo và chờ điều hướng về /teacher/quizzes
    await quizFormPage.saveDraftAndNavigate();

    // Xác nhận bài thi xuất hiện trong danh sách với trạng thái Bản thảo
    const card = quizListPage.getQuizCard(quizTitle);
    await expect(card).toBeVisible({ timeout: 10000 });
    const badgeText = await quizListPage.getQuizStatusBadge(quizTitle);
    expect(badgeText).toMatch(/Bản thảo/i);

    // Lấy ID để cleanup
    const editLink = await card.getByRole('link', { name: 'Sửa' }).getAttribute('href');
    const matchId = editLink?.match(/\/teacher\/quizzes\/(.*?)\/edit/);
    if (matchId?.[1]) {
      createdQuizIds.push(matchId[1]);
    }
  });

  test('TC-TCH-003: Validation: Báo lỗi khi tạo đề thi để trống tiêu đề', async ({ page }) => {
    const quizFormPage = new QuizFormPage(page);
    await quizFormPage.gotoCreate();
    await quizFormPage.expectLoaded();

    // Xóa trống tiêu đề
    await quizFormPage.titleInput.fill('');
    await quizFormPage.saveDraftBtn.click();

    // Kiểm tra toast báo lỗi
    await quizFormPage.expectToast(/Vui lòng nhập tên bài kiểm tra/i);
    // Vẫn ở trang tạo đề, không bị redirect
    await expect(page).toHaveURL(/\/teacher\/quizzes\/create/);
  });

  test('TC-TCH-004: Validation: Báo lỗi khi câu hỏi chưa chọn đáp án đúng', async ({ page }) => {
    const quizFormPage = new QuizFormPage(page);
    await quizFormPage.gotoCreate();
    await quizFormPage.expectLoaded();

    const timestamp = Date.now();
    await quizFormPage.fillBasicInfo(`E2E Invalid Quiz ${timestamp}`);

    // Đổi sang MULTIPLE_CHOICE để có thể bỏ chọn tất cả đáp án đúng
    await quizFormPage.setQuestionType(0, 'MULTIPLE_CHOICE');

    // Bỏ chọn đáp án A đang được chọn mặc định
    const checkedOption = page.locator('button[title="Đáp án đúng"]').first();
    await checkedOption.click();

    // Bấm Lưu bản thảo
    await quizFormPage.saveDraftBtn.click();
    await quizFormPage.expectToast(/Chưa chọn đáp án đúng/i);
  });

  test('TC-TCH-005: Giáo viên chỉnh sửa tiêu đề và thời lượng đề thi đã tạo', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const initialTitle = `E2E Quiz ToEdit ${timestamp}`;
    const updatedTitle = `E2E Quiz Updated ${timestamp}`;

    // Tạo đề thi ban đầu qua UI
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(initialTitle);
    await quizFormPage.saveDraftAndNavigate();

    // Bấm nút Sửa
    await quizListPage.clickEdit(initialTitle);
    await quizFormPage.expectLoaded();

    // Chờ dữ liệu bài thi VÀ câu hỏi được load đầy đủ vào form
    await expect(quizFormPage.titleInput).toHaveValue(initialTitle, { timeout: 10000 });
    await expect(page.locator('textarea[placeholder="Nhập nội dung câu hỏi..."]').first()).toBeVisible({ timeout: 10000 });

    // Cập nhật tiêu đề mới
    await quizFormPage.titleInput.fill(updatedTitle);
    await expect(quizFormPage.titleInput).toHaveValue(updatedTitle);

    // Lưu và chờ toast "Cập nhật thành công"
    await quizFormPage.saveDraftBtn.click();
    await quizFormPage.expectToast(/Cập nhật thành công/i);
    await page.waitForURL('**/teacher/quizzes', { timeout: 15000 });

    // Kiểm tra danh sách hiển thị tiêu đề mới
    const updatedCard = quizListPage.getQuizCard(updatedTitle);
    await expect(updatedCard).toBeVisible({ timeout: 10000 });

    const editLink = await updatedCard.getByRole('link', { name: 'Sửa' }).getAttribute('href');
    const matchId = editLink?.match(/\/teacher\/quizzes\/(.*?)\/edit/);
    if (matchId?.[1]) createdQuizIds.push(matchId[1]);
  });

  test('TC-TCH-006: Giáo viên xuất bản đề thi (Publish Quiz)', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitle = `E2E Quiz Publish ${timestamp}`;

    // Tạo đề thi và bấm "Xuất bản ngay"
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(quizTitle);
    await quizFormPage.publishImmediatelyAndNavigate();

    // Kiểm tra thẻ bài thi có trạng thái "Đã xuất bản" và nút "Đang mở"
    const card = quizListPage.getQuizCard(quizTitle);
    await expect(card).toBeVisible();
    const badgeText = await quizListPage.getQuizStatusBadge(quizTitle);
    expect(badgeText).toMatch(/Đã xuất bản/i);

    const editLink = await card.getByRole('link', { name: 'Sửa' }).getAttribute('href');
    const matchId = editLink?.match(/\/teacher\/quizzes\/(.*?)\/edit/);
    if (matchId?.[1]) createdQuizIds.push(matchId[1]);
  });

  test('TC-TCH-007: Giáo viên gỡ đề thi về trạng thái bản thảo (Unpublish Quiz)', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitle = `E2E Quiz Unpublish ${timestamp}`;

    // Tạo đề thi xuất bản ngay
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(quizTitle);
    await quizFormPage.publishImmediatelyAndNavigate();

    const card = quizListPage.getQuizCard(quizTitle);
    await expect(card).toBeVisible();

    // Bấm nút chuyển đổi trạng thái để gỡ về bản thảo
    await quizListPage.togglePublish(quizTitle);
    await quizListPage.expectToast(/Đã chuyển đề thi về bản thảo/i);

    // Xác nhận badge chuyển về Bản thảo
    await expect(card.locator('span').filter({ hasText: /Bản thảo/i })).toBeVisible({ timeout: 10000 });

    const editLink = await card.getByRole('link', { name: 'Sửa' }).getAttribute('href');
    const matchId = editLink?.match(/\/teacher\/quizzes\/(.*?)\/edit/);
    if (matchId?.[1]) createdQuizIds.push(matchId[1]);
  });

  test('TC-TCH-008: Giáo viên xem trước đề thi trong chế độ Preview Mode', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitle = `E2E Quiz Preview ${timestamp}`;

    // Tạo đề thi
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(quizTitle);
    await quizFormPage.saveDraftAndNavigate();

    // Nhấp Xem trước
    await quizListPage.clickPreview(quizTitle);

    // Xác nhận vào đúng URL preview và thấy banner chế độ xem trước
    await expect(page).toHaveURL(/\/teacher\/quizzes\/.*\/preview/);
    await expect(page.locator('text=Chế độ xem trước của Giáo viên (Preview Mode)')).toBeVisible();

    // Có link quay về chỉnh sửa
    await expect(page.getByRole('link', { name: 'Trở về chỉnh sửa' })).toBeVisible();
  });

  test('TC-TCH-009: Xóa bài kiểm tra với Modal xác nhận (Cancel vs Confirm)', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitle = `E2E Quiz Delete ${timestamp}`;

    // Tạo đề thi
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(quizTitle);
    await quizFormPage.saveDraftAndNavigate();

    // 1. Nhấp nút xóa -> Modal hiện ra -> Bấm Hủy
    await quizListPage.clickDelete(quizTitle);
    await quizListPage.cancelDelete();
    // Đề thi vẫn phải tồn tại
    await expect(quizListPage.getQuizCard(quizTitle)).toBeVisible();

    // 2. Nhấp nút xóa -> Modal hiện ra -> Xác nhận xóa vĩnh viễn
    await quizListPage.clickDelete(quizTitle);
    await quizListPage.confirmDelete();
    await quizListPage.expectToast(/Đã xóa đề thi thành công/i);

    // Đề thi biến mất khỏi danh sách
    await expect(quizListPage.getQuizCard(quizTitle)).toBeHidden();
  });

  test('TC-TCH-010: Lọc và tìm kiếm bài kiểm tra trên giao diện', async ({ page }) => {
    const quizListPage = new QuizListPage(page);
    const quizFormPage = new QuizFormPage(page);

    const timestamp = Date.now();
    const quizTitleUnique = `E2E UniqueSearch ${timestamp}`;

    // Tạo đề thi
    await quizFormPage.gotoCreate();
    await quizFormPage.fillBasicInfo(quizTitleUnique);
    await quizFormPage.saveDraftAndNavigate();

    // Tìm kiếm bằng từ khóa duy nhất
    await quizListPage.searchQuiz(quizTitleUnique);
    await expect(quizListPage.getQuizCard(quizTitleUnique)).toBeVisible();

    // Tìm kiếm với từ khóa không tồn tại
    await quizListPage.searchQuiz('KHONG_THE_TIM_THAY_KEYWORD_9999');
    await expect(quizListPage.emptyNotice).toBeVisible();

    // Xóa tìm kiếm và thử bộ lọc Bản thảo
    await quizListPage.searchQuiz('');
    await quizListPage.filterDraftBtn.click();
    await expect(quizListPage.getQuizCard(quizTitleUnique)).toBeVisible();

    const editLink = await quizListPage.getQuizCard(quizTitleUnique).getByRole('link', { name: 'Sửa' }).getAttribute('href');
    const matchId = editLink?.match(/\/teacher\/quizzes\/(.*?)\/edit/);
    if (matchId?.[1]) createdQuizIds.push(matchId[1]);
  });
});

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class QuizFormPage extends BasePage {
  readonly pageHeading: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly subjectInput: Locator;
  readonly durationInput: Locator;
  readonly attemptsInput: Locator;
  readonly saveDraftBtn: Locator;
  readonly publishBtn: Locator;
  readonly backToListLink: Locator;

  // QuestionBuilder elements
  readonly addQuestionBtn: Locator;
  readonly importFromBankBtn: Locator;
  readonly questionsContainer: Locator;

  // Bank Modal elements
  readonly bankModal: Locator;
  readonly bankModalImportBtn: Locator;
  readonly bankModalCancelBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator('h2').filter({ hasText: /Thiết Lập Bài Kiểm Tra Mới|Chỉnh Sửa Bài Kiểm Tra/i });
    this.titleInput = page.getByPlaceholder('VD: Kiểm tra Toán Giải Tích 12 - Khảo sát hàm số');
    this.descriptionInput = page.getByPlaceholder('Nhập ghi chú hoặc yêu cầu đối với học sinh...');
    this.subjectInput = page.locator('input').filter({ has: page.locator('xpath=preceding-sibling::label[contains(text(), "Môn học")] | ancestor::div[label[contains(text(), "Môn học")]]/input') }).first();
    this.durationInput = page.locator('input[type="number"]').first();
    this.attemptsInput = page.locator('input[type="number"]').nth(1);

    this.saveDraftBtn = page.getByRole('button', { name: 'Lưu bản thảo' });
    this.publishBtn = page.locator('#publish-quiz-btn, button:has-text("Xuất bản ngay")').first();
    this.backToListLink = page.getByRole('link', { name: 'Quay lại danh sách' });

    this.addQuestionBtn = page.locator('#add-question-btn, button:has-text("Thêm câu hỏi")').first();
    this.importFromBankBtn = page.getByRole('button', { name: 'Nhập từ Ngân hàng' });
    this.questionsContainer = page.locator('.space-y-6');

    this.bankModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Ngân hàng câu hỏi của tôi/i });
    this.bankModalImportBtn = this.bankModal.getByRole('button', { name: /Nhập .* câu hỏi|Nhập câu hỏi/i });
    this.bankModalCancelBtn = this.bankModal.getByRole('button', { name: 'Hủy' });
  }

  async gotoCreate() {
    await this.page.goto('/teacher/quizzes/create');
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/teacher/quizzes/${id}/edit`);
  }

  async expectLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Điền thông tin cơ bản cho đề thi
   */
  async fillBasicInfo(title: string, subject = 'Toán Học', duration = 15, description = '') {
    await this.titleInput.fill(title);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  /**
   * Soạn thảo câu hỏi thứ index (0-based)
   */
  async fillQuestion(index: number, content: string, optionTexts: string[] = ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']) {
    const contentTextarea = this.page.locator('textarea[placeholder="Nhập nội dung câu hỏi..."]').nth(index);
    await expect(contentTextarea).toBeVisible({ timeout: 10000 });
    await contentTextarea.fill(content);

    const optionInputs = this.page.locator('input[placeholder*="Nội dung lựa chọn"]');
    for (let i = 0; i < optionTexts.length; i++) {
      const opt = optionInputs.nth(index * 4 + i);
      if (await opt.isVisible()) {
        await opt.fill(optionTexts[i]);
      }
    }
  }

  /**
   * Đổi loại câu hỏi thứ index (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, ESSAY)
   */
  async setQuestionType(index: number, type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY') {
    const typeSelect = this.page.locator('select').filter({ has: this.page.locator('option[value="SINGLE_CHOICE"]') }).nth(index);
    await typeSelect.selectOption(type);
  }

  /**
   * Lưu câu hỏi thứ index vào Ngân hàng câu hỏi
   */
  async saveQuestionToBank(index: number) {
    const saveBankBtn = this.page.locator('button[title="Lưu vào ngân hàng câu hỏi"]').nth(index);
    await saveBankBtn.click();
  }

  /**
   * Mở modal Ngân hàng câu hỏi và chọn nhập câu hỏi
   */
  async importQuestionsFromBank() {
    await this.importFromBankBtn.click();
    await expect(this.bankModal).toBeVisible({ timeout: 5000 });
    const firstCheckbox = this.bankModal.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await this.bankModalImportBtn.click();
    await expect(this.bankModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Nhấp Lưu bản thảo và chờ điều hướng về danh sách bài thi
   */
  async saveDraftAndNavigate() {
    await this.saveDraftBtn.click();
    await this.expectToast(/thành công|đã tạo|đã lưu/i);
    await this.page.waitForURL('**/teacher/quizzes', { timeout: 15000 });
  }

  /**
   * Nhấp Xuất bản ngay và chờ điều hướng về danh sách bài thi
   */
  async publishImmediatelyAndNavigate() {
    await this.publishBtn.click();
    await this.expectToast(/thành công|đã tạo|xuất bản/i);
    await this.page.waitForURL('**/teacher/quizzes', { timeout: 15000 });
  }
}

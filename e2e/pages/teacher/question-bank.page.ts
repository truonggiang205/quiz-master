import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class QuestionBankPage extends BasePage {
  readonly heading: Locator;
  readonly subjectsSidebar: Locator;
  readonly questionsList: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkDeleteBtn: Locator;
  readonly emptyNotice: Locator;

  // Confirmation modal
  readonly deleteModal: Locator;
  readonly modalConfirmBtn: Locator;
  readonly modalCancelBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Ngân hàng đề' });
    this.subjectsSidebar = page.locator('text=Danh mục môn học').locator('..');
    this.questionsList = page.locator('.flex-1.space-y-4').first();
    this.selectAllCheckbox = page.locator('input[title="Chọn tất cả"]');
    this.bulkDeleteBtn = page.getByRole('button', { name: /Xoá .* mục/i });
    this.emptyNotice = page.locator('text=Chưa có câu hỏi nào trong môn học này');

    this.deleteModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Xoá câu hỏi/i });
    this.modalConfirmBtn = this.deleteModal.getByRole('button', { name: 'Xoá' });
    this.modalCancelBtn = this.deleteModal.getByRole('button', { name: 'Hủy bỏ' });
  }

  async goto() {
    await this.page.goto('/teacher/bank');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Chọn danh mục môn học
   */
  async selectSubject(subjectName: string) {
    await this.page.getByRole('button', { name: subjectName, exact: false }).first().click();
  }

  /**
   * Lấy locator câu hỏi theo nội dung
   */
  getQuestionItem(contentSubstring: string): Locator {
    return this.page.locator('.relative.group.bg-white, .relative.group.bg-slate-800').filter({ hasText: contentSubstring });
  }

  /**
   * Xóa câu hỏi đơn lẻ
   */
  async deleteQuestion(contentSubstring: string) {
    const item = this.getQuestionItem(contentSubstring);
    await item.hover();
    const deleteBtn = item.locator('button[title="Xoá câu hỏi"]');
    await deleteBtn.click({ force: true });
    await expect(this.deleteModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Hủy xóa câu hỏi
   */
  async cancelDelete() {
    await this.modalCancelBtn.click();
    await expect(this.deleteModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Xác nhận xóa câu hỏi
   */
  async confirmDelete() {
    await this.modalConfirmBtn.click();
    await expect(this.deleteModal).toBeHidden({ timeout: 5000 });
  }
}

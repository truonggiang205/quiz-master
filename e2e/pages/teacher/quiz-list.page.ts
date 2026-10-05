import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class QuizListPage extends BasePage {
  readonly heading: Locator;
  readonly createQuizBtn: Locator;
  readonly searchInput: Locator;
  readonly filterAllBtn: Locator;
  readonly filterPublishedBtn: Locator;
  readonly filterDraftBtn: Locator;
  readonly emptyNotice: Locator;

  // Confirmation modal elements
  readonly deleteModal: Locator;
  readonly deleteConfirmBtn: Locator;
  readonly deleteCancelBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Quản Lý Bài Kiểm Tra' });
    this.createQuizBtn = page.locator('#create-new-quiz-btn, a[href="/teacher/quizzes/create"]').first();
    this.searchInput = page.getByPlaceholder('Tìm kiếm bài thi hoặc môn học...');
    this.filterAllBtn = page.locator('.p-1 button').filter({ hasText: /Tất cả/i }).first();
    this.filterPublishedBtn = page.locator('.p-1 button').filter({ hasText: /Đang mở/i }).first();
    this.filterDraftBtn = page.locator('.p-1 button').filter({ hasText: /Bản thảo/i }).first();
    this.emptyNotice = page.locator('text=Không tìm thấy bài kiểm tra nào');

    this.deleteModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Xác nhận xóa bài kiểm tra/i });
    this.deleteConfirmBtn = page.getByRole('button', { name: 'Xóa vĩnh viễn' });
    this.deleteCancelBtn = page.getByRole('button', { name: 'Hủy' });
  }

  async goto() {
    await this.page.goto('/teacher/quizzes');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Lấy locator của thẻ card bài thi theo tiêu đề
   */
  getQuizCard(title: string): Locator {
    return this.page.locator('.p-5, .p-6').filter({ has: this.page.getByRole('heading', { name: title }) });
  }

  /**
   * Lấy trạng thái badge của bài thi
   */
  async getQuizStatusBadge(title: string): Promise<string> {
    const card = this.getQuizCard(title);
    const badge = card.locator('span').filter({ hasText: /Đã xuất bản|Bản thảo/i }).first();
    return (await badge.textContent()) || '';
  }

  /**
   * Chuyển đổi trạng thái Xuất bản / Gỡ bản thảo của bài thi
   */
  async togglePublish(title: string) {
    const card = this.getQuizCard(title);
    const toggleBtn = card.getByRole('button', { name: /Đang mở|Xuất bản/i });
    await toggleBtn.click();
  }

  /**
   * Nhấp nút Xem trước đề thi
   */
  async clickPreview(title: string) {
    const card = this.getQuizCard(title);
    await card.getByRole('link', { name: 'Xem trước' }).click();
  }

  /**
   * Nhấp nút Sửa đề thi
   */
  async clickEdit(title: string) {
    const card = this.getQuizCard(title);
    await card.getByRole('link', { name: 'Sửa' }).click();
  }

  /**
   * Mở modal xóa bài thi
   */
  async clickDelete(title: string) {
    const card = this.getQuizCard(title);
    const deleteBtn = card.locator('button[title="Xóa bài thi"]');
    await deleteBtn.click();
    await expect(this.deleteModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Hủy thao tác xóa
   */
  async cancelDelete() {
    await this.deleteCancelBtn.click();
    await expect(this.deleteModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Xác nhận xóa vĩnh viễn bài thi
   */
  async confirmDelete() {
    await this.deleteConfirmBtn.click();
    await expect(this.deleteModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Tìm kiếm bài thi
   */
  async searchQuiz(term: string) {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(300); // Debounce
  }
}

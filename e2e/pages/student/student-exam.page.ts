import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentExamPage extends BasePage {
  // Detail page locators (/student/quizzes/:id)
  readonly detailTitle: Locator;
  readonly startExamTriggerBtn: Locator;
  readonly startConfirmModal: Locator;
  readonly startConfirmBtn: Locator;

  // Taking page locators (/student/quizzes/:id/take)
  readonly examHeading: Locator;
  readonly topSubmitBtn: Locator;
  readonly bottomSubmitBtn: Locator;
  readonly prevQuestionBtn: Locator;
  readonly nextQuestionBtn: Locator;
  readonly flagBtn: Locator;
  readonly submitModal: Locator;
  readonly modalSubmitConfirmBtn: Locator;
  readonly modalAnsweredCount: Locator;
  readonly modalUnansweredCount: Locator;

  constructor(page: Page) {
    super(page);

    // Detail page
    this.detailTitle = page.locator('h1').first();
    this.startExamTriggerBtn = page.locator('#start-exam-confirm-trigger');
    this.startConfirmModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Xác nhận bắt đầu bài thi/i });
    this.startConfirmBtn = this.startConfirmModal.getByRole('button', { name: /Tôi đã sẵn sàng, bắt đầu!/i });

    // Taking page
    this.examHeading = page.locator('h1').first();
    this.topSubmitBtn = page.locator('#finish-exam-top-btn');
    this.bottomSubmitBtn = page.locator('#submit-exam-bottom-btn');
    this.prevQuestionBtn = page.locator('#prev-question-btn');
    this.nextQuestionBtn = page.locator('#next-question-btn');
    this.flagBtn = page.locator('button[aria-label*="cờ câu hỏi"]');

    // Submit modal
    this.submitModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Bạn có chắc muốn nộp bài thi\?/i });
    this.modalSubmitConfirmBtn = this.submitModal.getByRole('button', { name: /Xác nhận nộp bài/i });
    this.modalAnsweredCount = this.submitModal.locator('span:has-text("Đã trả lời")').locator('..').locator('span').first();
    this.modalUnansweredCount = this.submitModal.locator('span:has-text("Chưa trả lời")').locator('..').locator('span').first();
  }

  async gotoDetail(quizId: string) {
    await this.page.goto(`/student/quizzes/${quizId}`);
  }

  async expectDetailLoaded() {
    await expect(this.detailTitle).toBeVisible({ timeout: 15000 });
  }

  async startExamFromDetail() {
    await this.startExamTriggerBtn.click();
    await expect(this.startConfirmModal).toBeVisible({ timeout: 5000 });
    await this.startConfirmBtn.click();
  }

  async expectTakingLoaded() {
    await expect(this.topSubmitBtn).toBeVisible({ timeout: 15000 });
  }

  /**
   * Chọn option theo text hoặc index
   */
  async selectOptionByText(text: string) {
    const optBtn = this.page.locator('button[id^="option-card-"]').filter({ hasText: text }).first();
    await expect(optBtn).toBeVisible({ timeout: 5000 });
    await optBtn.click();
  }

  async selectOptionByIndex(index: number) {
    const optBtn = this.page.locator('button[id^="option-card-"]').nth(index);
    await expect(optBtn).toBeVisible({ timeout: 5000 });
    await optBtn.click();
  }

  async goToNextQuestion() {
    await this.nextQuestionBtn.click();
  }

  async goToPrevQuestion() {
    await this.prevQuestionBtn.click();
  }

  async openSubmitModal() {
    if (await this.bottomSubmitBtn.isVisible()) {
      await this.bottomSubmitBtn.click();
    } else {
      await this.topSubmitBtn.click();
    }
    await expect(this.submitModal).toBeVisible({ timeout: 5000 });
  }

  async confirmSubmit() {
    await this.modalSubmitConfirmBtn.click();
  }
}

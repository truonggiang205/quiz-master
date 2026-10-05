import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentQuizPage extends BasePage {
  readonly heading: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1').filter({ hasText: /Danh Sách Bài Thi Khả Dụng/i });
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm bài thi"]');
  }

  async goto() {
    await this.page.goto('/student/quizzes');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async searchQuiz(query: string) {
    await this.searchInput.fill(query);
  }

  async filterSubject(subject: string) {
    await this.page.getByRole('button', { name: subject, exact: false }).first().click();
  }

  getQuizCard(quizTitle: string): Locator {
    return this.page.locator('.group').filter({ hasText: quizTitle }).first();
  }

  async openQuizDetail(quizId: string) {
    const startBtn = this.page.locator(`#start-quiz-btn-${quizId}`);
    await startBtn.click();
  }
}

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentDashboardPage extends BasePage {
  readonly heroHeading: Locator;
  readonly welcomeSubtitle: Locator;
  readonly viewAllQuizzesBtn: Locator;
  readonly statAvailableCard: Locator;
  readonly statCompletedCard: Locator;
  readonly statAvgScoreCard: Locator;
  readonly statHighestScoreCard: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1').filter({ hasText: /Chào mừng/i });
    this.welcomeSubtitle = page.locator('p').filter({ hasText: /bài kiểm tra.*đang sẵn sàng/i });
    this.viewAllQuizzesBtn = page.locator('#student-dashboard-quizzes-btn');
    this.statAvailableCard = page.locator('span').filter({ hasText: /^Bài thi khả dụng$/i }).first();
    this.statCompletedCard = page.locator('span').filter({ hasText: /^Bài đã hoàn thành$/i }).first();
    this.statAvgScoreCard = page.locator('span').filter({ hasText: /^Điểm trung bình$/i }).first();
    this.statHighestScoreCard = page.locator('span').filter({ hasText: /^Điểm cao nhất$/i }).first();
  }

  async goto() {
    await this.page.goto('/student/dashboard');
  }

  async expectLoaded() {
    await expect(this.heroHeading).toBeVisible({ timeout: 15000 });
  }
}

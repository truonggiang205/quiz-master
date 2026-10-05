import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherDashboardPage extends BasePage {
  readonly heading: Locator;
  readonly createQuizBtn: Locator;
  readonly manageQuizzesBtn: Locator;
  readonly totalQuizzesCard: Locator;
  readonly activeQuizzesCard: Locator;
  readonly totalStudentsCard: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.createQuizBtn = page.locator('#dashboard-create-quiz-btn, a[href="/teacher/quizzes/create"]').first();
    this.manageQuizzesBtn = page.getByRole('link', { name: 'Quản lý đề thi' });
    this.totalQuizzesCard = page.locator('text=Tổng bài kiểm tra');
    this.activeQuizzesCard = page.locator('text=Bài đang hoạt động');
    this.totalStudentsCard = page.locator('text=Học sinh tham gia');
  }

  async goto() {
    await this.page.goto('/teacher/dashboard');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
    await expect(this.heading).toContainText(/Xin chào/i);
  }
}

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentResultPage extends BasePage {
  readonly resultHeading: Locator;
  readonly scoreNumber: Locator;
  readonly percentageBadge: Locator;
  readonly correctCountCard: Locator;
  readonly wrongCountCard: Locator;
  readonly unansweredCountCard: Locator;
  readonly timeUsedCard: Locator;
  readonly answerDetailsSection: Locator;
  readonly appealBtn: Locator;
  readonly backToDeskLink: Locator;

  constructor(page: Page) {
    super(page);
    this.resultHeading = page.locator('h1').filter({ hasText: /Kết Quả Bài Thi/i });
    this.scoreNumber = page.locator('.text-4xl, .text-5xl').first();
    this.percentageBadge = page.locator('div').filter({ hasText: /^Đạt \d+%/i }).first();
    this.correctCountCard = page.locator('span').filter({ hasText: /^Số câu đúng$/i }).locator('..');
    this.wrongCountCard = page.locator('span').filter({ hasText: /^Số câu sai$/i }).locator('..');
    this.unansweredCountCard = page.locator('span').filter({ hasText: /^Chưa trả lời$/i }).locator('..');
    this.timeUsedCard = page.locator('span').filter({ hasText: /^Thời gian làm bài$/i }).locator('..');
    this.answerDetailsSection = page.locator('h3').filter({ hasText: /Chi tiết câu hỏi & Lời giải/i });
    this.appealBtn = page.getByRole('button', { name: /Yêu cầu phúc khảo/i });
    this.backToDeskLink = page.getByRole('link', { name: /Quay lại bàn học/i });
  }

  async goto(quizId: string, submissionId?: string) {
    const url = submissionId
      ? `/student/quizzes/${quizId}/result?submissionId=${submissionId}`
      : `/student/quizzes/${quizId}/result`;
    await this.page.goto(url);
  }

  async expectLoaded() {
    await expect(this.resultHeading).toBeVisible({ timeout: 15000 });
  }
}

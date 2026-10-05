import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentClassroomPage extends BasePage {
  readonly heading: Locator;
  readonly openJoinModalBtn: Locator;
  readonly joinModal: Locator;
  readonly inviteCodeInput: Locator;
  readonly submitJoinBtn: Locator;
  readonly cancelJoinBtn: Locator;

  // Detail view locators
  readonly detailHeading: Locator;
  readonly teacherInfoCard: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1').filter({ hasText: /Lớp học của tôi/i });
    this.openJoinModalBtn = page.getByRole('button', { name: /Tham gia lớp|Nhập mã lớp học/i }).first();
    this.joinModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Tham gia lớp học/i });
    this.inviteCodeInput = this.joinModal.locator('input[placeholder*="MATH-A8F2"]');
    this.submitJoinBtn = this.joinModal.getByRole('button', { name: /Tham gia ngay/i });
    this.cancelJoinBtn = this.joinModal.getByRole('button', { name: /Hủy/i });

    this.detailHeading = page.locator('h1').first();
    this.teacherInfoCard = page.locator('text=Giáo viên phụ trách').locator('..');
  }

  async goto() {
    await this.page.goto('/student/classrooms');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async openJoinModal() {
    await this.openJoinModalBtn.click();
    await expect(this.joinModal).toBeVisible({ timeout: 5000 });
  }

  async submitInviteCode(code: string) {
    await this.inviteCodeInput.fill(code);
    await this.submitJoinBtn.click();
  }

  getClassroomCard(className: string): Locator {
    return this.page.locator('.group.relative').filter({ hasText: className }).first();
  }

  async enterClassroom(classId: string) {
    const link = this.page.locator(`a[href="/student/classrooms/${classId}"]`);
    await link.click();
  }
}

import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly toastContainer: Locator;
  readonly toastHeading: Locator;
  readonly confirmModal: Locator;
  readonly modalConfirmBtn: Locator;
  readonly modalCancelBtn: Locator;
  readonly themeToggleBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastContainer = page.locator('.fixed.top-5, .fixed.bottom-5, [role="alert"]').first();
    this.toastHeading = this.toastContainer.locator('h4');
    this.confirmModal = page.locator('[role="dialog"], .fixed.inset-0.z-50');
    this.modalConfirmBtn = page.getByRole('button', { name: /xác nhận|đồng ý|tiếp tục|xóa|lưu/i });
    this.modalCancelBtn = page.getByRole('button', { name: /hủy|đóng|quay lại/i });
    this.themeToggleBtn = page.locator('button').filter({ has: page.locator('svg.lucide-sun, svg.lucide-moon') }).first();
  }

  /**
   * Chờ toast thông báo xuất hiện
   */
  async expectToast(messagePattern?: string | RegExp, timeout = 7000) {
    await expect(this.toastContainer).toBeVisible({ timeout });
    if (messagePattern) {
      await expect(this.toastContainer).toContainText(messagePattern, { timeout });
    }
  }

  /**
   * Xác nhận trên hộp thoại modal (Confirm)
   */
  async confirmModalAction() {
    await expect(this.modalConfirmBtn).toBeVisible({ timeout: 5000 });
    await this.modalConfirmBtn.click();
  }

  /**
   * Đổi giao diện Sáng / Tối
   */
  async toggleTheme() {
    await this.themeToggleBtn.click();
  }
}

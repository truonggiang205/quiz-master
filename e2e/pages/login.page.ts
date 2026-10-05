import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordButton: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
    this.forgotPasswordButton = page.getByRole('button', { name: /Quên mật khẩu/i });
    this.registerLink = page.getByRole('link', { name: /Đăng ký/i });
  }

  /**
   * Điều hướng trực tiếp đến trang đăng nhập
   */
  async goto() {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Thực hiện điền form và click Đăng nhập
   */
  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  /**
   * Chuyển sang bước Quên mật khẩu
   */
  async clickForgotPassword() {
    await this.forgotPasswordButton.click();
  }
}

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordButton: Locator;
  readonly backToLoginButton: Locator;
  readonly otpInput: Locator;
  readonly newPasswordInput: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"], input[type="text"]').filter({ hasNot: page.locator('input[type="email"]') }).first();
    this.submitButton = page.locator('button[type="submit"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
    this.forgotPasswordButton = page.getByRole('button', { name: /quên mật khẩu/i });
    this.backToLoginButton = page.getByRole('button', { name: /quay lại đăng nhập/i });
    this.otpInput = page.locator('input[placeholder="------"]');
    this.newPasswordInput = page.locator('input[placeholder="••••••"]');
    this.registerLink = page.getByRole('link', { name: /đăng ký/i });
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    // Locate standard password field
    const passField = this.page.locator('input[autoComplete="current-password"]').or(this.page.locator('input[type="password"]')).first();
    await passField.fill(pass);
    await this.submitButton.click();
  }

  async requestForgotPassword(email: string) {
    await this.forgotPasswordButton.click();
    await expect(this.submitButton).toHaveText(/gửi mã khôi phục/i);
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async resetPassword(otp: string, newPass: string) {
    await expect(this.otpInput).toBeVisible({ timeout: 7000 });
    await this.otpInput.fill(otp);
    await this.newPasswordInput.fill(newPass);
    await this.submitButton.click();
  }
}

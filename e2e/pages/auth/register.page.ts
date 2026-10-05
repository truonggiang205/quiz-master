import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class RegisterPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly genderSelect: Locator;
  readonly dobInput: Locator;
  readonly roleStudentBtn: Locator;
  readonly roleTeacherBtn: Locator;
  readonly submitButton: Locator;
  readonly otpInput: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('input[type="text"]').first();
    this.genderSelect = page.locator('select');
    this.dobInput = page.locator('input[type="date"]');
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.roleStudentBtn = page.getByRole('button', { name: /học sinh/i });
    this.roleTeacherBtn = page.getByRole('button', { name: /giáo viên/i });
    this.submitButton = page.locator('button[type="submit"]');
    this.otpInput = page.locator('input[placeholder="------"]');
    this.loginLink = page.getByRole('link', { name: /đăng nhập/i });
  }

  async goto() {
    await this.page.goto('/register');
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
  }

  async fillRegisterForm(data: {
    name: string;
    email: string;
    password: string;
    role?: 'STUDENT' | 'TEACHER';
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dob?: string;
  }) {
    if (data.role === 'TEACHER') {
      await this.roleTeacherBtn.click();
    } else {
      await this.roleStudentBtn.click();
    }
    await this.nameInput.fill(data.name);
    await this.genderSelect.selectOption(data.gender || 'MALE');
    await this.dobInput.fill(data.dob || '2000-01-01');
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }

  async submitOtp(otp: string) {
    await expect(this.otpInput).toBeVisible({ timeout: 10000 });
    await this.otpInput.fill(otp);
    await this.submitButton.click();
  }
}

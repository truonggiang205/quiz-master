import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ClassroomPage extends BasePage {
  readonly heading: Locator;
  readonly createBtn: Locator;
  readonly tabAll: Locator;
  readonly tabClass: Locator;
  readonly tabPrivate: Locator;

  // Create Modal elements
  readonly createModal: Locator;
  readonly typeGroupBtn: Locator;
  readonly typePrivateBtn: Locator;
  readonly nameInput: Locator;
  readonly subjectInput: Locator;
  readonly descriptionInput: Locator;
  readonly modalSubmitBtn: Locator;
  readonly modalCancelBtn: Locator;

  // Detail Page elements
  readonly detailHeading: Locator;
  readonly detailInviteCodeBadge: Locator;
  readonly studentList: Locator;
  readonly removeStudentModal: Locator;
  readonly confirmRemoveStudentBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Khóa Học của tôi' });
    this.createBtn = page.getByRole('button', { name: 'Tạo mới' });
    this.tabAll = page.getByRole('button', { name: /Tất cả/i });
    this.tabClass = page.getByRole('button', { name: /Lớp học nhóm/i });
    this.tabPrivate = page.getByRole('button', { name: /Kèm 1-1/i });

    this.createModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Tạo khóa học mới/i });
    this.typeGroupBtn = this.createModal.getByRole('button', { name: /Lớp nhóm/i });
    this.typePrivateBtn = this.createModal.getByRole('button', { name: /Kèm 1-1/i });
    this.nameInput = this.createModal.locator('input[placeholder*="VD:"]').first();
    this.subjectInput = this.createModal.locator('input[placeholder*="Toán học, Tiếng Anh"]').first();
    this.descriptionInput = this.createModal.locator('textarea');
    this.modalSubmitBtn = this.createModal.getByRole('button', { name: /Tạo lớp nhóm|Tạo lớp kèm 1-1/i });
    this.modalCancelBtn = this.createModal.getByRole('button', { name: 'Hủy' });

    this.detailHeading = page.locator('h1').first();
    this.detailInviteCodeBadge = page.locator('span.uppercase').first();
    this.studentList = page.locator('ul.divide-y');
    this.removeStudentModal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /Xóa học sinh/i });
    this.confirmRemoveStudentBtn = this.removeStudentModal.getByRole('button', { name: 'Xóa' });
  }

  async goto() {
    await this.page.goto('/teacher/classrooms');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Mở modal và tạo lớp học nhóm mới
   */
  async createGroupClass(name: string, subject = 'Toán Học', description = 'Mô tả lớp học E2E') {
    await this.createBtn.click();
    await expect(this.createModal).toBeVisible({ timeout: 5000 });
    await this.nameInput.fill(name);
    await this.subjectInput.fill(subject);
    await this.descriptionInput.fill(description);
    await this.modalSubmitBtn.click();
    await expect(this.createModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Lấy thẻ lớp học theo tên
   */
  getClassCard(name: string): Locator {
    return this.page.locator('.group.bg-white, .group.bg-slate-900').filter({ hasText: name });
  }

  /**
   * Lấy mã mời inviteCode hiển thị trên thẻ lớp
   */
  async getCardInviteCode(name: string): Promise<string> {
    const card = this.getClassCard(name);
    const codeEl = card.locator('code');
    return (await codeEl.textContent())?.trim() || '';
  }

  /**
   * Nhấp "Quản lý lớp" để vào trang chi tiết
   */
  async openClassDetail(name: string) {
    const card = this.getClassCard(name);
    await card.getByRole('link', { name: 'Quản lý lớp' }).click();
  }

  /**
   * Xóa học sinh khỏi lớp trong trang chi tiết
   */
  async removeStudentFromClass(studentName: string) {
    const studentRow = this.studentList.locator('li').filter({ hasText: studentName });
    const removeBtn = studentRow.locator('button[title="Xóa khỏi lớp"]');
    await removeBtn.click();
    await expect(this.removeStudentModal).toBeVisible({ timeout: 5000 });
    await this.confirmRemoveStudentBtn.click();
    await expect(this.removeStudentModal).toBeHidden({ timeout: 5000 });
  }
}

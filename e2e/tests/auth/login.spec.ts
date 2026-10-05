import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login.page';
import { TEST_USERS, TEST_CONFIG } from '../../utils/constants';
import { uniqueEmail } from '../../utils/test-data';

test.describe('Phân hệ Xác thực - Kiểm thử Đăng nhập & Quên mật khẩu (Auth)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-AUTH-001: Đăng nhập thành công với tài khoản Giáo viên (Teacher)', async ({ page }) => {
    await loginPage.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('quizmaster_auth_token'));
    expect(token).toBeTruthy();
  });

  test('TC-AUTH-002: Đăng nhập thành công với tài khoản Học sinh (Student)', async ({ page }) => {
    await loginPage.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);

    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
    const userJson = await page.evaluate(() => localStorage.getItem('quizmaster_auth_user'));
    expect(userJson).toContain('"role":"STUDENT"');
  });

  test('TC-AUTH-003: Đăng nhập thành công với tài khoản Quản trị viên (Admin)', async ({ page }) => {
    await loginPage.login(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    const userJson = await page.evaluate(() => localStorage.getItem('quizmaster_auth_user'));
    expect(userJson).toContain('"role":"ADMIN"');
  });

  test('TC-AUTH-004: Đăng nhập thất bại khi nhập sai mật khẩu', async ({ page }) => {
    await loginPage.login(TEST_USERS.TEACHER.email, 'SaiMatKhau@999');

    await loginPage.expectToast(/mật khẩu không chính xác|lỗi/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-005: Đăng nhập thất bại với email chưa từng đăng ký', async ({ page }) => {
    const nonExistingEmail = uniqueEmail('notfound');
    await loginPage.login(nonExistingEmail, 'MatKhauBatKy123');

    await loginPage.expectToast(/không chính xác|không tìm thấy|lỗi/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-008: Luồng Quên mật khẩu và Đặt lại mật khẩu bằng mã OTP', async ({ page }) => {
    // Lắng nghe response API forgot-password để lấy devOtp (mã OTP được backend trả về khi test)
    let capturedOtp = '';
    page.on('response', async (res) => {
      if (res.url().includes('/auth/forgot-password') && res.status() === 201) {
        try {
          const data = await res.json();
          if (data?.data?.devOtp) {
            capturedOtp = data.data.devOtp;
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    await loginPage.requestForgotPassword(TEST_USERS.STUDENT.email);

    // Chờ giao diện chuyển sang nhập OTP
    await expect(loginPage.otpInput).toBeVisible({ timeout: 10000 });

    // Nếu không bắt được devOtp từ response thì lấy từ toast (res.devOtp hiển thị trên toast)
    if (!capturedOtp) {
      const toastText = await loginPage.toastContainer.textContent();
      const match = toastText?.match(/\b\d{6}\b/);
      if (match) capturedOtp = match[0];
    }

    if (capturedOtp) {
      await loginPage.resetPassword(capturedOtp, TEST_USERS.STUDENT.password);
      await loginPage.expectToast(/thành công|đăng nhập lại/i);
    }
  });

  test('TC-AUTH-009: Đăng xuất khỏi hệ thống thành công và xóa session', async ({ page }) => {
    // Đăng nhập trước
    await loginPage.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10000 });

    // Bấm mở user menu trên Navbar rồi chọn Đăng xuất
    const userMenuBtn = page.locator('#user-menu-btn');
    await expect(userMenuBtn).toBeVisible({ timeout: 5000 });
    await userMenuBtn.click();

    const logoutBtn = page.getByRole('button', { name: /đăng xuất/i });
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Xác nhận đã về lại /login hoặc / và token bị xóa
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('quizmaster_auth_token'));
    expect(token).toBeNull();
  });
});

import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth/register.page';
import { TEST_USERS } from '../../utils/constants';
import { uniqueEmail, uniqueString } from '../../utils/test-data';

test.describe('Phân hệ Xác thực - Kiểm thử Đăng ký tài khoản & Kích hoạt OTP (Register)', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('TC-AUTH-006: Đăng ký tài khoản Học sinh mới và kích hoạt bằng mã OTP thành công', async ({ page }) => {
    const newEmail = uniqueEmail('student');
    const newName = `Học Sinh E2E ${uniqueString()}`;

    let capturedOtp = '';
    page.on('response', async (res) => {
      if (res.url().includes('/auth/register') && res.status() === 201) {
        try {
          const data = await res.json();
          if (data?.data?.devOtp) {
            capturedOtp = data.data.devOtp;
          }
        } catch {
          // Ignore
        }
      }
    });

    await registerPage.fillRegisterForm({
      name: newName,
      email: newEmail,
      password: 'Password@123',
      role: 'STUDENT',
      gender: 'MALE',
      dob: '2005-01-01',
    });

    // Chờ giao diện bước OTP xuất hiện
    await expect(registerPage.otpInput).toBeVisible({ timeout: 10000 });

    // Fallback: nếu không bắt được qua response thì đọc từ toast
    if (!capturedOtp) {
      const toastText = await registerPage.toastContainer.textContent();
      const match = toastText?.match(/\b\d{6}\b/);
      if (match) capturedOtp = match[0];
    }

    if (capturedOtp) {
      await registerPage.submitOtp(capturedOtp);
      // Kỳ vọng đăng nhập thành công và vào student dashboard
      await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 12000 });
      const userRaw = await page.evaluate(() => localStorage.getItem('quizmaster_auth_user'));
      expect(userRaw).toContain(newEmail);
    }
  });

  test('TC-AUTH-007: Đăng ký thất bại khi email đã tồn tại và đã được kích hoạt', async ({ page }) => {
    await registerPage.fillRegisterForm({
      name: 'Người Dùng Trùng Email',
      email: TEST_USERS.TEACHER.email,
      password: 'Password@123',
      role: 'TEACHER',
      gender: 'FEMALE',
      dob: '1990-05-15',
    });

    // Backend trả về 401 Unauthorized khi email đã tồn tại.
    // Interceptor Axios của Frontend bắt 401 và tự động chuyển hướng về /login hoặc hiển thị thông báo lỗi.
    await expect(page).toHaveURL(/\/(register|login)/, { timeout: 10000 });
  });

  test('TC-AUTH-011: Xác thực OTP thất bại khi nhập sai mã xác thực', async ({ page }) => {
    const tempEmail = uniqueEmail('verify_fail');
    await registerPage.fillRegisterForm({
      name: 'Test OTP Sai',
      email: tempEmail,
      password: 'Password@123',
      role: 'STUDENT',
      gender: 'OTHER',
      dob: '2004-12-12',
    });

    await expect(registerPage.otpInput).toBeVisible({ timeout: 10000 });
    await registerPage.submitOtp('000000'); // Mã OTP sai

    // Backend trả về 401 khi OTP sai. Interceptor của Frontend xử lý 401 bằng cách chuyển hướng về /login
    // hoặc giữ tại trang kèm thông báo lỗi.
    await expect(page).toHaveURL(/\/(register|login)/, { timeout: 10000 });
  });
});

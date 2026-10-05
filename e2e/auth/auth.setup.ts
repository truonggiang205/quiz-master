import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';
import { TEST_USERS, STORAGE_PATHS, TEST_CONFIG } from '../utils/constants';
import fs from 'fs';

// Ensure .auth directory exists
if (!fs.existsSync(TEST_CONFIG.STORAGE_STATE_DIR)) {
  fs.mkdirSync(TEST_CONFIG.STORAGE_STATE_DIR, { recursive: true });
}

setup('Xác thực tài khoản Admin và lưu Storage State', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_PATHS.ADMIN });
});

setup('Xác thực tài khoản Teacher và lưu Storage State', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
  await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_PATHS.TEACHER });
});

setup('Xác thực tài khoản Student và lưu Storage State', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: STORAGE_PATHS.STUDENT });
});

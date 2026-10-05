import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './e2e',
  /* Timeout cho mỗi test */
  timeout: 45000,
  /* Chạy song song */
  fullyParallel: true,
  /* Bỏ qua retry ở local, retry 2 lần trên CI */
  retries: process.env.CI ? 2 : 0,
  /* Số lượng workers (2 workers để tránh quá tải CPU/RAM trên local) */
  workers: process.env.CI ? 1 : 2,
  /* Báo cáo */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    // Project 1: Setup authentication storage states
    {
      name: 'setup',
      testMatch: /.*auth\.setup\.ts/,
    },
    // Project 2: Test suite chạy trên Chromium
    {
      name: 'chromium',
      testMatch: /.*tests\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  /* Tự động bật Backend (3333) và Frontend (5173) nếu chưa chạy */
  webServer: [
    {
      command: 'npm --prefix backend run start',
      url: 'http://localhost:3333/api/docs',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'npm --prefix frontend run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});

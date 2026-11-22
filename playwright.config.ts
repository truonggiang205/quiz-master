import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { assertE2eTestEnvironment } from './e2e/utils/test-environment';

dotenv.config({ path: path.resolve(__dirname, '.env') });
assertE2eTestEnvironment();

const backendPort = process.env.E2E_BACKEND_PORT || '3000';
const frontendPort = process.env.E2E_FRONTEND_PORT || '5173';

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
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${frontendPort}`,
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

  /* Backend and frontend use the same explicit local-test ports as API helpers. */
  webServer: [
    {
      command: `sh -c 'DB_HOST="$E2E_DB_HOST" DB_PORT="$E2E_DB_PORT" DB_USERNAME="$E2E_DB_USERNAME" DB_PASSWORD="$E2E_DB_PASSWORD" DB_DATABASE="$E2E_DB_DATABASE" DB_SYNCHRONIZE=false NODE_ENV=test PORT=${backendPort} npm --prefix backend run start'`,
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: `VITE_API_URL=http://localhost:${backendPort}/api npm --prefix frontend run dev -- --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});

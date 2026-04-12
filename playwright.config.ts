import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
});

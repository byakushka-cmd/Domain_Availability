import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Local runs read WIX_API_KEY from .env; CI can set the variable directly.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  testDir: 'tests',
  // One worker keeps the API call counter exact and the load on Wix minimal.
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'api',
      testDir: 'tests/api',
      // API traces would record the Authorization header.
      use: { trace: 'off' },
    },
    {
      name: 'web',
      testDir: 'tests/web',
      // WHOIS answers after about 15 seconds (observations, section 3).
      timeout: 60_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.wix.com',
        trace: 'retain-on-failure',
      },
    },
  ],
});

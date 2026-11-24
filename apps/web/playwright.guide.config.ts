import { defineConfig } from '@playwright/test';

// Captures the user-guide screenshots into public/guide. Kept out of the e2e
// suite (its own testDir): it seeds a demo account and writes image files, it
// doesn't assert behaviour. Run: pnpm --filter @gastapp/web guide:screenshots
export default defineConfig({
  testDir: './guide-screenshots',
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    timezoneId: 'America/New_York',
    locale: 'en-US',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: '../..', // repo root so pnpm -r dev starts web + api together
    timeout: 120_000,
  },
});

import { test, expect } from '@playwright/test';

// Toolchain smoke test: proves Playwright + web + API + Postgres all work
// together. Uses fully synthetic data.
const email = `qa-smoke+${Date.now()}@example.com`;
const password = 'QaSmoke123!';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('register reaches the dashboard (full stack round-trip)', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Name').fill('QA Smoke');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');
  await expect(page.getByLabel('Email')).toHaveCount(0);
});

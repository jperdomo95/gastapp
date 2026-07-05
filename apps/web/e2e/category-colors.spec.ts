import { test, expect } from '@playwright/test';

// Regression: the by-category report didn't return category colors, so every
// custom category collapsed to the same fallback hue on the dashboard.
const email = `qa-colors+${Date.now()}@example.com`;
const password = 'QaColors123!';

test('dashboard breakdown uses each category\'s own color', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Name').fill('QA Colors');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');

  // Seed two custom categories with far-apart colors and one expense each,
  // through the app's own API (the browser context carries the auth cookie).
  const { accessToken } = await (
    await page.request.post('http://localhost:3001/api/auth/refresh')
  ).json();
  const headers = { Authorization: `Bearer ${accessToken}` };

  const mk = async (name: string, color: string, amount: string) => {
    const cat = await (
      await page.request.post('http://localhost:3001/api/categories', {
        headers,
        data: { name, color },
      })
    ).json();
    await page.request.post('http://localhost:3001/api/expenses', {
      headers,
      data: {
        amount,
        currency: 'USD',
        description: `QA ${name}`,
        date: new Date().toISOString(),
        categoryId: cat.id,
      },
    });
  };
  await mk('QA Rojo', '#e11d48', '90.00');
  await mk('QA Verde', '#16a34a', '60.00');

  await page.reload();
  const byCategory = page.locator('text=By category').locator('..');
  await expect(byCategory.getByText('QA Rojo')).toBeVisible();

  // The legend dot next to each category name must carry that category's hue.
  const dotColor = async (name: string) =>
    byCategory
      .getByText(name)
      .locator('xpath=preceding-sibling::span[1]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

  const rojo = await dotColor('QA Rojo');
  const verde = await dotColor('QA Verde');
  expect(rojo).not.toBe(verde);
});

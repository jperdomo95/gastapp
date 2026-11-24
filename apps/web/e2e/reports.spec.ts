import { test, expect, request } from '@playwright/test';

// Regression: the Reports page sent ISO timestamps as its date range, which
// the reports API (calendar days, YYYY-MM-DD) rejects with 400, so every
// report showed $0 and no merchants.
const email = `qa-reports+${Date.now()}@example.com`;
const password = 'QaReports123!';
const API = 'http://localhost:3001/api/';

test('shows this month\'s spending and top merchants', async ({ page }) => {
  const anon = await request.newContext({ baseURL: API });
  const reg = await anon.post('auth/register', { data: { name: 'QA Reports', email, password } });
  expect(reg.ok()).toBeTruthy();
  const api = await request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${(await reg.json()).accessToken}` },
  });
  const categories: Array<{ id: string; name: string }> = await (await api.get('categories')).json();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const created = await api.post('expenses', {
    data: {
      amount: '42.50', date: today, description: 'QA BOOKSHOP',
      categoryId: categories.find((c) => c.name === 'Shopping')!.id,
    },
  });
  expect(created.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');

  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByText('Top merchants', { exact: true })).toBeVisible();
  await expect(page.getByText('QA BOOKSHOP')).toBeVisible();
  await expect(page.getByText('$42.50').first()).toBeVisible();
});

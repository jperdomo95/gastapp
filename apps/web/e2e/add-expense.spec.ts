import { test, expect } from '@playwright/test';

// Regression for the add-expense dialog: it used to render two Dialog.Content
// nodes (desktop + mobile), which made Radix dismiss it immediately on open,
// and the desktop variant had no way to enter an amount at all.
const email = `qa-addexp+${Date.now()}@example.com`;
const password = 'QaAddExp123!';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/register');
  await page.getByLabel('Name').fill('QA AddExpense');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');
  await page.close();
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');
}

test('desktop: dialog stays open and expense can be added', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'New expense' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The old bug closed the dialog within the first frames — make sure it stays.
  await page.waitForTimeout(500);
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Amount').fill('12.34');
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByLabel('Note').fill('QA synthetic espresso');
  await dialog.getByRole('button', { name: 'Add expense' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('QA synthetic espresso')).toBeVisible();
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('bottom sheet keypad flow works', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Add expense' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: '7', exact: true }).click();
    await dialog.getByRole('button', { name: '.', exact: true }).click();
    await dialog.getByRole('button', { name: '5', exact: true }).click();
    await expect(dialog.getByText('$7.5')).toBeVisible();

    await dialog.getByRole('button', { name: 'Transport' }).click();
    await dialog.getByRole('button', { name: 'Add expense' }).click();
    await expect(dialog).toBeHidden();
  });
});

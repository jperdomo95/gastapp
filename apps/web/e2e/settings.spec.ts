import { test, expect, type Page } from '@playwright/test';

// Phase 2 of the "this month" timezone fix: the browser's IANA timezone is
// captured at register/login time and stored on the user, and /settings lets
// the user review + override + persist it via a Radix Select backed by
// GET/PATCH /users/me.

async function register(page: Page, email: string, password: string, name: string) {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');
}

test('registering shows the auto-detected timezone already selected, with Save not needed', async ({ page }) => {
  const email = `qa-settings-a+${Date.now()}@example.com`;
  await register(page, email, 'QaSettingsA123!', 'QA Settings A');

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.waitForURL('/settings');

  const detected = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const trigger = page.getByRole('combobox');
  await expect(trigger).toHaveText(detected);
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('changing the timezone and saving persists the new value across reload', async ({ page }) => {
  const email = `qa-settings-b+${Date.now()}@example.com`;
  await register(page, email, 'QaSettingsB123!', 'QA Settings B');

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.waitForURL('/settings');

  const trigger = page.getByRole('combobox');
  const before = await trigger.textContent();

  // Pick a target zone guaranteed to differ from whatever this device auto-detected.
  const target = before === 'Pacific/Kiritimati' ? 'Pacific/Niue' : 'Pacific/Kiritimati';

  const saveButton = page.getByRole('button', { name: 'Save' });
  await expect(saveButton).toBeDisabled();

  await trigger.click();
  const option = page.getByRole('option', { name: target, exact: true });
  await option.scrollIntoViewIfNeeded();
  await option.click();

  await expect(trigger).toHaveText(target);
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(page.getByText('Saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('combobox')).toHaveText(target);
});

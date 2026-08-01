import { test, expect, type Page } from '@playwright/test';

// Covers the whole recurring-expense loop: a subscription materialises real
// Expense rows, pausing stops it, and deleting it leaves the history behind.
const email = `qa-subs+${Date.now()}@example.com`;
const password = 'QaSubs123!';

/** A calendar day `months` months before today, clamped like the API does. */
function monthsAgo(months: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  const day = Math.min(now.getUTCDate(), new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate());
  d.setUTCDate(day);
  return d.toISOString().slice(0, 10);
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/register');
  await page.getByLabel('Name').fill('QA Subscriptions');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');
  await page.close();
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');
}

async function createSubscription(
  page: Page,
  { name, amount, startDate, backfill }: {
    name: string; amount: string; startDate: string; backfill: boolean;
  },
) {
  await page.getByRole('link', { name: 'Subscriptions' }).click();
  await page.waitForURL('/subscriptions');

  await page.getByRole('button', { name: 'New subscription' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Amount').fill(amount);
  await dialog.getByLabel('Starts').fill(startDate);

  // Two Radix selects in this form: frequency first, then category.
  await dialog.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Entertainment', exact: true }).click();

  if (backfill) {
    await dialog.getByRole('checkbox').check();
  }

  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}

test('a backfilled subscription generates past charges into the ledger', async ({ page }) => {
  await login(page);
  const name = `QA Streaming ${Date.now()}`;
  const startDate = monthsAgo(2);

  await createSubscription(page, { name, amount: '9.99', startDate, backfill: true });

  await expect(page.getByText(name)).toBeVisible();
  // Monthly, starting two months back, so today's period is included: 3 charges.
  await expect(page.getByText('Committed / month')).toBeVisible();

  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.waitForURL('/expenses');
  await page.getByRole('button', { name: 'All time' }).click();

  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(3);
});

test('pausing stops new charges and resuming does not backfill the gap', async ({ page }) => {
  await login(page);
  const name = `QA Paused ${Date.now()}`;

  await createSubscription(page, {
    name, amount: '4.50', startDate: monthsAgo(1), backfill: false,
  });

  await page.getByRole('button', { name: `Pause ${name}` }).click();

  // Paused subscriptions leave the Active filter.
  await expect(page.getByText(name)).toBeHidden();
  await page.getByRole('button', { name: 'Paused' }).click();
  await expect(page.getByText(name)).toBeVisible();

  await page.getByRole('button', { name: `Resume ${name}` }).click();
  await expect(page.getByText(name)).toBeHidden();

  // Backfill was off, so only the period due today was ever charged — and
  // resuming re-anchors forward rather than filling in the paused gap, so the
  // count is unchanged.
  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.waitForURL('/expenses');
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.getByText(name)).toHaveCount(1);
});

test('deleting a subscription keeps the expenses it already generated', async ({ page }) => {
  await login(page);
  const name = `QA Doomed ${Date.now()}`;

  await createSubscription(page, {
    name, amount: '7.25', startDate: monthsAgo(1), backfill: true,
  });

  await page.getByRole('button', { name: `Delete ${name}` }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText(name)).toBeHidden();

  // Past charges survive the delete — historical months keep their totals.
  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.waitForURL('/expenses');
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.getByText(name).first()).toBeVisible();
});

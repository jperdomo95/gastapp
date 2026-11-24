import { test, expect, request, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Seeds a throwaway demo account with synthetic data (invented merchants and
// amounts, dated relative to today) and captures every screenshot the guide
// uses, in light and dark. Output: public/guide/<name>-<theme>.png.

const API = process.env.GUIDE_API_URL ?? 'http://localhost:3001/api';
const TZ = 'America/New_York';
const OUT = fileURLToPath(new URL('../public/guide', import.meta.url));
const email = `guide-demo+${Date.now()}@example.com`;
const password = 'GuideDemo123!';

// --- Calendar helpers (YYYY-MM-DD strings, like the app) ---------------------

const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const fmt = (t: Date) => t.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const [y, m, day] = parts(d);
  return fmt(new Date(Date.UTC(y, m - 1, day + n)));
};
/** Same day of month, `n` months earlier, clamped into short months. */
const monthsBefore = (d: string, n: number) => {
  const [y, m, day] = parts(d);
  const last = new Date(Date.UTC(y, m - 1 - n + 1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(y, m - 1 - n, Math.min(day, last))));
};
const dayOf = (d: string) => parts(d)[2];

/** Deterministic pseudo-random numbers, so every run draws the same ledger. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Seeding -----------------------------------------------------------------

async function seed(api: APIRequestContext) {
  const post = async (url: string, data: unknown) => {
    const res = await api.post(url, { data });
    expect(res.ok(), `${url}: ${res.status()} ${await res.text()}`).toBeTruthy();
    return res.json();
  };

  const categories: Array<{ id: string; name: string }> = await (await api.get('categories')).json();
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;

  // Payday nine days ago, so the cycle has a pace and a few weeks still to run.
  const payday = addDays(today, -9);
  const from = dayOf(payday);
  const salary = await post('income/sources', {
    name: 'Salary', amount: '3200.00', payDayFrom: from, payDayTo: Math.min(from + 2, 31),
    matchText: 'NOMINA ACME',
  });
  const paydays = [2, 1, 0].map((n) => monthsBefore(payday, n));
  for (const date of paydays) {
    await post('income', { amount: '3200.00', date, sourceId: salary.id, description: 'NOMINA ACME CORP' });
  }

  await post('income/buckets', { name: 'Rent', kind: 'TRANSFER', amount: '950.00', matchText: 'RENT PAYMENT', sortOrder: 0 });
  const savings = await post('income/buckets', {
    name: 'Emergency savings', kind: 'SAVINGS', amount: '300.00', matchText: 'TO SAVINGS', sortOrder: 1,
  });
  await post('income/buckets', { name: 'Card reserve', kind: 'RESERVE', amount: '150.00', sortOrder: 2 });

  const expense = (date: string, amount: number, description: string, category: string) =>
    post('expenses', { amount: amount.toFixed(2), date, description, categoryId: cat(category) });

  const rand = rng(42);
  const start = paydays[0]!;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (paydays.includes(d)) {
      await expense(d, 950, 'RENT PAYMENT LANDLORD', 'Housing');
      await expense(d, 300, 'TRANSFER TO SAVINGS', 'Other');
    }
    if (rand() < 0.35) await expense(d, 28 + Math.round(rand() * 4500) / 100, 'GREENLEAF MARKET', 'Groceries');
    if (rand() < 0.45) await expense(d, 4.75, 'CAFE ORBIT', 'Food & Dining');
    if (rand() < 0.3) await expense(d, 2.9, 'METRO TRANSIT', 'Transport');
    if (rand() < 0.12) await expense(d, 30 + Math.round(rand() * 2500) / 100, 'LUNA TRATTORIA', 'Food & Dining');
    if (rand() < 0.08) await expense(d, 20 + Math.round(rand() * 6000) / 100, 'NORTHWIND OUTFITTERS', 'Shopping');
  }
  // Untracked monthly charges for the recurring-charge finder to suggest.
  for (let n = 4; n >= 0; n--) {
    const d = monthsBefore(addDays(today, -6), n);
    await expense(d, 15.49, 'STREAMFLIX.COM 866 555 0100', 'Entertainment');
    await expense(monthsBefore(addDays(today, -13), n), 2.99, 'CLOUDBOX ONE 650 555 0199', 'Other');
  }

  // Tracked subscriptions, back-filled so their charges are in the ledger.
  await post('subscriptions', {
    name: 'Gym membership', amount: '35.00', frequency: 'MONTHLY',
    startDate: monthsBefore(addDays(today, 4), 3), categoryId: cat('Health'), backfillPastOccurrences: true,
  });
  await post('subscriptions', {
    name: 'Mobile plan', amount: '25.00', frequency: 'MONTHLY',
    startDate: monthsBefore(addDays(today, 8), 3), categoryId: cat('Utilities'), backfillPastOccurrences: true,
  });

  await post('goals', {
    name: 'Emergency fund', targetAmount: '6000.00', baseAmount: '1800.00',
    milestones: ['2500.00', '4000.00'], bucketId: savings.id,
  });
  await post('goals', { name: 'Trip to Lisbon', targetAmount: '2400.00', baseAmount: '650.00', milestones: [] });
}

// --- Capture -----------------------------------------------------------------

async function shot(target: Locator, name: string, theme: string) {
  await target.screenshot({ path: path.join(OUT, `${name}-${theme}.png`), animations: 'disabled' });
}

async function capture(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    localStorage.setItem('pulse-theme', JSON.stringify({ state: { theme: t }, version: 0 }));
  }, theme);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');

  const main = page.locator('main > *').first();
  const settle = () => page.waitForLoadState('networkidle');

  await expect(page.getByText('This paycheck', { exact: true })).toBeVisible();
  await settle();
  await shot(main, 'dashboard', theme);

  await page.goto('/expenses');
  await expect(page.getByText('GREENLEAF MARKET').first()).toBeVisible();
  await settle();
  await shot(main, 'expenses', theme);
  await page.getByRole('button', { name: 'CSV' }).click();
  await shot(page.getByRole('dialog'), 'csv-import', theme);
  await page.keyboard.press('Escape');

  await page.goto('/subscriptions');
  await expect(page.getByText('Found in your expenses', { exact: true })).toBeVisible();
  await settle();
  await shot(main, 'subscriptions', theme);

  await page.goto('/income');
  await expect(page.getByText('Left this pay cycle', { exact: true })).toBeVisible();
  await settle();
  await shot(page.locator('div.rounded-pulse-card', { hasText: 'Left this pay cycle' }).first(), 'income', theme);
  await shot(page.locator('section', { hasText: 'Off the top each payday' }), 'set-asides', theme);

  await page.goto('/savings');
  await expect(page.getByText('Emergency fund', { exact: true }).first()).toBeVisible();
  await settle();
  await shot(main, 'savings', theme);

  // Wait for the data, not just the network: the cards render empty first.
  await page.goto('/reports');
  await expect(page.getByText('Top merchants', { exact: true })).toBeVisible();
  await expect(page.getByText('GREENLEAF MARKET').first()).toBeVisible();
  await settle();
  await shot(main, 'reports', theme);
}

test('capture guide screenshots', async ({ browser }) => {
  const anon = await request.newContext({ baseURL: `${API}/` });
  const reg = await anon.post('auth/register', { data: { name: 'Alex Demo', email, password, timezone: TZ } });
  expect(reg.ok(), await reg.text()).toBeTruthy();
  const { accessToken } = await reg.json();
  const api = await request.newContext({
    baseURL: `${API}/`, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  expect((await api.patch('users/me', { data: { timezone: TZ } })).ok()).toBeTruthy();
  await seed(api);

  for (const theme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 2400 } });
    await capture(await context.newPage(), theme);
    await context.close();
  }
});

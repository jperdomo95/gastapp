// Shared sample data so all three directions show the SAME numbers — only the
// visual treatment differs. (Plain global, loaded before the babel scripts.)
window.GAST = {
  user: 'Marco',
  monthLabel: 'June 2026',
  monthShort: 'JUN 2026',
  thisMonth: 2847.50,
  lastMonth: 3210.00,
  get deltaPct() { return ((this.thisMonth - this.lastMonth) / this.lastMonth) * 100; },
  avgPerDay: 94.92,
  entries: 64,
  budget: 3500,
  // last 6 months outflow (oldest -> newest), current month last
  trend: [
    { m: 'JAN', v: 2980 },
    { m: 'FEB', v: 3120 },
    { m: 'MAR', v: 2640 },
    { m: 'APR', v: 3300 },
    { m: 'MAY', v: 3210 },
    { m: 'JUN', v: 2847 },
  ],
  categories: [
    { name: 'Groceries',     value: 642, hue: 145 },
    { name: 'Health',        value: 525, hue: 200 },
    { name: 'Dining',        value: 498, hue: 28 },
    { name: 'Shopping',      value: 421, hue: 280 },
    { name: 'Transport',     value: 310, hue: 330 },
    { name: 'Utilities',     value: 264, hue: 50 },
    { name: 'Subscriptions', value: 187, hue: 170 },
  ],
  recent: [
    { name: 'Whole Foods',   cat: 'Groceries',     amount: -84.20,  when: 'Today' },
    { name: 'Spotify',       cat: 'Subscriptions', amount: -11.99,  when: 'Today' },
    { name: 'Uber',          cat: 'Transport',     amount: -23.40,  when: 'Yesterday' },
    { name: 'City Pharmacy', cat: 'Health',        amount: -48.00,  when: 'Yesterday' },
    { name: 'Trattoria Po',  cat: 'Dining',        amount: -112.50, when: 'Mon' },
  ],
};
window.GAST.catTotal = window.GAST.categories.reduce((s, c) => s + c.value, 0);

// Per-category entry counts (for the Categories screen).
Object.assign(window.GAST.categories.find((c) => c.name === 'Groceries'),     { count: 14 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Health'),        { count: 6 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Dining'),        { count: 11 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Shopping'),      { count: 9 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Transport'),     { count: 13 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Utilities'),     { count: 4 });
Object.assign(window.GAST.categories.find((c) => c.name === 'Subscriptions'), { count: 7 });

// Full transaction ledger grouped by day (for the Expenses screen).
window.GAST.ledger = [
  { group: 'Today', date: 'Jun 20', items: [
    { name: 'Whole Foods',    cat: 'Groceries',     amount: -84.20 },
    { name: 'Spotify',        cat: 'Subscriptions', amount: -11.99 },
    { name: 'Blue Bottle',    cat: 'Dining',        amount: -6.50 },
  ] },
  { group: 'Yesterday', date: 'Jun 19', items: [
    { name: 'Uber',           cat: 'Transport',     amount: -23.40 },
    { name: 'City Pharmacy',  cat: 'Health',        amount: -48.00 },
    { name: 'Amazon',         cat: 'Shopping',      amount: -64.99 },
  ] },
  { group: 'Monday', date: 'Jun 16', items: [
    { name: 'Trattoria Po',   cat: 'Dining',        amount: -112.50 },
    { name: 'Shell',          cat: 'Transport',     amount: -52.10 },
    { name: 'Electric Co.',   cat: 'Utilities',     amount: -98.40 },
  ] },
  { group: 'Sunday', date: 'Jun 15', items: [
    { name: 'Trader Joe\u2019s', cat: 'Groceries',  amount: -57.80 },
    { name: 'Netflix',        cat: 'Subscriptions', amount: -15.49 },
  ] },
];

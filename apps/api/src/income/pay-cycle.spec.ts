import {
  computePayCycle, payWindow, shiftDays, windowOf,
  type CycleExpense, type CycleIncome, type CycleSource, type CycleSubscription,
} from './pay-cycle';

// Synthetic figures only.
const SALARY: CycleSource = {
  id: 'src-salary', amount: '3000.00', currency: 'USD', payDayFrom: 28, payDayTo: 30, active: true,
};

const spend = (date: string, amount: string, currency = 'USD'): CycleExpense => ({
  date, amount, currency,
});
const deposit = (date: string, amount: string, sourceId: string | null = 'src-salary'): CycleIncome => ({
  date, amount, currency: 'USD', sourceId,
});
const sub = (o: Partial<CycleSubscription> & Pick<CycleSubscription, 'nextOccurrenceDate'>): CycleSubscription => ({
  amount: '10.00', currency: 'USD', frequency: 'MONTHLY', endDate: null,
  startDate: o.nextOccurrenceDate ?? '2026-01-01', ...o,
});

const cycle = (o: {
  today: string;
  sources?: CycleSource[];
  incomes?: CycleIncome[];
  expenses?: CycleExpense[];
  subscriptions?: CycleSubscription[];
}) =>
  computePayCycle({
    sources: [SALARY], incomes: [], expenses: [], subscriptions: [], ...o,
  });

describe('payWindow', () => {
  it('clamps pay days into short months', () => {
    expect(payWindow({ payDayFrom: 30, payDayTo: 31 }, 2026, 2))
      .toMatchObject({ start: '2026-02-28', end: '2026-02-28' });
  });

  it('runs into the next month when the window crosses the month end', () => {
    expect(payWindow({ payDayFrom: 28, payDayTo: 2 }, 2026, 12))
      .toMatchObject({ year: 2026, month: 12, start: '2026-12-28', end: '2027-01-02' });
  });
});

describe('windowOf', () => {
  it('assigns an early, on-time or late deposit to the nearest window', () => {
    expect(windowOf(SALARY, '2026-11-26').month).toBe(11); // early
    expect(windowOf(SALARY, '2026-11-29').month).toBe(11); // on time
    expect(windowOf(SALARY, '2026-12-02').month).toBe(11); // late
  });
});

describe('shiftDays', () => {
  it('moves across month and year ends', () => {
    expect(shiftDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('computePayCycle', () => {
  it('is null without an active income source', () => {
    expect(cycle({ today: '2026-11-21', sources: [{ ...SALARY, active: false }] })).toBeNull();
  });

  it('assumes the expected payday when no deposit is recorded', () => {
    const result = cycle({ today: '2026-11-21' });

    expect(result).toMatchObject({
      currency: 'USD',
      start: '2026-10-28',
      paydayConfirmed: false,
      nextPaydayEarliest: '2026-11-28',
      nextPaydayLatest: '2026-11-30',
      daysElapsed: 25,
      daysLeft: 9,
      income: '3000.00',
    });
  });

  it('starts on the recorded deposit and counts its real amount once', () => {
    const result = cycle({
      today: '2026-11-21',
      incomes: [deposit('2026-09-29', '3000.00'), deposit('2026-10-30', '2990.50')],
    });

    expect(result).toMatchObject({ start: '2026-10-30', paydayConfirmed: true, income: '2990.50' });
  });

  it('moves to the next cycle when pay lands a couple of days early', () => {
    const result = cycle({ today: '2026-11-26', incomes: [deposit('2026-11-26', '3000.00')] });

    expect(result).toMatchObject({
      start: '2026-11-26',
      paydayConfirmed: true,
      nextPaydayEarliest: '2026-12-28',
      nextPaydayLatest: '2026-12-30',
    });
  });

  it('counts on the paycheck inside the pay window even before it shows up', () => {
    const result = cycle({ today: '2026-11-29', incomes: [deposit('2026-10-29', '3000.00')] });

    expect(result).toMatchObject({
      start: '2026-11-28',
      paydayConfirmed: false,
      nextPaydayLatest: '2026-12-30',
      income: '3000.00',
    });
  });

  it('handles a window that crosses the month end', () => {
    const result = cycle({
      today: '2026-12-01',
      sources: [{ ...SALARY, payDayTo: 2 }],
      incomes: [deposit('2026-12-01', '3000.00')],
    });

    expect(result).toMatchObject({
      start: '2026-12-01',
      nextPaydayEarliest: '2026-12-28',
      nextPaydayLatest: '2027-01-02',
    });
  });

  it('adds a second source once its own window opens in this cycle', () => {
    const side: CycleSource = {
      id: 'src-side', amount: '450.00', currency: 'USD', payDayFrom: 15, payDayTo: 15, active: true,
    };

    expect(cycle({ today: '2026-11-10', sources: [SALARY, side] })?.income).toBe('3000.00');
    expect(cycle({ today: '2026-11-21', sources: [SALARY, side] })?.income).toBe('3450.00');
    expect(
      cycle({
        today: '2026-11-21',
        sources: [SALARY, side],
        incomes: [deposit('2026-11-16', '430.00', 'src-side')],
      })?.income,
    ).toBe('3430.00');
  });

  it('counts unlinked deposits in the cycle as income too', () => {
    const result = cycle({ today: '2026-11-21', incomes: [deposit('2026-11-05', '75.00', null)] });
    expect(result?.income).toBe('3075.00');
  });

  it('sums spending from the cycle start, keeping other currencies apart', () => {
    const result = cycle({
      today: '2026-11-21',
      expenses: [
        spend('2026-10-27', '999.00'), // last cycle
        spend('2026-10-28', '1500.00'),
        spend('2026-11-20', '42.10'),
        spend('2026-11-21', '7.90'),
        spend('2026-11-02', '35000.00', 'VES'),
      ],
    });

    expect(result).toMatchObject({ spent: '1550.00', otherCurrencyExpenses: 1 });
  });

  it('reserves subscription charges still due before payday, not on it', () => {
    const result = cycle({
      today: '2026-11-21',
      subscriptions: [
        sub({ nextOccurrenceDate: '2026-11-25', amount: '55.00' }),
        sub({ nextOccurrenceDate: '2026-11-30', amount: '20.00' }), // lands on payday
        sub({ nextOccurrenceDate: '2026-11-22', frequency: 'WEEKLY', startDate: '2026-11-01', amount: '5.00' }),
        sub({ nextOccurrenceDate: '2026-11-24', endDate: '2026-11-23' }), // already ended
        sub({ nextOccurrenceDate: '2026-11-26', currency: 'VES', amount: '900.00' }),
      ],
    });

    // 55 + weekly on the 22nd and 29th.
    expect(result?.committed).toBe('65.00');
  });

  it('spreads what is left over the remaining days', () => {
    const result = cycle({
      today: '2026-11-21',
      expenses: [spend('2026-11-01', '2500.00')],
      subscriptions: [sub({ nextOccurrenceDate: '2026-11-25', amount: '40.00' })],
    });

    expect(result).toMatchObject({ left: '460.00', daysLeft: 9, perDay: '51.11' });
  });

  it('reports an overspent cycle as negative with nothing per day', () => {
    const result = cycle({ today: '2026-11-21', expenses: [spend('2026-11-01', '3100.00')] });
    expect(result).toMatchObject({ left: '-100.00', perDay: '0.00' });
  });
});

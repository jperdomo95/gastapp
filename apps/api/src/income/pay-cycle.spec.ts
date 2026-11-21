import {
  computePayCycle, payWindow, shiftDays, windowOf,
  type CycleBucket, type CycleExpense, type CycleIncome, type CycleSource, type CycleSubscription,
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
  buckets?: CycleBucket[];
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

  describe('burn', () => {
    it('lists spending per day from the start, empty days included', () => {
      const result = cycle({
        today: '2026-10-31',
        expenses: [spend('2026-10-28', '100.00'), spend('2026-10-28', '20.00'), spend('2026-10-30', '5.50')],
      });

      expect(result?.daily).toEqual([
        { date: '2026-10-28', spent: '120.00' },
        { date: '2026-10-29', spent: '0.00' },
        { date: '2026-10-30', spent: '5.50' },
        { date: '2026-10-31', spent: '0.00' },
      ]);
    });

    it('averages the last seven days for the recent pace', () => {
      const result = cycle({
        today: '2026-11-21',
        expenses: [
          spend('2026-10-28', '2000.00'), // payday transfers, outside the week
          spend('2026-11-15', '70.00'),
          spend('2026-11-21', '70.00'),
        ],
      });

      expect(result).toMatchObject({ recentPerDay: '20.00', recentDays: 7 });
    });

    it('projects the day the money runs out at the recent pace', () => {
      // 3000 in, 2900 spent: 100 left at 50/day is gone by the end of the 23rd.
      const expenses = [spend('2026-10-28', '2550.00')];
      for (let d = 15; d <= 21; d++) expenses.push(spend(`2026-11-${d}`, '50.00'));

      expect(cycle({ today: '2026-11-21', expenses })?.projectedZeroDate).toBe('2026-11-23');
    });

    it('has no zero day when the money lasts until payday', () => {
      const result = cycle({ today: '2026-11-21', expenses: [spend('2026-11-21', '10.00')] });
      expect(result?.projectedZeroDate).toBeNull();
    });

    it('says today when nothing is left', () => {
      const result = cycle({ today: '2026-11-21', expenses: [spend('2026-11-01', '3000.00')] });
      expect(result?.projectedZeroDate).toBe('2026-11-21');
    });

    it('gives the previous cycle as a running total, from its recorded payday', () => {
      const result = cycle({
        today: '2026-11-21',
        incomes: [deposit('2026-09-29', '3000.00'), deposit('2026-10-29', '3000.00')],
        expenses: [
          spend('2026-09-28', '999.00'), // before the previous payday
          spend('2026-09-29', '1000.00'),
          spend('2026-10-01', '250.00'),
          spend('2026-10-29', '5.00'), // this cycle
        ],
      });

      expect(result?.previous?.start).toBe('2026-09-29');
      expect(result?.previous?.end).toBe('2026-10-28');
      expect(result?.previous?.cumulative.slice(0, 4)).toEqual(['1000.00', '1000.00', '1250.00', '1250.00']);
      expect(result?.previous?.cumulative).toHaveLength(30);
    });
  });

  describe('set-asides and weekly allowance', () => {
    const PARTNER: CycleBucket = {
      id: 'b-partner', name: 'Partner share', kind: 'TRANSFER', amount: '1000.00', currency: 'USD',
      matchText: 'acct 0042', categoryId: null,
    };
    const SAVINGS: CycleBucket = {
      id: 'b-savings', name: 'Savings', kind: 'SAVINGS', amount: '300.00', currency: 'USD',
      matchText: null, categoryId: 'cat-savings',
    };
    const transfer = (date: string, amount: string): CycleExpense => ({
      date, amount, currency: 'USD', description: 'Transfer to ACCT 0042',
    });

    it('holds back set-asides that have not gone out yet', () => {
      const result = cycle({ today: '2026-11-21', buckets: [PARTNER, SAVINGS] });
      expect(result).toMatchObject({ reserved: '1300.00', left: '1700.00' });
    });

    it('counts a matching transfer as paying the set-aside, not as spending on top', () => {
      const result = cycle({
        today: '2026-11-21',
        buckets: [PARTNER, SAVINGS],
        expenses: [
          transfer('2026-10-28', '1000.00'),
          { date: '2026-10-29', amount: '100.00', currency: 'USD', categoryId: 'cat-savings' },
        ],
      });

      expect(result?.buckets.map((b) => [b.name, b.paid])).toEqual([
        ['Partner share', '1000.00'],
        ['Savings', '100.00'],
      ]);
      // 3000 − 1000 paid − 100 paid − 200 savings still to go.
      expect(result).toMatchObject({ reserved: '200.00', left: '1700.00' });
    });

    it('counts paying more than the set-aside as money gone', () => {
      const result = cycle({
        today: '2026-11-21', buckets: [PARTNER], expenses: [transfer('2026-10-28', '1100.00')],
      });
      expect(result).toMatchObject({ reserved: '0.00', left: '1900.00' });
    });

    it('leaves set-aside payments out of the recent pace', () => {
      const result = cycle({
        today: '2026-11-21', buckets: [PARTNER], expenses: [transfer('2026-11-20', '1000.00')],
      });
      expect(result?.recentPerDay).toBe('0.00');
      expect(result?.projectedZeroDate).toBeNull();
    });

    it('spreads what day-to-day spending gets over the cycle and hands it out by the week', () => {
      // Cycle Oct 28 → Nov 30 is 33 days; today Nov 21 is day 25, in week 4 (Nov 18–24).
      const result = cycle({
        today: '2026-11-21',
        buckets: [PARTNER, SAVINGS],
        expenses: [
          transfer('2026-10-28', '1000.00'),
          { date: '2026-11-03', amount: '50.00', currency: 'USD', fromSubscription: true },
          spend('2026-11-17', '40.00'), // last week
          spend('2026-11-18', '25.00'),
          spend('2026-11-21', '15.50'),
        ],
        subscriptions: [sub({ nextOccurrenceDate: '2026-11-25', amount: '17.00' })],
      });

      // 3000 − 1300 set aside − (50 charged + 17 still due) = 1633 over 33 days.
      expect(result?.allowance).toEqual({
        cycleBudget: '1633.00',
        cycleSpent: '80.50',
        perDay: '49.48',
        week: { number: 4, start: '2026-11-18', end: '2026-11-24', budget: '346.36', spent: '40.50' },
      });
    });

    it('ends the last week the day before payday', () => {
      const result = cycle({ today: '2026-11-27' });
      expect(result?.allowance.week).toMatchObject({ number: 5, start: '2026-11-25', end: '2026-11-29' });
    });
  });
});

import { goalProgress, type GoalInput } from './goal-progress';
import type { CycleBucket, CycleExpense } from '../income/pay-cycle';

// Synthetic figures only.
const TODAY = '2026-11-21';
const BUCKET: CycleBucket = {
  id: 'b-ef', name: 'Rainy day', kind: 'SAVINGS', amount: '400.00', currency: 'USD',
  matchText: 'to savings', categoryId: null,
};
const FUND: GoalInput = {
  targetAmount: '6000.00', currency: 'USD', milestones: ['1000.00', '2500.00'],
  baseAmount: '0.00', baseDate: '2026-08-01', bucket: BUCKET,
};
const toSavings = (date: string, amount: string): CycleExpense => ({
  date, amount, currency: 'USD', description: 'Transfer to savings',
});

describe('goalProgress', () => {
  it('adds payments to the linked set-aside made after the balance was entered', () => {
    const result = goalProgress(
      { ...FUND, baseAmount: '150.00' },
      [
        toSavings('2026-08-01', '999.00'), // on the base day: already in the balance
        toSavings('2026-08-29', '400.00'),
        toSavings('2026-09-29', '400.00'),
        { date: '2026-10-02', amount: '35.00', currency: 'USD', description: 'GROCER' },
        { ...toSavings('2026-10-03', '50.00'), currency: 'EUR' },
      ],
      TODAY,
    );

    expect(result).toMatchObject({ saved: '950.00', contributed: '800.00', remaining: '5050.00' });
  });

  it('marks steps reached and dates the rest at the set-aside amount per month', () => {
    const result = goalProgress({ ...FUND, baseAmount: '1200.00', baseDate: TODAY }, [], TODAY);

    expect(result.ratePerMonth).toBe('400.00');
    expect(result.rateSource).toBe('SET_ASIDE');
    expect(result.steps).toEqual([
      { amount: '1000.00', reached: true, eta: null },
      // 1300 more at 400/month: 3.25 months ≈ 99 days.
      { amount: '2500.00', reached: false, eta: '2027-02-28' },
      { amount: '6000.00', reached: false, eta: '2027-11-22' }, // 12 months
    ]);
  });

  it('falls back to the recent saving rate without a set-aside amount', () => {
    const result = goalProgress(
      { ...FUND, bucket: { ...BUCKET, amount: '0.00' } },
      [toSavings('2026-09-10', '300.00'), toSavings('2026-10-10', '300.00'), toSavings('2026-11-10', '300.00')],
      TODAY,
    );
    // 900 over the last 90 days ≈ 304.38 a month.
    expect(result).toMatchObject({ rateSource: 'HISTORY', ratePerMonth: '304.38' });
  });

  it('gives no rate when the recent history rounds to nothing a month', () => {
    const result = goalProgress(
      { ...FUND, bucket: { ...BUCKET, amount: '0.00' } },
      [toSavings('2026-10-10', '0.01')],
      TODAY,
    );
    expect(result).toMatchObject({ ratePerMonth: null, rateSource: null, contributed: '0.01' });
  });

  it('does not count a transfer dated before the balance was entered, even if imported later', () => {
    // The balance typed in on the base day already includes money that landed by then.
    const result = goalProgress({ ...FUND, baseAmount: '1000.00', baseDate: '2026-11-21' }, [toSavings('2026-11-20', '400.00')], '2026-11-24');
    expect(result.saved).toBe('1000.00');
  });

  it('gives no dates without a set-aside or enough history', () => {
    const result = goalProgress({ ...FUND, bucket: null, baseDate: '2026-11-10' }, [], TODAY);
    expect(result).toMatchObject({ ratePerMonth: null, rateSource: null, contributed: '0.00' });
    expect(result.steps.every((s) => s.eta === null)).toBe(true);
  });

  it('ignores steps above the target and duplicates of it', () => {
    const result = goalProgress({ ...FUND, milestones: ['6000.00', '9000.00', '500.00'] }, [], TODAY);
    expect(result.steps.map((s) => s.amount)).toEqual(['500.00', '6000.00']);
  });

  it('never reports a negative remainder once the target is passed', () => {
    const result = goalProgress({ ...FUND, baseAmount: '6500.00' }, [], TODAY);
    expect(result).toMatchObject({ remaining: '0.00' });
    expect(result.steps.every((s) => s.reached)).toBe(true);
  });
});

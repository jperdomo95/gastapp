import { createBudgetBucketSchema, createIncomeSourceSchema } from '@gastapp/types';

describe('income input schemas', () => {
  const bucket = { name: 'Savings', kind: 'SAVINGS', amount: '300.00' };

  it('rejects a set-aside matchText short enough to match almost any description', () => {
    expect(createBudgetBucketSchema.safeParse({ ...bucket, matchText: '0' }).success).toBe(false);
    expect(createBudgetBucketSchema.safeParse({ ...bucket, matchText: 'ACCT 0042' }).success).toBe(true);
  });

  it('still accepts a blank matchText from the form', () => {
    expect(createBudgetBucketSchema.safeParse({ ...bucket, matchText: '' }).success).toBe(true);
  });

  it('accepts only USD', () => {
    const source = { name: 'Salary', amount: '3000.00', payDayFrom: 28, payDayTo: 30 };
    expect(createIncomeSourceSchema.parse(source).currency).toBe('USD');
    expect(createIncomeSourceSchema.safeParse({ ...source, currency: 'VES' }).success).toBe(false);
    expect(createBudgetBucketSchema.safeParse({ ...bucket, currency: 'EUR' }).success).toBe(false);
  });
});

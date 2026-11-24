import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';

const USER = 'user-1';
const NOW = new Date('2026-11-21T12:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const goalRow = (o: Record<string, unknown> = {}) => ({
  id: 'g-1',
  name: 'Rainy day fund',
  targetAmount: new Prisma.Decimal('6000.00'),
  currency: 'USD',
  milestones: [new Prisma.Decimal('1000.00')],
  baseAmount: new Prisma.Decimal('200.00'),
  baseDate: day('2026-09-01'),
  bucketId: 'b-1',
  bucket: {
    id: 'b-1', name: 'Savings', kind: 'SAVINGS', amount: new Prisma.Decimal('400.00'), currency: 'USD',
    matchText: 'TO SAVINGS', categoryId: null, sortOrder: 0, userId: USER,
  },
  userId: USER,
  createdAt: NOW,
  updatedAt: NOW,
  ...o,
});

function makePrismaMock() {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
    savingsGoal: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
    // The user's set-asides always include the goal's own.
    budgetBucket: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([goalRow().bucket]) },
    expense: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
}

describe('GoalsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: GoalsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = makePrismaMock();
    service = new GoalsService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('lists goals with progress from payments to their set-aside', async () => {
    prisma.savingsGoal.findMany.mockResolvedValue([goalRow()]);
    prisma.expense.findMany.mockResolvedValue([
      {
        date: day('2026-10-01'), amount: new Prisma.Decimal('400.00'), currency: 'USD',
        description: 'Transfer to savings', categoryId: 'c', subscriptionId: null,
      },
    ]);

    const [goal] = await service.list(USER);

    expect(goal).toMatchObject({
      name: 'Rainy day fund',
      milestones: ['1000.00'],
      baseDate: '2026-09-01',
      progress: { saved: '600.00', ratePerMonth: '400.00', rateSource: 'SET_ASIDE' },
    });
    expect(prisma.expense.findMany.mock.calls[0][0].where.date).toEqual({ gt: day('2026-09-01') });
  });

  it('starts a new goal from today with the balance given', async () => {
    await service.create(USER, {
      name: 'Trip', targetAmount: '900.00', currency: 'USD', milestones: [], baseAmount: '50.00',
    });

    const { data } = prisma.savingsGoal.create.mock.calls[0][0];
    expect(data).toMatchObject({ userId: USER, bucketId: null, baseDate: day('2026-11-21') });
    expect(data.baseAmount.toFixed(2)).toBe('50.00');
  });

  it('re-dates the balance when it is updated', async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue(goalRow());

    await service.update(USER, 'g-1', { baseAmount: '1500.00' });

    const { data } = prisma.savingsGoal.update.mock.calls[0][0];
    expect(data.baseDate).toEqual(day('2026-11-21'));
  });

  const toSavings = (date: string, amount: string) => ({
    date: day(date), amount: new Prisma.Decimal(amount), currency: 'USD',
    description: 'Transfer to savings', categoryId: 'c', subscriptionId: null,
  });

  it('keeps what was saved when the set-aside is unlinked', async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue(goalRow());
    prisma.savingsGoal.findMany.mockResolvedValue([goalRow()]);
    prisma.expense.findMany.mockResolvedValue([toSavings('2026-10-01', '400.00'), toSavings('2026-11-01', '800.00')]);

    await service.update(USER, 'g-1', { bucketId: null });

    // First the balance is folded in (200 + 1200), then the link is dropped.
    expect(prisma.savingsGoal.update.mock.calls[0][0]).toEqual({
      where: { id: 'g-1' },
      data: { baseAmount: new Prisma.Decimal('1400.00'), baseDate: day('2026-11-21') },
    });
    expect(prisma.savingsGoal.update.mock.calls[1][0].data).toMatchObject({ bucketId: null });
  });

  it('does not fold in progress when the bucket is unchanged or a new balance is given', async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue(goalRow());
    prisma.budgetBucket.findUnique.mockResolvedValue({ id: 'b-1', userId: USER, kind: 'SAVINGS' });
    await service.update(USER, 'g-1', { bucketId: 'b-1', name: 'Renamed' });
    await service.update(USER, 'g-1', { bucketId: null, baseAmount: '500.00' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('counts an expense only toward the set-aside it pays first, as the pay cycle does', async () => {
    prisma.savingsGoal.findMany.mockResolvedValue([goalRow()]);
    prisma.budgetBucket.findMany.mockResolvedValue([
      { id: 'b-0', name: 'Transfers', kind: 'TRANSFER', amount: new Prisma.Decimal('800.00'), currency: 'USD',
        matchText: 'TRANSFER', categoryId: null },
      goalRow().bucket,
    ]);
    prisma.expense.findMany.mockResolvedValue([toSavings('2026-10-01', '400.00')]);

    const [goal] = await service.list(USER);
    expect(goal?.progress.saved).toBe('200.00');
  });

  it('only links savings set-asides', async () => {
    prisma.budgetBucket.findUnique.mockResolvedValue({ id: 'b-rent', userId: USER, kind: 'TRANSFER' });
    await expect(
      service.create(USER, {
        name: 'Trip', targetAmount: '900.00', currency: 'USD', milestones: [], baseAmount: '0', bucketId: 'b-rent',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to link someone else's set-aside", async () => {
    prisma.budgetBucket.findUnique.mockResolvedValue({ id: 'b-x', userId: 'someone-else' });
    await expect(
      service.create(USER, {
        name: 'Trip', targetAmount: '900.00', currency: 'USD', milestones: [], baseAmount: '0', bucketId: 'b-x',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.savingsGoal.create).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's goal, and 404s a missing one", async () => {
    prisma.savingsGoal.findUnique.mockResolvedValueOnce(goalRow({ userId: 'someone-else' }));
    await expect(service.remove(USER, 'g-1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.savingsGoal.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove(USER, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
  });
});

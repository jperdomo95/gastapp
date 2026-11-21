import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IncomeService } from './income.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const USER = 'user-1';
const NOW = new Date('2026-11-21T12:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const sourceRow = (o: Record<string, unknown> = {}) => ({
  id: 'src-1',
  name: 'Salary',
  amount: new Prisma.Decimal('3000.00'),
  currency: 'USD',
  payDayFrom: 28,
  payDayTo: 30,
  matchText: null,
  active: true,
  userId: USER,
  createdAt: NOW,
  updatedAt: NOW,
  ...o,
});

function makePrismaMock() {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
    incomeSource: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    income: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    expense: { findMany: jest.fn().mockResolvedValue([]) },
    subscription: { findMany: jest.fn().mockResolvedValue([]) },
    budgetBucket: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: { findUnique: jest.fn() },
  };
}

describe('IncomeService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let subscriptions: { runDueGenerations: jest.Mock };
  let service: IncomeService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = makePrismaMock();
    subscriptions = { runDueGenerations: jest.fn().mockResolvedValue({}) };
    service = new IncomeService(
      prisma as unknown as PrismaService,
      subscriptions as unknown as SubscriptionsService,
    );
  });

  afterEach(() => jest.useRealTimers());

  describe('sources', () => {
    it('creates a source and returns amounts as strings', async () => {
      prisma.incomeSource.create.mockResolvedValue(sourceRow({ matchText: 'NOMINA' }));

      const result = await service.createSource(USER, {
        name: 'Salary', amount: '3000.00', currency: 'USD',
        payDayFrom: 28, payDayTo: 30, matchText: 'NOMINA', active: true,
      });

      expect(result).toMatchObject({ id: 'src-1', amount: '3000.00', payDayFrom: 28, matchText: 'NOMINA' });
      expect(prisma.incomeSource.create.mock.calls[0][0].data.userId).toBe(USER);
    });

    it("refuses to change someone else's source", async () => {
      prisma.incomeSource.findUnique.mockResolvedValue(sourceRow({ userId: 'someone-else' }));
      await expect(service.updateSource(USER, 'src-1', { amount: '1.00' }))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.incomeSource.update).not.toHaveBeenCalled();
    });

    it('404s for a missing source', async () => {
      prisma.incomeSource.findUnique.mockResolvedValue(null);
      await expect(service.removeSource(USER, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deposits', () => {
    it("will not link a deposit to someone else's source", async () => {
      prisma.incomeSource.findUnique.mockResolvedValue(sourceRow({ userId: 'someone-else' }));
      await expect(
        service.create(USER, { amount: '10.00', currency: 'USD', date: '2026-11-02', sourceId: 'src-1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.income.create).not.toHaveBeenCalled();
    });

    it('stores the date as a calendar day', async () => {
      prisma.income.create.mockResolvedValue({
        id: 'inc-1', amount: new Prisma.Decimal('10.00'), currency: 'USD', description: null,
        date: day('2026-11-02'), sourceId: null, userId: USER, createdAt: NOW, updatedAt: NOW,
      });

      const result = await service.create(USER, { amount: '10.00', currency: 'USD', date: '2026-11-02' });

      expect(prisma.income.create.mock.calls[0][0].data.date).toEqual(day('2026-11-02'));
      expect(result.date).toBe('2026-11-02');
    });

    it("refuses to delete someone else's deposit", async () => {
      prisma.income.findUnique.mockResolvedValue({ id: 'inc-1', userId: 'someone-else' });
      await expect(service.remove(USER, 'inc-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.income.delete).not.toHaveBeenCalled();
    });
  });

  describe('set-asides', () => {
    it("refuses a bucket tied to someone else's category", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-x', isSystem: false, userId: 'someone-else' });
      await expect(
        service.createBucket(USER, {
          name: 'Savings', kind: 'SAVINGS', amount: '300.00', currency: 'USD', categoryId: 'cat-x', sortOrder: 0,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.budgetBucket.create).not.toHaveBeenCalled();
    });

    it("refuses to delete someone else's bucket", async () => {
      prisma.budgetBucket.findUnique.mockResolvedValue({ id: 'b-1', userId: 'someone-else' });
      await expect(service.removeBucket(USER, 'b-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.budgetBucket.delete).not.toHaveBeenCalled();
    });

    it('keeps set-aside payments and subscription charges out of day-to-day spending', async () => {
      prisma.incomeSource.findMany.mockResolvedValue([sourceRow()]);
      prisma.income.findMany.mockResolvedValue([
        { date: day('2026-10-29'), amount: new Prisma.Decimal('3000.00'), currency: 'USD', sourceId: 'src-1' },
      ]);
      const expense = (date: string, amount: string, description: string, subscriptionId: string | null = null) => ({
        date: day(date), amount: new Prisma.Decimal(amount), currency: 'USD', description,
        categoryId: 'cat-1', subscriptionId,
      });
      prisma.expense.findMany.mockResolvedValue([
        expense('2026-10-29', '1200.00', 'TRANSFER TO ACCT 0042'),
        expense('2026-11-03', '9.99', 'Streamflix', 'sub-1'),
        expense('2026-11-20', '30.00', 'GROCER'),
      ]);
      prisma.budgetBucket.findMany.mockResolvedValue([
        {
          id: 'b-1', name: 'Shared costs', kind: 'TRANSFER', amount: new Prisma.Decimal('1200.00'),
          currency: 'USD', matchText: '0042', categoryId: null, sortOrder: 0,
        },
      ]);

      const result = await service.payCycle(USER);

      expect(result?.buckets).toEqual([
        { id: 'b-1', name: 'Shared costs', kind: 'TRANSFER', amount: '1200.00', paid: '1200.00' },
      ]);
      expect(result?.allowance.cycleSpent).toBe('30.00');
    });
  });

  describe('payCycle', () => {
    it('is null until there is an active source', async () => {
      expect(await service.payCycle(USER)).toBeNull();
    });

    it('catches up subscriptions first, then works out the cycle from the ledger', async () => {
      prisma.incomeSource.findMany.mockResolvedValue([sourceRow()]);
      prisma.income.findMany.mockResolvedValue([
        { date: day('2026-10-29'), amount: new Prisma.Decimal('3000.00'), currency: 'USD', sourceId: 'src-1' },
      ]);
      prisma.expense.findMany.mockResolvedValue([
        { date: day('2026-11-03'), amount: new Prisma.Decimal('1200.00'), currency: 'USD' },
      ]);
      prisma.subscription.findMany.mockResolvedValue([
        {
          amount: new Prisma.Decimal('55.00'), currency: 'USD', frequency: 'MONTHLY',
          startDate: day('2026-01-27'), endDate: null, nextOccurrenceDate: day('2026-11-27'),
        },
      ]);

      const result = await service.payCycle(USER);

      expect(subscriptions.runDueGenerations).toHaveBeenCalledWith(USER);
      expect(result).toMatchObject({
        start: '2026-10-29',
        paydayConfirmed: true,
        nextPaydayLatest: '2026-11-30',
        income: '3000.00',
        spent: '1200.00',
        committed: '55.00',
        left: '1745.00',
      });
    });
  });
});

import {
  BadRequestException, ConflictException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

const USER = 'user-1';
const SYSTEM_CATEGORY = { id: 'cat-1', isSystem: true, userId: null };

/** Noon UTC, so no timezone in the world lands on a different date by accident. */
const NOW = new Date('2026-07-26T12:00:00.000Z');

/** A calendar day as the UTC-midnight Date a @db.Date column holds. */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function makePrismaMock() {
  return {
    subscription: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
    expense: { create: jest.fn().mockResolvedValue({}) },
    subscriptionAmountChange: {
      create: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({}),
    },
    category: { findUnique: jest.fn().mockResolvedValue(SYSTEM_CATEGORY) },
    user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
  };
}

type Overrides = Partial<{
  id: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  startDate: string;
  endDate: string | null;
  nextOccurrenceDate: string | null;
  lastGeneratedDate: string | null;
  timezone: string | null;
  /** [amount, effectiveFrom] pairs, oldest first — as the service reads them. */
  amountChanges: Array<[string, string]>;
}>;

function makeSubscription(o: Overrides = {}) {
  return {
    id: o.id ?? 'sub-1',
    name: 'Netflix',
    amount: new Prisma.Decimal('15.99'),
    currency: 'USD',
    description: null,
    frequency: o.frequency ?? 'MONTHLY',
    startDate: day(o.startDate ?? '2026-05-05'),
    endDate: o.endDate === undefined ? null : o.endDate && day(o.endDate),
    nextOccurrenceDate:
      o.nextOccurrenceDate === undefined
        ? day('2026-05-05')
        : o.nextOccurrenceDate && day(o.nextOccurrenceDate),
    lastGeneratedDate: o.lastGeneratedDate ? day(o.lastGeneratedDate) : null,
    status: o.status ?? 'ACTIVE',
    categoryId: SYSTEM_CATEGORY.id,
    userId: USER,
    createdAt: NOW,
    amountChanges: (o.amountChanges ?? []).map(([amount, effectiveFrom], i) => ({
      id: `chg-${i}`,
      amount: new Prisma.Decimal(amount),
      effectiveFrom: day(effectiveFrom),
    })),
    user: { timezone: o.timezone === undefined ? 'UTC' : o.timezone },
  };
}

/** The calendar days passed to expense.create, in order. */
const generatedDays = (prisma: ReturnType<typeof makePrismaMock>) =>
  prisma.expense.create.mock.calls.map(
    ([arg]) => (arg as { data: { date: Date } }).data.date.toISOString().slice(0, 10),
  );

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' });

describe('SubscriptionsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = makePrismaMock();
    service = new SubscriptionsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generation', () => {
    it('materialises every period that has come due and parks the cursor on the next one', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSubscription()]);

      const result = await service.runDueGenerations(USER);

      expect(generatedDays(prisma)).toEqual(['2026-05-05', '2026-06-05', '2026-07-05']);
      expect(result).toEqual({ generated: 3, subscriptionsProcessed: 1 });
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          nextOccurrenceDate: day('2026-08-05'),
          lastGeneratedDate: day('2026-07-05'),
        },
      });
    });

    it('copies the subscription amount onto each generated expense', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSubscription()]);

      await service.runDueGenerations(USER);

      const [first] = prisma.expense.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(first.data).toMatchObject({
        amount: new Prisma.Decimal('15.99'),
        currency: 'USD',
        subscriptionId: 'sub-1',
        userId: USER,
        categoryId: SYSTEM_CATEGORY.id,
        // No description on the subscription, so the name identifies the charge
        // (reports group top merchants by description).
        description: 'Netflix',
      });
    });

    it('falls back to the name when the note is an empty string, not just null', async () => {
      // The form submits "" for an untouched note, and `??` would let that
      // through — leaving nameless ledger rows and an empty top-merchants bucket.
      prisma.subscription.findMany.mockResolvedValue([
        { ...makeSubscription(), description: '' },
      ]);

      await service.runDueGenerations(USER);

      const [first] = prisma.expense.create.mock.calls[0] as [{ data: { description: string } }];
      expect(first.data.description).toBe('Netflix');
    });

    it('charges each period the price in force on that date', async () => {
      // The whole point of scheduling a change: periods before it keep the old
      // price, periods on or after it get the new one.
      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({ amountChanges: [['17.99', '2026-06-05']] }),
      ]);

      await service.runDueGenerations(USER);

      const amounts = prisma.expense.create.mock.calls.map(
        ([arg]) => (arg as { data: { amount: Prisma.Decimal } }).data.amount.toFixed(2),
      );
      expect(generatedDays(prisma)).toEqual(['2026-05-05', '2026-06-05', '2026-07-05']);
      expect(amounts).toEqual(['15.99', '17.99', '17.99']);
    });

    it('applies the latest change on or before an occurrence, not the newest overall', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({
          amountChanges: [['17.99', '2026-06-05'], ['21.99', '2026-12-01']],
        }),
      ]);

      await service.runDueGenerations(USER);

      const amounts = prisma.expense.create.mock.calls.map(
        ([arg]) => (arg as { data: { amount: Prisma.Decimal } }).data.amount.toFixed(2),
      );
      // The December change is still in the future — nothing generated uses it.
      expect(amounts).toEqual(['15.99', '17.99', '17.99']);
    });

    it('keeps going when a period was already materialised by a concurrent run', async () => {
      // This is what the unique index on Expense(subscriptionId, date) buys:
      // a double-fire cannot double-charge.
      prisma.subscription.findMany.mockResolvedValue([makeSubscription()]);
      prisma.expense.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(uniqueViolation())
        .mockResolvedValueOnce({});

      const result = await service.runDueGenerations(USER);

      expect(generatedDays(prisma)).toEqual(['2026-05-05', '2026-06-05', '2026-07-05']);
      expect(result.generated).toBe(2);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { nextOccurrenceDate: day('2026-08-05'), lastGeneratedDate: day('2026-07-05') },
      });
    });

    it('propagates errors that are not duplicate violations', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSubscription()]);
      prisma.expense.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.runDueGenerations(USER)).rejects.toThrow('connection lost');
    });

    it('stops at the end date and clears the cursor', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({ endDate: '2026-06-30' }),
      ]);

      await service.runDueGenerations(USER);

      expect(generatedDays(prisma)).toEqual(['2026-05-05', '2026-06-05']);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { nextOccurrenceDate: null, lastGeneratedDate: day('2026-06-05') },
      });
    });

    it('caps a runaway backfill and leaves the cursor for the next pass', async () => {
      // 1990 monthly is ~438 periods; a typo must not hang the request.
      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({ startDate: '1990-01-31', nextOccurrenceDate: '1990-01-31' }),
      ]);

      const result = await service.runDueGenerations(USER);

      expect(result.generated).toBe(400);
      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { nextOccurrenceDate: Date | null } },
      ];
      // Still short of today, so the cursor is parked mid-history, not cleared.
      expect(data.nextOccurrenceDate).toEqual(day('2023-05-31'));
    });

    it('skips a subscription that is not yet due in its owner timezone', async () => {
      // Same instant: it is already the 27th in Kiritimati but still the 26th
      // in Niue, so only the Kiritimati user is charged.
      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({
          id: 'niue',
          startDate: '2026-07-27',
          nextOccurrenceDate: '2026-07-27',
          timezone: 'Pacific/Niue',
        }),
      ]);
      await service.runDueGenerations();
      expect(prisma.expense.create).not.toHaveBeenCalled();
      // Nothing moved, so a read-triggered catch-up stays read-only.
      expect(prisma.subscription.update).not.toHaveBeenCalled();

      prisma.subscription.findMany.mockResolvedValue([
        makeSubscription({
          id: 'kiritimati',
          startDate: '2026-07-27',
          nextOccurrenceDate: '2026-07-27',
          timezone: 'Pacific/Kiritimati',
        }),
      ]);
      await service.runDueGenerations();
      expect(generatedDays(prisma)).toEqual(['2026-07-27']);
    });

    it('generates nothing for a paused subscription', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSubscription({ status: 'PAUSED' })]);

      const result = await service.runDueGenerations(USER);

      expect(prisma.expense.create).not.toHaveBeenCalled();
      expect(result.generated).toBe(0);
    });

    it('only asks the database for active subscriptions with a live cursor', async () => {
      await service.runDueGenerations(USER);

      const [{ where }] = prisma.subscription.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(where).toMatchObject({ status: 'ACTIVE', userId: USER });
      // Bounded generously in SQL because "today" differs per user timezone;
      // the exact day is applied in JS.
      expect(where.nextOccurrenceDate).toEqual({ not: null, lte: day('2026-07-27') });
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.subscription.create.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...makeSubscription(), ...data, id: 'sub-1' }),
      );
      prisma.subscription.findUnique.mockResolvedValue({
        ...makeSubscription(),
        _count: { expenses: 0 },
      });
    });

    const dto = {
      name: 'Netflix',
      amount: '15.99',
      currency: 'USD',
      frequency: 'MONTHLY' as const,
      startDate: '2026-05-05',
      categoryId: SYSTEM_CATEGORY.id,
      backfillPastOccurrences: false,
    };

    it('skips straight to the next future period when backfill is off', async () => {
      await service.create(USER, dto);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ nextOccurrenceDate: day('2026-08-05') }),
      });
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('materialises the history when backfill is on', async () => {
      await service.create(USER, { ...dto, backfillPastOccurrences: true });

      expect(generatedDays(prisma)).toEqual(['2026-05-05', '2026-06-05', '2026-07-05']);
    });

    it('rejects a category belonging to someone else', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-9',
        isSystem: false,
        userId: 'someone-else',
      });
      await expect(service.create(USER, { ...dto, categoryId: 'cat-9' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('rejects a category that does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.create(USER, dto)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.subscription.update.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...makeSubscription(), ...data }),
      );
      prisma.subscription.findUnique.mockResolvedValue({
        ...makeSubscription(),
        _count: { expenses: 0 },
      });
    });

    it('throws NotFound for a missing subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.update(USER, 'missing', { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Forbidden for another user\'s subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(
        makeSubscription({ id: 'sub-1' }),
      );
      prisma.subscription.findUnique.mockResolvedValueOnce({
        ...makeSubscription(),
        userId: 'someone-else',
      });
      await expect(service.update(USER, 'sub-1', { name: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('rejects an end date before the persisted start date', async () => {
      // The update schema is .partial(), so this cross-field rule cannot live
      // in zod — a PATCH may send endDate alone.
      await expect(
        service.update(USER, 'sub-1', { endDate: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('re-anchors the cursor ahead of what was already generated when the frequency changes', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ nextOccurrenceDate: '2026-08-05', lastGeneratedDate: '2026-07-05' }),
      );

      await service.update(USER, 'sub-1', { frequency: 'WEEKLY' });

      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { nextOccurrenceDate: Date | null } },
      ];
      // Weekly grid anchored at 2026-05-05, first slot after both today and
      // the last generated day.
      expect(data.nextOccurrenceDate).toEqual(day('2026-07-28'));
    });

    it('does not backfill the paused gap on resume', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({
          status: 'PAUSED',
          nextOccurrenceDate: '2026-05-05',
          lastGeneratedDate: '2026-04-05',
        }),
      );

      await service.update(USER, 'sub-1', { status: 'ACTIVE' });

      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { nextOccurrenceDate: Date | null } },
      ];
      // Next monthly slot on or after today — the missed May/June/July periods
      // are gone for good, not charged retroactively.
      expect(data.nextOccurrenceDate).toEqual(day('2026-08-05'));
    });

    it('leaves the cursor alone when only the amount changes', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ nextOccurrenceDate: '2026-08-05', lastGeneratedDate: '2026-07-05' }),
      );

      await service.update(USER, 'sub-1', { amount: '17.99' });

      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { nextOccurrenceDate: Date | null; amount: Prisma.Decimal } },
      ];
      expect(data.nextOccurrenceDate).toEqual(day('2026-08-05'));
      // Past expenses keep their own amount, so the new price only applies
      // from the next generated period onwards.
      expect(data.amount).toEqual(new Prisma.Decimal('17.99'));
    });

    it('clears a previously set end date when null is sent', async () => {
      // Omitting the key means "leave it alone", so removing an end date needs
      // an explicit null — otherwise it silently comes back.
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ endDate: '2026-08-31', nextOccurrenceDate: null }),
      );

      await service.update(USER, 'sub-1', { endDate: null });

      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { endDate: Date | null; nextOccurrenceDate: Date | null } },
      ];
      expect(data.endDate).toBeNull();
      // The schedule was finished; dropping the end date revives it.
      expect(data.nextOccurrenceDate).toEqual(day('2026-08-05'));
    });

    it('clears the cursor when a new end date has already passed', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ nextOccurrenceDate: '2026-08-05' }),
      );

      await service.update(USER, 'sub-1', { endDate: '2026-07-31' });

      const [{ data }] = prisma.subscription.update.mock.calls[0] as [
        { data: { nextOccurrenceDate: Date | null } },
      ];
      expect(data.nextOccurrenceDate).toBeNull();
    });
  });

  describe('price changes', () => {
    beforeEach(() => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...makeSubscription(),
        _count: { expenses: 0 },
      });
    });

    it('schedules a change on an owned subscription', async () => {
      await service.addAmountChange(USER, 'sub-1', {
        amount: '17.99',
        effectiveFrom: '2026-09-01',
      });

      expect(prisma.subscriptionAmountChange.create).toHaveBeenCalledWith({
        data: {
          subscriptionId: 'sub-1',
          amount: new Prisma.Decimal('17.99'),
          effectiveFrom: day('2026-09-01'),
        },
      });
    });

    it('refuses to schedule a change on someone else\'s subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...makeSubscription(),
        userId: 'someone-else',
        _count: { expenses: 0 },
      });

      await expect(
        service.addAmountChange(USER, 'sub-1', { amount: '1.00', effectiveFrom: '2026-09-01' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.subscriptionAmountChange.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate effective date to a conflict', async () => {
      prisma.subscriptionAmountChange.create.mockRejectedValue(uniqueViolation());

      await expect(
        service.addAmountChange(USER, 'sub-1', { amount: '17.99', effectiveFrom: '2026-09-01' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to remove a change belonging to a different subscription', async () => {
      prisma.subscriptionAmountChange.findUnique.mockResolvedValue({
        id: 'chg-1',
        subscriptionId: 'other-sub',
      });

      await expect(service.removeAmountChange(USER, 'sub-1', 'chg-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.subscriptionAmountChange.delete).not.toHaveBeenCalled();
    });

    it('removes a change that belongs to the subscription', async () => {
      prisma.subscriptionAmountChange.findUnique.mockResolvedValue({
        id: 'chg-1',
        subscriptionId: 'sub-1',
      });

      await service.removeAmountChange(USER, 'sub-1', 'chg-1');

      expect(prisma.subscriptionAmountChange.delete).toHaveBeenCalledWith({
        where: { id: 'chg-1' },
      });
    });

    it('turns an amount edit into a change effective today once one is already in force', async () => {
      // Otherwise amountFor keeps preferring the older change and the edit
      // looks saved but never takes effect.
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({
          nextOccurrenceDate: '2026-08-05',
          amountChanges: [['17.99', '2026-06-05']],
        }),
      );
      prisma.subscription.update.mockResolvedValue(makeSubscription());

      await service.update(USER, 'sub-1', { amount: '19.99' });

      expect(prisma.subscriptionAmountChange.upsert).toHaveBeenCalledWith({
        where: {
          subscriptionId_effectiveFrom: {
            subscriptionId: 'sub-1',
            effectiveFrom: day('2026-07-26'),
          },
        },
        create: {
          subscriptionId: 'sub-1',
          amount: new Prisma.Decimal('19.99'),
          effectiveFrom: day('2026-07-26'),
        },
        update: { amount: new Prisma.Decimal('19.99') },
      });
    });

    it('leaves the base amount alone when no change is in force yet', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({
          nextOccurrenceDate: '2026-08-05',
          amountChanges: [['21.99', '2026-12-01']], // future only
        }),
      );
      prisma.subscription.update.mockResolvedValue(makeSubscription());

      await service.update(USER, 'sub-1', { amount: '19.99' });

      expect(prisma.subscriptionAmountChange.upsert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFound for a missing subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.remove(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subscription.delete).not.toHaveBeenCalled();
    });

    it('throws Forbidden for another user\'s subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...makeSubscription(),
        userId: 'someone-else',
      });
      await expect(service.remove(USER, 'sub-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.subscription.delete).not.toHaveBeenCalled();
    });

    it('deletes the subscription without touching its generated expenses', async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSubscription());

      await service.remove(USER, 'sub-1');

      // The FK is onDelete: SetNull, so past charges stay in the ledger and
      // historical months keep their totals.
      expect(prisma.subscription.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
    });
  });

  describe('list', () => {
    it('catches up before reading, so the list is never stale', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);

      await service.list(USER, {});

      // First call is the generation sweep, second is the actual listing.
      expect(prisma.subscription.findMany).toHaveBeenCalledTimes(2);
      const [{ where }] = prisma.subscription.findMany.mock.calls[0] as [{ where: object }];
      expect(where).toMatchObject({ status: 'ACTIVE', userId: USER });
    });

    it('scopes the listing to the caller and serialises dates as calendar days', async () => {
      prisma.subscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...makeSubscription(), _count: { expenses: 3 } }]);

      const [item] = await service.list(USER, { status: 'ACTIVE' });

      expect(item).toMatchObject({
        id: 'sub-1',
        amount: '15.99',
        startDate: '2026-05-05',
        nextOccurrenceDate: '2026-05-05',
        endDate: null,
        status: 'ACTIVE',
        expenseCount: 3,
      });
      const [{ where }] = prisma.subscription.findMany.mock.calls[1] as [{ where: object }];
      expect(where).toEqual({ userId: USER, status: 'ACTIVE' });
    });
  });
});

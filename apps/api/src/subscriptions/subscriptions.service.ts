import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, type RecurrenceFrequency, type SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateSubscriptionDto, UpdateSubscriptionDto, ListSubscriptionsQuery, CreateAmountChangeDto,
} from '@gastapp/types';
import { todayInTimezone } from '../common/timezone';
import {
  dayAfter, maxDateString, nextOccurrenceOnOrAfter, occurrenceOn, toDateString, toDbDate,
} from './recurrence';

/**
 * Hard cap on how many periods a single generation pass will materialise, so a
 * subscription created with a typo'd start date in 1990 cannot hang a request.
 * The cursor is persisted, so a capped run simply finishes on the next pass.
 */
const MAX_OCCURRENCES_PER_RUN = 400;

/** A scheduled price change, as the generator sees it. */
type AmountChange = { amount: Prisma.Decimal; effectiveFrom: Date };

/** The subscription shape the generator needs. */
type GeneratableSubscription = {
  id: string;
  amount: Prisma.Decimal;
  amountChanges: AmountChange[];
  currency: string;
  description: string | null;
  name: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate: Date | null;
  nextOccurrenceDate: Date | null;
  lastGeneratedDate: Date | null;
  status: SubscriptionStatus;
  categoryId: string;
  userId: string;
  user: { timezone: string | null };
};

/** Price changes must be ordered for amountFor()'s scan and the serializer. */
const AMOUNT_CHANGES_INCLUDE = {
  amountChanges: { orderBy: { effectiveFrom: 'asc' } },
} as const;

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListSubscriptionsQuery) {
    await this.runDueGenerations(userId);
    const subs = await this.prisma.subscription.findMany({
      where: { userId, ...(q.status && { status: q.status }) },
      orderBy: [{ status: 'asc' }, { nextOccurrenceDate: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { expenses: true } }, ...AMOUNT_CHANGES_INCLUDE },
    });
    return subs.map(this.serialize);
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    await this.assertCategoryAccessible(userId, dto.categoryId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const today = todayInTimezone(user?.timezone);

    // Backfill on: start the cursor at the beginning of the schedule so the
    // first generation pass materialises the history. Off: skip straight to
    // the first period that has not happened yet.
    const first = dto.backfillPastOccurrences
      ? dto.startDate
      : nextOccurrenceOnOrAfter(dto.startDate, dto.frequency, today).date;
    const finished = dto.endDate !== undefined && dto.endDate !== null && first > dto.endDate;

    const created = await this.prisma.subscription.create({
      data: {
        name: dto.name,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        // An empty note is stored as absent, not as an empty string.
        description: dto.description || null,
        frequency: dto.frequency,
        startDate: toDbDate(dto.startDate),
        endDate: dto.endDate ? toDbDate(dto.endDate) : null,
        nextOccurrenceDate: finished ? null : toDbDate(first),
        categoryId: dto.categoryId,
        userId,
      },
    });

    await this.generateFor({
      ...created,
      amountChanges: [],
      user: { timezone: user?.timezone ?? null },
    });
    return this.findOne(userId, created.id);
  }

  async findOne(userId: string, id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { _count: { select: { expenses: true } }, ...AMOUNT_CHANGES_INCLUDE },
    });
    if (!sub) throw new NotFoundException();
    if (sub.userId !== userId) throw new ForbiddenException();
    return this.serialize(sub);
  }

  async update(userId: string, id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
      include: { user: { select: { timezone: true } }, ...AMOUNT_CHANGES_INCLUDE },
    });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    if (dto.categoryId) await this.assertCategoryAccessible(userId, dto.categoryId);

    const today = todayInTimezone(existing.user.timezone);
    const existingStart = toDateString(existing.startDate);
    const startDate = dto.startDate ?? existingStart;
    const frequency = dto.frequency ?? existing.frequency;
    const endDate =
      dto.endDate !== undefined
        ? dto.endDate
        : existing.endDate && toDateString(existing.endDate);

    // The zod update schema is `.partial()`, so the cross-field check from the
    // create schema is gone — and could not live there anyway, since a PATCH
    // may send only `endDate`. Re-check it against the persisted start date.
    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before the start date');
    }

    const status = dto.status ?? existing.status;
    const scheduleChanged = startDate !== existingStart || frequency !== existing.frequency;
    const resuming = status === 'ACTIVE' && existing.status !== 'ACTIVE';

    let nextOccurrenceDate = existing.nextOccurrenceDate;
    if (status === 'ACTIVE' && (scheduleChanged || resuming || existing.nextOccurrenceDate === null)) {
      // Re-anchor onto the (possibly new) grid. Never behind what has already
      // been generated, so old charges are never interleaved with new ones —
      // and resuming does not backfill the paused gap.
      const floor = existing.lastGeneratedDate
        ? maxDateString(today, dayAfter(toDateString(existing.lastGeneratedDate)))
        : today;
      const next = nextOccurrenceOnOrAfter(startDate, frequency, floor).date;
      nextOccurrenceDate = endDate && next > endDate ? null : toDbDate(next);
    } else if (endDate && nextOccurrenceDate && toDateString(nextOccurrenceDate) > endDate) {
      nextOccurrenceDate = null;
    }

    // `amountFor` prefers the newest change effective by the occurrence date,
    // so once one is in force the base amount is dead weight. Editing the
    // amount has to become a change effective today, or the edit would look
    // like it saved and then charge the old price forever.
    let amountChanges = existing.amountChanges;
    if (dto.amount && amountChanges.some((c) => toDateString(c.effectiveFrom) <= today)) {
      await this.prisma.subscriptionAmountChange.upsert({
        where: {
          subscriptionId_effectiveFrom: { subscriptionId: id, effectiveFrom: toDbDate(today) },
        },
        create: {
          subscriptionId: id,
          amount: new Prisma.Decimal(dto.amount),
          effectiveFrom: toDbDate(today),
        },
        update: { amount: new Prisma.Decimal(dto.amount) },
      });
      amountChanges = await this.prisma.subscriptionAmountChange.findMany({
        where: { subscriptionId: id },
        orderBy: { effectiveFrom: 'asc' },
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.amount && { amount: new Prisma.Decimal(dto.amount) }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.startDate && { startDate: toDbDate(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? toDbDate(dto.endDate) : null }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.status && { status: dto.status }),
        nextOccurrenceDate,
      },
    });

    if (updated.status === 'ACTIVE') {
      await this.generateFor({
        ...updated,
        amountChanges,
        user: { timezone: existing.user.timezone },
      });
    }
    return this.findOne(userId, id);
  }

  /**
   * Permanently removes the subscription. Expenses it already generated stay
   * in the ledger — the FK is `onDelete: SetNull` — so historical months keep
   * their totals.
   */
  async remove(userId: string, id: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.subscription.delete({ where: { id } });
  }

  /**
   * Materialises every period that has come due, for one user or for everyone.
   * Idempotent: safe to call from a read, a cron sweep and a manual trigger at
   * the same time.
   */
  async runDueGenerations(userId?: string) {
    // There is no single "today" across timezones, so the SQL filter is a
    // generous bound (the spread is at most ±14h) and each user's real
    // calendar day is applied in JS inside generateFor.
    const bound = toDbDate(dayAfter(todayInTimezone('UTC')));
    const due = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextOccurrenceDate: { not: null, lte: bound },
        ...(userId && { userId }),
      },
      include: { user: { select: { timezone: true } }, ...AMOUNT_CHANGES_INCLUDE },
    });

    let generated = 0;
    for (const sub of due) {
      generated += await this.generateFor(sub);
    }
    return { generated, subscriptionsProcessed: due.length };
  }

  /** Materialises the due periods of a single subscription. Returns how many. */
  private async generateFor(sub: GeneratableSubscription): Promise<number> {
    if (sub.status !== 'ACTIVE' || !sub.nextOccurrenceDate) return 0;

    const today = todayInTimezone(sub.user.timezone);
    const startDate = toDateString(sub.startDate);
    const endDate = sub.endDate ? toDateString(sub.endDate) : null;
    const originalNext = toDateString(sub.nextOccurrenceDate);

    // Normalise the stored cursor onto the schedule grid and recover its index.
    let { date: cursor, index } = nextOccurrenceOnOrAfter(startDate, sub.frequency, originalNext);
    let lastGenerated = sub.lastGeneratedDate ? toDateString(sub.lastGeneratedDate) : null;
    let generated = 0;
    let guard = 0;

    while (cursor <= today && (!endDate || cursor <= endDate) && guard < MAX_OCCURRENCES_PER_RUN) {
      guard += 1;
      try {
        await this.prisma.expense.create({
          data: {
            amount: this.amountFor(sub, cursor),
            currency: sub.currency,
            // `||`, not `??`: an untouched note field arrives as "", and a
            // blank description would leave nameless rows in the ledger and an
            // empty bucket in the top-merchants report.
            description: sub.description || sub.name,
            date: toDbDate(cursor),
            categoryId: sub.categoryId,
            userId: sub.userId,
            subscriptionId: sub.id,
          },
        });
        generated += 1;
        lastGenerated = cursor;
      } catch (err) {
        // A concurrent pass already materialised this period. The unique index
        // on (subscriptionId, date) is what makes double-charging impossible.
        if (!isUniqueViolation(err)) throw err;
        lastGenerated = lastGenerated ? maxDateString(lastGenerated, cursor) : cursor;
      }
      index += 1;
      cursor = occurrenceOn(startDate, sub.frequency, index);
    }

    const finished = endDate !== null && cursor > endDate;
    // Nothing moved (typically: not yet due in this user's timezone) — skip the
    // write so a read-triggered catch-up stays read-only.
    if (generated === 0 && cursor === originalNext && !finished) return 0;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        nextOccurrenceDate: finished ? null : toDbDate(cursor),
        ...(lastGenerated && { lastGeneratedDate: toDbDate(lastGenerated) }),
      },
    });
    return generated;
  }

  /**
   * The price in force for a given occurrence: the latest scheduled change
   * effective on or before it, falling back to the subscription's own amount.
   */
  private amountFor(sub: GeneratableSubscription, occurrence: string): Prisma.Decimal {
    let price = sub.amount;
    for (const change of sub.amountChanges) {
      if (toDateString(change.effectiveFrom) <= occurrence) price = change.amount;
      else break; // ordered by effectiveFrom ascending
    }
    return price;
  }

  async addAmountChange(userId: string, id: string, dto: CreateAmountChangeDto) {
    await this.findOne(userId, id); // ownership check
    try {
      await this.prisma.subscriptionAmountChange.create({
        data: {
          subscriptionId: id,
          amount: new Prisma.Decimal(dto.amount),
          effectiveFrom: toDbDate(dto.effectiveFrom),
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A price change already exists for that date');
      }
      throw err;
    }
    return this.findOne(userId, id);
  }

  async removeAmountChange(userId: string, id: string, changeId: string) {
    await this.findOne(userId, id); // ownership check
    const change = await this.prisma.subscriptionAmountChange.findUnique({
      where: { id: changeId },
    });
    if (!change || change.subscriptionId !== id) throw new NotFoundException();
    await this.prisma.subscriptionAmountChange.delete({ where: { id: changeId } });
    return this.findOne(userId, id);
  }

  private async assertCategoryAccessible(userId: string, categoryId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    if (!cat.isSystem && cat.userId !== userId) throw new ForbiddenException('Category not yours');
  }

  private serialize = (s: {
    id: string;
    name: string;
    amount: Prisma.Decimal;
    currency: string;
    description: string | null;
    frequency: RecurrenceFrequency;
    startDate: Date;
    endDate: Date | null;
    nextOccurrenceDate: Date | null;
    lastGeneratedDate: Date | null;
    status: SubscriptionStatus;
    categoryId: string;
    createdAt: Date;
    _count: { expenses: number };
    amountChanges: { id: string; amount: Prisma.Decimal; effectiveFrom: Date }[];
  }) => ({
    id: s.id,
    name: s.name,
    amount: s.amount.toFixed(2),
    currency: s.currency,
    description: s.description,
    frequency: s.frequency,
    startDate: toDateString(s.startDate),
    endDate: s.endDate && toDateString(s.endDate),
    nextOccurrenceDate: s.nextOccurrenceDate && toDateString(s.nextOccurrenceDate),
    lastGeneratedDate: s.lastGeneratedDate && toDateString(s.lastGeneratedDate),
    status: s.status,
    categoryId: s.categoryId,
    expenseCount: s._count.expenses,
    amountChanges: s.amountChanges.map((c) => ({
      id: c.id,
      amount: c.amount.toFixed(2),
      effectiveFrom: toDateString(c.effectiveFrom),
    })),
    createdAt: s.createdAt.toISOString(),
  });
}

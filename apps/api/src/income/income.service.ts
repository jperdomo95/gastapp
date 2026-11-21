import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateIncomeDto, CreateIncomeSourceDto, ListIncomeQuery, PayCycle, UpdateIncomeSourceDto,
} from '@gastapp/types';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { toDateString, toDbDate } from '../subscriptions/recurrence';
import { todayInTimezone } from '../common/timezone';
import { computePayCycle, shiftDays } from './pay-cycle';

/** Far enough back to reach the start of the previous pay cycle, late paydays included. */
const CYCLE_LOOKBACK_DAYS = 80;

type SourceRow = Prisma.IncomeSourceGetPayload<object>;
type IncomeRow = Prisma.IncomeGetPayload<object>;

@Injectable()
export class IncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // --- Sources -------------------------------------------------------------

  async listSources(userId: string) {
    const rows = await this.prisma.incomeSource.findMany({
      where: { userId },
      orderBy: [{ active: 'desc' }, { amount: 'desc' }],
    });
    return rows.map(serializeSource);
  }

  async createSource(userId: string, dto: CreateIncomeSourceDto) {
    const row = await this.prisma.incomeSource.create({
      data: {
        name: dto.name,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        payDayFrom: dto.payDayFrom,
        payDayTo: dto.payDayTo,
        matchText: dto.matchText || null,
        active: dto.active,
        userId,
      },
    });
    return serializeSource(row);
  }

  async updateSource(userId: string, id: string, dto: UpdateIncomeSourceDto) {
    await this.ownedSource(userId, id);
    const row = await this.prisma.incomeSource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: new Prisma.Decimal(dto.amount) }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.payDayFrom !== undefined && { payDayFrom: dto.payDayFrom }),
        ...(dto.payDayTo !== undefined && { payDayTo: dto.payDayTo }),
        ...(dto.matchText !== undefined && { matchText: dto.matchText || null }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    return serializeSource(row);
  }

  async removeSource(userId: string, id: string) {
    await this.ownedSource(userId, id);
    // Recorded deposits stay (sourceId is set to null by the FK).
    await this.prisma.incomeSource.delete({ where: { id } });
  }

  // --- Deposits ------------------------------------------------------------

  async list(userId: string, q: ListIncomeQuery) {
    const rows = await this.prisma.income.findMany({
      where: {
        userId,
        ...((q.from || q.to) && {
          date: { ...(q.from && { gte: toDbDate(q.from) }), ...(q.to && { lte: toDbDate(q.to) }) },
        }),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return rows.map(serializeIncome);
  }

  async create(userId: string, dto: CreateIncomeDto) {
    if (dto.sourceId) await this.ownedSource(userId, dto.sourceId);
    const row = await this.prisma.income.create({
      data: {
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        description: dto.description || null,
        date: toDbDate(dto.date),
        sourceId: dto.sourceId ?? null,
        userId,
      },
    });
    return serializeIncome(row);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.income.delete({ where: { id } });
  }

  // --- Pay cycle -----------------------------------------------------------

  /** The current pay cycle, or null until the user has an active income source. */
  async payCycle(userId: string): Promise<PayCycle | null> {
    // Charges that came due belong in "spent", not "committed".
    await this.subscriptions.runDueGenerations(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { timezone: true },
    });
    const today = todayInTimezone(user?.timezone);
    const since = toDbDate(shiftDays(today, -CYCLE_LOOKBACK_DAYS));

    const [sources, incomes, expenses, subscriptions] = await Promise.all([
      this.prisma.incomeSource.findMany({ where: { userId, active: true } }),
      this.prisma.income.findMany({
        where: { userId, date: { gte: since } },
        select: { date: true, amount: true, currency: true, sourceId: true },
      }),
      this.prisma.expense.findMany({
        where: { userId, date: { gte: since } },
        select: { date: true, amount: true, currency: true },
      }),
      this.prisma.subscription.findMany({
        where: { userId, status: 'ACTIVE', nextOccurrenceDate: { not: null } },
        select: {
          amount: true, currency: true, frequency: true,
          startDate: true, endDate: true, nextOccurrenceDate: true,
        },
      }),
    ]);

    return computePayCycle({
      today,
      sources: sources.map((s) => ({ ...s, amount: s.amount.toFixed(2) })),
      incomes: incomes.map((i) => ({
        ...i, date: toDateString(i.date), amount: i.amount.toFixed(2),
      })),
      expenses: expenses.map((e) => ({
        ...e, date: toDateString(e.date), amount: e.amount.toFixed(2),
      })),
      subscriptions: subscriptions.map((s) => ({
        amount: s.amount.toFixed(2),
        currency: s.currency,
        frequency: s.frequency,
        startDate: toDateString(s.startDate),
        endDate: s.endDate ? toDateString(s.endDate) : null,
        nextOccurrenceDate: s.nextOccurrenceDate ? toDateString(s.nextOccurrenceDate) : null,
      })),
    });
  }

  private async ownedSource(userId: string, id: string) {
    const source = await this.prisma.incomeSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Income source not found');
    if (source.userId !== userId) throw new ForbiddenException();
    return source;
  }
}

const serializeSource = (s: SourceRow) => ({
  id: s.id,
  name: s.name,
  amount: s.amount.toFixed(2),
  currency: s.currency,
  payDayFrom: s.payDayFrom,
  payDayTo: s.payDayTo,
  matchText: s.matchText,
  active: s.active,
  createdAt: s.createdAt.toISOString(),
});

const serializeIncome = (i: IncomeRow) => ({
  id: i.id,
  amount: i.amount.toFixed(2),
  currency: i.currency,
  description: i.description,
  date: toDateString(i.date),
  sourceId: i.sourceId,
  createdAt: i.createdAt.toISOString(),
});

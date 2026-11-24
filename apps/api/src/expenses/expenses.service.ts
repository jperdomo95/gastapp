import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateExpenseDto, UpdateExpenseDto, ListExpensesQuery, ImportExpensesResult,
} from '@gastapp/types';
import { parseBankCsv, type ParsedExpenseRow } from './csv-import';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { toDateString, toDbDate } from '../subscriptions/recurrence';
import { matchIncomeSource } from '../income/match-source';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async list(userId: string, q: ListExpensesQuery) {
    // Materialise any recurring charges that have come due, so the ledger is
    // current whether or not the daily sweep has run. Idempotent.
    await this.subscriptions.runDueGenerations(userId);

    const where: Prisma.ExpenseWhereInput = {
      userId,
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...((q.from || q.to) && {
        date: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) },
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      items: items.map(this.serialize),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.assertCategoryAccessible(userId, dto.categoryId);
    const created = await this.prisma.expense.create({
      data: {
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        description: dto.description ?? null,
        date: new Date(dto.date),
        categoryId: dto.categoryId,
        userId,
      },
    });
    return this.serialize(created);
  }

  async importFromCsv(
    userId: string,
    categoryId: string,
    file: Buffer,
    options: { includeIncome?: boolean } = {},
  ): Promise<ImportExpensesResult> {
    await this.assertCategoryAccessible(userId, categoryId);

    const { rows, credits, skipped, errors } = parseBankCsv(file.toString('utf8'));
    const deposits = options.includeIncome ? credits : [];
    if (rows.length === 0 && deposits.length === 0 && errors.length > 0) {
      // Nothing importable and the file looked malformed — surface why.
      throw new BadRequestException({ message: 'Could not import CSV', errors });
    }

    // Bank exports carry no currency column; the app is USD-only.
    const recorded = deposits.length > 0 ? await this.newDeposits(userId, deposits) : [];
    const matchable = recorded.length > 0
      ? (await this.prisma.incomeSource.findMany({
          where: { userId },
          select: { id: true, amount: true, currency: true, matchText: true, active: true },
        })).map((s) => ({ ...s, amount: s.amount.toFixed(2) }))
      : [];

    // One transaction: a failed income write must not leave the expenses saved,
    // or the user's retry would import every debit twice.
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    if (rows.length > 0) {
      writes.push(this.prisma.expense.createMany({
        data: rows.map((r) => ({
          amount: new Prisma.Decimal(r.amount),
          currency: 'USD',
          description: r.description || null,
          date: toDbDate(r.date),
          categoryId,
          userId,
        })),
      }));
    }
    if (recorded.length > 0) {
      writes.push(this.prisma.income.createMany({
        data: recorded.map((d) => ({
          amount: new Prisma.Decimal(d.amount),
          currency: 'USD',
          description: d.description || null,
          date: toDbDate(d.date),
          sourceId: matchIncomeSource(matchable, { ...d, currency: 'USD' }),
          userId,
        })),
      }));
    }
    if (writes.length > 0) await this.prisma.$transaction(writes);

    return {
      imported: rows.length,
      incomeImported: recorded.length,
      // Credits recorded as income were not skipped; already-recorded ones were.
      skipped: skipped - recorded.length,
      errors,
    };
  }

  /**
   * The deposits not already recorded, so re-importing an overlapping statement
   * doesn't count the same money twice. Matches on date, amount and description;
   * a deposit repeated within the file is kept as many times as it appears beyond
   * what is already stored (two equal transfers on one day are both real).
   */
  private async newDeposits(userId: string, deposits: ParsedExpenseRow[]) {
    const dates = deposits.map((d) => d.date).sort();
    const existing = await this.prisma.income.findMany({
      where: {
        userId,
        date: { gte: toDbDate(dates[0]!), lte: toDbDate(dates[dates.length - 1]!) },
      },
      select: { date: true, amount: true, description: true },
    });
    const key = (date: string, amount: string, description: string | null) =>
      `${date}|${amount}|${(description ?? '').trim()}`;
    const stored = new Map<string, number>();
    for (const e of existing) {
      const k = key(toDateString(e.date), e.amount.toFixed(2), e.description);
      stored.set(k, (stored.get(k) ?? 0) + 1);
    }
    return deposits.filter((d) => {
      const k = key(d.date, d.amount, d.description || null);
      const left = stored.get(k) ?? 0;
      if (left === 0) return true;
      stored.set(k, left - 1);
      return false;
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    if (dto.categoryId) await this.assertCategoryAccessible(userId, dto.categoryId);

    try {
      const updated = await this.prisma.expense.update({
        where: { id },
        data: {
          ...(dto.amount && { amount: new Prisma.Decimal(dto.amount) }),
          ...(dto.currency && { currency: dto.currency }),
          ...(dto.description !== undefined && { description: dto.description ?? null }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
        },
      });
      return this.serialize(updated);
    } catch (err) {
      // Moving a generated charge onto a date its subscription already covers
      // collides with the unique index that keeps generation idempotent.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          'This subscription already has a charge on that date',
        );
      }
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.expense.delete({ where: { id } });
  }

  private async assertCategoryAccessible(userId: string, categoryId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    if (!cat.isSystem && cat.userId !== userId) throw new ForbiddenException('Category not yours');
  }

  private serialize = (e: {
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    description: string | null;
    date: Date;
    categoryId: string;
    subscriptionId: string | null;
    createdAt: Date;
  }) => ({
    id: e.id,
    amount: e.amount.toFixed(2),
    currency: e.currency,
    description: e.description,
    date: e.date.toISOString().slice(0, 10),
    categoryId: e.categoryId,
    subscriptionId: e.subscriptionId,
    createdAt: e.createdAt.toISOString(),
  });
}

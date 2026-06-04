import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateExpenseDto, UpdateExpenseDto, ListExpensesQuery, ImportExpensesResult,
} from '@gastapp/types';
import { parseBankCsv } from './csv-import';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ListExpensesQuery) {
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
  ): Promise<ImportExpensesResult> {
    await this.assertCategoryAccessible(userId, categoryId);

    const { rows, skipped, errors } = parseBankCsv(file.toString('utf8'));
    if (rows.length === 0 && errors.length > 0) {
      // Nothing importable and the file looked malformed — surface why.
      throw new BadRequestException({ message: 'Could not import CSV', errors });
    }

    if (rows.length > 0) {
      await this.prisma.expense.createMany({
        data: rows.map((r) => ({
          amount: new Prisma.Decimal(r.amount),
          currency: 'USD',
          description: r.description || null,
          date: r.date,
          categoryId,
          userId,
        })),
      });
    }

    return { imported: rows.length, skipped, errors };
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();
    if (dto.categoryId) await this.assertCategoryAccessible(userId, dto.categoryId);

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
    createdAt: Date;
  }) => ({
    id: e.id,
    amount: e.amount.toFixed(2),
    currency: e.currency,
    description: e.description,
    date: e.date.toISOString(),
    categoryId: e.categoryId,
    createdAt: e.createdAt.toISOString(),
  });
}

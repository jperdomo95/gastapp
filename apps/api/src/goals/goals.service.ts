import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateSavingsGoalDto, SavingsGoal, UpdateSavingsGoalDto } from '@gastapp/types';
import { PrismaService } from '../prisma/prisma.service';
import { toDateString, toDbDate } from '../subscriptions/recurrence';
import { todayInTimezone } from '../common/timezone';
import { goalProgress } from './goal-progress';

type GoalRow = Prisma.SavingsGoalGetPayload<{ include: { bucket: true } }>;

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<SavingsGoal[]> {
    const [goals, today] = await Promise.all([
      this.prisma.savingsGoal.findMany({
        where: { userId }, include: { bucket: true }, orderBy: { createdAt: 'asc' },
      }),
      this.today(userId),
    ]);
    if (goals.length === 0) return [];

    // Only payments to a linked set-aside count, so only those expenses are needed.
    const earliest = goals.map((g) => g.baseDate).reduce((a, b) => (a < b ? a : b));
    const expenses = goals.some((g) => g.bucket)
      ? await this.prisma.expense.findMany({
          where: { userId, date: { gt: earliest } },
          select: {
            date: true, amount: true, currency: true, description: true, categoryId: true,
            subscriptionId: true,
          },
        })
      : [];
    const ledger = expenses.map((e) => ({
      date: toDateString(e.date),
      amount: e.amount.toFixed(2),
      currency: e.currency,
      description: e.description,
      categoryId: e.categoryId,
      fromSubscription: e.subscriptionId !== null,
    }));

    return goals.map((g) => this.serialize(g, ledger, today));
  }

  async create(userId: string, dto: CreateSavingsGoalDto) {
    if (dto.bucketId) await this.ownedBucket(userId, dto.bucketId);
    await this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currency: dto.currency,
        milestones: dto.milestones.map((m) => new Prisma.Decimal(m)),
        baseAmount: new Prisma.Decimal(dto.baseAmount),
        baseDate: toDbDate(await this.today(userId)),
        bucketId: dto.bucketId || null,
        userId,
      },
    });
    return this.list(userId);
  }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    await this.owned(userId, id);
    if (dto.bucketId) await this.ownedBucket(userId, dto.bucketId);
    await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: new Prisma.Decimal(dto.targetAmount) }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.milestones !== undefined && {
          milestones: dto.milestones.map((m) => new Prisma.Decimal(m)),
        }),
        // A new balance is as of today; contributions count again from tomorrow.
        ...(dto.baseAmount !== undefined && {
          baseAmount: new Prisma.Decimal(dto.baseAmount),
          baseDate: toDbDate(await this.today(userId)),
        }),
        ...(dto.bucketId !== undefined && { bucketId: dto.bucketId || null }),
      },
    });
    return this.list(userId);
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.savingsGoal.delete({ where: { id } });
  }

  private async today(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    return todayInTimezone(user?.timezone);
  }

  private async owned(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException();
    return goal;
  }

  private async ownedBucket(userId: string, id: string) {
    const bucket = await this.prisma.budgetBucket.findUnique({ where: { id } });
    if (!bucket) throw new NotFoundException('Set-aside not found');
    if (bucket.userId !== userId) throw new ForbiddenException();
  }

  private serialize(
    g: GoalRow,
    ledger: Parameters<typeof goalProgress>[1],
    today: string,
  ): SavingsGoal {
    const base = {
      targetAmount: g.targetAmount.toFixed(2),
      currency: g.currency,
      milestones: g.milestones.map((m) => m.toFixed(2)),
      baseAmount: g.baseAmount.toFixed(2),
      baseDate: toDateString(g.baseDate),
    };
    return {
      id: g.id,
      name: g.name,
      ...base,
      bucketId: g.bucketId,
      progress: goalProgress(
        { ...base, bucket: g.bucket ? { ...g.bucket, amount: g.bucket.amount.toFixed(2) } : null },
        ledger,
        today,
      ),
    };
  }
}

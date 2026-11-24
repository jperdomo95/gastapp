import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    return this.withProgress(userId, goals, today);
  }

  /**
   * Fold each matching goal's current progress into its balance as of today.
   * Contributions only count while a set-aside is linked, so this must run
   * before a goal's set-aside is changed, unlinked or deleted — otherwise the
   * money saved since the last balance update would drop out.
   */
  async freezeBalances(userId: string, where: Prisma.SavingsGoalWhereInput) {
    const [goals, today] = await Promise.all([
      this.prisma.savingsGoal.findMany({ where: { ...where, userId }, include: { bucket: true } }),
      this.today(userId),
    ]);
    if (goals.length === 0) return;
    const current = await this.withProgress(userId, goals, today);
    await this.prisma.$transaction(current.map((g) =>
      this.prisma.savingsGoal.update({
        where: { id: g.id },
        data: { baseAmount: new Prisma.Decimal(g.progress.saved), baseDate: toDbDate(today) },
      })));
  }

  private async withProgress(userId: string, goals: GoalRow[], today: string): Promise<SavingsGoal[]> {
    if (goals.length === 0) return [];

    // Only payments to a linked set-aside count, so only those expenses are needed.
    const linked = goals.some((g) => g.bucket);
    const earliest = goals.map((g) => g.baseDate).reduce((a, b) => (a < b ? a : b));
    const [expenses, buckets] = linked
      ? await Promise.all([
          this.prisma.expense.findMany({
            where: { userId, date: { gt: earliest } },
            select: {
              date: true, amount: true, currency: true, description: true, categoryId: true,
              subscriptionId: true,
            },
          }),
          // Pay-cycle order, so an expense matching two set-asides pays the same one in both views.
          this.prisma.budgetBucket.findMany({
            where: { userId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          }),
        ])
      : [[], []];
    const allBuckets = buckets.map((b) => ({ ...b, amount: b.amount.toFixed(2) }));
    const ledger = expenses.map((e) => ({
      date: toDateString(e.date),
      amount: e.amount.toFixed(2),
      currency: e.currency,
      description: e.description,
      categoryId: e.categoryId,
      fromSubscription: e.subscriptionId !== null,
    }));

    return goals.map((g) => this.serialize(g, ledger, allBuckets, today));
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
    const existing = await this.owned(userId, id);
    if (dto.bucketId) await this.ownedBucket(userId, dto.bucketId);
    const bucketChanges = dto.bucketId !== undefined && (dto.bucketId || null) !== existing.bucketId;
    // Keep what was saved through the old set-aside, unless a new balance is being entered anyway.
    if (bucketChanges && dto.baseAmount === undefined) await this.freezeBalances(userId, { id });
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
    // A transfer or reserve isn't saving: its payments would count toward the goal.
    if (bucket.kind !== 'SAVINGS') throw new BadRequestException('Link a savings set-aside');
  }

  private serialize(
    g: GoalRow,
    ledger: Parameters<typeof goalProgress>[1],
    allBuckets: NonNullable<Parameters<typeof goalProgress>[0]['allBuckets']>,
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
        {
          ...base,
          bucket: g.bucket ? { ...g.bucket, amount: g.bucket.amount.toFixed(2) } : null,
          allBuckets,
        },
        ledger,
        today,
      ),
    };
  }
}

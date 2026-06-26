import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ReportRangeQuery } from '@gastapp/types';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlyTotals(userId: string, q: ReportRangeQuery) {
    const rows = await this.prisma.$queryRaw<{ month: string; total: Prisma.Decimal }[]>`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
             SUM("amount")::numeric(12,2) AS total
      FROM "Expense"
      WHERE "userId" = ${userId}
        AND "date" >= ${new Date(q.from)}
        AND "date" <= ${new Date(q.to)}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ month: r.month, total: r.total.toFixed(2) }));
  }

  async categoryBreakdown(userId: string, q: ReportRangeQuery) {
    const rows = await this.prisma.$queryRaw<
      { categoryId: string; categoryName: string; total: Prisma.Decimal }[]
    >`
      SELECT c."id" AS "categoryId",
             c."name" AS "categoryName",
             SUM(e."amount")::numeric(12,2) AS total
      FROM "Expense" e
      JOIN "Category" c ON c."id" = e."categoryId"
      WHERE e."userId" = ${userId}
        AND e."date" >= ${new Date(q.from)}
        AND e."date" <= ${new Date(q.to)}
      GROUP BY c."id", c."name"
      ORDER BY total DESC
    `;
    const grandTotal = rows.reduce((acc, r) => acc.add(r.total), new Prisma.Decimal(0));
    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      total: r.total.toFixed(2),
      percentage: grandTotal.isZero()
        ? 0
        : Number(r.total.div(grandTotal).mul(100).toFixed(2)),
    }));
  }

  async topMerchants(userId: string, q: ReportRangeQuery) {
    const rows = await this.prisma.$queryRaw<
      { merchant: string; count: bigint; total: Prisma.Decimal }[]
    >`
      SELECT "description" AS merchant,
             COUNT(*)      AS count,
             SUM("amount")::numeric(12,2) AS total
      FROM "Expense"
      WHERE "userId" = ${userId}
        AND "date" >= ${new Date(q.from)}
        AND "date" <= ${new Date(q.to)}
        AND "description" IS NOT NULL
      GROUP BY "description"
      ORDER BY total DESC
      LIMIT 10
    `;
    return rows.map((r) => ({
      merchant: r.merchant,
      count: Number(r.count),
      total: r.total.toFixed(2),
    }));
  }
}

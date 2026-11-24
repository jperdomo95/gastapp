import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const USER = 'user-1';
const CATEGORY = 'cat-1';

// Synthetic rows in the shape the bank exports use — never real statement data.
const CSV = [
  'Date,Description,Amount',
  '2026-08-03,POS PURCHASE ACME (Ref 00000000001),-1797.10',
  '2026-08-03,TRANSFER IN (Ref 00000000002),327000.00',
  '2026-08-04,MOBILE PAYMENT (Ref 00000000003),-5700.00',
].join('\r\n');

function makePrismaMock() {
  return {
    category: { findUnique: jest.fn() },
    expense: { createMany: jest.fn().mockReturnValue('expense-write') },
    income: {
      createMany: jest.fn().mockReturnValue('income-write'),
      findMany: jest.fn().mockResolvedValue([]),
    },
    incomeSource: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

const csv = (text: string) => Buffer.from(text, 'utf8');

describe('ExpensesService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.category.findUnique.mockResolvedValue({ id: CATEGORY, isSystem: false, userId: USER });
    service = new ExpensesService(
      prisma as unknown as PrismaService,
      {} as unknown as SubscriptionsService,
    );
  });

  describe('importFromCsv', () => {
    // Regression: the parser yields day-only `YYYY-MM-DD` strings, but the
    // `date` column is a Prisma `DateTime` (`@db.Date` only narrows the Postgres
    // type). Forwarding the raw string made Prisma reject the whole batch with
    // "premature end of input. Expected ISO-8601 DateTime", surfacing as a 500.
    it('writes dates as UTC-midnight Dates, not calendar-day strings', async () => {
      await service.importFromCsv(USER, CATEGORY, csv(CSV));

      const { data } = prisma.expense.createMany.mock.calls[0][0];
      for (const row of data) {
        expect(row.date).toBeInstanceOf(Date);
      }
      expect(data.map((r: { date: Date }) => r.date.toISOString())).toEqual([
        '2026-08-03T00:00:00.000Z',
        '2026-08-04T00:00:00.000Z',
      ]);
    });

    it('imports debits, skips credits, and reports the counts', async () => {
      const result = await service.importFromCsv(USER, CATEGORY, csv(CSV));

      expect(result).toEqual({ imported: 2, incomeImported: 0, skipped: 1, errors: [] });
      const { data } = prisma.expense.createMany.mock.calls[0][0];
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        currency: 'USD',
        description: 'POS PURCHASE ACME (Ref 00000000001)',
        categoryId: CATEGORY,
        userId: USER,
      });
      // Credits are inflows, so the sign is dropped and only debits land.
      expect(data.map((r: { amount: Prisma.Decimal }) => r.amount.toFixed(2))).toEqual([
        '1797.10',
        '5700.00',
      ]);
    });

    it('rejects a file with no importable rows', async () => {
      await expect(
        service.importFromCsv(USER, CATEGORY, csv('Nombre;Telefono\nAna;555')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.expense.createMany).not.toHaveBeenCalled();
    });

    it('does not write when every row is a credit', async () => {
      const result = await service.importFromCsv(
        USER,
        CATEGORY,
        csv('Date,Description,Amount\n2026-08-03,TRANSFER IN,500.00'),
      );

      expect(result).toEqual({ imported: 0, incomeImported: 0, skipped: 1, errors: [] });
      expect(prisma.expense.createMany).not.toHaveBeenCalled();
    });

    describe('with includeIncome', () => {
      const PAYROLL = [
        'Date,Description,Amount',
        '2026-08-28,DEPOSITO NOMINA ACME CORP,3100.00',
        '2026-08-28,TRANSFER TO SAVINGS,-500.00',
        '2026-08-30,TRANSFER IN FROM ANA,40.00',
      ].join('\n');

      it('records credit rows as income and stops counting them as skipped', async () => {
        const result = await service.importFromCsv(USER, CATEGORY, csv(PAYROLL), {
          includeIncome: true,
        });

        expect(result).toEqual({ imported: 1, incomeImported: 2, skipped: 0, errors: [] });
        const { data } = prisma.income.createMany.mock.calls[0][0];
        expect(
          data.map((r: { amount: Prisma.Decimal; date: Date; userId: string }) => [
            r.amount.toFixed(2), r.date.toISOString().slice(0, 10), r.userId,
          ]),
        ).toEqual([
          ['3100.00', '2026-08-28', USER],
          ['40.00', '2026-08-30', USER],
        ]);
      });

      it('links a deposit to the income source it matches', async () => {
        prisma.incomeSource.findMany.mockResolvedValue([
          {
            id: 'src-salary', amount: new Prisma.Decimal('3100.00'), currency: 'USD',
            matchText: null, active: true,
          },
        ]);

        await service.importFromCsv(USER, CATEGORY, csv(PAYROLL), { includeIncome: true });

        const { data } = prisma.income.createMany.mock.calls[0][0];
        expect(data.map((r: { sourceId: string | null }) => r.sourceId))
          .toEqual(['src-salary', null]);
      });

      it('writes expenses and income in one transaction', async () => {
        await service.importFromCsv(USER, CATEGORY, csv(PAYROLL), { includeIncome: true });

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction).toHaveBeenCalledWith(['expense-write', 'income-write']);
      });

      it('skips deposits already recorded, so re-importing does not double income', async () => {
        prisma.income.findMany.mockResolvedValue([
          {
            date: new Date('2026-08-28T00:00:00.000Z'),
            amount: new Prisma.Decimal('3100.00'),
            description: 'DEPOSITO NOMINA ACME CORP',
          },
        ]);

        const result = await service.importFromCsv(USER, CATEGORY, csv(PAYROLL), {
          includeIncome: true,
        });

        expect(result).toEqual({ imported: 1, incomeImported: 1, skipped: 1, errors: [] });
        const { data } = prisma.income.createMany.mock.calls[0][0];
        expect(data.map((r: { description: string }) => r.description))
          .toEqual(['TRANSFER IN FROM ANA']);
      });

      it('keeps repeated deposits within one file beyond those already stored', async () => {
        const twice = 'Date,Description,Amount\n2026-08-03,TRANSFER IN,50.00\n2026-08-03,TRANSFER IN,50.00';
        prisma.income.findMany.mockResolvedValue([
          { date: new Date('2026-08-03T00:00:00.000Z'), amount: new Prisma.Decimal('50.00'), description: 'TRANSFER IN' },
        ]);

        const result = await service.importFromCsv(USER, CATEGORY, csv(twice), { includeIncome: true });

        expect(result).toMatchObject({ incomeImported: 1, skipped: 1 });
      });

      it('imports a file of deposits only', async () => {
        const result = await service.importFromCsv(
          USER, CATEGORY, csv('Date,Description,Amount\n2026-08-03,TRANSFER IN,500.00'),
          { includeIncome: true },
        );

        expect(result).toMatchObject({ imported: 0, incomeImported: 1, skipped: 0 });
        expect(prisma.expense.createMany).not.toHaveBeenCalled();
      });
    });

    it('refuses to import into a category owned by someone else', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: CATEGORY, isSystem: false, userId: 'someone-else',
      });

      await expect(service.importFromCsv(USER, CATEGORY, csv(CSV)))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.expense.createMany).not.toHaveBeenCalled();
    });

    it('throws NotFound for a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.importFromCsv(USER, CATEGORY, csv(CSV)))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.expense.createMany).not.toHaveBeenCalled();
    });
  });
});

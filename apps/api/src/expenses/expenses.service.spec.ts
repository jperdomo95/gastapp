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
    expense: { createMany: jest.fn() },
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

      expect(result).toEqual({ imported: 2, skipped: 1, errors: [] });
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

      expect(result).toEqual({ imported: 0, skipped: 1, errors: [] });
      expect(prisma.expense.createMany).not.toHaveBeenCalled();
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

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

const USER = 'user-1';

function makePrismaMock() {
  return {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expense: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('CategoriesService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe('update', () => {
    it('rejects editing a system category', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: true, userId: null });
      await expect(service.update(USER, 'c1', { name: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('rejects editing another user\'s category', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: false, userId: 'someone-else' });
      await expect(service.update(USER, 'c1', { name: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps a duplicate-name violation to a conflict', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: false, userId: USER });
      prisma.category.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
      );
      await expect(service.update(USER, 'c1', { name: 'Food' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('throws NotFound for a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.remove(USER, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes directly when the category has no expenses', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: false, userId: USER });
      prisma.expense.count.mockResolvedValue(0);
      await service.remove(USER, 'c1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws a conflict when expenses exist and no reassign target is given', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: false, userId: USER });
      prisma.expense.count.mockResolvedValue(3);
      await expect(service.remove(USER, 'c1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('reassigns expenses then deletes when a target is given', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'c1', isSystem: false, userId: USER }) // target being deleted
        .mockResolvedValueOnce({ id: 'c2', isSystem: false, userId: USER }); // reassign target
      prisma.expense.count.mockResolvedValue(2);
      prisma.expense.updateMany.mockReturnValue('updateMany-op');
      prisma.category.delete.mockReturnValue('delete-op');
      prisma.$transaction.mockResolvedValue(undefined);

      await service.remove(USER, 'c1', 'c2');

      expect(prisma.expense.updateMany).toHaveBeenCalledWith({
        where: { categoryId: 'c1' },
        data: { categoryId: 'c2' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(['updateMany-op', 'delete-op']);
    });

    it('rejects reassigning to the category being deleted', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', isSystem: false, userId: USER });
      prisma.expense.count.mockResolvedValue(1);
      await expect(service.remove(USER, 'c1', 'c1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

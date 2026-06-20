import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from '@gastapp/types';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const categories = await this.prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { expenses: true } } },
    });
    return categories.map(({ _count, ...c }) => ({ ...c, expenseCount: _count.expenses }));
  }

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      const created = await this.prisma.category.create({
        data: {
          name: dto.name,
          icon: dto.icon ?? null,
          color: dto.color ?? null,
          userId,
          isSystem: false,
        },
      });
      return { ...created, expenseCount: 0 };
    } catch (err) {
      throw this.rethrowDuplicateName(err);
    }
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const existing = await this.assertOwnEditable(userId, id);
    try {
      const updated = await this.prisma.category.update({
        where: { id: existing.id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.icon !== undefined && { icon: dto.icon ?? null }),
          ...(dto.color !== undefined && { color: dto.color ?? null }),
        },
        include: { _count: { select: { expenses: true } } },
      });
      const { _count, ...c } = updated;
      return { ...c, expenseCount: _count.expenses };
    } catch (err) {
      throw this.rethrowDuplicateName(err);
    }
  }

  async remove(userId: string, id: string, reassignTo?: string) {
    await this.assertOwnEditable(userId, id);
    const expenseCount = await this.prisma.expense.count({ where: { categoryId: id } });

    if (expenseCount === 0) {
      await this.prisma.category.delete({ where: { id } });
      return;
    }

    if (!reassignTo) {
      throw new ConflictException({
        message: 'Category has expenses; choose a category to reassign them to',
        expenseCount,
      });
    }
    if (reassignTo === id) {
      throw new ConflictException('Cannot reassign expenses to the category being deleted');
    }
    await this.assertCategoryAccessible(userId, reassignTo);

    await this.prisma.$transaction([
      this.prisma.expense.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignTo },
      }),
      this.prisma.category.delete({ where: { id } }),
    ]);
  }

  /** Loads a category and asserts the caller may edit/delete it (owns it, not a system category). */
  private async assertOwnEditable(userId: string, id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.isSystem) throw new ForbiddenException('System categories cannot be modified');
    if (cat.userId !== userId) throw new ForbiddenException('Category not yours');
    return cat;
  }

  /** Asserts a category exists and is usable by the caller (system or owned). */
  private async assertCategoryAccessible(userId: string, categoryId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    if (!cat.isSystem && cat.userId !== userId) throw new ForbiddenException('Category not yours');
  }

  private rethrowDuplicateName(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A category with that name already exists');
    }
    return err;
  }
}

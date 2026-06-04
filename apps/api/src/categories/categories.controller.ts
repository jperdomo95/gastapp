import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { createCategorySchema, type CreateCategoryDto } from '@gastapp/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { CategoriesService } from './categories.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.categories.listForUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto,
  ) {
    return this.categories.create(user.id, dto);
  }
}

import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  createIncomeSchema, createIncomeSourceSchema, listIncomeQuerySchema, updateIncomeSourceSchema,
  type CreateIncomeDto, type CreateIncomeSourceDto, type ListIncomeQuery,
  type UpdateIncomeSourceDto,
} from '@gastapp/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IncomeService } from './income.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('income')
@UseGuards(JwtAuthGuard)
export class IncomeController {
  constructor(private readonly income: IncomeService) {}

  /** The paycheck you are living on now. `null` until an income source exists. */
  @Get('cycle')
  async cycle(@CurrentUser() user: AuthUser) {
    // Wrapped so "no cycle yet" is a JSON body, not an empty 200.
    return { cycle: await this.income.payCycle(user.id) };
  }

  @Get('sources')
  listSources(@CurrentUser() user: AuthUser) {
    return this.income.listSources(user.id);
  }

  @Post('sources')
  createSource(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createIncomeSourceSchema)) dto: CreateIncomeSourceDto,
  ) {
    return this.income.createSource(user.id, dto);
  }

  @Patch('sources/:id')
  updateSource(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIncomeSourceSchema)) dto: UpdateIncomeSourceDto,
  ) {
    return this.income.updateSource(user.id, id, dto);
  }

  @Delete('sources/:id')
  @HttpCode(204)
  removeSource(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.removeSource(user.id, id);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listIncomeQuerySchema)) q: ListIncomeQuery,
  ) {
    return this.income.list(user.id, q);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createIncomeSchema)) dto: CreateIncomeDto,
  ) {
    return this.income.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.income.remove(user.id, id);
  }
}

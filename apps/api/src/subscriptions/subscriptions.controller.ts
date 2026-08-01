import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  createSubscriptionSchema, updateSubscriptionSchema, listSubscriptionsQuerySchema,
  createAmountChangeSchema,
  type CreateSubscriptionDto, type UpdateSubscriptionDto, type ListSubscriptionsQuery,
  type CreateAmountChangeDto,
} from '@gastapp/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listSubscriptionsQuerySchema)) q: ListSubscriptionsQuery,
  ) {
    return this.subscriptions.list(user.id, q);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSubscriptionSchema)) dto: CreateSubscriptionDto,
  ) {
    return this.subscriptions.create(user.id, dto);
  }

  /** Forces a catch-up for the caller. Idempotent — safe to hit repeatedly. */
  @Post('run-generation')
  runGeneration(@CurrentUser() user: AuthUser) {
    return this.subscriptions.runDueGenerations(user.id);
  }

  /** Schedules a future price change; past charges keep the price they were generated with. */
  @Post(':id/price-changes')
  addPriceChange(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createAmountChangeSchema)) dto: CreateAmountChangeDto,
  ) {
    return this.subscriptions.addAmountChange(user.id, id, dto);
  }

  @Delete(':id/price-changes/:changeId')
  removePriceChange(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('changeId') changeId: string,
  ) {
    return this.subscriptions.removeAmountChange(user.id, id, changeId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSubscriptionSchema)) dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptions.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subscriptions.remove(user.id, id);
  }
}

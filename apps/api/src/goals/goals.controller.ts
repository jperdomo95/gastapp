import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  createSavingsGoalSchema, updateSavingsGoalSchema,
  type CreateSavingsGoalDto, type UpdateSavingsGoalDto,
} from '@gastapp/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GoalsService } from './goals.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

/** Writes return the whole list, since one goal's change can reorder ETAs. */
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.goals.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSavingsGoalSchema)) dto: CreateSavingsGoalDto,
  ) {
    return this.goals.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSavingsGoalSchema)) dto: UpdateSavingsGoalDto,
  ) {
    return this.goals.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goals.remove(user.id, id);
  }
}

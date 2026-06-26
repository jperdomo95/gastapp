import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { reportRangeQuerySchema, type ReportRangeQuery } from '@gastapp/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { ReportsService } from './reports.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('monthly')
  monthly(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(reportRangeQuerySchema)) q: ReportRangeQuery,
  ) {
    return this.reports.monthlyTotals(user.id, q);
  }

  @Get('by-category')
  byCategory(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(reportRangeQuerySchema)) q: ReportRangeQuery,
  ) {
    return this.reports.categoryBreakdown(user.id, q);
  }

  @Get('top-merchants')
  topMerchants(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(reportRangeQuerySchema)) q: ReportRangeQuery,
  ) {
    return this.reports.topMerchants(user.id, q);
  }
}

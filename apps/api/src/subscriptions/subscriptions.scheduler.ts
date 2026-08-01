import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Daily sweep so recurring charges land even for users who do not open the app.
 *
 * Reads already trigger the same catch-up, and generation is idempotent (the
 * unique index on Expense(subscriptionId, date)), so overlapping runs are safe.
 */
@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(private readonly subscriptions: SubscriptionsService) {}

  // 02:00 UTC — pinned explicitly, because @Cron otherwise fires on the host's
  // local time and dev boxes are not UTC. Whoever this misses is picked up by
  // the next day's run or by their next read.
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async generateDueExpenses() {
    try {
      const { generated, subscriptionsProcessed } = await this.subscriptions.runDueGenerations();
      if (generated > 0) {
        this.logger.log(
          `Generated ${generated} expense(s) from ${subscriptionsProcessed} due subscription(s)`,
        );
      }
    } catch (err) {
      // Never let a sweep failure take down the process; the next read or run
      // picks up where this one stopped.
      this.logger.error('Subscription generation sweep failed', err as Error);
    }
  }
}

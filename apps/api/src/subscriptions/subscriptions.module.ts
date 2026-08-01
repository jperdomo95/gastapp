import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsScheduler } from './subscriptions.scheduler';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler],
  // Exported so expenses and reports can run the same lazy catch-up before
  // they read, without duplicating the generation logic.
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

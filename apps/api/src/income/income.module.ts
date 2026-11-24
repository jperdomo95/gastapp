import { Module } from '@nestjs/common';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [SubscriptionsModule, GoalsModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}

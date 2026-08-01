import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // .env.local (dev overrides) wins over .env; neither exists in prod, where
    // Railway injects variables directly.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env.local', '../../.env'] }),
    // Required for @Cron to fire at all — without it the decorated handlers
    // are simply never registered, with no error and no log.
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ExpensesModule,
    ReportsModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { CatalogModule } from './catalog/catalog.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PaymentsModule } from './payments/payments.module';
import { UploadsModule } from './uploads/uploads.module';
import { SupportBotModule } from './support-bot/support-bot.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    CatalogModule,
    AnalyticsModule,
    PaymentsModule,
    UploadsModule,
    SupportBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

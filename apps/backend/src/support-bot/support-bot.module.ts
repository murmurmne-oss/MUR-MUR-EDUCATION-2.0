import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportBotService } from './support-bot.service';
import { SupportBotController } from './support-bot.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SupportBotController],
  providers: [SupportBotService],
})
export class SupportBotModule {}


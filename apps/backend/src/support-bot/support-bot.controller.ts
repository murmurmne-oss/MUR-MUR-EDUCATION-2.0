import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { SupportBotService } from './support-bot.service';
import type { TelegramUpdate } from './support-bot.types';

@Controller('support-bot')
export class SupportBotController {
  constructor(private readonly supportBotService: SupportBotService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ) {
    this.supportBotService.verifySecret(secret);
    await this.supportBotService.handleUpdate(update);
    return { ok: true };
  }
}


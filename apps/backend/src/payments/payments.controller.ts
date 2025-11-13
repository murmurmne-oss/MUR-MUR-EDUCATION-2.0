import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService, type TelegramStarsPayload } from './payments.service';

@Controller('payments/telegram-stars')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-telegram-signature') signature: string | undefined,
    @Body() body: TelegramStarsPayload,
  ) {
    const rawBody = request.rawBody;
    const result = await this.paymentsService.handleTelegramStarsWebhook(body, {
      rawBody,
      signature,
    });
    return result;
  }
}

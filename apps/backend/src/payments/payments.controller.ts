import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  PaymentsService,
  type CreateStarsInvoiceDto,
  type TelegramUpdate,
} from './payments.service';

@Controller('payments/telegram-stars')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoice')
  async createInvoice(@Body() body: CreateStarsInvoiceDto) {
    return this.paymentsService.createStarsInvoice(body);
  }

  @Post('send-invoice')
  async sendInvoice(@Body() body: CreateStarsInvoiceDto) {
    return this.paymentsService.sendStarsInvoice(body);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: TelegramUpdate,
  ) {
    return this.paymentsService.handleTelegramUpdate(body, secret);
  }
}

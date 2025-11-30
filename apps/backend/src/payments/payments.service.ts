import { Injectable, Logger } from '@nestjs/common';
import {
  ActivityActorType,
  Course,
  CourseAccessStatus,
  CourseAccessType,
  Currency,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TelegramUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

type TelegramSuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
};

type TelegramPreCheckoutQuery = {
  id: string;
  from: TelegramUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id?: number;
    from?: TelegramUser;
    chat?: { id: number; type: string };
    text?: string;
    successful_payment?: TelegramSuccessfulPayment;
  };
  channel_post?: {
    from?: TelegramUser;
    successful_payment?: TelegramSuccessfulPayment;
  };
  edited_message?: {
    from?: TelegramUser;
    successful_payment?: TelegramSuccessfulPayment;
  };
  pre_checkout_query?: TelegramPreCheckoutQuery;
};

type InvoicePayload = {
  type: 'course_access';
  courseSlug: string;
  userId: string;
  starsAmount: number;
  issuedAt: number;
};

export type CreateStarsInvoiceDto = {
  courseSlug: string;
  user: {
    id: string | number;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    languageCode?: string | null;
    avatarUrl?: string | null;
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? null;
  private readonly webhookSecret =
    process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim() ?? null;
  private readonly starsPerEuro = this.parseStarsPerEuro(
    process.env.TELEGRAM_STARS_PER_EURO ??
      process.env.NEXT_PUBLIC_TELEGRAM_STARS_PER_EURO ??
      '60',
  );
  private readonly miniappUrl =
    process.env.NEXT_PUBLIC_MINIAPP_URL ??
    process.env.MINIAPP_URL ??
    'https://mini.murmurmne.com';
  private readonly telegramApiBase = this.botToken
    ? `https://api.telegram.org/bot${this.botToken}`
    : null;
  private hasWarnedAboutWebhookSecret = false;

  constructor(private readonly prisma: PrismaService) {}

  async createStarsInvoice(dto: CreateStarsInvoiceDto) {
    if (!this.telegramApiBase) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not configured. Unable to create Telegram Stars invoice.',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { slug: dto.courseSlug },
    });

    if (!course) {
      throw new Error('Курс не найден. Попробуйте выбрать другой курс.');
    }

    if (course.isFree) {
      throw new Error('Этот курс бесплатный — оформлять оплату не нужно.');
    }

    const amountInStars = this.calculateStarsAmount(course);
    if (!amountInStars) {
      throw new Error(
        'Не удалось рассчитать стоимость курса в Telegram Stars. Обновите настройки курса и попробуйте снова.',
      );
    }

    const payload: InvoicePayload = {
      type: 'course_access',
      courseSlug: course.slug,
      userId: dto.user.id.toString(),
      starsAmount: amountInStars,
      issuedAt: Date.now(),
    };

    const title =
      course.title?.slice(0, 32) ?? 'Mur Mur Education · доступ к курсу';
    const description = (
      course.shortDescription ??
      course.description ??
      'Получите доступ к курсу Mur Mur Education.'
    ).slice(0, 255);

    const invoiceUrl = await this.callTelegramApi<string>(
      'createInvoiceLink',
      {
        title,
        description,
        payload: JSON.stringify(payload),
        currency: 'XTR',
        prices: [
          {
            label: title,
            amount: amountInStars,
          },
        ],
        photo_url: course.coverImageUrl ?? undefined,
      },
    );

    return {
      invoiceUrl,
      amountInStars,
    };
  }

  async sendStarsInvoice(dto: CreateStarsInvoiceDto) {
    if (!this.telegramApiBase) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not configured. Unable to send Telegram Stars invoice.',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { slug: dto.courseSlug },
    });

    if (!course) {
      throw new Error('Курс не найден. Попробуйте выбрать другой курс.');
    }

    if (course.isFree) {
      throw new Error('Этот курс бесплатный — оформлять оплату не нужно.');
    }

    const amountInStars = this.calculateStarsAmount(course);
    if (!amountInStars) {
      throw new Error(
        'Не удалось рассчитать стоимость курса в Telegram Stars. Обновите настройки курса и попробуйте снова.',
      );
    }

    const payload: InvoicePayload = {
      type: 'course_access',
      courseSlug: course.slug,
      userId: dto.user.id.toString(),
      starsAmount: amountInStars,
      issuedAt: Date.now(),
    };

    const title =
      course.title?.slice(0, 32) ?? 'Mur Mur Education · доступ к курсу';
    const description = (
      course.shortDescription ??
      course.description ??
      'Получите доступ к курсу Mur Mur Education.'
    ).slice(0, 255);

    await this.callTelegramApi('sendInvoice', {
      chat_id: Number(dto.user.id) || dto.user.id,
      title,
      description,
      payload: JSON.stringify(payload),
      currency: 'XTR',
      prices: [
        {
          label: title,
          amount: amountInStars,
        },
      ],
      provider_token: '',
      photo_url: course.coverImageUrl ?? undefined,
    });

    return { status: 'sent' };
  }

  async handleTelegramUpdate(body: TelegramUpdate, secret?: string) {
    if (!this.verifyWebhookSecret(secret)) {
      this.logger.warn('Rejected Telegram webhook due to invalid secret token');
      return { ok: false, reason: 'invalid_secret' };
    }

    if (!body) {
      this.logger.warn('Received empty Telegram webhook body');
      return { ok: false, reason: 'empty_body' };
    }

    if (body.pre_checkout_query) {
      await this.answerPreCheckoutQuery(body.pre_checkout_query.id, true);
      this.logger.debug(
        `Approved pre-checkout query ${body.pre_checkout_query.id}`,
      );
      return { ok: true };
    }

    // Обработка команды /start
    const message = body.message;
    if (
      message?.text?.startsWith('/start') &&
      message.chat?.type === 'private' &&
      message.chat?.id
    ) {
      await this.handleStartCommand({
        message_id: message.message_id,
        chat: { id: message.chat.id, type: message.chat.type },
        from: message.from,
      });
      return { ok: true };
    }

    const payment =
      body.message?.successful_payment ??
      body.edited_message?.successful_payment ??
      body.channel_post?.successful_payment;

    if (!payment) {
      this.logger.debug('Telegram webhook does not contain a payment event');
      return { ok: true };
    }

    await this.processSuccessfulPayment(
      payment,
      body.message?.from ??
        body.edited_message?.from ??
        body.channel_post?.from,
    );
    return { ok: true };
  }

  private parseStarsPerEuro(raw: string | number | undefined): number | null {
    if (typeof raw === 'number') {
      return Number.isFinite(raw) && raw > 0 ? raw : null;
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const parsed = Number(raw.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  private calculateStarsAmount(course: Course): number | null {
    if (course.isFree) {
      return null;
    }

    if (course.priceCurrency === Currency.TELEGRAM_STAR) {
      return Math.max(1, course.priceAmount);
    }

    if (course.priceCurrency === Currency.EUR) {
      if (!this.starsPerEuro) {
        this.logger.warn(
          'TELEGRAM_STARS_PER_EURO is not configured; unable to convert EUR price.',
        );
        return null;
      }
      const euroValue = course.priceAmount / 100;
      return Math.max(1, Math.round(euroValue * this.starsPerEuro));
    }

    return null;
  }

  private verifyWebhookSecret(secret?: string) {
    if (!this.webhookSecret) {
      if (!this.hasWarnedAboutWebhookSecret) {
        this.logger.warn(
          'TELEGRAM_WEBHOOK_SECRET_TOKEN is not configured. Configure it to validate Telegram webhooks for better security.',
        );
        this.hasWarnedAboutWebhookSecret = true;
      }
      return true;
    }
    return secret === this.webhookSecret;
  }

  private parseInvoicePayload(payload: string): InvoicePayload | null {
    if (!payload) {
      return null;
    }

    try {
      const parsed = JSON.parse(payload) as InvoicePayload;
      if (parsed?.type === 'course_access' && parsed.courseSlug && parsed.userId) {
        return parsed;
      }
    } catch (error) {
      this.logger.error('Failed to parse invoice payload', error);
    }
    return null;
  }

  private async processSuccessfulPayment(
    payment: TelegramSuccessfulPayment,
    telegramUser?: TelegramUser,
  ) {
    const payload = this.parseInvoicePayload(payment.invoice_payload);
    if (!payload) {
      this.logger.error('Received Telegram payment with invalid invoice payload');
      return;
    }

    const course = await this.prisma.course.findUnique({
      where: { slug: payload.courseSlug },
    });

    if (!course) {
      this.logger.error(`Course with slug ${payload.courseSlug} not found`);
      return;
    }

    const userId =
      payload.userId ?? telegramUser?.id?.toString();
    if (!userId) {
      this.logger.error('Unable to determine user ID for paid invoice');
      return;
    }

    const displayName =
      telegramUser?.first_name ??
      telegramUser?.username ??
      telegramUser?.last_name ??
      userId;

    const priceCurrency =
      payment.currency.toUpperCase() === 'XTR'
        ? Currency.TELEGRAM_STAR
        : Currency.EUR;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          firstName: telegramUser?.first_name ?? displayName,
          lastName: telegramUser?.last_name ?? null,
          username: telegramUser?.username ?? null,
          languageCode: telegramUser?.language_code ?? null,
          avatarUrl: telegramUser?.photo_url ?? null,
        },
        create: {
          id: userId,
          firstName: telegramUser?.first_name ?? displayName,
          lastName: telegramUser?.last_name ?? null,
          username: telegramUser?.username ?? null,
          languageCode: telegramUser?.language_code ?? null,
          avatarUrl: telegramUser?.photo_url ?? null,
        },
      });

      await tx.courseEnrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        update: {
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.PURCHASED,
          paymentId: payment.telegram_payment_charge_id,
          paymentStatus: PaymentStatus.PAID,
          pricePaid: payment.total_amount,
          priceCurrency,
          activatedAt: new Date(),
        },
        create: {
          userId,
          courseId: course.id,
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.PURCHASED,
          paymentId: payment.telegram_payment_charge_id,
          paymentStatus: PaymentStatus.PAID,
          pricePaid: payment.total_amount,
          priceCurrency,
          activatedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'payment.telegram-stars',
          metadata: {
            courseSlug: course.slug,
            paymentId: payment.telegram_payment_charge_id,
            amount: payment.total_amount,
            currency: payment.currency,
          },
          courseId: course.id,
        },
      });
    });

    this.logger.log(
      `Activated course ${course.slug} for user ${userId} after successful payment ${payment.telegram_payment_charge_id}`,
    );
  }

  private async callTelegramApi<T>(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    if (!this.telegramApiBase) {
      throw new Error('Telegram API base URL is not configured');
    }
    const response = await fetch(`${this.telegramApiBase}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      ok: boolean;
      result: T;
      description?: string;
    };
    if (!data.ok) {
      throw new Error(
        data.description ?? `Telegram API method ${method} failed`,
      );
    }
    return data.result;
  }

  private async handleStartCommand(message: {
    message_id?: number;
    chat: { id: number; type: string };
    from?: TelegramUser;
  }) {
    if (!this.telegramApiBase) {
      this.logger.warn('Cannot handle /start command: TELEGRAM_BOT_TOKEN not configured');
      return;
    }

    const chatId = message.chat.id;
    const welcomeText =
      'Добар дан! Ово је платформа за сексуално образовање. За почетак учења кликните на дугме да отворите апликацију.';

    try {
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text: welcomeText,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отвори апликацију',
                web_app: { url: this.miniappUrl },
              },
            ],
          ],
        },
      };

      if (message.message_id) {
        payload.reply_to_message_id = message.message_id;
      }

      await this.callTelegramApi('sendMessage', payload);
      this.logger.log(`Sent welcome message to chat ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome message to chat ${chatId}`,
        error,
      );
    }
  }

  private async answerPreCheckoutQuery(
    id: string,
    ok: boolean,
    errorMessage?: string,
  ) {
    try {
      await this.callTelegramApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: id,
        ok,
        error_message: ok ? undefined : errorMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to answer pre-checkout query ${id}`,
        error,
      );
    }
  }
}

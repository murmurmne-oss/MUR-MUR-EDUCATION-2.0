import { Injectable, Logger } from '@nestjs/common';
import {
  ActivityActorType,
  CourseAccessStatus,
  CourseAccessType,
  Currency,
  PaymentStatus,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type TelegramStarsUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramStarsPayload = {
  event: string;
  payload: {
    courseSlug: string;
    paymentId: string;
    amount: number;
    currency: Currency;
    status: 'paid' | 'failed' | 'pending';
  };
  user: TelegramStarsUser;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret =
    process.env.TELEGRAM_STARS_WEBHOOK_SECRET?.trim() ??
    process.env.TELEGRAM_BOT_TOKEN?.trim() ??
    null;

  constructor(private readonly prisma: PrismaService) {}

  async handleTelegramStarsWebhook(
    body: TelegramStarsPayload,
    context?: { rawBody?: Buffer; signature?: string },
  ) {
    if (!this.verifySignature(context?.rawBody, context?.signature)) {
      this.logger.warn('Rejected Telegram Stars webhook due to invalid signature');
      return { ok: false, reason: 'invalid_signature' };
    }

    if (!body || body.event !== 'purchase') {
      this.logger.warn('Unsupported Telegram Stars webhook event', body);
      return { ok: false, reason: 'unsupported_event' };
    }

    if (body.payload.status !== 'paid') {
      this.logger.log(
        `Ignoring webhook with status ${body.payload.status} for payment ${body.payload.paymentId}`,
      );
      return { ok: true };
    }

    const course = await this.prisma.course.findUnique({
      where: { slug: body.payload.courseSlug },
    });

    if (!course) {
      this.logger.error(
        `Course with slug ${body.payload.courseSlug} not found`,
      );
      return { ok: false, reason: 'course_not_found' };
    }

    const userId = body.user.id.toString();
    const displayName =
      body.user.first_name ??
      body.user.username ??
      body.user.last_name ??
      userId;
    const paymentCurrency =
      body.payload.currency === Currency.TELEGRAM_STAR
        ? Currency.TELEGRAM_STAR
        : Currency.EUR;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          firstName: body.user.first_name ?? displayName,
          lastName: body.user.last_name ?? null,
          username: body.user.username ?? null,
          languageCode: body.user.language_code ?? null,
          avatarUrl: body.user.photo_url ?? null,
        },
        create: {
          id: userId,
          firstName: body.user.first_name ?? displayName,
          lastName: body.user.last_name ?? null,
          username: body.user.username ?? null,
          languageCode: body.user.language_code ?? null,
          avatarUrl: body.user.photo_url ?? null,
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
          paymentId: body.payload.paymentId,
          paymentStatus: PaymentStatus.PAID,
          pricePaid: body.payload.amount,
          priceCurrency: paymentCurrency,
          activatedAt: new Date(),
        },
        create: {
          userId,
          courseId: course.id,
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.PURCHASED,
          paymentId: body.payload.paymentId,
          paymentStatus: PaymentStatus.PAID,
          pricePaid: body.payload.amount,
          priceCurrency: paymentCurrency,
          activatedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'payment.telegram-stars',
          metadata: {
            courseSlug: body.payload.courseSlug,
            paymentId: body.payload.paymentId,
            amount: body.payload.amount,
            currency: body.payload.currency,
          },
          courseId: course.id,
        },
      });
    });

    return { ok: true };
  }

  private verifySignature(rawBody?: Buffer, signature?: string): boolean {
    if (!this.webhookSecret) {
      this.logger.error(
        'Telegram Stars webhook secret is not configured. Set TELEGRAM_STARS_WEBHOOK_SECRET or TELEGRAM_BOT_TOKEN.',
      );
      return false;
    }

    if (!rawBody || !signature) {
      this.logger.warn('Missing raw body or signature for Telegram Stars webhook validation');
      return false;
    }

    const normalizedSignature = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    let received: Buffer;
    let expected: Buffer;

    try {
      expected = Buffer.from(
        createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex'),
        'hex',
      );
      received = Buffer.from(normalizedSignature.toLowerCase(), 'hex');
    } catch (error) {
      this.logger.error('Failed to prepare Telegram Stars signature comparison', error);
      return false;
    }

    if (expected.length === 0 || expected.length !== received.length) {
      return false;
    }

    try {
      return timingSafeEqual(expected, received);
    } catch (error) {
      this.logger.error('Failed to compare Telegram Stars signatures', error);
      return false;
    }
  }
}

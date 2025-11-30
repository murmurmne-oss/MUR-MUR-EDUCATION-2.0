import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramMessage, TelegramUpdate } from './support-bot.types';

@Injectable()
export class SupportBotService {
  private readonly logger = new Logger(SupportBotService.name);
  private readonly apiBase?: string;
  private readonly managerChatId?: number;
  private readonly secretToken?: string;
  private readonly miniappUrl?: string;
  private readonly uidTag = /#uid:(\d+)/;
  private readonly isEnabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const token = process.env.MANAGER_BOT_TOKEN;
    const chatId = process.env.MANAGER_CHAT_ID;
    this.secretToken = process.env.MANAGER_BOT_SECRET_TOKEN;
    this.miniappUrl =
      process.env.NEXT_PUBLIC_MINIAPP_URL ??
      process.env.MINIAPP_URL ??
      'https://mini.murmurmne.com';

    if (!token || !chatId) {
      this.isEnabled = false;
      this.logger.warn(
        'Support bot is disabled. Provide MANAGER_BOT_TOKEN and MANAGER_CHAT_ID to enable it.',
      );
      return;
    }

    this.isEnabled = true;
    this.apiBase = `https://api.telegram.org/bot${token}`;
    this.managerChatId = Number(chatId);
    this.secretToken = process.env.MANAGER_BOT_SECRET_TOKEN;
  }

  verifySecret(header: string | undefined) {
    if (!this.secretToken) {
      return;
    }
    if (this.secretToken && header !== this.secretToken) {
      throw new UnauthorizedException('Invalid support bot secret token');
    }
  }

  async handleUpdate(update: TelegramUpdate) {
    if (!this.isEnabled) {
      return;
    }
    const message = update.message;
    if (!message) {
      return;
    }

    if (this.managerChatId && message.chat.id === this.managerChatId) {
      if (message.reply_to_message) {
        await this.handleManagerReply(message);
      }
      return;
    }

    if (message.chat.type === 'private') {
      await this.handleUserMessage(message);
    }
  }

  private async handleUserMessage(message: TelegramMessage) {
    const userId = message.from?.id;
    if (!userId) {
      return;
    }

    const text = message.text ?? message.caption ?? '';
    if (text.startsWith('/start')) {
      await this.handleStartCommand(message, text);
      return;
    }

    await this.forwardToManagers(message, text);
    await this.safeSendMessage(userId, {
      text:
        'Спасибо! Я передал ваше сообщение менеджеру. Он ответит прямо в этом диалоге.',
    });
  }

  private async handleStartCommand(message: TelegramMessage, text: string) {
    const userId = message.from?.id;
    if (!userId) {
      return;
    }

    const payload = text.replace('/start', '').trim();
    if (payload.startsWith('buy_')) {
      const slug = decodeURIComponent(payload.replace(/^buy_/, ''));
      const course = await this.prisma.course.findFirst({
        where: { slug },
        select: { title: true, slug: true },
      });
      const courseLabel = course?.title ?? slug;

      await this.safeNotifyManagers(
        [
          '🛒 Новый запрос на покупку курса',
          this.formatUserLine(message),
          `#uid:${userId}`,
          '',
          `Курс: ${courseLabel}`,
        ].join('\n'),
      );

      await this.safeSendMessage(userId, {
        text: `Добрый день! Мы сообщили менеджеру, что вы хотите купить курс «${courseLabel}». Пожалуйста, дождитесь ответа в этом чате.`,
      });
      return;
    }

    // Приветственное сообщение на сербском с кнопкой для открытия приложения
    const welcomeText =
      'Добар дан! Ово је платформа за сексуално образовање. За почетак учења кликните на дугме да отворите апликацију.';
    
    await this.safeSendMessage(userId, {
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
    });
  }

  private async forwardToManagers(message: TelegramMessage, body: string) {
    if (!message.from || !this.managerChatId) {
      return;
    }

    const lines = [
      '✉️ Новое сообщение',
      this.formatUserLine(message),
      `#uid:${message.from.id}`,
      '',
      body && body.length > 0 ? body : '(без текста)',
    ];

    await this.safeNotifyManagers(lines.join('\n'));
  }

  private async handleManagerReply(message: TelegramMessage) {
    if (!this.managerChatId) {
      return;
    }

    const source = message.reply_to_message;
    if (!source) {
      return;
    }

    const sourceText = source.text ?? source.caption ?? '';
    const match = this.uidTag.exec(sourceText);
    if (!match) {
      return;
    }

    const targetId = Number(match[1]);
    const answer = message.text ?? message.caption;
    if (!answer) {
      return;
    }

    await this.safeSendMessage(targetId, { text: answer });
    await this.safeNotifyManagers(
      '✅ Сообщение отправлено пользователю.',
      message.message_id,
    );
  }

  private formatUserLine(message: TelegramMessage) {
    const from = message.from;
    if (!from) {
      return 'Не удалось определить отправителя';
    }

    const parts = [
      `${from.first_name ?? ''} ${from.last_name ?? ''}`.trim() ||
        'Неизвестный пользователь',
    ];
    if (from.username) {
      parts.push(`@${from.username}`);
    }
    parts.push(`ID: ${from.id}`);
    return parts.join(' · ');
  }

  private async safeSendMessage(
    chatId: number,
    payload: {
      text: string;
      reply_to_message_id?: number;
      reply_markup?: {
        inline_keyboard: Array<
          Array<{
            text: string;
            web_app?: { url: string };
            url?: string;
          }>
        >;
      };
    },
  ) {
    if (!this.isEnabled || !this.apiBase) {
      return;
    }
    try {
      await this.callTelegram('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        ...payload,
      });
    } catch (error) {
      this.logger.error('Failed to send Telegram message', error);
    }
  }

  private async callTelegram(method: string, body: Record<string, unknown>) {
    if (!this.apiBase) {
      return;
    }
    const response = await fetch(`${this.apiBase}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Telegram API error (${method}): ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  private async safeNotifyManagers(text: string, replyId?: number) {
    if (!this.managerChatId) {
      this.logger.warn(
        'Manager chat is not configured; notification skipped.',
      );
      return;
    }
    await this.safeSendMessage(this.managerChatId, {
      text,
      reply_to_message_id: replyId,
    });
  }
}


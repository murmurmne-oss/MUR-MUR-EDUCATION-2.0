import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const validApiKey = process.env.API_KEY?.trim();
    if (!validApiKey || validApiKey.length === 0) {
      // Если API_KEY не настроен, разрешаем доступ (для обратной совместимости)
      // В продакшене это должно быть обязательно!
      console.warn(
        'API_KEY не настроен! Административные endpoints не защищены.',
      );
      return true;
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Неверный или отсутствующий API ключ');
    }

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Проверяем заголовок
    const headerKey =
      request.headers['x-api-key'] || request.headers['authorization'];
    if (headerKey) {
      // Если в Authorization, может быть "Bearer <key>" или просто "<key>"
      const authHeader = Array.isArray(headerKey)
        ? headerKey[0]
        : headerKey;
      return authHeader.replace(/^Bearer\s+/i, '').trim() || null;
    }

    // Проверяем query параметр (менее безопасно, но для совместимости)
    const queryKey = request.query['apiKey'];
    if (queryKey && typeof queryKey === 'string') {
      return queryKey.trim();
    }

    return null;
  }
}


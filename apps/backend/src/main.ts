import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import { AppModule } from './app.module';

function resolveUploadsDir() {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured && configured.length > 0) {
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }
  return join(process.cwd(), 'uploads');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const bodySizeLimit = process.env.BODY_SIZE_LIMIT ?? '10mb';
  app.use(
    json({
      limit: bodySizeLimit,
      verify: (req, _res, buf) => {
        if (buf.length > 0) {
          (req as RawBodyRequest<Request>).rawBody = Buffer.from(buf);
        }
      },
    }),
  );
  app.use(
    urlencoded({
      extended: true,
      limit: bodySizeLimit,
      verify: (req, _res, buf) => {
        if (buf.length > 0) {
          (req as RawBodyRequest<Request>).rawBody = Buffer.from(buf);
        }
      },
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  });

  const uploadsDir = resolveUploadsDir();
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`Mur Mur API listening on port ${port}`);
}
bootstrap().catch((error) => {
  console.error('Failed to bootstrap NestJS application', error);
  process.exitCode = 1;
});

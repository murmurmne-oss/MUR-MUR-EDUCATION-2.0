import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, isAbsolute, join } from 'path';

function resolveUploadsDir() {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured && configured.length > 0) {
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }
  return join(process.cwd(), 'uploads');
}

const uploadsDir = resolveUploadsDir();

function ensureUploadsDir() {
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
}

function resolveUploadsBaseUrl(request: Request) {
  const fromEnv = process.env.PUBLIC_UPLOADS_BASE_URL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }
  const host = request.get('host');
  return `${request.protocol}://${host}`;
}

@Controller('uploads')
export class UploadsController {
  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadsDir();
          cb(null, uploadsDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const extension = extname(file.originalname) || '.jpg';
          cb(null, `${unique}${extension}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Можно загружать только изображения') as never,
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize:
          Number.parseInt(process.env.UPLOAD_IMAGE_MAX_SIZE ?? '', 10) ||
          5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не найден или не прошел проверку');
    }

    const baseUrl = resolveUploadsBaseUrl(request);
    return {
      url: `${baseUrl}/uploads/${file.filename}`,
    };
  }
}








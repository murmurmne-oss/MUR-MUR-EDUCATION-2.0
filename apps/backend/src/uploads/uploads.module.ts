import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MulterModule.register({}), AuthModule],
  controllers: [UploadsController],
})
export class UploadsModule {}









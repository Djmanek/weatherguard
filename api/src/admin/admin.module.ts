import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [UsersModule, TelegramModule],
  controllers: [AdminController],
})
export class AdminModule {}

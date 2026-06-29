import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

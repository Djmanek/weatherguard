import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { UsersModule } from '../users/users.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [UsersModule, TelegramModule],
  providers: [AlertsService],
  controllers: [AlertsController],
})
export class AlertsModule {}

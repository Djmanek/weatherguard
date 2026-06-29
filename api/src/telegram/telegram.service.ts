import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBotLib from 'node-telegram-bot-api';
import { UsersService } from '../users/users.service';

const TelegramBot = (TelegramBotLib as any).default ?? TelegramBotLib;

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: any = null;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });

    // Log ALL incoming messages to debug
    this.bot.on('message', (msg: any) => {
      this.logger.log(`Bot received message: "${msg.text}" from chat ${msg.chat.id}`);
    });

    this.registerCommands();
    this.logger.log('Telegram bot started');
  }

  private registerCommands() {
    if (!this.bot) return;

    this.bot.onText(/\/start (.+)/, async (msg: any, match: any) => {
      const chatId = String(msg.chat.id);
      const token = match?.[1]?.trim();
      this.logger.log(`/start with token: ${token} from chat ${chatId}`);

      if (!token) {
        this.bot.sendMessage(chatId, '❌ Usage: /start <link_token>');
        return;
      }

      try {
        const userId = Buffer.from(token, 'base64').toString('utf-8');
        this.logger.log(`Linking userId: ${userId} to chatId: ${chatId}`);
        await this.usersService.setTelegramChatId(userId, chatId);
        this.bot.sendMessage(
          chatId,
          `Your Telegram account is linked to WeatherGuard!\n\nYou'll receive weather alerts here once your access is approved.`,
        );
      } catch (err: any) {
        this.logger.error(`Linking failed: ${err.message}`);
        this.bot.sendMessage(chatId, 'Invalid or expired link token.');
      }
    });

    this.bot.onText(/^\/start$/, (msg: any) => {
      const chatId = String(msg.chat.id);
      this.logger.log(`/start (no token) from chat ${chatId}`);
      this.bot.sendMessage(
        chatId,
        `Welcome to WeatherGuard Bot!\n\nVisit the WeatherGuard dashboard to link your account and receive weather alerts.`,
      );
    });

    this.bot.onText(/\/setcity (.+)/, async (msg: any, match: any) => {
      const chatId = String(msg.chat.id);
      const city = match?.[1]?.trim();
      if (!city) return;

      const users = await this.usersService.findApprovedWithTelegram();
      const user = users.find((u: any) => u.telegramChatId === chatId);

      if (!user) {
        this.bot.sendMessage(chatId, '❌ Account not linked. Visit the WeatherGuard dashboard first.');
        return;
      }

      await this.usersService.setCity(String(user._id), city);
      this.bot.sendMessage(chatId, `📍 Weather city updated to: *${city}*`, { parse_mode: 'Markdown' });
    });
  }

  async sendApprovalNotification(chatId: string, displayName: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.sendMessage(
        chatId,
        `🎉 *Congratulations, ${displayName}!*\n\nYour WeatherGuard access has been *approved*.\n\nYou'll now receive automated weather alerts.\n\nUse /setcity <city> to set your location for alerts.`,
        { parse_mode: 'Markdown' },
      );
    } catch (err: any) {
      this.logger.error(`Failed to send approval to ${chatId}: ${err.message}`);
    }
  }

  async sendWeatherAlert(chatId: string, message: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (err: any) {
      this.logger.error(`Failed to send alert to ${chatId}: ${err.message}`);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import axios from 'axios';
import { UsersService } from '../users/users.service';
import { TelegramService } from '../telegram/telegram.service';

export interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private telegramService: TelegramService,
  ) {
    this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY') ?? '';
  }

  onModuleInit() {
    // Run every hour at :00
    cron.schedule('0 * * * *', () => {
      this.logger.log('Running hourly weather alert job');
      this.dispatchAlerts();
    });

    this.logger.log('Weather alert cron scheduled (hourly)');
  }

  async dispatchAlerts(): Promise<void> {
    const users = await this.usersService.findApprovedWithTelegram();

    for (const user of users) {
      const city = user.city ?? 'London'; // fallback city
      try {
        const weather = await this.fetchWeather(city);
        const message = this.formatMessage(weather);
        await this.telegramService.sendWeatherAlert(user.telegramChatId!, message);
      } catch (err) {
        this.logger.error(`Alert failed for user ${user._id}: ${err.message}`);
      }
    }

    this.logger.log(`Alerts dispatched to ${users.length} user(s)`);
  }

  async fetchWeather(city: string): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather`;
    const { data } = await axios.get(url, {
      params: {
        q: city,
        appid: this.apiKey,
        units: 'metric',
      },
    });

    return {
      city: data.name,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      icon: data.weather[0].main,
    };
  }

  private formatMessage(w: WeatherData): string {
    const emoji = this.weatherEmoji(w.icon);
    return (
      `${emoji} *WeatherGuard Alert — ${w.city}*\n\n` +
      `🌡 *${w.temp}°C* (feels like ${w.feelsLike}°C)\n` +
      `📋 ${w.description.charAt(0).toUpperCase() + w.description.slice(1)}\n` +
      `💧 Humidity: ${w.humidity}%\n` +
      `💨 Wind: ${w.windSpeed} m/s\n\n` +
      `_Updated: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST_`
    );
  }

  private weatherEmoji(icon: string): string {
    const map: Record<string, string> = {
      Clear: '☀️',
      Clouds: '☁️',
      Rain: '🌧️',
      Drizzle: '🌦️',
      Thunderstorm: '⛈️',
      Snow: '❄️',
      Mist: '🌫️',
      Fog: '🌫️',
    };
    return map[icon] ?? '🌍';
  }
}

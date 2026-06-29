import { Controller, Post, Get, UseGuards, Param } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  /** POST /alerts/dispatch — manually trigger all alerts (admin only) */
  @Post('dispatch')
  async dispatchNow() {
    await this.alertsService.dispatchAlerts();
    return { message: 'Alerts dispatched successfully' };
  }

  /** GET /alerts/preview/:city — preview weather for a city */
  @Get('preview/:city')
  async previewWeather(@Param('city') city: string) {
    return this.alertsService.fetchWeather(city);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
      role: user.role,
      telegramLinked: !!user.telegramChatId,
      city: user.city,
    };
  }

  @Get('telegram-link')
  getTelegramLink(@CurrentUser() user: any) {
    const userId = user._id.toString();
    const token = Buffer.from(userId).toString('base64');
    return {
      url: `https://t.me/weatherguard_dev_bot?start=${token}`,
      token,
    };
  }
}
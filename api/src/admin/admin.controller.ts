import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from '../users/users.service';
import { TelegramService } from '../telegram/telegram.service';
import { UserStatus } from '../users/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private telegramService: TelegramService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }

  @Get('users')
  getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get('users/pending')
  getPendingUsers() {
    return this.usersService.findAllPending();
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    console.log(`Updating user ${id} status to: ${dto.status}`);
    const user = await this.usersService.updateStatus(id, dto.status);
    console.log(`Updated user status: ${user.status}`);

    if (dto.status === UserStatus.APPROVED && user.telegramChatId) {
      await this.telegramService.sendApprovalNotification(user.telegramChatId, user.displayName);
    }

    return user;
  }
}
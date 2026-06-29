import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus, UserRole, AuthProvider } from './user.schema';
import { ConfigService } from '@nestjs/config';

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async findOrCreate(profile: OAuthProfile): Promise<UserDocument> {
    let user = await this.userModel.findOne({
      provider: profile.provider,
      providerId: profile.providerId,
    });

    if (!user) {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      const role = profile.email === adminEmail ? UserRole.ADMIN : UserRole.USER;
      const status = role === UserRole.ADMIN ? UserStatus.APPROVED : UserStatus.PENDING;

      user = new this.userModel({
        ...profile,
        role,
        status,
      });
      await user.save();
    }

    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAllPending(): Promise<UserDocument[]> {
    return this.userModel.find({ status: UserStatus.PENDING, role: UserRole.USER }).sort({ createdAt: -1 });
  }

  async findAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ role: UserRole.USER }).sort({ createdAt: -1 });
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserDocument> {
    await this.userModel.updateOne({ _id: id }, { $set: { status } });
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setTelegramChatId(userId: string, chatId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { telegramChatId: chatId }, { returnDocument: 'after' });
  }

  async setCity(userId: string, city: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { city }, { returnDocument: 'after' });
  }

  async findApprovedWithTelegram(): Promise<UserDocument[]> {
    return this.userModel.find({
      status: UserStatus.APPROVED,
      telegramChatId: { $ne: null },
    });
  }
}
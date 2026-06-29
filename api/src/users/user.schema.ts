import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: AuthProvider })
  provider: AuthProvider;

  @Prop({ required: true })
  providerId: string;

  @Prop({ default: UserStatus.PENDING, enum: UserStatus })
  status: UserStatus;

  @Prop({ default: UserRole.USER, enum: UserRole })
  role: UserRole;

  @Prop({ type: String, default: null })
  telegramChatId: string | null;

  @Prop({ type: String, default: null })
  city: string | null;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
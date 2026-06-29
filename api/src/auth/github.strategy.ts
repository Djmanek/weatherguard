import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthProvider } from '../users/user.schema';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value ?? `${profile.username}@github.local`;
    const user = await this.usersService.findOrCreate({
      provider: AuthProvider.GITHUB,
      providerId: profile.id,
      email,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value,
    });
    done(null, user);
  }
}

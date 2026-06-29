import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(user: UserDocument): { accessToken: string } {
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}

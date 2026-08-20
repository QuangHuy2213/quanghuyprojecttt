import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
      scope: ['email', 'profile'],
    });
  }

  // 🌟 THÊM HÀM NÀY VÀO: Ép Google luôn hiện bảng chọn tài khoản
  authorizationParams(): { [key: string]: string; } {
    return {
      prompt: 'select_account',
    };
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos, id } = profile;
    
    const user = {
      googleId: id,
      email: emails[0].value,
      fullName: name ? `${name.familyName || ''} ${name.givenName || ''}`.trim() : 'Người dùng',
      avatarUrl: photos[0].value,
    };
    
    done(null, user);
  }
}
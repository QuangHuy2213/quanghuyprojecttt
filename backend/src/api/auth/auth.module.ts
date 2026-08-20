import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleStrategy } from './google.strategy'; // <-- THÊM DÒNG NÀY

@Module({
  imports: [
    JwtModule.register({
      secret: 'QUANG_HUY_SECRET_KEY_2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, GoogleStrategy], // <-- THÊM GOOGLE STRATEGY VÀO ĐÂY
})
export class AuthModule {}
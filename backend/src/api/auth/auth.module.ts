import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'QUANG_HUY_SECRET_KEY_2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController], // Bắt buộc phải có dòng này
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
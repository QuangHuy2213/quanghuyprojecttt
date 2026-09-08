import { getJwtSecret } from '../../config/security';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleStrategy } from './google.strategy'; // <-- THÊM DÒNG NÀY
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, GoogleStrategy, JwtStrategy],
  exports: [JwtModule, JwtStrategy],
})
export class AuthModule {}

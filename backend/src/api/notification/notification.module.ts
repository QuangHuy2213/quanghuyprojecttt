import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    // Import JwtModule với cùng Secret Key để giải mã Token
    JwtModule.register({
      secret: 'QUANG_HUY_SECRET_KEY_2026', 
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService],
  exports: [NotificationService], // Export ra để các file khác có thể mượn hàm tạo thông báo
})
export class NotificationModule {}
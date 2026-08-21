import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // 1. Lấy danh sách thông báo của 1 user (Mới nhất xếp trên cùng)
  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Chỉ lấy 50 thông báo gần nhất để tránh nặng máy
    });
  }

  // 2. Đánh dấu 1 thông báo là "Đã đọc"
  async markAsRead(id: number, userId: string) {
    return this.prisma.notification.updateMany({
      where: { 
        id: id,
        userId: userId // Ép buộc phải đúng chủ tài khoản mới được đánh dấu
      },
      data: { isRead: true },
    });
  }

  // 3. Đánh dấu TẤT CẢ thông báo là "Đã đọc"
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { 
        userId: userId,
        isRead: false 
      },
      data: { isRead: true },
    });
  }

  // 4. Hàm nội bộ: Dùng để các tính năng khác (như Chat) gọi vào để tạo thông báo
  async createNotification(data: { userId: string, title: string, content: string, type: any }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        type: data.type,
      },
    });
  }
}
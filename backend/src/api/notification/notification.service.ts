import { Injectable, Optional } from '@nestjs/common';
import { RealtimeService } from '../../realtime/realtime.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService, @Optional() private readonly realtime?: RealtimeService) {}

  // 1. Lấy danh sách thông báo của 1 user (Mới nhất xếp trên cùng)
  async getUserNotifications(userId: string) {
    const recent = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Chỉ lấy 50 thông báo gần nhất để tránh nặng máy
    });
    // Include unread rows and warning acknowledgements, including old warnings a
    // disconnected tab may still have open beyond the 50 recent notifications.
    const unread = await this.prisma.notification.findMany({
      where: { userId, OR: [{ isRead: false }, { type: 'WARNING_POPUP' }] },
      orderBy: { createdAt: 'desc' },
    });
    return [...new Map([...recent, ...unread].map((item) => [item.id, item])).values()]
      .sort((a, b) => b.id - a.id);
  }

  // 2. Đánh dấu 1 thông báo là "Đã đọc"
  async markAsRead(id: number, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: id,
        userId: userId, // Ép buộc phải đúng chủ tài khoản mới được đánh dấu
      },
      data: { isRead: true },
    });
    if (result.count && this.realtime) {
      const row = await this.prisma.notification.findFirst({ where: { id, userId } });
      if (row) this.realtime.warning(row);
    }
    return result;
  }

  // 3. Đánh dấu TẤT CẢ thông báo là "Đã đọc"
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
        type: { not: 'WARNING_POPUP' },
      },
      data: { isRead: true },
    });
  }

  // 4. Hàm nội bộ: Dùng để các tính năng khác (như Chat) gọi vào để tạo thông báo
  async createNotification(data: {
    userId: string;
    title: string;
    content: string;
    type: any;
  }) {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        type: data.type,
      },
    });
    this.realtime?.warning(row);
    return row;
  }
}

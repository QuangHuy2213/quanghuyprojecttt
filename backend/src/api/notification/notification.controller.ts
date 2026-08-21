import { Controller, Get, Patch, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtService } from '@nestjs/jwt';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  // Hàm phụ trợ: Tự động tách ID người dùng từ Token gửi lên
  private getUserIdFromToken(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Không tìm thấy token đăng nhập');
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      return payload.sub; 
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // API 1: Lấy danh sách thông báo
  @Get()
  async getNotifications(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.notificationService.getUserNotifications(userId);
  }

  // API 2: Đánh dấu tất cả là đã đọc
  @Patch('read-all')
  async markAllAsRead(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    await this.notificationService.markAllAsRead(userId);
    return { message: 'Đã đánh dấu đọc tất cả' };
  }

  // API 3: Đánh dấu 1 thông báo cụ thể là đã đọc
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string
  ) {
    const userId = this.getUserIdFromToken(authHeader);
    await this.notificationService.markAsRead(Number(id), userId);
    return { message: 'Đã đánh dấu đọc' };
  }
}
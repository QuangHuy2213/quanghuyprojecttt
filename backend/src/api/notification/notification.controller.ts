import { Controller, Get, Patch, Post, Body, Param, Headers, UnauthorizedException, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service'; // 🌟 ĐÃ THÊM PRISMA
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService, // 🌟 Nhúng Prisma để dùng cho API Cảnh báo
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

  // API 1: Lấy danh sách thông báo thông thường
  @Get()
  @ApiOperation({ summary: 'Lấy thông báo của người dùng hiện tại' })
  async getNotifications(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.notificationService.getUserNotifications(userId);
  }

  // API 2: Đánh dấu tất cả là đã đọc
  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  async markAllAsRead(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    await this.notificationService.markAllAsRead(userId);
    return { message: 'Đã đánh dấu đọc tất cả' };
  }

  // API 3: Đánh dấu 1 thông báo cụ thể là đã đọc
  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  @ApiParam({ name: 'id', example: 12 })
  async markAsRead(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string
  ) {
    const userId = this.getUserIdFromToken(authHeader);
    await this.notificationService.markAsRead(Number(id), userId);
    return { message: 'Đã đánh dấu đọc' };
  }

  // =========================================================
  // 🌟 MỚI: CÁC API DÀNH RIÊNG CHO TÍNH NĂNG CẢNH BÁO (WARNING)
  // =========================================================

  // API 4: Admin gửi cảnh báo (Dùng ở trang Admin)
  @Post('admin/send-warning')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Admin gửi cảnh báo gian lận cho User' })
  async sendWarning(@Body() body: { userId: string, content: string }, @Req() req: any) {
    if (req.user?.role !== 'ADMIN') throw new ForbiddenException('Chỉ quản trị viên được gửi cảnh báo.');
    if (!body.content?.trim()) throw new ForbiddenException('Nội dung cảnh báo không được để trống.');
    return this.prisma.notification.create({
      data: {
        userId: body.userId,
        title: '⚠️ CẢNH BÁO TỪ BAN QUẢN TRỊ',
        content: body.content,
        type: 'WARNING_POPUP', // Trùng khớp với Enum trong schema.prisma
        isRead: false,
      }
    });
  }

  // API 5: Lấy cảnh báo chưa đọc (Dành cho Frontend load lúc khởi động)
  @Get('unread-warnings')
  @ApiOperation({ summary: 'Lấy cảnh báo chặn màn hình chưa đọc của User' })
  async getUnreadWarnings(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);
    return this.prisma.notification.findFirst({
      where: {
        userId: userId,
        type: 'WARNING_POPUP',
        isRead: false, // Chỉ lấy những cảnh báo chưa bấm xác nhận
      }
    });
  }
}

import { Controller, Post, Get, Req, Res, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';
import 'dotenv/config';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // API 1: Tạo URL Thanh Toán (Frontend gọi)
  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade-agent')
  async createUpgradePayment(@Req() req: Request) {
    const userId = (req.user as any).userId; // Trích xuất ID từ JWT
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    // URL này Backend sẽ gửi cho VNPAY để VNPAY trả kết quả về sau khi thanh toán xong
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const returnUrl = `${backendUrl}/payments/vnpay-return`;

    const paymentUrl = this.paymentService.createPaymentUrl(userId, ipAddr as string, returnUrl);
    
    return { paymentUrl };
  }

  // API 2: Nhận kết quả từ VNPAY và Redirect về Frontend
  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.processReturn(query);
    
    // Sau khi cập nhật DB xong, Backend chủ động điều hướng trình duyệt về lại Frontend (Next.js chạy port 3000)
    if (result.success) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/payment-result?status=success`);
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/payment-result?status=failed`);
    }
  }
}
import { Controller, Post, Get, Req, Res, UseGuards, Query, Body, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';
import 'dotenv/config';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Hàm phụ trợ trích xuất userId (Do tuỳ cấu hình jwt payload của bạn lưu ở sub hay userId)
  private getUserId(req: Request): string {
    const user = req.user as any;
    if (!user) throw new UnauthorizedException();
    return user.sub || user.userId || user.id; 
  }

  // =======================================================
  // API 1: Tạo URL Thanh Toán - Nâng cấp môi giới
  // =======================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade-agent')
  async createUpgradePayment(@Req() req: Request) {
    const userId = this.getUserId(req);
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const returnUrl = `${backendUrl}/payments/vnpay-return`;

    const paymentUrl = this.paymentService.createPaymentUrl(userId, ipAddr as string, returnUrl);
    
    return { paymentUrl };
  }

  // =======================================================
  // 🌟 MỚI: API 2: Tạo URL Thanh Toán - Trả Hóa Đơn
  // =======================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('pay-invoice')
  async createInvoicePayment(
    @Req() req: Request,
    @Body('invoiceId') invoiceId: string
  ) {
    const userId = this.getUserId(req);
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const returnUrl = `${backendUrl}/payments/vnpay-return`;

    // Gọi Service mới
    const paymentUrl = await this.paymentService.createInvoicePaymentUrl(
      invoiceId, 
      userId, 
      ipAddr as string, 
      returnUrl
    );
    
    return { paymentUrl };
  }

  // =======================================================
  // API 3: Nhận kết quả từ VNPAY và Redirect về Frontend
  // =======================================================
  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.processReturn(query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Gắn thêm type (INVOICE hoặc UPGRADE) để Frontend biết hiển thị chữ gì cho phù hợp
    if (result.success) {
      return res.redirect(`${frontendUrl}/payment-result?status=success&type=${result.type}`);
    } else {
      return res.redirect(`${frontendUrl}/payment-result?status=failed`);
    }
  }
}
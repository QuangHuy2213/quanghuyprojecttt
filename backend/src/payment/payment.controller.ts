import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  // =======================================================
  // LẤY USER ID TỪ JWT
  // =======================================================
  private getUserId(req: Request): string {
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException(
        'Bạn chưa đăng nhập.',
      );
    }

    const userId =
      user.sub ||
      user.userId ||
      user.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng.',
      );
    }

    return String(userId);
  }

  // =======================================================
  // LẤY IP CLIENT
  // =======================================================
  private getClientIp(req: Request): string {
    const forwarded =
      req.headers['x-forwarded-for'];

    const value = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded;

    return (
      value?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  // =======================================================
  // VNPAY RETURN URL
  // =======================================================
  private getVnpayReturnUrl(): string {
    const value =
      process.env.VNPAY_RETURN_URL?.trim();

    if (!value) {
      throw new Error(
        'VNPAY_RETURN_URL chưa được cấu hình.',
      );
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(
        'VNPAY_RETURN_URL không hợp lệ.',
      );
    }

    if (
      process.env.NODE_ENV === 'production' &&
      url.protocol !== 'https:'
    ) {
      throw new Error(
        'VNPAY_RETURN_URL production phải sử dụng HTTPS.',
      );
    }

    return value.replace(/\/+$/, '');
  }

  // =======================================================
  // FRONTEND URL
  // =======================================================
  private getFrontendUrl(): string {
    const value = (
      process.env.FRONTEND_URL ||
      'https://nguyenducquanghuy.vercel.app'
    ).trim();

    return value.replace(/\/+$/, '');
  }

  // =======================================================
  // 1. THANH TOÁN NÂNG CẤP MÔI GIỚI
  // =======================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade-agent')
  async createUpgradePayment(
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req);
    const ipAddr = this.getClientIp(req);
    const returnUrl =
      this.getVnpayReturnUrl();

    const paymentUrl =
      this.paymentService.createPaymentUrl(
        userId,
        ipAddr,
        returnUrl,
      );

    return { paymentUrl };
  }

  // =======================================================
  // 2. THANH TOÁN HÓA ĐƠN
  // =======================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('pay-invoice')
  async createInvoicePayment(
    @Req() req: Request,
    @Body('invoiceId') invoiceId: string,
  ) {
    if (!invoiceId) {
      throw new UnauthorizedException(
        'Thiếu invoiceId.',
      );
    }

    const userId = this.getUserId(req);
    const ipAddr = this.getClientIp(req);
    const returnUrl =
      this.getVnpayReturnUrl();

    const paymentUrl =
      await this.paymentService
        .createInvoicePaymentUrl(
          invoiceId,
          userId,
          ipAddr,
          returnUrl,
        );

    return { paymentUrl };
  }

  // =======================================================
  // 3. VNPAY RETURN
  // =======================================================
  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const result =
      await this.paymentService.processReturn(
        query,
      );

    const frontendUrl =
      this.getFrontendUrl();

    if (result.success) {
      const type =
        encodeURIComponent(
          result.type || '',
        );

      return res.redirect(
        `${frontendUrl}/payment-result?status=success&type=${type}`,
      );
    }

    return res.redirect(
      `${frontendUrl}/payment-result?status=failed`,
    );
  }
}
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
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  private getUserId(req: Request): string {
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException('Bạn chưa đăng nhập.');
    }

    const userId = user.sub || user.userId || user.id;

    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng.');
    }

    return String(userId);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    return (
      value?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private getVnpayReturnUrl(): string {
    const returnUrl = process.env.VNPAY_RETURN_URL?.trim();

    if (!returnUrl) {
      throw new Error('VNPAY_RETURN_URL chưa được cấu hình.');
    }

    return returnUrl.replace(/\/+$/, '');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade-agent')
  async createUpgradePayment(@Req() req: Request) {
    const userId = this.getUserId(req);
    const ipAddr = this.getClientIp(req);
    const returnUrl = this.getVnpayReturnUrl();

    const paymentUrl = this.paymentService.createPaymentUrl(
      userId,
      ipAddr,
      returnUrl,
    );

    return { paymentUrl };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('pay-invoice')
  async createInvoicePayment(
    @Req() req: Request,
    @Body('invoiceId') invoiceId: string,
  ) {
    const userId = this.getUserId(req);
    const ipAddr = this.getClientIp(req);
    const returnUrl = this.getVnpayReturnUrl();

    const paymentUrl =
      await this.paymentService.createInvoicePaymentUrl(
        invoiceId,
        userId,
        ipAddr,
        returnUrl,
      );

    return { paymentUrl };
  }

  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const result =
      await this.paymentService.processReturn(query);

    const frontendUrl = (
      process.env.FRONTEND_URL ||
      'https://nguyenducquanghuy.vercel.app'
    ).replace(/\/+$/, '');

    if (result.success) {
      return res.redirect(
        `${frontendUrl}/payment-result?status=success&type=${result.type}`,
      );
    }

    return res.redirect(
      `${frontendUrl}/payment-result?status=failed`,
    );
  }
}
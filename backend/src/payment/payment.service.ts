import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Đảm bảo đường dẫn tới PrismaService đúng
import { VNPay, ProductCode, VnpLocale } from 'vnpay';

@Injectable()
export class PaymentService {
  private vnpay: VNPay;

  constructor(private prisma: PrismaService) {
    // KHỞI TẠO VNPAY VỚI CÁC THÔNG SỐ SANDBOX CỦA BẠN
    this.vnpay = new VNPay({
      tmnCode: 'YLWVOYZZ', // Terminal ID / Mã Website
      secureSecret: 'HRPRKZJXDIPAIGIZUJFCMWJPJRPYSVYQ', // Secret Key / Chuỗi bí mật
      vnpayHost: 'https://sandbox.vnpayment.vn', // Môi trường Test
      testMode: true, // Kích hoạt Test Mode
    });
  }

  createPaymentUrl(userId: string, ipAddr: string, returnUrl: string) {
    const urlString = this.vnpay.buildPaymentUrl({
      vnp_Amount: 299000, // 299k VNĐ
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: `UPGRADE_${userId}_${Date.now()}`, // Gắn userId vào mã đơn
      vnp_OrderInfo: `Nang cap Moi gioi 3 thang`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });
    return urlString;
  }

  async processReturn(query: any) {
    try {
      const verify = this.vnpay.verifyReturnUrl(query);
      
      if (verify.isSuccess && verify.vnp_ResponseCode === '00') {
        const txnRef = query.vnp_TxnRef as string;
        const userId = txnRef.split('_')[1];

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3);

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            role: 'AGENT',
            agentExpiresAt: expiresAt,
          },
        });

        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Lỗi xác thực VNPAY:', error);
      return { success: false };
    }
  }
}
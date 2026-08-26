import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VNPay, ProductCode, VnpLocale } from 'vnpay';

@Injectable()
export class PaymentService {
  private vnpay: VNPay;

  constructor(private prisma: PrismaService) {
    // KHỞI TẠO VNPAY
    this.vnpay = new VNPay({
      tmnCode: 'YLWVOYZZ', 
      secureSecret: 'HRPRKZJXDIPAIGIZUJFCMWJPJRPYSVYQ', 
      vnpayHost: 'https://sandbox.vnpayment.vn', 
      testMode: true, 
    });
  }

  // =======================================================
  // 1. TẠO URL THANH TOÁN: NÂNG CẤP MÔI GIỚI (Cũ)
  // =======================================================
  createPaymentUrl(userId: string, ipAddr: string, returnUrl: string) {
    const urlString = this.vnpay.buildPaymentUrl({
      vnp_Amount: 299000, // 299k VNĐ
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: `UPGRADE_${userId}_${Date.now()}`, // Tiền tố UPGRADE
      vnp_OrderInfo: `Nang cap Moi gioi 3 thang`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });
    return urlString;
  }

  // =======================================================
  // 2. 🌟 MỚI: TẠO URL THANH TOÁN: HÓA ĐƠN GIAO DỊCH (INVOICE)
  // =======================================================
  async createInvoicePaymentUrl(invoiceId: string, userId: string, ipAddr: string, returnUrl: string) {
    // 1. Kiểm tra hóa đơn
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) throw new BadRequestException('Hóa đơn không tồn tại.');
    if (invoice.userId !== userId) throw new BadRequestException('Bạn không có quyền thanh toán hóa đơn này.');
    if (invoice.status === 'PAID') throw new BadRequestException('Hóa đơn này đã được thanh toán rồi.');
    if (invoice.status === 'CANCELLED') throw new BadRequestException('Hóa đơn này đã bị hủy.');

    // 2. Tạo URL thanh toán
    const amountToPay = Number(invoice.amount);
    const urlString = this.vnpay.buildPaymentUrl({
      vnp_Amount: amountToPay, 
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: `INVOICE_${invoice.id}_${Date.now()}`, // Tiền tố INVOICE
      vnp_OrderInfo: `Thanh toan phi giao dich ${invoice.id.substring(0,8)}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });

    return urlString;
  }

  // =======================================================
  // 3. XỬ LÝ KẾT QUẢ TỪ VNPAY TRẢ VỀ (Gộp chung cả 2 loại)
  // =======================================================
  async processReturn(query: any) {
    try {
      const verify = this.vnpay.verifyReturnUrl(query);
      
      if (verify.isSuccess && verify.vnp_ResponseCode === '00') {
        const txnRef = query.vnp_TxnRef as string;
        const parts = txnRef.split('_');
        const paymentType = parts[0]; // UPGRADE hoặc INVOICE
        const targetId = parts[1];    // userId hoặc invoiceId

        // ===================================
        // NẾU LÀ GIAO DỊCH NÂNG CẤP TÀI KHOẢN
        // ===================================
        if (paymentType === 'UPGRADE') {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 3);

          await this.prisma.user.update({
            where: { id: targetId },
            data: { role: 'AGENT', agentExpiresAt: expiresAt },
          });

          return { success: true, type: 'UPGRADE' };
        }

        // ===================================
        // NẾU LÀ GIAO DỊCH TRẢ HÓA ĐƠN GIAO DỊCH
        // ===================================
        else if (paymentType === 'INVOICE') {
          // 1. Cập nhật hóa đơn thành Đã Thanh Toán (PAID)
          const updatedInvoice = await this.prisma.invoice.update({
            where: { id: targetId },
            data: { status: 'PAID', paidAt: new Date() },
          });

          // 2. Gửi thông báo cảm ơn cho User
          await this.prisma.notification.create({
            data: {
              userId: updatedInvoice.userId,
              title: '✅ Thanh toán thành công',
              content: `Cảm ơn bạn đã thanh toán phí giao dịch cho hóa đơn #${targetId.substring(0,8)}. Chúc bạn chốt được nhiều giao dịch hơn cùng Nhà Tốt!`,
              type: 'SYSTEM'
            }
          });

          return { success: true, type: 'INVOICE' };
        }
      }
      
      return { success: false };
    } catch (error) {
      console.error('Lỗi xác thực VNPAY:', error);
      return { success: false };
    }
  }
}
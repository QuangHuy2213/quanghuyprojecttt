import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ProductCode, VNPay, VnpLocale } from 'vnpay';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class PaymentService {
  private readonly vnpay: VNPay;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {
    const tmnCode = process.env.VNP_TMN_CODE?.trim();
    const secureSecret = process.env.VNP_HASH_SECRET?.trim();

    if (!tmnCode) {
      throw new Error('VNP_TMN_CODE chưa được cấu hình.');
    }

    if (!secureSecret) {
      throw new Error('VNP_HASH_SECRET chưa được cấu hình.');
    }

    this.vnpay = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
    });
  }

  // =======================================================
  // TÍNH SỐ TIỀN HÓA ĐƠN CẦN THANH TOÁN
  // =======================================================
  private calculateInvoiceAmount(invoice: {
    amount: any;
    dueDate: Date | null;
  }): number {
    const baseAmount = Number(invoice.amount);

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new BadRequestException('Số tiền hóa đơn không hợp lệ.');
    }

    const overdueMonths =
      invoice.dueDate && new Date() > invoice.dueDate
        ? Math.max(
            1,
            Math.ceil(
              (Date.now() - invoice.dueDate.getTime()) /
                (30 * 24 * 60 * 60 * 1000),
            ),
          )
        : 0;

    return Math.round(baseAmount * (1 + overdueMonths * 0.005));
  }

  // =======================================================
  // 1. TẠO URL THANH TOÁN NÂNG CẤP MÔI GIỚI
  // =======================================================
  createPaymentUrl(
    userId: string,
    ipAddr: string,
    returnUrl: string,
  ) {
    return this.vnpay.buildPaymentUrl({
      vnp_Amount: 299000,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: `UPGRADE_${userId}_${Date.now()}`,
      vnp_OrderInfo: 'Nang cap Moi gioi 3 thang',
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });
  }

  // =======================================================
  // 2. TẠO URL THANH TOÁN HÓA ĐƠN GIAO DỊCH
  // =======================================================
  async createInvoicePaymentUrl(
    invoiceId: string,
    userId: string,
    ipAddr: string,
    returnUrl: string,
  ) {
    if (!invoiceId) {
      throw new BadRequestException('Thiếu invoiceId.');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { transaction: true },
    });

    if (!invoice) {
      throw new BadRequestException('Hóa đơn không tồn tại.');
    }

    if (invoice.userId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thanh toán hóa đơn này.',
      );
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException(
        'Hóa đơn này đã được thanh toán rồi.',
      );
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(
        'Hóa đơn này đã bị hủy.',
      );
    }

    if (
      !['PENDING_PAYMENT', 'OVERDUE'].includes(invoice.status) ||
      invoice.transaction.status !== 'SUCCESS'
    ) {
      throw new BadRequestException(
        'Hóa đơn chưa được phát hành hoặc giao dịch đang hủy/đối soát.',
      );
    }

    const amountToPay = this.calculateInvoiceAmount(invoice);

    return this.vnpay.buildPaymentUrl({
      vnp_Amount: amountToPay,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: `INVOICE_${invoice.id}_${Date.now()}`,
      vnp_OrderInfo: `Thanh toan phi giao dich ${invoice.id.substring(0, 8)}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });
  }

  // =======================================================
  // 3. XỬ LÝ CALLBACK / RETURN TỪ VNPAY
  // =======================================================
  async processReturn(query: any) {
    try {
      const verify = this.vnpay.verifyReturnUrl(query);

      if (
        !verify.isSuccess ||
        verify.vnp_ResponseCode !== '00'
      ) {
        return { success: false };
      }

      const txnRef = String(query.vnp_TxnRef || '');

      if (!txnRef) {
        return { success: false };
      }

      const parts = txnRef.split('_');
      const paymentType = parts[0];
      const targetId = parts[1];

      if (!paymentType || !targetId) {
        return { success: false };
      }

      // ===================================================
      // NÂNG CẤP TÀI KHOẢN MÔI GIỚI
      // ===================================================
      if (paymentType === 'UPGRADE') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3);

        await this.prisma.user.update({
          where: { id: targetId },
          data: {
            role: 'AGENT',
            agentExpiresAt: expiresAt,
          },
        });

        return {
          success: true,
          type: 'UPGRADE',
        };
      }

      // ===================================================
      // THANH TOÁN HÓA ĐƠN
      // ===================================================
      if (paymentType === 'INVOICE') {
        const current = await this.prisma.invoice.findUnique({
          where: { id: targetId },
          include: { transaction: true },
        });

        if (!current) {
          throw new BadRequestException(
            'Không tìm thấy hóa đơn.',
          );
        }

        const updatedInvoice =
          await this.prisma.$transaction(async (db) => {
            await db.$queryRaw`
              SELECT id
              FROM posts
              WHERE id = ${current.transaction.postId}
              FOR UPDATE
            `;

            const invoice =
              await db.invoice.findUniqueOrThrow({
                where: { id: targetId },
                include: { transaction: true },
              });

            // Callback VNPay có thể được gọi lại.
            // Nếu đã PAID thì coi như thành công, không update lần nữa.
            if (invoice.status === 'PAID') {
              return null;
            }

            if (
              !['PENDING_PAYMENT', 'OVERDUE'].includes(
                invoice.status,
              ) ||
              invoice.transaction.status !== 'SUCCESS'
            ) {
              throw new BadRequestException(
                'Hóa đơn không còn được phép thanh toán; cần đối soát khoản tiền.',
              );
            }

            const expectedAmount =
              this.calculateInvoiceAmount(invoice);

            const vnpAmount = Number(query.vnp_Amount);

            if (
              !Number.isFinite(vnpAmount) ||
              vnpAmount <= 0
            ) {
              throw new BadRequestException(
                'Số tiền VNPay không hợp lệ.',
              );
            }

            // VNPay truyền vnp_Amount theo đơn vị x100.
            const paidAmount = Math.round(vnpAmount / 100);

            if (paidAmount !== expectedAmount) {
              throw new BadRequestException(
                'Số tiền thanh toán không khớp hóa đơn.',
              );
            }

            const paidInvoice = await db.invoice.update({
              where: { id: targetId },
              data: {
                status: 'PAID',
                paidAt: new Date(),
              },
            });

            await db.notification.upsert({
              where: {
                eventKey: `invoice:${targetId}:paid`,
              },
              update: {},
              create: {
                userId: invoice.userId,
                eventKey: `invoice:${targetId}:paid`,
                title: 'Thanh toán thành công',
                content: `Đã ghi nhận thanh toán hóa đơn #${targetId.slice(0, 8)}.`,
                type: 'SYSTEM',
                link: '/my-transactions',
              },
            });

            return paidInvoice;
          });

        // Chỉ emit sau khi transaction DB commit thành công.
        if (updatedInvoice) {
          this.realtime?.invoice(updatedInvoice);
        }

        return {
          success: true,
          type: 'INVOICE',
        };
      }

      return { success: false };
    } catch (error) {
      console.error(
        'Lỗi xác thực/xử lý VNPAY:',
        error instanceof Error ? error.message : error,
      );

      return { success: false };
    }
  }
}
import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  private withLateFee<T extends { amount: any; dueDate: Date | null; status: string }>(invoice: T) {
    const baseAmount = Number(invoice.amount);
    const now = new Date();
    const overdueMonths = invoice.dueDate && now > invoice.dueDate && !['PAID', 'CANCELLED'].includes(invoice.status)
      ? Math.max(1, Math.ceil((now.getTime() - invoice.dueDate.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 0;
    const lateFee = Math.round(baseAmount * 0.005 * overdueMonths);
    return { ...invoice, status: overdueMonths > 0 && invoice.status === 'PENDING_PAYMENT' ? 'OVERDUE' : invoice.status, overdueMonths, lateFee, totalPayable: baseAmount + lateFee };
  }

  // =================================================================
  // 1. HÀM TÍNH TOÁN CHIẾT KHẤU / HOA HỒNG
  // =================================================================
  calculateAppFee(
    posterType: 'OWNER' | 'BROKER', 
    transactionType: 'SALE' | 'RENT' | 'PROJECT', 
    price: number, 
    brokerCommission?: number
  ): number {
    let appFee = 0;

    if (posterType === 'OWNER') {
      if (transactionType === 'SALE') {
        appFee = price * 0.015; 
      } else if (transactionType === 'RENT') {
        appFee = price * 0.10; 
      }
    } 
    else if (posterType === 'BROKER') {
      if (transactionType === 'SALE') {
        const commissionPercent = brokerCommission || 0;
        const brokerMoney = price * (commissionPercent / 100);
        appFee = brokerMoney * 0.20;
      } else if (transactionType === 'RENT') {
        appFee = price * 0.20;
      }
    }

    return appFee;
  }

  // =================================================================
  // 2. AI PHÁT HIỆN TỪ KHÓA & TẠO GIAO DỊCH ĐỂ ĐỒNG KIỂM
  // =================================================================
  async triggerEscrowVerification(postId: number, buyerId: string, sellerId: string, sellerConfirmed?: boolean) {
    return this.prisma.transaction.create({
      data: {
        postId,
        buyerId,
        sellerId,
        status: 'VERIFYING',
        sellerConfirmed,
      }
    });
  }

  async markPostSold(postId: number, sellerId: string, buyerPhone: string) {
    const normalizedPhone = buyerPhone?.replace(/\s+/g, '');
    if (!/^0\d{9}$/.test(normalizedPhone || '')) {
      throw new BadRequestException('Số điện thoại khách hàng phải gồm 10 số và bắt đầu bằng 0.');
    }

    const [post, buyer] = await Promise.all([
      this.prisma.posts.findUnique({ where: { id: postId } }),
      this.prisma.user.findUnique({ where: { phoneNumber: normalizedPhone } }),
    ]);
    if (!post) throw new BadRequestException('Không tìm thấy bài đăng.');
    if (post.userId !== sellerId) throw new ForbiddenException('Bạn không phải người đăng tin này.');
    if (!buyer) throw new BadRequestException('Không tìm thấy tài khoản khách hàng với số điện thoại này.');
    if (buyer.id === sellerId) throw new BadRequestException('Không thể chọn chính bạn làm khách mua.');
    if (await this.hasCompletedTransaction(postId, buyer.id, sellerId)) {
      throw new ConflictException('Giao dịch với khách hàng này đã hoàn tất.');
    }

    let transaction = await this.prisma.transaction.findFirst({
      where: { postId, buyerId: buyer.id, sellerId, status: 'VERIFYING' },
    });
    if (!transaction) {
      transaction = await this.triggerEscrowVerification(postId, buyer.id, sellerId, true);
    } else if (transaction.sellerConfirmed !== true) {
      transaction = await this.prisma.transaction.update({
        where: { id: transaction.id }, data: { sellerConfirmed: true },
      });
    }

    await this.prisma.notification.create({
      data: {
        userId: buyer.id,
        title: 'Yêu cầu xác nhận giao dịch',
        content: `Người đăng tin “${post.title}” đã báo giao dịch thành công với bạn. Vui lòng mở cuộc trò chuyện và xác nhận.`,
        type: 'SYSTEM',
      },
    });
    return transaction;
  }

  // =================================================================
  // 3. MA TRẬN ĐỒNG KIỂM & XỬ LÝ KẾT QUẢ (CÓ / KHÔNG)
  // =================================================================
  async verifyTransaction(transactionId: string, userId: string, isConfirmed: boolean) {
    if (typeof isConfirmed !== 'boolean') {
      throw new BadRequestException('isConfirmed phải có giá trị true hoặc false.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { post: true },
      });

      if (!transaction) throw new BadRequestException('Không tìm thấy giao dịch!');
      if (transaction.status !== 'VERIFYING') {
        throw new ConflictException('Giao dịch này đã được xử lý và không thể xác nhận lại.');
      }

      // Xác định ai đang bấm xác nhận
      const updateData =
        userId === transaction.buyerId
          ? { buyerConfirmed: isConfirmed }
          : userId === transaction.sellerId
            ? { sellerConfirmed: isConfirmed }
            : null;

      if (!updateData) throw new ForbiddenException('Bạn không có quyền xác nhận giao dịch này.');

      // Cập nhật câu trả lời của người dùng
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      let finalStatus = updatedTx.status;
      let calculatedFee: number | undefined;

      // KHI CẢ 2 ĐÃ CÓ CÂU TRẢ LỜI
      if (updatedTx.buyerConfirmed !== null && updatedTx.sellerConfirmed !== null) {
        const buyerYes = updatedTx.buyerConfirmed;
        const sellerYes = updatedTx.sellerConfirmed;

        if (buyerYes && sellerYes) {
          // 🌟 Trường hợp 1: Cả 2 chọn CÓ (Giao dịch thành công)
          calculatedFee = this.calculateAppFee(
            transaction.post.posterType,
            transaction.post.transactionType,
            Number(transaction.post.price),
            transaction.post.brokerCommission ?? 0,
          );
          finalStatus = 'SUCCESS';
          await tx.posts.update({
            where: { id: updatedTx.postId },
            data: { status: 'SOLD' },
          });

          await tx.invoice.upsert({
            where: { transactionId },
            create: { transactionId, userId: updatedTx.sellerId, amount: calculatedFee, status: 'DRAFT' },
            update: { amount: calculatedFee },
          });

        } else if (!buyerYes && !sellerYes) {
          // 🌟 Trường hợp 2: Cả 2 chọn KHÔNG (Hủy đồng kiểm, AI có thể hỏi lại sau)
          finalStatus = 'CANCELLED';

        } else {
          // 🌟 Trường hợp 3: Lệch pha (1 CÓ, 1 KHÔNG) -> Chuyển thành Tranh chấp
          // Tạm thời không auto-ban (FRAUD) ở đây để Admin vào kiểm tra và xử lý cảnh báo sau.
          finalStatus = 'DISPUTE';
          const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
          if (admins.length) {
            await tx.notification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                title: 'Cảnh báo giao dịch cần đối soát',
                content: `Hai bên trả lời không khớp cho giao dịch #${transactionId.substring(0, 8)} (${transaction.post.title}).`,
                type: 'SYSTEM' as const,
              })),
            });
          }
        }
      }

      // Cập nhật trạng thái cuối cùng
      const finalTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: finalStatus,
          ...(calculatedFee === undefined ? {} : { calculatedFee }),
        },
        include: { post: true },
      });

      return finalTx;
    });
  }

  // =================================================================
  // 4. CHECK TRẠNG THÁI HIỂN THỊ POPUP (Cho Frontend)
  // =================================================================
  async checkActiveTransaction(user1: string, user2: string, postId?: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        ...(postId ? { postId } : {}),
        status: { in: ['VERIFYING', 'DISPUTE'] },
        OR: [
          { buyerId: user1, sellerId: user2 },
          { buyerId: user2, sellerId: user1 },
        ],
      },
      include: { post: true },
      orderBy: { createdAt: 'desc' },
    });

    return transaction; 
  }

  // =================================================================
  // 5. KIỂM TRA ĐÃ CHỐT THÀNH CÔNG CHƯA (Cho AI Chat Service)
  // =================================================================
  async hasCompletedTransaction(postId: number, user1: string, user2: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        postId,
        status: 'SUCCESS', // Chỉ quan tâm nếu đã thành công
        OR: [
          { buyerId: user1, sellerId: user2 },
          { buyerId: user2, sellerId: user1 },
        ],
      }
    });

    return !!transaction; // Trả về true nếu đã có giao dịch SUCCESS
  }

  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: { post: { select: { id: true, title: true, thumbnail: true } }, invoice: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPendingBuyerConfirmations(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        buyerId: userId,
        status: 'VERIFYING',
        sellerConfirmed: true,
        buyerConfirmed: null,
      },
      include: {
        post: { select: { id: true, title: true, thumbnail: true, price: true } },
        seller: { select: { fullName: true, phoneNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getUserInvoices(userId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      include: { transaction: { include: { post: { select: { id: true, title: true, thumbnail: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((invoice) => this.withLateFee(invoice));
  }
  // =================================================================
  // 6. YÊU CẦU HỦY KÈO (Có check Quota 3 lần/tháng)
  // =================================================================
  async requestCancelAfterSuccess(transactionId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) throw new BadRequestException('Không tìm thấy giao dịch!');
      if (transaction.status !== 'SUCCESS') {
        throw new BadRequestException('Chỉ có thể yêu cầu hủy các giao dịch đã chốt.');
      }

      // 1. Kiểm tra Grace Period (3 ngày)
      const now = new Date();
      const updatedAt = new Date(transaction.updatedAt);
      const diffDays = Math.ceil(Math.abs(now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)); 
      if (diffDays > 3) {
        throw new ConflictException('Đã quá thời hạn 3 ngày để yêu cầu hủy.');
      }

      // 2. 🌟 KIỂM TRA QUOTA (Tối đa 3 lần/tháng)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const cancelCount = await tx.transaction.count({
        where: {
          cancelInitiatorId: userId,
          createdAt: { gte: startOfMonth }
        }
      });

      if (cancelCount >= 3) {
        // Tự động khóa tài khoản nếu lạm dụng
        await tx.user.update({
          where: { id: userId },
          data: { isLocked: true, lockReason: 'Hệ thống tự động khóa: Lạm dụng tính năng hủy kèo quá 3 lần/tháng.' }
        });
        throw new ForbiddenException('Tài khoản của bạn đã bị khóa do vi phạm lạm dụng hủy giao dịch.');
      }

      // 3. Đổi trạng thái sang Chờ Xác Nhận
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { 
          status: 'PENDING_CANCEL',
          cancelInitiatorId: userId,
          cancelReason: reason
        }
      });

      // 4. Gửi thông báo cho đối tác
      const partnerId = transaction.buyerId === userId ? transaction.sellerId : transaction.buyerId;
      await tx.notification.create({
        data: {
          userId: partnerId,
          title: 'Yêu cầu hủy giao dịch',
          content: `Đối tác muốn hủy giao dịch #${transactionId.substring(0,6)} với lý do: "${reason}". Vui lòng xác nhận hoặc phản đối.`,
          type: 'SYSTEM'
        }
      });

      return updatedTx;
    });
  }

  // =================================================================
  // 7. PHẢN HỒI YÊU CẦU HỦY KÈO (QUYỀN KHÁNG CÁO)
  // =================================================================
  async respondToCancelRequest(transactionId: string, userId: string, isAgreed: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction || transaction.status !== 'PENDING_CANCEL') {
        throw new BadRequestException('Giao dịch không ở trạng thái chờ hủy.');
      }

      // Chỉ người bị yêu cầu (không phải người khơi mào) mới được quyền trả lời
      if (transaction.cancelInitiatorId === userId) {
        throw new ForbiddenException('Bạn không thể tự duyệt yêu cầu của chính mình.');
      }

      if (isAgreed) {
        // 🌟 Nếu Đồng ý -> Hủy chính thức, bài đăng ACTIVE trở lại
        await tx.posts.update({
          where: { id: transaction.postId },
          data: { status: 'ACTIVE' }
        });
        await tx.invoice.updateMany({
          where: { transactionId },
          data: { status: 'CANCELLED' },
        });
        return tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'CANCELLED_AFTER_SUCCESS' }
        });
      } else {
        // 🌟 Nếu Phản đối -> Đưa vào TRANH CHẤP để Admin xử lý
        const disputed = await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'DISPUTE' }
        });
        const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (admins.length) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              title: 'Tranh chấp hủy giao dịch',
              content: `Một bên phản đối yêu cầu hủy giao dịch #${transactionId.substring(0, 8)}. Vui lòng kiểm tra và phản hồi.`,
              type: 'SYSTEM' as const,
            })),
          });
        }
        return disputed;
      }
    });
  }
  // =================================================================
  // 8. QUẢN LÝ HÓA ĐƠN GIAO DỊCH (DÀNH CHO ADMIN)
  // =================================================================
  
  async getAllInvoices() {
    const invoices = await this.prisma.invoice.findMany({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } },
        transaction: { include: { post: { select: { id: true, title: true, thumbnail: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return invoices.map((invoice) => this.withLateFee(invoice));
  }

  async deleteProcessedTransaction(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId }, include: { invoice: true } });
    if (!transaction) throw new BadRequestException('Không tìm thấy giao dịch.');
    if (['VERIFYING', 'DISPUTE', 'PENDING_CANCEL'].includes(transaction.status)) {
      throw new ConflictException('Giao dịch chưa xử lý xong nên chưa thể xóa.');
    }
    if (transaction.invoice && !['PAID', 'CANCELLED'].includes(transaction.invoice.status)) {
      throw new ConflictException('Hóa đơn chưa hoàn tất nên chưa thể xóa giao dịch.');
    }
    return this.prisma.transaction.delete({ where: { id: transactionId } });
  }

  async issueInvoice(invoiceId: string) {
    const current = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!current) throw new BadRequestException('Không tìm thấy hóa đơn.');
    if (current.status !== 'DRAFT') {
      throw new ConflictException('Chỉ hóa đơn nháp mới có thể được phát hành.');
    }
    // Cộng thêm 30 ngày làm hạn chót
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PENDING_PAYMENT',
        dueDate: dueDate
      }
    });

    // Bắn thông báo yêu cầu User đóng tiền
    await this.prisma.notification.create({
      data: {
        userId: invoice.userId,
        title: 'Báo cáo: Hóa đơn phí dịch vụ mới',
        content: `Bạn có một hóa đơn phí giao dịch (Mã: #${invoice.id.substring(0,8)}) cần thanh toán trước ngày ${dueDate.toLocaleDateString('vi-VN')}. Vui lòng kiểm tra và thanh toán.`,
        type: 'SYSTEM'
      }
    });

    return invoice;
  }
}

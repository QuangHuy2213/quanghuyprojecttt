import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // 1. HÀM TÍNH TOÁN CHIẾT KHẤU / HOA HỒNG
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

  // 2. AI PHÁT HIỆN TỪ KHÓA & TẠO GIAO DỊCH ĐỂ ĐỒNG KIỂM
  async triggerEscrowVerification(postId: number, buyerId: string, sellerId: string) {
    return this.prisma.transaction.create({
      data: {
        postId,
        buyerId,
        sellerId,
        status: 'VERIFYING',
      }
    });
  }

  // 3. MA TRẬN ĐỒNG KIỂM & XỬ LÝ GIAN LẬN
  async verifyTransaction(transactionId: string, userId: string, isConfirmed: boolean) {
    if (typeof isConfirmed !== 'boolean') {
      throw new BadRequestException('isConfirmed phải có giá trị true hoặc false.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { post: true },
      });

      if (!transaction) {
        throw new BadRequestException('Không tìm thấy giao dịch!');
      }

      if (transaction.status !== 'VERIFYING') {
        throw new ConflictException('Giao dịch này đã được xử lý và không thể xác nhận lại.');
      }

      const updateData =
        userId === transaction.buyerId
          ? { buyerConfirmed: isConfirmed }
          : userId === transaction.sellerId
            ? { sellerConfirmed: isConfirmed }
            : null;

      if (!updateData) {
        throw new ForbiddenException('Bạn không có quyền xác nhận giao dịch này.');
      }

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      let finalStatus = updatedTx.status;
      let calculatedFee: number | undefined;

      if (updatedTx.buyerConfirmed !== null && updatedTx.sellerConfirmed !== null) {
        const buyerYes = updatedTx.buyerConfirmed;
        const sellerYes = updatedTx.sellerConfirmed;

        if (buyerYes && sellerYes) {
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
        } else if (!buyerYes && !sellerYes) {
          finalStatus = 'CANCELLED';
        } else if (buyerYes && !sellerYes) {
          finalStatus = 'FRAUD';
          await tx.user.update({
            where: { id: transaction.sellerId },
            data: {
              isLocked: true,
              lockReason: 'Hệ thống phát hiện gian lận: Cố tình trốn phí hoa hồng giao dịch.',
            },
          });
          await tx.posts.update({
            where: { id: updatedTx.postId },
            data: { status: 'HIDDEN' },
          });
        } else {
          finalStatus = 'DISPUTE';
        }
      }

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
  // 🌟 MỚI: KIỂM TRA GIAO DỊCH ĐANG CHỜ ĐỒNG KIỂM GIỮA 2 USER
  async checkActiveTransaction(user1: string, user2: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        status: { in: ['VERIFYING', 'DISPUTE'] },
        OR: [
          { buyerId: user1, sellerId: user2 },
          { buyerId: user2, sellerId: user1 },
        ],
      },
      include: { post: true },
      orderBy: { createdAt: 'desc' },
    });

    return transaction; // Trả về giao dịch nếu có, hoặc null nếu không có
  }
  
}
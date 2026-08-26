import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService
  ) {}

  async handleMessageWithAI(senderId: string, postId: number, content: string) {
    const keywords = ['chốt', 'chuyển cọc', 'stk', 'số tài khoản', 'gặp nhau', 'ký hợp đồng', 'thanh toán'];
    const lowerContent = content.toLowerCase();
    const isMatched = keywords.some(keyword => lowerContent.includes(keyword));

    if (isMatched) {
      const existingTx = await this.prisma.transaction.findFirst({
        where: { postId, status: 'VERIFYING' }
      });

      if (!existingTx) {
        const post = await this.prisma.posts.findUnique({ where: { id: postId } });
        
        // 🌟 Thêm điều kiện kiểm tra post và post.userId tồn tại để khắc phục triệt để lỗi type null
        if (post && post.userId && post.userId !== senderId) {
          await this.transactionService.triggerEscrowVerification(postId, senderId, post.userId);
        }
      }
    }

    return { success: true };
  }
}
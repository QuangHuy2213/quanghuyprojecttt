import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService
  ) {
    // 🌟 KHỞI TẠO AI (Nhớ thêm GEMINI_API_KEY vào file .env của bạn)
    // Lấy key miễn phí tại: https://aistudio.google.com/
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }

  async handleMessageWithAI(senderId: string, receiverId: string, postId: number, content: string) {
    let isMatched = false;

    // 🌟 BƯỚC 1: DÙNG AI ĐỂ ĐỌC HIỂU NGỮ CẢNH CÂU NÓI
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        Bạn là hệ thống kiểm duyệt tin nhắn giao dịch bất động sản.
        Hãy đọc câu sau và cho biết người nói có ý định ngầm hoặc trực tiếp để "chốt giao dịch", "chuyển tiền đặt cọc", hoặc "hẹn ký hợp đồng" hay không?
        Câu nói của khách: "${content}"
        Chỉ trả về đúng 1 chữ: "TRUE" nếu có ý định giao dịch, "FALSE" nếu không. Không giải thích gì thêm.
      `;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim().toUpperCase();
      
      if (responseText.includes('TRUE')) {
        isMatched = true;
      }
    } catch (error) {
      console.error("Lỗi API AI, fallback về quét từ khóa:", error);
      // Fallback dự phòng nếu AI bị nghẽn mạng
      const keywords = ['chốt', 'cọc', 'stk', 'thanh toán'];
      isMatched = keywords.some(k => content.toLowerCase().includes(k));
    }

    // 🌟 BƯỚC 2: KÍCH HOẠT ĐỒNG KIỂM NẾU AI BÁO TRUE
    if (isMatched) {
      const validPostId = Number(postId);
      if (!validPostId || isNaN(validPostId)) return { success: false };

      const existingTx = await this.prisma.transaction.findFirst({
        where: { postId: validPostId, status: 'VERIFYING' }
      });

      if (!existingTx) {
        const post = await this.prisma.posts.findUnique({ where: { id: validPostId } });
        
        if (post && post.userId) {
          const buyerId = (senderId === post.userId) ? receiverId : senderId;
          const sellerId = post.userId;
          await this.transactionService.triggerEscrowVerification(validPostId, buyerId, sellerId);
        }
      }
    }

    return { success: true };
  }
}
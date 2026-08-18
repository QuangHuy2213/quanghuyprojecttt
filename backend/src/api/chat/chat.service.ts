import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participantIds: { has: userId },
        NOT: { deletedByIds: { has: userId } },
      },
      include: {
        users: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async sendMessage(text: string, receiverId: string, currentUserId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participantIds: { has: currentUserId } },
          { participantIds: { has: receiverId } },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participantIds: [currentUserId, receiverId],
          users: { connect: [{ id: currentUserId }, { id: receiverId }] },
        },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { deletedByIds: [] },
      });
    }

    return this.prisma.message.create({
      data: {
        text,
        senderId: currentUserId,
        conversationId: conversation.id,
      },
    });
  }

  async deleteConversation(conversationId: string, currentUserId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        deletedByIds: { push: currentUserId },
      },
    });

    return { success: true };
  }
}
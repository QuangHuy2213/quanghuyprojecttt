import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { IntentService } from './intent.service';
import { ConversationDto, SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly analyses = new Map<string, Promise<unknown>>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionService,
    private readonly intent: IntentService,
  ) {}

  private conversation(
    userId: string,
    peerId: string,
    postId?: number,
  ): Prisma.MessageWhereInput {
    return {
      postId: postId ?? null,
      OR: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
    };
  }

  private async validateConversation(userId: string, peerId: string, postId?: number) {
    if (userId === peerId)
      throw new BadRequestException('Không thể nhắn tin cho chính mình.');
    const peer = await this.prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, isLocked: true },
    });
    if (!peer || peer.isLocked)
      throw new NotFoundException('Tài khoản nhận tin không khả dụng.');
    if (!postId) return null;
    const post = await this.prisma.posts.findUnique({ where: { id: postId } });
    if (!post || !post.userId) throw new NotFoundException('Không tìm thấy bài đăng.');
    if (![userId, peerId].includes(post.userId))
      throw new ForbiddenException('Cuộc trò chuyện phải có người đăng tin.');
    if (post.status !== 'ACTIVE') {
      const existing = await this.prisma.message.findFirst({
        where: this.conversation(userId, peerId, postId),
      });
      const transaction = await this.transactions.checkActiveTransaction(
        userId,
        peerId,
        postId,
      );
      if (!existing && !transaction)
        throw new ForbiddenException('Tin không còn nhận cuộc trò chuyện mới.');
    }
    return post;
  }

  async send(userId: string, input: SendMessageDto) {
    const content = input.content.trim();
    if (!content) throw new BadRequestException('Tin nhắn không được để trống.');
    const post = await this.validateConversation(userId, input.receiverId, input.postId);
    const unique = {
      senderId_clientMessageId: {
        senderId: userId,
        clientMessageId: input.clientMessageId,
      },
    };
    const existing = await this.prisma.message.findUnique({ where: unique });
    if (existing) {
      if (
        existing.receiverId !== input.receiverId ||
        existing.postId !== (input.postId ?? null) ||
        existing.text !== content
      )
        throw new BadRequestException('Mã gửi tin đã được dùng cho nội dung khác.');
      return { message: existing };
    }
    const message = await this.prisma.message.upsert({
      where: unique,
      update: {},
      create: {
        senderId: userId,
        receiverId: input.receiverId,
        postId: input.postId,
        text: content,
        clientMessageId: input.clientMessageId,
      },
    });
    if (
      message.receiverId !== input.receiverId ||
      message.postId !== (input.postId ?? null) ||
      message.text !== content
    ) {
      throw new BadRequestException('Mã gửi tin đã được dùng cho nội dung khác.');
    }
    if (post?.status === 'ACTIVE') {
      const buyerId = userId === post.userId ? input.receiverId : userId;
      const analysisKey = `${post.id}:${buyerId}`;
      const previous = this.analyses.get(analysisKey) ?? Promise.resolve();
      const analysis = previous
        .catch(() => undefined)
        .then(async () => {
          if (
            await this.transactions.checkActiveTransaction(
              userId,
              input.receiverId,
              post.id,
            )
          )
            return;
          const recent = await this.prisma.message.findMany({
            where: this.conversation(userId, input.receiverId, post.id),
            orderBy: { id: 'desc' },
            take: 12,
          });
          const messages = recent.reverse().map((item) => ({
            role:
              item.senderId === post.userId ? ('seller' as const) : ('buyer' as const),
            text: item.text,
          }));
          if (await this.intent.isNegotiating(post.title, messages))
            await this.transactions.triggerEscrowVerification(
              post.id,
              buyerId,
              post.userId!,
            );
        });
      this.analyses.set(analysisKey, analysis);
      // Persisted chat is returned even if the classifier is unavailable; no keyword fallback.
      try {
        await analysis;
      } catch {
        /* A saved message must not become a failed send when analysis fails. */
      } finally {
        if (this.analyses.get(analysisKey) === analysis)
          this.analyses.delete(analysisKey);
      }
    }
    return { message };
  }

  async messages(userId: string, input: ConversationDto, before?: number) {
    await this.validateConversation(userId, input.receiverId, input.postId);
    return (
      await this.prisma.message.findMany({
        where: {
          ...this.conversation(userId, input.receiverId, input.postId),
          ...(before ? { id: { lt: before } } : {}),
        },
        orderBy: { id: 'desc' },
        take: 50,
      })
    ).reverse();
  }

  async details(userId: string, input: ConversationDto) {
    const post = await this.validateConversation(userId, input.receiverId, input.postId);
    const peer = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.receiverId },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    return { peer, post: post ? { id: post.id, title: post.title } : null };
  }

  async threads(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT DISTINCT ON (peer_id, post_id) id
      FROM (
        SELECT id, post_id,
          CASE WHEN sender_id = ${userId}
            THEN receiver_id ELSE sender_id END AS peer_id
        FROM messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
      ) AS conversation_messages
      ORDER BY peer_id, post_id, id DESC`;
    const messages = await this.prisma.message.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true } },
        post: { select: { id: true, title: true } },
      },
      orderBy: { id: 'desc' },
    });
    const unread = await this.prisma.message.groupBy({
      by: ['senderId', 'postId'],
      where: { receiverId: userId, readAt: null },
      _count: true,
    });
    return messages.map((message) => ({
      peer: message.senderId === userId ? message.receiver : message.sender,
      post: message.post,
      lastMessage: message,
      unread:
        unread.find(
          (item) =>
            item.senderId ===
              (message.senderId === userId ? message.receiverId : message.senderId) &&
            item.postId === message.postId,
        )?._count ?? 0,
    }));
  }

  unreadCount(userId: string) {
    return this.prisma.message.count({ where: { receiverId: userId, readAt: null } });
  }

  latestReceived(userId: string) {
    return this.prisma.message.findFirst({
      where: { receiverId: userId },
      orderBy: { id: 'desc' },
      select: { id: true, senderId: true, postId: true, text: true },
    });
  }

  async deleteConversation(userId: string, input: ConversationDto) {
    const remove = async (db: Prisma.TransactionClient) => {
      const transaction = await db.transaction.findFirst({
        where: {
          ...(input.postId ? { postId: input.postId } : {}),
          OR: [
            { buyerId: userId, sellerId: input.receiverId },
            { sellerId: userId, buyerId: input.receiverId },
          ],
          status: { notIn: ['CANCELLED', 'CANCELLED_AFTER_SUCCESS'] },
        },
      });
      if (transaction) {
        throw new BadRequestException(
          'Không thể xóa hội thoại có giao dịch đang xử lý hoặc đã hoàn tất.',
        );
      }
      await db.message.deleteMany({
        where: this.conversation(userId, input.receiverId, input.postId),
      });
      return { deleted: true };
    };
    return this.prisma.$transaction(async (db) => {
      if (input.postId) {
        await db.$queryRaw`SELECT id FROM posts WHERE id = ${input.postId} FOR UPDATE`;
      }
      return remove(db);
    });
  }

  async markRead(userId: string, input: ConversationDto, throughId: number) {
    if (!Number.isInteger(throughId) || throughId < 1)
      throw new BadRequestException('Mốc đọc tin nhắn không hợp lệ.');
    await this.prisma.message.updateMany({
      where: {
        senderId: input.receiverId,
        receiverId: userId,
        postId: input.postId ?? null,
        readAt: null,
        id: { lte: throughId },
      },
      data: { readAt: new Date() },
    });
    return { unreadCount: await this.unreadCount(userId) };
  }
}

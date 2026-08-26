import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service'; 
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: { userId: string };
};

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  async sendMessage(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const senderId = req.user.userId;
    const { postId, receiverId, content } = body;

    if (!senderId || !receiverId || !content?.trim()) {
      return { success: false, message: 'Thiếu thông tin tin nhắn.' };
    }

  // Gọi service đã được nâng cấp
    return this.chatService.handleMessageWithAI(senderId, receiverId, postId, content);
}
}

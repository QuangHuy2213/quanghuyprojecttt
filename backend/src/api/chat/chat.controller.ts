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
  async sendMessage(
    @Body() body: { postId: number; content: string }, 
    @Req() req: AuthenticatedRequest
  ) {
    const senderId = req.user.userId;
    return this.chatService.handleMessageWithAI(senderId, Number(body.postId), body.content);
  }
}
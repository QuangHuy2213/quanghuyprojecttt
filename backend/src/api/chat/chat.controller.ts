import { Controller, Get, Post, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api') // Hoặc bỏ chữ 'api' đi nếu app.module đã có global prefix
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('Thiếu userId');
    return this.chatService.getConversations(userId);
  }

  @Post('messages')
  async sendMessage(@Body() body: { text: string; receiverId: string; currentUserId: string }) {
    const { text, receiverId, currentUserId } = body;
    if (!text || !receiverId || !currentUserId) throw new BadRequestException('Thiếu dữ liệu đầu vào');
    return this.chatService.sendMessage(text, receiverId, currentUserId);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string, @Body('currentUserId') currentUserId: string) {
    if (!id || !currentUserId) throw new BadRequestException('Thiếu dữ liệu');
    return this.chatService.deleteConversation(id, currentUserId);
  }
}
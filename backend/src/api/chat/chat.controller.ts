import {
  Body,
  Delete,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import {
  ConversationDto,
  MessageQueryDto,
  ReadMessagesDto,
  SendMessageDto,
} from './dto/chat.dto';

type AuthRequest = { user: { userId: string } };

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('send')
  send(@Req() req: AuthRequest, @Body() body: SendMessageDto) {
    return this.chat.send(req.user.userId, body);
  }

  @Get('threads')
  threads(@Req() req: AuthRequest) {
    return this.chat.threads(req.user.userId);
  }

  @Delete('conversation')
  deleteConversation(@Req() req: AuthRequest, @Query() query: ConversationDto) {
    return this.chat.deleteConversation(req.user.userId, query);
  }

  @Get('conversation')
  details(@Req() req: AuthRequest, @Query() query: ConversationDto) {
    return this.chat.details(req.user.userId, query);
  }

  @Get('messages')
  messages(@Req() req: AuthRequest, @Query() query: MessageQueryDto) {
    return this.chat.messages(req.user.userId, query, query.before);
  }

  @Get('unread-count')
  async unread(@Req() req: AuthRequest) {
    return {
      count: await this.chat.unreadCount(req.user.userId),
      latest: await this.chat.latestReceived(req.user.userId),
    };
  }

  @Patch('read')
  read(@Req() req: AuthRequest, @Body() body: ReadMessagesDto) {
    return this.chat.markRead(req.user.userId, body, body.throughId);
  }
}

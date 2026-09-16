import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  AiService,
} from './ai.service';

import {
  AiChatDto,
} from './dto/ai-chat.dto';


@Controller('ai')
export class AiController {

  constructor(
    private readonly aiService:
      AiService,
  ) {}


  @Post('chat')
  chat(
    @Body()
    dto: AiChatDto,
  ) {

    return this.aiService.chat(
      dto.message.trim(),
    );
  }
}
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [PrismaModule, TransactionModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PrismaModule } from '../../prisma/prisma.module'; // Trỏ ra 2 cấp thư mục

@Module({
  imports: [PrismaModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService], 
})
export class TransactionModule {}
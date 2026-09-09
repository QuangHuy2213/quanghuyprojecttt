import { TransactionModule } from '../transaction/transaction.module';
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [TransactionModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}

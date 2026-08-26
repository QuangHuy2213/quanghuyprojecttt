import { Controller, Get, Patch, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: { userId: string };
};

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/verify')
  async verifyTransaction(
    @Param('id') transactionId: string,
    @Body('isConfirmed') isConfirmed: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    const result = await this.transactionService.verifyTransaction(transactionId, userId, isConfirmed);

    return {
      message: 'Cảm ơn bạn đã phản hồi xác nhận giao dịch.',
      data: result,
    };
  }

  // 🌟 API KIỂM TRA TRẠNG THÁI GIAO ĐỊCH ĐỒNG KIỂM
  @UseGuards(AuthGuard('jwt'))
  @Get('check')
  async checkTransaction(
    @Query('user1') user1: string,
    @Query('user2') user2: string,
  ) {
    return this.transactionService.checkActiveTransaction(user1, user2);
  }
}
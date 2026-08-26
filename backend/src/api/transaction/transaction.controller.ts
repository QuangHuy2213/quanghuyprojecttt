import { Controller, Delete, Get, Patch, Post, Param, Body, UseGuards, Req, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger'; // 🌟 ĐÃ THÊM IMPORT NÀY ĐỂ SỬA LỖI
import { TransactionService } from './transaction.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

// Tùy thuộc vào cách bạn lưu payload trong JWT, có thể là userId hoặc sub
type AuthenticatedRequest = Request & {
  user: { userId?: string, sub?: string }; 
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
    // Lấy ID người dùng an toàn
    const userId = req.user.userId || req.user.sub;
    const result = await this.transactionService.verifyTransaction(transactionId, userId as string, isConfirmed);

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
    @Query('postId') postId?: string,
  ) {
    return this.transactionService.checkActiveTransaction(user1, user2, postId ? Number(postId) : undefined);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-transactions')
  async getMyTransactions(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId || req.user.sub;
    return this.transactionService.getUserTransactions(userId as string);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-invoices')
  async getMyInvoices(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId || req.user.sub;
    return this.transactionService.getUserInvoices(userId as string);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('posts/:postId/mark-sold')
  @ApiOperation({ summary: 'Người đăng báo đã bán và mời khách mua xác nhận bằng số điện thoại' })
  async markPostSold(
    @Param('postId') postId: string,
    @Body('buyerPhone') buyerPhone: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const sellerId = req.user.userId || req.user.sub;
    return this.transactionService.markPostSold(Number(postId), sellerId as string, buyerPhone);
  }

  // =================================================================
  // 🌟 API YÊU CẦU & PHẢN HỒI HỦY KÈO PHÚT CHÓT (USER)
  // =================================================================
  
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/request-cancel')
  @ApiOperation({ summary: 'User yêu cầu hủy giao dịch sau khi đã chốt' })
  async requestCancel(
    @Param('id') transactionId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId || req.user.sub;
    if (!reason) throw new BadRequestException('Vui lòng cung cấp lý do hủy.');
    return this.transactionService.requestCancelAfterSuccess(transactionId, userId as string, reason);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/respond-cancel')
  @ApiOperation({ summary: 'Đối tác phản hồi yêu cầu hủy (Đồng ý/Phản đối)' })
  async respondCancel(
    @Param('id') transactionId: string,
    @Body('isAgreed') isAgreed: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId || req.user.sub;
    if (typeof isAgreed !== 'boolean') {
      throw new BadRequestException('Trạng thái xác nhận (isAgreed) phải là true hoặc false.');
    }
    return this.transactionService.respondToCancelRequest(transactionId, userId as string, isAgreed);
  }

  // =================================================================
  // 🌟 API QUẢN LÝ HÓA ĐƠN (DÀNH CHO ADMIN)
  // =================================================================
  
  @Get('invoices/admin/all')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Admin lấy danh sách toàn bộ hóa đơn' })
  // @UseGuards(AuthGuard('jwt')) // Mở comment này ra nếu bạn muốn check Auth Admin
  async getAdminInvoices(@Req() req: any) {
    if (req.user?.role !== 'ADMIN') throw new BadRequestException('Bạn không có quyền quản trị hóa đơn.');
    return this.transactionService.getAllInvoices();
  }

  @Patch('invoices/admin/:id/issue')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Admin duyệt phát hành hóa đơn' })
  // @UseGuards(AuthGuard('jwt')) // Mở comment này ra nếu bạn muốn check Auth Admin
  async issueInvoice(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== 'ADMIN') throw new BadRequestException('Bạn không có quyền phát hành hóa đơn.');
    return this.transactionService.issueInvoice(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/:id')
  async deleteProcessed(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== 'ADMIN') throw new BadRequestException('Bạn không có quyền xóa dữ liệu đối soát.');
    return this.transactionService.deleteProcessedTransaction(id);
  }
}

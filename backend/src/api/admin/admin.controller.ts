import { Controller, Get, Patch, Post, Delete, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- API DASHBOARD ---
  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  // --- API QUẢN LÝ NGƯỜI DÙNG ---
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string, 
    @Body('role') role: 'USER' | 'AGENT' | 'ADMIN'
  ) {
    await this.adminService.updateUserRole(id, role);
    return { message: 'Cập nhật phân quyền thành công!' };
  }

  @Post('users')
  async createUser(@Body() body: any) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUserDetails(id, body);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
    return { message: 'Xóa người dùng thành công!' };
  }

  @Get('posts/pending')
  async getPendingPosts() {
    return this.adminService.getPendingPosts();
  }

  @Patch('posts/:id/review')
  async reviewPost(
    @Param('id') id: string, 
    @Body() body: { status: 'ACTIVE' | 'HIDDEN', reason?: string }
  ) {
    return this.adminService.reviewPost(Number(id), body.status, body.reason);
  }
  // --- API LIÊN HỆ ---
  @Get('contacts')
  async getAllContacts() {
    return this.adminService.getAllContacts();
  }

  @Patch('contacts/:id/status')
  async updateContactStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    await this.adminService.updateContactStatus(Number(id), status);
    return { message: 'Cập nhật trạng thái liên hệ thành công!' };
  }
  // --- API BÁO CÁO VI PHẠM ---
  @Get('reports')
  async getAllReports() {
    return this.adminService.getAllReports();
  }

  @Patch('reports/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body('status') status: 'RESOLVED' | 'IGNORED'
  ) {
    await this.adminService.updateReportStatus(Number(id), status);
    return { message: 'Cập nhật trạng thái báo cáo thành công!' };
  }

  // 🌟 THÊM API GỬI EMAIL NÀY VÀO TRONG AdminController
  @Post('contacts/reply')
  async replyContactEmail(@Body() body: { contactId: number, email: string, subject: string, message: string }) {
    await this.adminService.replyContactEmail(body.contactId, body.email, body.subject, body.message);
    return { message: 'Đã gửi email phản hồi thành công!' };
  }
  @Delete('contacts/:id')
  async deleteContact(@Param('id') id: string) {
    await this.adminService.deleteContact(Number(id));
    return { message: 'Đã xóa thành công!' };
  }
  @Delete('reports/:reportId/post/:postId')
  async deleteReportedPost(
    @Param('reportId') reportId: string,
    @Param('postId') postId: string
  ) {
    return this.adminService.deletePostByAdmin(Number(postId), Number(reportId));
  }
  @Delete('reports/:id')
  async deleteReport(@Param('id') id: string) {
    await this.adminService.deleteReport(Number(id));
    return { message: 'Đã xóa báo cáo thành công!' };
  }
}
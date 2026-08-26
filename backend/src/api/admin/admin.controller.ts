import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto, ReplyContactEmailDto, ReviewPostDto, UpdateContactStatusDto, UpdateReportStatusDto, UpdateUserDetailsDto, UpdateUserRoleDto } from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- API DASHBOARD ---
  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê dashboard' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  // --- API QUẢN LÝ NGƯỜI DÙNG ---
  @Get('users')
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Cập nhật vai trò người dùng' })
  @ApiParam({ name: 'id', example: '8b4d5f7c-1234-4567-8901-abcdef123456' })
  @ApiBody({ type: UpdateUserRoleDto })
  async updateUserRole(
    @Param('id') id: string, 
    @Body('role') role: 'USER' | 'AGENT' | 'ADMIN'
  ) {
    await this.adminService.updateUserRole(id, role);
    return { message: 'Cập nhật phân quyền thành công!' };
  }

  @Post('users')
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  @ApiBody({ type: CreateUserDto })
  async createUser(@Body() body: CreateUserDto) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  @ApiParam({ name: 'id', example: '8b4d5f7c-1234-4567-8901-abcdef123456' })
  @ApiBody({ type: UpdateUserDetailsDto })
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDetailsDto) {
    return this.adminService.updateUserDetails(id, body);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiParam({ name: 'id', example: '8b4d5f7c-1234-4567-8901-abcdef123456' })
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
    return { message: 'Xóa người dùng thành công!' };
  }

  // --- API QUẢN LÝ BÀI ĐĂNG ---
  @Get('posts/pending')
  @ApiOperation({ summary: 'Lấy các bài đăng chờ duyệt' })
  async getPendingPosts() {
    return this.adminService.getPendingPosts();
  }

  @Patch('posts/:id/review')
  @ApiOperation({ summary: 'Duyệt hoặc ẩn bài đăng' })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: ReviewPostDto })
  async reviewPost(
    @Param('id') id: string, 
    @Body() body: ReviewPostDto
  ) {
    return this.adminService.reviewPost(Number(id), body.status, body.reason);
  }

  // --- API QUẢN LÝ GIAO DỊCH & DOANH THU (ESCROW) ---
  @Get('transactions')
  @ApiOperation({ summary: 'Lấy danh sách giao dịch / đối soát' })
  async getAllTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Patch('transactions/:id/resolve')
  @ApiOperation({ summary: 'Xử lý tranh chấp giao dịch' })
  @ApiParam({ name: 'id', example: 'uuid-giao-dich' })
  async resolveTransactionDispute(
    @Param('id') id: string,
    @Body('resolutionStatus') resolutionStatus: 'SUCCESS' | 'CANCELLED',
    @Body('finalFee') finalFee?: number
  ) {
    await this.adminService.resolveTransactionDispute(id, resolutionStatus, finalFee);
    return { message: 'Đã xử lý tranh chấp giao dịch thành công!' };
  }

  // --- API LIÊN HỆ ---
  @Get('contacts')
  @ApiOperation({ summary: 'Lấy danh sách liên hệ' })
  async getAllContacts() {
    return this.adminService.getAllContacts();
  }

  @Patch('contacts/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái liên hệ' })
  @ApiParam({ name: 'id', example: 12 })
  @ApiBody({ type: UpdateContactStatusDto })
  async updateContactStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    await this.adminService.updateContactStatus(Number(id), status);
    return { message: 'Cập nhật trạng thái liên hệ thành công!' };
  }

  @Post('contacts/reply')
  @ApiOperation({ summary: 'Gửi email phản hồi liên hệ' })
  @ApiBody({ type: ReplyContactEmailDto })
  async replyContactEmail(@Body() body: ReplyContactEmailDto) {
    await this.adminService.replyContactEmail(body.contactId, body.email, body.subject, body.message);
    return { message: 'Đã gửi email phản hồi thành công!' };
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Xóa liên hệ' })
  @ApiParam({ name: 'id', example: 12 })
  async deleteContact(@Param('id') id: string) {
    await this.adminService.deleteContact(Number(id));
    return { message: 'Đã xóa thành công!' };
  }

  // --- API BÁO CÁO VI PHẠM ---
  @Get('reports')
  @ApiOperation({ summary: 'Lấy danh sách báo cáo vi phạm' })
  async getAllReports() {
    return this.adminService.getAllReports();
  }

  @Patch('reports/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái báo cáo' })
  @ApiParam({ name: 'id', example: 12 })
  @ApiBody({ type: UpdateReportStatusDto })
  async updateReportStatus(
    @Param('id') id: string,
    @Body('status') status: 'RESOLVED' | 'IGNORED'
  ) {
    await this.adminService.updateReportStatus(Number(id), status);
    return { message: 'Cập nhật trạng thái báo cáo thành công!' };
  }

  @Delete('reports/:reportId/post/:postId')
  @ApiOperation({ summary: 'Xóa bài đăng bị báo cáo' })
  @ApiParam({ name: 'reportId', example: 12 })
  @ApiParam({ name: 'postId', example: 123 })
  async deleteReportedPost(
    @Param('reportId') reportId: string,
    @Param('postId') postId: string
  ) {
    return this.adminService.deletePostByAdmin(Number(postId), Number(reportId));
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Xóa báo cáo' })
  @ApiParam({ name: 'id', example: 12 })
  async deleteReport(@Param('id') id: string) {
    await this.adminService.deleteReport(Number(id));
    return { message: 'Đã xóa báo cáo thành công!' };
  }
}
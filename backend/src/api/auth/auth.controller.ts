import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // --- GOOGLE OAUTH ROUTES (MỚI THÊM) ---

  // API 1: Bật Popup đăng nhập Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // AuthGuard sẽ tự động chuyển hướng người dùng sang Google
  }

  // API 2: Google trả kết quả về đây
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Xử lý lưu user và tạo token
    const loginData = await this.authService.validateGoogleUser(req.user);

    // Chuyển hướng về Frontend kèm theo token và thông tin user
    const frontendUrl = `http://localhost:3000/auth/callback?token=${loginData.access_token}&user=${encodeURIComponent(JSON.stringify(loginData.user))}`;
    
    return res.redirect(frontendUrl);
  }
}
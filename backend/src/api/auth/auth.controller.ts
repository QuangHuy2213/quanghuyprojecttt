import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'Đăng ký tài khoản thành công' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Đăng nhập thành công và trả về access token' })
  @ApiUnauthorizedResponse({ description: 'Sai tài khoản hoặc mật khẩu' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Gửi email đặt lại mật khẩu' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Đã gửi email đặt lại mật khẩu' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Đặt lại mật khẩu thành công' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // --- GOOGLE OAUTH ROUTES (MỚI THÊM) ---

  // API 1: Bật Popup đăng nhập Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Chuyển hướng sang Google để đăng nhập' })
  @ApiOkResponse({ description: 'Chuyển hướng OAuth sang Google' })
  async googleAuth(@Req() req) {
    // AuthGuard sẽ tự động chuyển hướng người dùng sang Google
  }

  // API 2: Google trả kết quả về đây
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Nhận callback từ Google OAuth' })
  @ApiOkResponse({ description: 'Đăng nhập Google thành công và redirect về frontend' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Xử lý lưu user và tạo token
    const loginData = await this.authService.validateGoogleUser(req.user);

    // Chuyển hướng về Frontend kèm theo token và thông tin user
    // Thay link bằng tên miền thật Vercel của bạn
  const frontendUrl = `https://nguyenducquanghuy.vercel.app/auth/callback?token=${loginData.access_token}&user=${encodeURIComponent(JSON.stringify(loginData.user))}`;
    
    return res.redirect(frontendUrl);
  }
  
}

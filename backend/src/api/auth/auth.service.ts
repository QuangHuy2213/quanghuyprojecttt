import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // Cấu hình Nodemailer gửi mail qua Gmail
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'quanghuy22130504@gmail.com', 
      pass: 'mqlbonvnmwhmgdab', // ĐÃ SỬA: Viết liền 16 ký tự để không bị lỗi gửi mail
    },
  });

  // 1. CHỨC NĂNG ĐĂNG KÝ
  async register(data: any) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (userExists) {
      throw new BadRequestException('Email này đã bị trùng. Vui lòng tạo lại với một email khác!');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      }
    });

    return { message: 'Tuyệt vời! Bạn đã đăng ký tài khoản thành công.' };
  }

  // 2. CHỨC NĂNG ĐĂNG NHẬP
  async login(data: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (!user) {
      throw new UnauthorizedException('Tài khoản không đúng hoặc không tồn tại!');
    }

    // ĐÃ THÊM: Ngăn lỗi crash app nếu user đăng nhập bằng form thường nhưng tài khoản tạo bằng Google (không có password)
    if (!user.password) {
      throw new UnauthorizedException('Tài khoản này được đăng ký bằng Google. Vui lòng chọn "Đăng nhập bằng Google"!');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Tài khoản không đúng hoặc không tồn tại!');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Đăng nhập thành công!',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      }
    };
  }

  // 3. CHỨC NĂNG QUÊN MẬT KHẨU
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email này chưa được đăng ký trong hệ thống!');
    }

    const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: '"Nhà Tốt Support" <no-reply@nhatot.com>',
      to: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu tài khoản Nhà Tốt',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1877F2;">Khôi phục mật khẩu Nhà Tốt</h2>
          <p>Xin chào <b>${user.fullName || 'Quý khách'}</b>,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên hệ thống Nhà Tốt.</p>
          <p>Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới (Đường dẫn có hiệu lực trong vòng <b>15 phút</b>):</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #1877F2; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Đặt lại mật khẩu</a>
          <p style="margin-top: 25px; font-size: 12px; color: #777;">Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
        </div>
      `,
    });

    return { message: 'Đã gửi đường dẫn khôi phục mật khẩu qua email của bạn!' };
  }

  // 4. CHỨC NĂNG ĐẶT LẠI MẬT KHẨU MỚI
  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);
      const email = payload.email;

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new BadRequestException('Tài khoản không tồn tại!');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await this.prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      return { message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' };
    } catch (err) {
      throw new BadRequestException('Đường dẫn khôi phục không hợp lệ hoặc đã hết hạn!');
    }
  }

  // 5. CHỨC NĂNG ĐĂNG NHẬP GOOGLE (MỚI THÊM)
  async validateGoogleUser(googleUser: any) {
    let user = await this.prisma.user.findUnique({ 
      where: { email: googleUser.email } 
    });

    if (!user) {
      // Nếu chưa có, tự động tạo tài khoản mới (Không cần password)
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.fullName,
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl,
        },
      });
    } else if (!user.googleId) {
      // Nếu user đã đăng ký bằng mật khẩu, giờ login bằng Google thì cập nhật thêm mã Google
      user = await this.prisma.user.update({
        where: { email: user.email },
        data: { 
          googleId: googleUser.googleId, 
          avatarUrl: googleUser.avatarUrl 
        },
      });
    }

    // Tạo Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
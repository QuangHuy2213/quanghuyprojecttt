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
      user: 'quanghuy22130504@gmail.com', // Thay bằng email Gmail của bạn
      pass: 'mqlb onvn mwhm gdab', // Thay bằng App Password (Mật khẩu ứng dụng 16 ký tự) của Gmail
    },
  });

  // 1. CHỨC NĂNG ĐĂNG KÝ
  async register(data: any) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    // NẾU TRÙNG TÀI KHOẢN SẼ BÁO LỖI NÀY
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

    // NẾU THÀNH CÔNG SẼ TRẢ VỀ CÂU NÀY
    return { message: 'Tuyệt vời! Bạn đã đăng ký tài khoản thành công.' };
  }

  // 2. CHỨC NĂNG ĐĂNG NHẬP
  async login(data: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    
    // NẾU CHƯA CÓ TÀI KHOẢN
    if (!user) {
      throw new UnauthorizedException('Tài khoản không đúng hoặc không tồn tại!');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    
    // NẾU SAI MẬT KHẨU CŨNG BÁO CHUNG 1 CÂU CHO BẢO MẬT
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
      }
    };
  }

  // 3. CHỨC NĂNG QUÊN MẬT KHẨU (GỬI LINK KÍCH HOẠT QUA GMAIL)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email này chưa được đăng ký trong hệ thống!');
    }

    // Tạo token chứa email, thời hạn 15 phút
    const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });

    // Đường dẫn trỏ về trang đặt lại mật khẩu ở Frontend
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    // Gửi email qua Nodemailer
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
      // Giải mã token xem có hợp lệ và hết hạn chưa
      const payload = this.jwtService.verify(token);
      const email = payload.email;

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new BadRequestException('Tài khoản không tồn tại!');
      }

      // Mã hóa mật khẩu mới trước khi lưu vào cơ sở dữ liệu
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
}
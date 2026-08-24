import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'quanghuy22130504@gmail.com', 
      pass: 'mqlbonvnmwhmgdab', 
    },
  });

  async register(data: any) {
    const userExists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) throw new BadRequestException('Email này đã bị trùng. Vui lòng tạo lại với một email khác!');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    await this.prisma.user.create({
      data: { email: data.email, password: hashedPassword, fullName: data.fullName, phoneNumber: data.phoneNumber }
    });
    return { message: 'Tuyệt vời! Bạn đã đăng ký tài khoản thành công.' };
  }

  async login(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UnauthorizedException('Tài khoản không đúng hoặc không tồn tại!');
    if (!user.password) throw new UnauthorizedException('Tài khoản này được đăng ký bằng Google. Vui lòng chọn "Đăng nhập bằng Google"!');
    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Tài khoản không đúng hoặc không tồn tại!');
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
        role: user.role,
        phoneNumber: user.phoneNumber // 🌟 ĐÃ BỔ SUNG SỐ ĐIỆN THOẠI
      }
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Email này chưa được đăng ký trong hệ thống!');
    const resetToken = this.jwtService.sign({ email: user.email }, { expiresIn: '15m' });
    const resetLink = `https://nguyenducquanghuy.vercel.app/reset-password?token=${resetToken}`;
    await this.transporter.sendMail({
      from: '"Nhà Tốt Support" <no-reply@nhatot.com>',
      to: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu tài khoản Nhà Tốt',
      html: `<p>Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới (Đường dẫn có hiệu lực trong vòng <b>15 phút</b>):</p><a href="${resetLink}">Đặt lại mật khẩu</a>`,
    });
    return { message: 'Đã gửi đường dẫn khôi phục mật khẩu qua email của bạn!' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);
      const email = payload.email;
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new BadRequestException('Tài khoản không tồn tại!');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await this.prisma.user.update({ where: { email }, data: { password: hashedPassword } });
      return { message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' };
    } catch (err) {
      throw new BadRequestException('Đường dẫn khôi phục không hợp lệ hoặc đã hết hạn!');
    }
  }

  async validateGoogleUser(googleUser: any) {
    let user = await this.prisma.user.findUnique({ where: { email: googleUser.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: googleUser.email, fullName: googleUser.fullName, googleId: googleUser.googleId, avatarUrl: googleUser.avatarUrl },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { email: user.email },
        data: { googleId: googleUser.googleId, avatarUrl: googleUser.avatarUrl },
      });
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { 
      access_token: token, 
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        avatarUrl: user.avatarUrl, 
        role: user.role,
        phoneNumber: user.phoneNumber // 🌟 ĐÃ BỔ SUNG SỐ ĐIỆN THOẠI CHO ĐĂNG NHẬP GOOGLE
      } 
    };
  }
 async upgradeToAgent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản cần nâng cấp.');
    }

    if (user.role === 'AGENT') {
      throw new BadRequestException('Tài khoản đã là AGENT.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'AGENT' },
      select: { id: true, email: true, fullName: true, role: true },
    });

    return { message: 'Nâng cấp thành công!', user: updatedUser };
  }
}
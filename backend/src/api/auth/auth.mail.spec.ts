import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { AuthService } from './auth.service';

describe('Forgot password email', () => {
  const findUnique = jest.fn();
  const sign = jest.fn();
  const sendPasswordReset = jest.fn();
  const service = new AuthService(
    { user: { findUnique } } as unknown as PrismaService,
    { sign } as unknown as JwtService,
    { sendPasswordReset } as unknown as MailService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({ email: 'user@example.com' });
    sign.mockReturnValue('test-reset-token');
    sendPasswordReset.mockResolvedValue(undefined);
  });

  it('preserves token payload, expiry, URL, recipient and success response', async () => {
    await expect(service.forgotPassword('user@example.com')).resolves.toEqual({
      message: 'Đã gửi đường dẫn khôi phục mật khẩu qua email của bạn!',
    });
    expect(sign).toHaveBeenCalledWith({ email: 'user@example.com' }, { expiresIn: '15m' });
    expect(sendPasswordReset).toHaveBeenCalledWith('user@example.com',
      'https://nguyenducquanghuy.vercel.app/reset-password?token=test-reset-token');
  });

  it('propagates provider failure rather than returning success', async () => {
    const failure = new ServiceUnavailableException('Mail unavailable');
    sendPasswordReset.mockRejectedValue(failure);
    await expect(service.forgotPassword('user@example.com')).rejects.toBe(failure);
  });

  it('preserves the existing unknown-user response without sending', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.forgotPassword('unknown@example.com')).rejects.toBeInstanceOf(BadRequestException);
    expect(sign).not.toHaveBeenCalled();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });
});

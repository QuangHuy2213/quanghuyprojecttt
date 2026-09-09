import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export const MAIL_TIMEOUT_MS = 12_000;
const MAIL_ERROR = 'Dịch vụ gửi email tạm thời không khả dụng. Vui lòng thử lại sau.';
type MailOperation = 'password-reset' | 'contact-reply';
type MailContent = { to: string; subject: string; html: string; text: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordReset(to: string, resetLink: string): Promise<void> {
    return this.send('password-reset', {
      to,
      subject: 'Yêu cầu đặt lại mật khẩu tài khoản Nhà Tốt',
      text: `Đặt lại mật khẩu tài khoản Nhà Tốt: ${resetLink}\nĐường dẫn có hiệu lực trong 15 phút.`,
      html: `<p>Vui lòng bấm vào nút bên dưới để đổi mật khẩu. Đường dẫn có hiệu lực trong <b>15 phút</b>.</p>
        <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:12px 20px;background:#1877f2;color:#fff;border-radius:6px">Đặt lại mật khẩu</a>`,
    });
  }

  sendContactReply(to: string, subject: string, message: string): Promise<void> {
    return this.send('contact-reply', {
      to,
      subject,
      text: `${message}\n\nĐội ngũ hỗ trợ Nhà Tốt.\nHotline: 1900 6868`,
      html: `<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto;padding:20px">
        <h2>Phản hồi từ Nhà Tốt</h2>
        <div>${escapeHtml(message).replace(/\r\n|\r|\n/g, '<br/>')}</div>
        <p>Đội ngũ hỗ trợ Nhà Tốt.<br/>Hotline: 1900 6868</p>
      </div>`,
    });
  }

  private async send(operation: MailOperation, content: MailContent): Promise<void> {
    // Read only on the backend. Missing mail configuration must not stop unrelated services.
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.MAIL_FROM?.trim();
    if (!apiKey || !from) {
      this.logger.warn({ message: 'Mail provider request failed', operation, code: 'configuration_missing' });
      throw new ServiceUnavailableException(MAIL_ERROR);
    }

    const controller = new AbortController();
    let status: number | undefined;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error('Mail deadline exceeded'));
        controller.abort();
      }, MAIL_TIMEOUT_MS);
    });

    try {
      // Race also bounds body parsing, even if a transport fails to honor cancellation.
      await Promise.race([
        (async () => {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, ...content, to: [content.to] }),
            signal: controller.signal,
            redirect: 'error',
          });
          status = response.status;
          if (!response.ok) throw new Error('Mail provider rejected request');
          const result: unknown = await response.json();
          if (!result || typeof result !== 'object' || !('id' in result) ||
              typeof result.id !== 'string' || !result.id.trim()) {
            throw new Error('Invalid mail provider response');
          }
        })(),
        deadline,
      ]);
    } catch {
      // Never log provider bodies, request content, recipients, tokens or raw exceptions.
      this.logger.warn({
        message: 'Mail provider request failed', operation,
        code: timedOut ? 'timeout' : 'request_failed',
        ...(status === undefined ? {} : { status }),
      });
      throw new ServiceUnavailableException(MAIL_ERROR);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}

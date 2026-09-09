import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { MAIL_TIMEOUT_MS, MailService } from './mail.service';

describe('Resend HTTPS mail', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.MAIL_FROM;
  let fetchMock: jest.SpyInstance;
  let logs: jest.SpyInstance;
  const service = new MailService();

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key-not-a-real-secret';
    process.env.MAIL_FROM = 'Nhà Tốt <sender@example.com>';
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'test-mail-id' }));
    logs = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = originalFrom;
  });

  it('sends reset HTML/text over HTTPS with backend credentials and clears its deadline', async () => {
    jest.useFakeTimers();
    await service.sendPasswordReset('user@example.com', 'https://example.com/reset?token=test-reset-token');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-key-not-a-real-secret');
    const body = JSON.parse(options.body);
    expect(body.from).toBe(process.env.MAIL_FROM);
    expect(body.to).toEqual(['user@example.com']);
    expect(body.html).toContain('15 phút');
    expect(body.html).toContain('href="https://example.com/reset?token=test-reset-token"');
    expect(body.text).toContain('test-reset-token');
    expect(logs).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('escapes HTML, preserves line breaks and keeps plain text fallback', async () => {
    const message = '<script>alert(1)</script>\r\n<img src=x onerror="bad()"> & \'text\'';
    await service.sendContactReply('user@example.com', '<b>Subject</b>', message);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.html).not.toMatch(/<script|<img|<b>Subject/);
    expect(body.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;<br/>');
    expect(body.html).toContain('&quot;bad()&quot;');
    expect(body.text).toContain(message);
    expect(body.subject).toBe('<b>Subject</b>');
  });

  it.each([401, 403, 422, 429, 500])('maps provider %s to a safe 503 without logging its body', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ message: 'test-key-not-a-real-secret test-reset-token password' }, { status }));
    const error = await service.sendPasswordReset('user@example.com', 'https://example.com/?token=test-reset-token').catch(e => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getStatus()).toBe(503);
    const exposed = JSON.stringify([error.getResponse(), logs.mock.calls]);
    expect(exposed).not.toMatch(/test-key|test-reset-token|user@example.com/);
    expect(logs.mock.calls[0][0]).toMatchObject({ operation: 'password-reset', status });
  });

  it.each([{}, { id: '' }, null])('rejects malformed successful provider response %j', async body => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(service.sendContactReply('user@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sanitizes network exceptions', async () => {
    fetchMock.mockRejectedValue(new Error('test-key-not-a-real-secret test-reset-token'));
    await expect(service.sendContactReply('user@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(JSON.stringify(logs.mock.calls)).not.toMatch(/test-key|test-reset-token/);
  });

  it.each(['RESEND_API_KEY', 'MAIL_FROM'])('fails immediately when %s is missing', async name => {
    delete process.env[name];
    await expect(service.sendContactReply('user@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['connection', 'body'])('ends a stalled %s after 12 seconds even if abort is ignored', async phase => {
    jest.useFakeTimers();
    const never = new Promise(() => {});
    fetchMock.mockImplementation(() => phase === 'connection' ? never : Promise.resolve({
      ok: true, status: 200, json: () => never,
    }));
    const result = service.sendContactReply('user@example.com', 'Subject', 'Message');
    const assertion = expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await jest.advanceTimersByTimeAsync(MAIL_TIMEOUT_MS);
    await assertion;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(logs.mock.calls[0][0].code).toBe('timeout');
    expect(jest.getTimerCount()).toBe(0);
  });
});

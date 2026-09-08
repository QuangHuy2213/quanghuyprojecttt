import { IntentService } from './intent.service';

describe('AI intent classification', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-only';
    process.env.GEMINI_MODEL = 'test-model';
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  });

  it('uses both sides of the conversation and a structured AI decision, not keywords', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({
          candidates: [{ content: { parts: [{ text: '{"negotiating":false}' }] } }],
        }),
      );
    expect(
      await new IntentService().isNegotiating('Tin thử', [
        { role: 'buyer', text: 'Tôi không đặt cọc, không chốt.' },
        { role: 'seller', text: 'Vâng, khi khác trao đổi tiếp.' },
      ]),
    ).toBe(false);
    const request = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(JSON.parse(request.contents[0].parts[0].text).conversation).toHaveLength(2);
  });

  it('accepts only boolean true, not matching substrings', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({
          candidates: [{ content: { parts: [{ text: '{"negotiating":true}' }] } }],
        }),
      );
    expect(await new IntentService().isNegotiating('Tin', [])).toBe(true);
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({
          candidates: [{ content: { parts: [{ text: '{"negotiating":"TRUE"}' }] } }],
        }),
      );
    expect(await new IntentService().isNegotiating('Tin', [])).toBe(false);
  });

  it('does not trigger negotiation when the AI is unavailable, even with old trigger words', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    expect(
      await new IntentService().isNegotiating('Tin', [
        { role: 'buyer', text: 'chốt đặt cọc ký hợp đồng' },
      ]),
    ).toBe(false);
  });

  it('logs HTTP errors safely without leaking key or conversation', async () => {
    const service = new IntentService();
    const log = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue(new Response('', { status: 503 }));
    expect(await service.isNegotiating('private title', [{ role: 'buyer', text: 'private content' }], 'hashed-id')).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('reason=HTTP_503'));
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private title|private content|test-only/);
  });

  it('sends the complete meeting/location sequence for semantic classification', async () => {
    global.fetch = jest.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: '{"negotiating":true}' }] } }] }));
    const messages = [
      { role: 'buyer' as const, text: 'tôi muốn mua nhà' },
      { role: 'seller' as const, text: 'bạn muốn gặp nhau ở đâu để trao đổi' },
      { role: 'buyer' as const, text: 'để tôi gửi định vị' },
    ];
    expect(await new IntentService().isNegotiating('Nhà thử nghiệm', messages)).toBe(true);
    const request = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(JSON.parse(request.contents[0].parts[0].text).conversation).toEqual(messages);
    expect(request.generationConfig.responseSchema.required).toEqual(['negotiating']);
  });
});

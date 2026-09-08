// Uses only synthetic conversations; never sends real user messages or prints API keys.
require('dotenv').config({ quiet: true });
require('ts-node/register/transpile-only');
const { IntentService } = require('../src/api/chat/intent.service');
const transport = global.fetch;
global.fetch = async (...args) => {
  const started = Date.now();
  try {
    const response = await transport(...args);
    console.log(JSON.stringify({ probe: 'Gemini HTTP', status: response.status, elapsedMs: Date.now() - started }));
    return response;
  } catch (error) {
    console.log(JSON.stringify({ probe: 'Gemini transport', error: error.cause?.code || error.name, elapsedMs: Date.now() - started }));
    throw error;
  }
};
(async () => {
  console.log(JSON.stringify({ scope: 'local backend env; not Render env', configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || null }));
  try {
    const model = process.env.GEMINI_MODEL?.trim().replace(/^models\//, '');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(10_000),
    });
    const data = response.ok ? await response.json() : {};
    console.log(JSON.stringify({ modelLookupStatus: response.status, supportsGenerateContent: data.supportedGenerationMethods?.includes('generateContent') ?? null }));
  } catch { console.log(JSON.stringify({ modelLookup: 'transport failed' })); }
  const cases = {
    greeting: [{ role: 'buyer', text: 'hello' }, { role: 'seller', text: 'alo' }, { role: 'buyer', text: 'khỏe không' }],
    negotiation: [{ role: 'buyer', text: 'tôi muốn mua nhà' }, { role: 'seller', text: 'bạn muốn gặp nhau ở đâu để trao đổi' }, { role: 'buyer', text: 'để tôi gửi định vị' }],
  };
  for (const [name, messages] of Object.entries(cases)) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const detected = await new IntentService().isNegotiating('Nhà ở thử nghiệm', messages);
    console.log(JSON.stringify({ case: name, detected }));
  }
})();

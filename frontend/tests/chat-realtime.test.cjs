const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(load, configured = true) {
  let now = 100_000, sequence = 0, retryUntil = 0;
  const timers = new Map(), channels = [], calls = [], batches = [], errors = [];
  const document = new EventTarget();
  document.visibilityState = 'visible';
  class Clock extends Date { static now() { return now; } }
  const client = {
    channel(name) {
      const channel = {
        name, handlers: [], removed: false,
        on(kind, filter, cb) { this.handlers.push({ filter, cb }); return this; },
        subscribe(cb) { this.status = cb; return this; },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel) { channel.removed = true; channel.status('CLOSED'); return Promise.resolve(); },
  };
  const context = vm.createContext({
    document, crypto, AbortController, Date: Clock, console,
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/chat-realtime.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const timestamps = { exports: {} };
  const timestampCode = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/timestamps.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInContext(`(function(exports){${timestampCode}\n})`, context)(timestamps.exports);
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(
    name => name === './supabase' ? { supabase: client, isSupabaseConfigured: configured }
      : name === './timestamps' ? timestamps.exports : { getApiRetryDelay: () => Math.max(0, retryUntil - now) },
    module, module.exports,
  );
  const service = module.exports;
  const start = (extra = {}) => service.watchConversation({
    userId: 'a', receiverId: 'b', postId: 7,
    load: async (signal, before) => { calls.push({ signal, before }); return load ? load(signal, before) : []; },
    onMessages: items => batches.push(items), onError: error => errors.push(error), ...extra,
  });
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  return {
    service, start, channels, calls, batches, errors, document, flush,
    limit(ms) { retryUntil = now + ms; },
    async tick(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = end; await flush();
    },
  };
}
const row = (id, overrides = {}) => ({ id, sender_id: 'b', receiver_id: 'a', post_id: 7, text: 'hello', created_at: '2026-09-08T00:00:00Z', read_at: null, ...overrides });

test('A/E: subscribed chat loads once, receives INSERT, and makes no history requests for five minutes', async () => {
  const h = harness(); const stop = h.start(); const channel = h.channels[0];
  channel.status('SUBSCRIBED'); await h.flush();
  assert.equal(h.calls.length, 1);
  channel.handlers[1].cb({ new: row(1) });
  assert.equal(h.batches.at(-1)[0].text, 'hello');
  assert.equal(channel.handlers[0].filter.table, 'messages');
  await h.tick(300_000); assert.equal(h.calls.length, 1); stop();
});
test('C: POST/Realtime overlap keeps five database IDs, including identical texts', () => {
  const h = harness(); const items = [1, 2, 3, 4, 5].map(id => h.service.messageFromRow(row(id)));
  assert.equal(h.service.mergeMessages([...items, ...items]).length, 5);
});
test('conversation filter checks both users, both directions, listing and null listing', () => {
  const h = harness(); const match = r => h.service.belongsToConversation(h.service.messageFromRow(r), 'a', 'b', 7);
  assert.equal(match(row(1)), true);
  assert.equal(match(row(1, { sender_id: 'a', receiver_id: 'b' })), true);
  assert.equal(match(row(1, { receiver_id: 'c' })), false);
  assert.equal(match(row(1, { post_id: 8 })), false);
  assert.equal(match(row(1, { post_id: null })), false);
  assert.equal(h.service.belongsToConversation(h.service.messageFromRow(row(1, { post_id: null })), 'a', 'b'), true);
  assert.equal(h.service.messageFromRow({ id: 1 }), null);
});
test('D: cleanup aborts history and ignores late events/statuses; Strict Mode leaves one channel', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; })); const stop = h.start();
  h.channels[0].status('SUBSCRIBED'); stop();
  assert.equal(h.calls[0].signal.aborted, true);
  resolve([]); await h.flush();
  h.channels[0].handlers[0].cb({ new: row(1) }); h.channels[0].status('SUBSCRIBED');
  assert.equal(h.batches.length, 0);
  const stopNext = h.start({ receiverId: 'c' });
  assert.equal(h.channels.filter(c => !c.removed).length, 1); stopNext();
});
test('F: disconnect fallback is 60 seconds; reconnect stops fallback; errors cannot burst GETs', async () => {
  const h = harness(); const stop = h.start(); const channel = h.channels[0];
  channel.status('SUBSCRIBED'); await h.flush();
  channel.status('CHANNEL_ERROR'); channel.status('TIMED_OUT');
  await h.tick(59_999); assert.equal(h.calls.length, 1);
  await h.tick(1); assert.equal(h.calls.length, 2);
  channel.status('SUBSCRIBED'); await h.tick(1000); assert.equal(h.calls.length, 3);
  await h.tick(300_000); assert.equal(h.calls.length, 3); stop();
});
test('hidden tab creates no polling; return syncs without a second channel', async () => {
  const h = harness(); const stop = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.document.visibilityState = 'hidden'; h.document.dispatchEvent(new Event('visibilitychange'));
  h.channels[0].status('CHANNEL_ERROR'); await h.tick(300_000); assert.equal(h.calls.length, 1);
  h.document.visibilityState = 'visible'; h.document.dispatchEvent(new Event('visibilitychange')); await h.flush();
  assert.equal(h.calls.length, 2); assert.equal(h.channels.length, 1); stop();
});
test('handshake timeout still loads history; read rate limit delays recovery', async () => {
  const h = harness(); const stop = h.start(); await h.tick(10_000); assert.equal(h.calls.length, 1);
  h.limit(90_000); h.channels[0].status('SUBSCRIBED');
  await h.tick(89_999); assert.equal(h.calls.length, 1);
  await h.tick(1); assert.equal(h.calls.length, 2); stop();
});
test('recovery backfills more than 50 missed messages', async () => {
  let initial = true;
  const h = harness(async (_, before) => {
    if (initial) { initial = false; return [{ id: 1 }]; }
    if (before) return [{ id: 1 }, { id: 2 }];
    return Array.from({ length: 50 }, (_, i) => ({ id: i + 3 }));
  });
  const stop = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.channels[0].status('CHANNEL_ERROR'); await h.tick(60_000);
  assert.equal(h.calls.at(-1).before, 3); assert.equal(h.batches.at(-1).length, 52); stop();
});
test('terminal CLOSED recreates the channel without stale status overwriting the new one', async () => {
  const h = harness(); const stop = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.channels[0].status('CLOSED'); await h.tick(60_000);
  assert.equal(h.channels.length, 2); assert.equal(h.channels[0].removed, true);
  h.channels[1].status('SUBSCRIBED'); await h.tick(1000);
  const count = h.calls.length; await h.tick(300_000); assert.equal(h.calls.length, count); stop();
});

test('missing configuration loads immediately with 60-second fallback, without a placeholder channel', async () => {
  const h = harness(undefined, false); const stop = h.start(); await h.tick(0);
  assert.equal(h.calls.length, 1); assert.equal(h.channels.length, 0);
  await h.tick(59_999); assert.equal(h.calls.length, 1);
  await h.tick(1); assert.equal(h.calls.length, 2); stop();
});

test('a history failure retries conservatively and stops retrying after success', async () => {
  let fail = true;
  const h = harness(async () => { if (fail) throw Error('temporary failure'); return []; });
  const stop = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  assert.equal(h.errors.length, 1); await h.tick(59_999); assert.equal(h.calls.length, 1);
  fail = false; await h.tick(1); assert.equal(h.calls.length, 2);
  await h.tick(300_000); assert.equal(h.calls.length, 2); stop();
});

test('recovery from initially empty history also backfills every missed page', async () => {
  let first = true;
  const h = harness(async (_, before) => {
    if (first) { first = false; return []; }
    if (before) return [{ id: 1 }];
    return Array.from({ length: 50 }, (_, i) => ({ id: i + 2 }));
  });
  const stop = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.channels[0].status('CHANNEL_ERROR'); await h.tick(60_000);
  assert.equal(h.batches.at(-1).length, 51); stop();
});

test('G: send uses jsonRequest/apiFetch; Realtime service never writes to Supabase', () => {
  const component = fs.readFileSync(require.resolve('../src/components/ChatWorkspace.tsx'), 'utf8');
  const realtime = fs.readFileSync(require.resolve('../src/services/chat-realtime.ts'), 'utf8');
  const api = fs.readFileSync(require.resolve('../src/services/api.ts'), 'utf8');
  assert.match(component, /jsonRequest<\{ message: Message \}>\('chat\/send',\s*\{\s*method: 'POST'/);
  assert.match(component, /await apiFetch\(path, options\)/);
  assert.match(api, /https:\/\/quanghuy-security\.onrender\.com\/api/);
  assert.doesNotMatch(component + realtime, /supabase\s*\.\s*from\s*\(|\.insert\s*\(/);
});

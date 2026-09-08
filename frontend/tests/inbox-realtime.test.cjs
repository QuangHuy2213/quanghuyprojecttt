const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(load, configured = true) {
  let now = 100_000, sequence = 0, retryUntil = 0;
  const timers = new Map(), channels = [], calls = [], batches = [], errors = [], toasts = [], counts = [];
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
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/inbox-realtime.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const stateModule = { exports: {} };
  const stateCode = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/notification-state.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInContext(`(function(exports){${stateCode}\n})`, context)(stateModule.exports);
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(
    name => name === './supabase' ? { supabase: client, isSupabaseConfigured: configured }
      : name === './notification-state' ? stateModule.exports
      : { getApiRetryDelay: () => Math.max(0, retryUntil - now) },
    module, module.exports,
  );
  const service = module.exports;
  const start = (extra = {}) => service.watchInbox({
    userId: 'b', token: 'session',
    load: async (token, signal) => { calls.push({ token, signal }); return load ? load(token, signal) : { notifications: [], unreadIds: [] }; },
    onNotifications: items => batches.push(items), onUnreadMessages: count => counts.push(count),
    onToast: item => toasts.push(item), onError: error => errors.push(error), ...extra,
  });
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  return {
    service, start, channels, calls, batches, errors, document, flush, toasts, counts,
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
const row = (id, extra = {}) => ({ id, user_id: 'b', title: 'New message', content: 'hello',
  type: 'MESSAGE', eventKey: `message:${id}`, is_read: false, created_at: '2026-09-08T00:00:00Z', ...extra });
const apiRow = (id, extra = {}) => ({ id, userId: 'b', title: 'New message', content: 'hello',
  type: 'MESSAGE', eventKey: `message:${id}`, isRead: false, createdAt: '2026-09-08T00:00:00Z', ...extra });
const deliver = (h, table, event, value, channel = h.channels.at(-1)) =>
  channel.handlers.find(item => item.filter.table === table && item.filter.event === event).cb({ new: value });

test('A/B: five INSERTs update bell/list/toast once each, no GET per event or polling for five minutes', async () => {
  const h = harness(); const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  for (let i = 1; i <= 5; i++) {
    deliver(h, 'notifications', 'INSERT', row(i));
    deliver(h, 'notifications', 'INSERT', row(i));
  }
  assert.equal(h.batches.at(-1).filter(item => !item.isRead).length, 5);
  assert.equal(h.toasts.length, 5);
  await h.tick(300_000); assert.equal(h.calls.length, 1); inbox.stop();
});

test('validates actual row ownership and maps snake_case columns, keeping distinct equal texts', async () => {
  const h = harness(); const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  deliver(h, 'notifications', 'INSERT', row(1, { user_id: 'another-user' }));
  deliver(h, 'notifications', 'INSERT', { id: 2, user_id: 'b' });
  assert.equal(h.toasts.length, 0);
  deliver(h, 'notifications', 'INSERT', row(3));
  deliver(h, 'notifications', 'INSERT', row(4));
  assert.equal(h.batches.at(-1).length, 2);
  assert.equal(h.batches.at(-1)[0].isRead, false); inbox.stop();
});

test('C: hidden tab receives notification/toast without extra GET or channels', async () => {
  const h = harness(); const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.document.visibilityState = 'hidden'; h.document.dispatchEvent(new Event('visibilitychange'));
  deliver(h, 'notifications', 'INSERT', row(1));
  assert.equal(h.toasts.length, 1); assert.equal(h.batches.at(-1).length, 1);
  await h.tick(300_000); assert.equal(h.calls.length, 1);
  h.document.visibilityState = 'visible'; h.document.dispatchEvent(new Event('visibilitychange')); await h.flush();
  assert.equal(h.calls.length, 1); assert.equal(h.channels.length, 1); inbox.stop();
});

test('D: reload snapshot keeps all 65 unread items and does not toast historical items', async () => {
  const h = harness(async () => ({ notifications: Array.from({ length: 65 }, (_, i) => apiRow(i + 1)), unreadIds: [1, 2] }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  assert.equal(h.batches.at(-1).length, 65); assert.equal(h.toasts.length, 0); assert.equal(h.counts.at(-1), 2);
  deliver(h, 'notifications', 'INSERT', row(1)); assert.equal(h.toasts.length, 0); inbox.stop();
});

test('initial snapshot racing INSERT does not lose or double-count notification or unread message', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED');
  deliver(h, 'notifications', 'INSERT', row(1));
  deliver(h, 'messages', 'INSERT', { id: 1, receiver_id: 'b', read_at: null });
  resolve({ notifications: [apiRow(1)], unreadIds: [1] }); await h.flush();
  assert.equal(h.batches.at(-1).length, 1); assert.equal(h.toasts.length, 1); assert.equal(h.counts.at(-1), 1); inbox.stop();
});

test('notification arriving BEFORE initial GET survives a stale snapshot and later recovery', async () => {
  const h = harness(); const inbox = h.start();
  for (let id = 1; id <= 5; id++) deliver(h, 'notifications', 'INSERT', row(id));
  h.channels[0].status('SUBSCRIBED'); await h.flush();
  assert.equal(h.batches.at(-1).length, 5);
  assert.equal(h.batches.at(-1).filter(item => !item.isRead && item.type !== 'WARNING_POPUP').length, 5);
  await h.tick(1000); inbox.refresh(); await h.flush();
  assert.equal(h.batches.at(-1).length, 5);
  assert.equal(h.toasts.length, 5); inbox.stop();
});

test('notification arriving DURING GET survives a snapshot that does not contain it', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED');
  deliver(h, 'notifications', 'INSERT', row(1));
  resolve({ notifications: [], unreadIds: [] }); await h.flush();
  assert.equal(h.batches.at(-1).length, 1); assert.equal(h.toasts.length, 1); inbox.stop();
});

test('UPDATE/read acknowledgement wins over late history or replay; no second toast', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED');
  deliver(h, 'notifications', 'INSERT', row(1));
  inbox.updateNotifications(items => items.map(item => ({ ...item, isRead: true })));
  deliver(h, 'messages', 'UPDATE', { id: 1, receiver_id: 'b', read_at: '2026-09-08T01:00:00Z' });
  deliver(h, 'messages', 'INSERT', { id: 1, receiver_id: 'b', read_at: null });
  resolve({ notifications: [apiRow(1)], unreadIds: [1] }); await h.flush();
  deliver(h, 'notifications', 'INSERT', row(1));
  assert.equal(h.batches.at(-1)[0].isRead, true); assert.equal(h.toasts.length, 1); assert.equal(h.counts.at(-1), 0); inbox.stop();
});

test('E: disconnect uses 60s fallback and reconnect cancels it; terminal CLOSED is recreated', async () => {
  const h = harness(); const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  h.channels[0].status('CHANNEL_ERROR'); await h.tick(59_999); assert.equal(h.calls.length, 1);
  await h.tick(1); assert.equal(h.calls.length, 2);
  h.channels[0].status('SUBSCRIBED'); await h.tick(1000); assert.equal(h.calls.length, 3);
  await h.tick(300_000); assert.equal(h.calls.length, 3);
  h.channels[0].status('CLOSED'); await h.tick(60_000); assert.equal(h.channels.length, 2);
  assert.equal(h.channels[0].removed, true); inbox.stop();
});

test('cleanup/logout aborts GET, removes channel, and ignores stale callbacks and Strict Mode cleanup', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); inbox.stop();
  assert.equal(h.calls[0].signal.aborted, true);
  resolve({ notifications: [apiRow(1)], unreadIds: [1] }); await h.flush();
  deliver(h, 'notifications', 'INSERT', row(2)); h.channels[0].status('SUBSCRIBED');
  assert.equal(h.toasts.length, 0); assert.equal(h.batches.length, 0);
  const next = h.start(); assert.equal(h.channels.filter(c => !c.removed).length, 1); next.stop();
});

test('fallback obeys API cooldown; missing config does not create a placeholder channel', async () => {
  const h = harness(undefined, false); const inbox = h.start(); await h.tick(0);
  assert.equal(h.calls.length, 1); assert.equal(h.channels.length, 0);
  h.limit(90_000); await h.tick(60_000); assert.equal(h.calls.length, 1);
  await h.tick(30_000); assert.equal(h.calls.length, 2); inbox.stop();
});

test('admin warnings remain in state without ordinary toast; updates synchronize read status', async () => {
  const h = harness(); const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  deliver(h, 'notifications', 'INSERT', row(1, { type: 'WARNING_POPUP' }));
  assert.equal(h.batches.at(-1)[0].type, 'WARNING_POPUP'); assert.equal(h.toasts.length, 0);
  deliver(h, 'notifications', 'UPDATE', row(1, { type: 'WARNING_POPUP', is_read: true }));
  assert.equal(h.batches.at(-1)[0].isRead, true); assert.equal(h.calls.length, 1); inbox.stop();
});

test('a cached recovery snapshot cannot resurrect already acknowledged rows', async () => {
  const h = harness(async () => ({ notifications: [apiRow(1)], unreadIds: [1] }));
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  deliver(h, 'notifications', 'UPDATE', row(1, { is_read: true }));
  deliver(h, 'messages', 'UPDATE', { id: 1, receiver_id: 'b', read_at: '2026-09-08T01:00:00Z' });
  await h.tick(1000); inbox.refresh(); await h.flush();
  assert.equal(h.batches.at(-1)[0].isRead, true); assert.equal(h.counts.at(-1), 0); inbox.stop();
});

test('history failure retries once after 60 seconds and success stops retries', async () => {
  let fail = true;
  const h = harness(async () => {
    if (fail) throw new Error('offline');
    return { notifications: [], unreadIds: [] };
  });
  const inbox = h.start(); h.channels[0].status('SUBSCRIBED'); await h.flush();
  assert.equal(h.errors.length, 1); await h.tick(59_999); assert.equal(h.calls.length, 1);
  fail = false; await h.tick(1); assert.equal(h.calls.length, 2);
  await h.tick(300_000); assert.equal(h.calls.length, 2); inbox.stop();
});

test('F/security: no browser notification writes, per-event refetch, or warning polling', () => {
  const inbox = fs.readFileSync(require.resolve('../src/components/InboxProvider.tsx'), 'utf8');
  const transport = fs.readFileSync(require.resolve('../src/services/inbox-realtime.ts'), 'utf8');
  const header = fs.readFileSync(require.resolve('../src/components/Header.tsx'), 'utf8');
  assert.doesNotMatch(inbox, /subscribeApiPolling|messageSync\.refresh|notificationSync\.refresh/);
  assert.doesNotMatch(header, /notifications\/unread-warnings/);
  assert.doesNotMatch(inbox + transport, /\.insert\s*\(|SERVICE_ROLE_KEY/);
  assert.doesNotMatch(header, /item\.type !== 'MESSAGE'/);
});

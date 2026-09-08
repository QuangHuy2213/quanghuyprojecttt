const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness({ role = 'USER', scope = 'personal', userId = 'b', load = async () => [], configured = true } = {}) {
  let now = 100000, sequence = 0, cursor = 0, cleanup;
  const values = [], channels = [], calls = [], timers = new Map(), events = new Map();
  let statusListener;
  let activeUserId = userId, activeToken = 'test';
  const document = new EventTarget(); document.visibilityState = 'visible';
  const window = new EventTarget();
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  const react = {
    createContext: () => ({ Provider: 'provider' }), useContext: () => null,
    useState(initial) { const i = cursor++; values[i] = initial; return [initial, value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; },
    useEffect(fn) { cleanup = fn(); }, useRef: value => ({ current: value }),
    useCallback: fn => fn, useMemo: fn => fn(),
  };
  const client = {
    channel(name) { const ch = { name, handlers: [], on(kind, filter, cb) { this.handlers.push({ filter, cb }); return this; }, subscribe(cb) { this.status = cb; return this; } }; channels.push(ch); return ch; },
    removeChannel(ch) { ch.removed = true; ch.status('CLOSED'); return Promise.resolve(); },
  };
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({ document, window, crypto, AbortController, console: { warn() {} }, Date: Clock,
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { at: now + delay, fn }); return id; }, clearTimeout(id) { timers.delete(id); } });
  const modules = {};
  function read(file, dependencies = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInContext(`(function(require,exports){${code}\n})`, context)(name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; }, exports);
    return exports;
  }
  const timestamps = read('../src/services/timestamps.ts');
  const state = read('../src/services/transaction-state.ts', { './timestamps': timestamps });
  const provider = read('../src/components/TransactionProvider.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }) },
    './InboxProvider': { useInbox: () => ({ user: { id: activeUserId, role }, token: activeToken }) },
    '@/services/transaction-state': state,
    '@/services/realtime-socket': { onRealtime(event, fn) { events.set(event, fn); return () => events.delete(event); }, onRealtimeStatus(fn) { statusListener = fn; fn('disconnected'); return () => { statusListener = () => {}; }; } },
    '@/services/api': { getApiRetryDelay: () => 0, apiFetch: async (path, options) => { calls.push({ path, options }); return { ok: true, json: () => load(path) }; } },
  });
  const tree = provider.TransactionProvider({ children: null, scope });
  tree.type(tree.props);
  return { state, values, channels, calls, flush, document, window, sessionKey: tree.key,
    keyForSession(id, token, nextScope = scope) { activeUserId = id; activeToken = token; return provider.TransactionProvider({ children: null, scope: nextScope }).key; },
    stop: () => cleanup(),
    status: value => statusListener(value),
    deliver(table, row) { events.get(table === 'Transaction' ? 'transaction:updated' : table === 'Invoice' ? 'invoice:updated' : table)?.(row); },
    async tick(ms) { const end = now + ms; for (;;) { const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush(); } now = end; await flush(); },
  };
}
const row = (extra = {}) => ({ id: 'tx1', buyerId: 'b', sellerId: 's', status: 'VERIFYING', buyerConfirmed: null, sellerConfirmed: null, updatedAt: '2026-09-08T01:00:00Z', ...extra });

test('socket transaction replay is deduplicated; outsider cannot change participant state', async () => {
  const h = harness(); await h.flush();
  h.deliver('Transaction', row()); h.deliver('Transaction', row());
  h.deliver('Transaction', row({ id: 'other', buyerId: 'x', sellerId: 'y' }));
  h.deliver('Transaction', null);
  assert.equal(h.values[0].length, 1);
  const calls = h.calls.length;
  h.deliver('Transaction', row({ status: 'NEGOTIATING', buyerConfirmed: true, sellerConfirmed: true, updatedAt: '2026-09-08T01:01:00Z' }));
  assert.equal(h.values[0][0].status, 'NEGOTIATING'); assert.equal(h.calls.length, calls); h.stop();
});
test('late snapshot preserves newer socket confirmation and enriches relation', async () => {
  let resolve;
  const h = harness({ load: path => path.includes('my-transactions') ? new Promise(r => { resolve = r; }) : [] });
  await h.flush();
  h.deliver('Transaction', row({ status: 'SUCCESS', updatedAt: '2026-09-08T01:02:00Z' }));
  resolve([row({ post: { title: 'House' } })]); await h.flush();
  assert.equal(h.values[0][0].status, 'SUCCESS'); assert.equal(h.values[0][0].post.title, 'House'); h.stop();
});
test('deleted transaction is not resurrected by late snapshot or replay', async () => {
  let resolve;
  const h = harness({ load: path => path.includes('my-transactions') ? new Promise(r => { resolve = r; }) : [] });
  await h.flush(); h.deliver('Transaction', row()); h.deliver('transaction:deleted', row());
  resolve([row()]); await h.flush(); h.deliver('Transaction', row());
  assert.equal(h.values[0].length, 0); h.stop();
});
test('connected socket does not poll for five minutes; fallback 60s and reconnect sync once', async () => {
  const h = harness(); await h.flush(); h.status('connected'); await h.tick(1000);
  const calls = h.calls.length; await h.tick(300000); assert.equal(h.calls.length, calls);
  h.status('disconnected'); await h.tick(59000); assert.equal(h.calls.length, calls);
  await h.tick(1000); assert.equal(h.calls.length, calls + 2);
  h.status('connected'); await h.tick(1000); const recovered = h.calls.length;
  await h.tick(300000); assert.equal(h.calls.length, recovered); h.stop();
  h.deliver('Transaction', row()); assert.equal(h.values[0].length, 0);
});
test('invoice ownership, admin visibility, stale replay and no per-event GET', async () => {
  const h = harness(); await h.flush(); const calls = h.calls.length;
  const invoice = { id: 'inv', userId: 'b', transactionId: 'tx1', amount: '100', status: 'DRAFT', updatedAt: '2026-09-08T01:00:00Z' };
  h.deliver('Invoice', invoice); h.deliver('Invoice', invoice);
  h.deliver('Invoice', { ...invoice, id: 'foreign', userId: 's' });
  h.deliver('Invoice', { ...invoice, status: 'PAID', updatedAt: '2026-09-08T02:00:00Z' }); h.deliver('Invoice', invoice);
  assert.equal(h.values[1].length, 1); assert.equal(h.values[1][0].status, 'PAID'); assert.equal(h.calls.length, calls); h.stop();
  const admin = harness({ role: 'ADMIN', scope: 'admin' }); await admin.flush(); admin.deliver('Invoice', invoice);
  assert.equal(admin.values[1].length, 1); assert.equal(admin.calls[0].path, 'admin/transactions'); admin.stop();
});
test('hidden fallback pauses and return recovers without per-page socket creation', async () => {
  const h = harness(); await h.flush(); h.document.visibilityState = 'hidden'; h.document.dispatchEvent(new Event('visibilitychange'));
  const calls = h.calls.length; await h.tick(120000); assert.equal(h.calls.length, calls);
  h.document.visibilityState = 'visible'; h.document.dispatchEvent(new Event('visibilitychange')); await h.flush();
  assert.equal(h.calls.length, calls + 2); h.stop();
});
test('all real states retain actions and raw invoice projects payable amount', () => {
  const h = harness(); for (const status of h.state.transactionStatuses) assert.ok(h.state.transactionAction[status]);
  assert.equal(h.state.pendingConfirmation(row(), 'b'), true);
  assert.equal(h.state.pendingConfirmation(row({ buyerConfirmed: true }), 'b'), false);
  assert.equal(h.state.invoiceForDisplay({ id: 'inv', amount: '100', status: 'DRAFT' }).totalPayable, 100); h.stop();
});

test('authoritative reconnect removes missed deletes without dropping events received during GET', () => {
  const h = harness();
  const old = row(), newRow = row({ id: 'new' });
  const result = h.state.mergeSnapshot([old, newRow], [], [old]);
  assert.equal(result.length, 1); assert.equal(result[0].id, 'new');
  const confirmed = row({ buyerConfirmed: true });
  const merged = h.state.mergeSnapshot([confirmed], [old], [old]);
  assert.equal(merged[0].buyerConfirmed, true); h.stop();
});

test('admin personal scope uses owned endpoints and filters unrelated snapshot and socket rows', async () => {
  const own = row({ buyerId: 'admin-b', id: 'own' }), foreign = row({ id: 'foreign' });
  const h = harness({ role: 'ADMIN', userId: 'admin-b', load: async path => path.includes('my-transactions') ? [own, foreign] : [
    { id: 'own-invoice', userId: 'admin-b' }, { id: 'foreign-invoice', userId: 'b' },
  ] });
  await h.flush();
  assert.equal(h.calls[0].path, 'transactions/my-transactions'); assert.equal(h.calls[1].path, 'transactions/my-invoices');
  assert.deepEqual(Array.from(h.values[0], item => item.id), ['own']);
  assert.deepEqual(Array.from(h.values[1], item => item.id), ['own-invoice']);
  h.deliver('Transaction', foreign); h.deliver('Invoice', { id: 'foreign2', userId: 'b', updatedAt: '2026-09-08T01:00:00Z' });
  assert.equal(h.values[0].length, 1); assert.equal(h.values[1].length, 1); h.stop();
});
test('old account snapshot is aborted and cannot populate a new admin personal store', async () => {
  let resolve;
  const a = harness({ load: path => path.includes('my-transactions') ? new Promise(r => { resolve = r; }) : [] });
  await a.flush(); a.stop(); assert.equal(a.calls[0].options.signal.aborted, true);
  const b = harness({ role: 'ADMIN', userId: 'admin-b' }); await b.flush();
  resolve([row()]); await a.flush();
  assert.equal(a.values[0].length, 0); assert.equal(b.values[0].length, 0); assert.equal(b.values[1].length, 0); b.stop();
});

test('React store identity changes on account, token and view scope before effects run', () => {
  const h = harness({ role: 'ADMIN' });
  const key = h.sessionKey;
  assert.notEqual(h.keyForSession('b', 'replacement-token'), key);
  assert.notEqual(h.keyForSession('different-user', 'test'), key);
  assert.notEqual(h.keyForSession('b', 'test', 'admin'), key);
  assert.notEqual(h.keyForSession(null, null), key);
  assert.equal(h.keyForSession('b', 'test'), key); h.stop();
});

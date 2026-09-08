const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual TS helpers with browser events, a controlled transport and virtual time.
// No production traffic, dependency installation or five-minute wall-clock sleeps.
function browser(handler = () => Response.json([]), storage = new Map()) {
  let now = 1_800_000_000_000;
  let nextTimer = 0;
  const timers = new Map();
  const requests = [];
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const window = new EventTarget();
  window.location = { hostname: 'localhost' };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  };
  class ClockDate extends Date { static now() { return now; } }
  const context = vm.createContext({
    window, document, localStorage, Date: ClockDate,
    Response, Headers, FormData, AbortController, DOMException, crypto,
    console, process: { env: {} },
    setTimeout: (fn, delay = 0) => {
      const id = ++nextTimer;
      timers.set(id, { at: now + delay, fn });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => {
      const request = { url, options, at: now };
      requests.push(request);
      return handler(request, requests.length);
    },
  });
  const modules = new Map();
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const file = path.resolve(__dirname, '../src/services', `${name}.ts`);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    vm.runInContext(`(function(require,module,exports){${source}\n})`, context, { filename: file })(
      ref => load(ref.replace('./', '')), module, module.exports,
    );
    modules.set(name, module.exports);
    return module.exports;
  }
  const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };
  return {
    api: load('api'), polling: load('polling'), requests, storage, localStorage, document, window, timers, flush,
    login() { localStorage.setItem('user', '{"id":"u1"}'); localStorage.setItem('access_token', 'test-token'); },
    async tick(ms) {
      const target = now + ms;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        await flush();
      }
      now = target;
      await flush();
    },
    visibility(value) { document.visibilityState = value; document.dispatchEvent(new Event('visibilitychange')); },
  };
}

const endpoints = ['notifications', 'notifications/unread-warnings', 'transactions/pending-confirmations'];
const subscribeHeader = b => endpoints.map(endpoint => b.polling.subscribeApiPolling(endpoint, 'test-token', () => {}));

test('A/C: authenticated home has 6 initial GETs, then 3/min for five minutes; subscriptions share timers', async () => {
  const b = browser(); b.login();
  const subscriptions = [...subscribeHeader(b), ...subscribeHeader(b)];
  await Promise.all(['posts?page=1&limit=12', 'cities', 'posts/favorites/u1', 'posts/favorites/u1'].map(p => b.api.apiFetch(p)));
  await b.tick(0);
  assert.equal(b.requests.length, 6);
  await b.tick(59_999);
  assert.equal(b.requests.length, 6);
  await b.tick(1);
  assert.equal(b.requests.length, 9);
  await b.tick(240_000);
  assert.equal(b.requests.length, 21);
  for (const endpoint of endpoints) {
    const calls = b.requests.filter(r => r.url.endsWith(`/api/${endpoint}`));
    assert.equal(calls.length, 6);
    assert.ok(calls.slice(1).every((r, i) => r.at - calls[i].at === 60_000));
  }
  for (const r of b.requests) assert.ok(b.requests.filter(x => x.at >= r.at && x.at < r.at + 60_000).length < 120);
  subscriptions.forEach(s => s.stop());
  await b.tick(300_000);
  assert.equal(b.requests.length, 21);
  assert.equal(b.timers.size, 0);
});

test('B: Strict Mode abort/remount deduplicates posts/cities/favorites; a reload makes one fresh request each', async () => {
  const b = browser(); b.login();
  for (const endpoint of ['posts?page=1&limit=12', 'cities', 'posts/favorites/u1']) {
    const controller = new AbortController();
    const first = b.api.apiFetch(endpoint, { signal: controller.signal });
    const rejected = assert.rejects(first, { name: 'AbortError' });
    controller.abort();
    const second = b.api.apiFetch(endpoint, { cache: 'no-store' });
    await rejected;
    assert.deepEqual(await (await second).json(), []);
  }
  assert.equal(b.requests.length, 3);
  const initial = subscribeHeader(b); initial.forEach(s => s.stop());
  const remount = subscribeHeader(b);
  await b.tick(0);
  assert.equal(b.requests.length, 6);
  remount.forEach(s => s.stop());
  const reload = browser(undefined, b.storage); reload.login();
  await Promise.all(['posts?page=1&limit=12', 'cities', 'posts/favorites/u1'].map(p => reload.api.apiFetch(p)));
  const reloadedHeader = subscribeHeader(reload); await reload.tick(0);
  assert.equal(reload.requests.length, 6);
  reloadedHeader.forEach(s => s.stop());
});

test('D: hidden tab stops traffic; focus does not bypass cadence; logout stops polling', async () => {
  const b = browser(); b.login();
  const subscriptions = subscribeHeader(b); await b.tick(0);
  assert.equal(b.requests.length, 3);
  for (let i = 0; i < 20; i++) b.window.dispatchEvent(new Event('focus'));
  await b.tick(1000); assert.equal(b.requests.length, 3);
  b.visibility('hidden'); await b.tick(300_000); assert.equal(b.requests.length, 3);
  b.visibility('visible'); await b.tick(0); assert.equal(b.requests.length, 6);
  b.localStorage.removeItem('access_token'); b.window.dispatchEvent(new Event('user-updated'));
  await b.tick(300_000); assert.equal(b.requests.length, 6);
  subscriptions.forEach(s => s.stop());
});

test('E/F: 429 retry_after=30 blocks the read group for 30s, persists on reload, then polling resumes', async () => {
  const b = browser((_, count) => count === 1
    ? Response.json({ status: 'rate_limited', retry_after: 30, rate_limit_group: 'read' }, { status: 429 })
    : Response.json([]));
  b.login();
  const subscription = b.polling.subscribeApiPolling(endpoints[2], 'test-token', () => {});
  await b.tick(0); assert.equal(b.requests.length, 1);
  for (let i = 0; i < 10; i++) assert.equal((await b.api.apiFetch('posts')).status, 429);
  const reload = browser(undefined, b.storage);
  assert.equal((await reload.api.apiFetch('cities')).status, 429);
  assert.equal(reload.requests.length, 0);
  await b.tick(29_999); assert.equal(b.requests.length, 1);
  await b.tick(1); assert.equal(b.requests.length, 2);
  await b.tick(60_000); assert.equal(b.requests.length, 3);
  subscription.stop();
});

test('slow transport never overlaps and is aborted when the last subscriber unmounts', async () => {
  const b = browser(({ options }) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }));
  b.login();
  const first = b.polling.subscribeApiPolling(endpoints[2], 'test-token', () => {});
  const second = b.polling.subscribeApiPolling(endpoints[2], 'test-token', () => {});
  await b.tick(300_000); assert.equal(b.requests.length, 1);
  first.stop(); await b.tick(0); assert.equal(b.requests[0].options.signal.aborted, false);
  second.stop(); await b.tick(0); assert.equal(b.requests[0].options.signal.aborted, true);
  assert.equal(b.timers.size, 0);
});

test('guest has no background polls; paired transaction endpoints run only once per minute', async () => {
  const b = browser();
  let first = true;
  const poller = b.polling.startPolling(async signal => {
    await Promise.all(['transactions/my-transactions', 'transactions/my-invoices'].map(p => b.api.apiFetch(p, { signal })));
    first = false;
  });
  await b.tick(300_000); assert.equal(b.requests.length, 0); assert.equal(first, true);
  b.login(); b.window.dispatchEvent(new Event('user-updated'));
  await b.tick(0); assert.equal(b.requests.length, 2);
  await b.tick(60_000); assert.equal(b.requests.length, 4);
  poller.stop();
});

test('a transaction event during an in-flight check queues one refresh instead of waiting 60 seconds', async () => {
  const b = browser(); b.login();
  let finish;
  let checks = 0;
  const poller = b.polling.startPolling(async () => {
    checks++;
    if (checks === 1) await new Promise(resolve => { finish = resolve; });
  });
  await b.tick(0); assert.equal(checks, 1);
  poller.refresh(); poller.refresh();
  finish(); await b.flush();
  await b.tick(999); assert.equal(checks, 1);
  await b.tick(1); assert.equal(checks, 2);
  await b.tick(59_999); assert.equal(checks, 2);
  poller.stop();
});

test('GET cache is scoped by auth, expires, and is invalidated by writes; mutations are never deduplicated', async () => {
  const b = browser();
  await b.api.apiFetch('cities'); await b.tick(1000); await b.api.apiFetch('/cities');
  assert.equal(b.requests.length, 1);
  await b.tick(300_000); await b.api.apiFetch('cities'); assert.equal(b.requests.length, 2);
  await b.api.apiFetch('notifications', { headers: { Authorization: 'Bearer a' } });
  await b.api.apiFetch('notifications', { headers: { Authorization: 'Bearer b' } });
  assert.equal(b.requests.length, 4);
  await Promise.all([b.api.apiFetch('posts', { method: 'POST' }), b.api.apiFetch('posts', { method: 'POST' })]);
  assert.equal(b.requests.length, 6);
  await b.api.apiFetch('cities'); assert.equal(b.requests.length, 7);
});

test('Retry-After header and body use the longer wait; other groups remain usable; no immediate retry', async () => {
  const b = browser((_, count) => count === 1
    ? Response.json({ retry_after: 10 }, { status: 429, headers: { 'Retry-After': '30' } }) : Response.json([]));
  await b.api.apiFetch('cities');
  assert.equal(b.api.getApiRetryDelay('posts'), 30_000);
  assert.equal((await b.api.apiFetch('posts', { method: 'POST' })).status, 200);
  assert.equal(b.requests.length, 2);
  await b.tick(29_999); assert.equal((await b.api.apiFetch('cities')).status, 429);
  await b.tick(1); assert.equal((await b.api.apiFetch('cities')).status, 200);
});

test('429 with null/non-JSON body has a safe cooldown; HTTP-date and one-second Retry-After are honored', async () => {
  for (const body of ['null', 'not-json']) {
    const b = browser(() => new Response(body, { status: 429 }));
    assert.equal((await b.api.apiFetch('posts')).status, 429);
    assert.equal(b.api.getApiRetryDelay('cities'), 60_000);
  }
  const date = new Date(1_800_000_030_000).toUTCString();
  const dated = browser(() => new Response('', { status: 429, headers: { 'Retry-After': date } }));
  await dated.api.apiFetch('posts'); assert.equal(dated.api.getApiRetryDelay('posts'), 30_000);
  const short = browser(() => Response.json({ retry_after: 1 }, { status: 429 }));
  await short.api.apiFetch('posts'); assert.equal(short.api.getApiRetryDelay('posts'), 1000);
});

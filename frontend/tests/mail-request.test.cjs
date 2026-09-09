const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function helper(apiFetch) {
  const timers = new Map();
  let id = 0;
  const exports = {};
  vm.runInNewContext(transpile(read('services/mail-request.ts')), {
    exports, require: () => ({ apiFetch }), AbortController,
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { mailRequest: exports.mailRequest, timers };
}

test('mail requests go through apiFetch, preserve DTO payload and clear timers', async () => {
  const calls = [];
  const h = helper(async (...args) => { calls.push(args); return Response.json({ message: 'ok' }); });
  const payload = { contactId: 1, email: 'owner@example.com', subject: 'Subject', message: 'Message' };
  const result = await h.mailRequest('admin/contacts/reply', payload);
  assert.equal(result.response.ok, true);
  assert.equal(calls[0][0], 'admin/contacts/reply');
  assert.deepEqual(JSON.parse(calls[0][1].body), payload);
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(h.timers.size, 0);
});

for (const phase of ['connection', 'body']) {
  test(`mail request stops a stalled ${phase} after 25 seconds`, async () => {
    let signal;
    const never = new Promise(() => {});
    const h = helper((_path, options) => {
      signal = options.signal;
      return phase === 'connection' ? never : Promise.resolve({ json: () => never });
    });
    const result = h.mailRequest('auth/forgot-password', { email: 'owner@example.com' });
    const assertion = assert.rejects(result, /quá thời gian chờ/);
    const timer = [...h.timers.values()][0];
    assert.equal(timer.delay, 25000);
    timer.fn();
    await assertion;
    assert.equal(signal.aborted, true);
    assert.equal(h.timers.size, 0);
  });
}

test('provider error response is preserved for UI error handling', async () => {
  const h = helper(async () => Response.json({ message: 'Dịch vụ gửi email tạm thời không khả dụng.' }, { status: 503 }));
  const result = await h.mailRequest('auth/forgot-password', { email: 'owner@example.com' });
  assert.equal(result.response.status, 503);
  assert.match(result.data.message, /tạm thời/);
  assert.equal(h.timers.size, 0);
});

function adminHandler(mailRequest) {
  const source = read('app/(admin)/admin/contacts/page.tsx');
  const handler = source.slice(source.indexOf('  const handleSendEmail ='), source.indexOf('  if (loading) return'));
  const state = {
    modal: { isOpen: true, contactId: 1, email: 'owner@example.com', subject: 'Subject', message: 'Draft' },
    contacts: [{ id: 1, status: 'PENDING' }], loading: false, toasts: [],
  };
  const context = {
    emailModal: state.modal, isSending: false, mailRequest,
    setIsSending: value => { state.loading = value; },
    setContacts: fn => { state.contacts = fn(state.contacts); },
    setEmailModal: value => { state.modal = value; },
    showToast: (...args) => state.toasts.push(args),
  };
  const run = vm.runInNewContext(transpile(`${handler}\nhandleSendEmail;`), context);
  return { state, run: () => run({ preventDefault() {} }) };
}

test('admin sends only DTO fields, marks success and closes/resets modal', async () => {
  let sent;
  const h = adminHandler(async (route, payload) => {
    sent = { route, payload };
    return { response: { ok: true }, data: { message: 'ok' } };
  });
  await h.run();
  assert.equal(sent.route, 'admin/contacts/reply');
  assert.deepEqual(Object.keys(sent.payload).sort(), ['contactId', 'email', 'message', 'subject']);
  assert.equal(h.state.contacts[0].status, 'REPLIED');
  assert.equal(h.state.modal.isOpen, false);
  assert.equal(h.state.modal.message, '');
  assert.equal(h.state.loading, false);
});

for (const failure of ['503', 'timeout']) {
  test(`admin ${failure} ends loading and retains modal, draft and contact status`, async () => {
    const h = adminHandler(async () => {
      if (failure === 'timeout') throw new Error('Yêu cầu quá thời gian chờ.');
      return { response: { ok: false }, data: { message: 'Email tạm thời không khả dụng.' } };
    });
    await h.run();
    assert.equal(h.state.loading, false);
    assert.equal(h.state.modal.isOpen, true);
    assert.equal(h.state.modal.message, 'Draft');
    assert.equal(h.state.contacts[0].status, 'PENDING');
    assert.equal(h.state.toasts[0][1], 'error');
  });
}

for (const failure of ['503', 'timeout']) {
  test(`forgot-password ${failure} ends loading and displays an error`, async () => {
    const source = read('app/forgot-password/page.tsx');
    const handler = source.slice(source.indexOf('  const handleSubmit ='), source.indexOf('\n  return ('));
    const state = { loading: false, email: 'owner@example.com', toasts: [] };
    const run = vm.runInNewContext(transpile(`${handler}\nhandleSubmit;`), {
      email: state.email, Error,
      setIsLoading: value => { state.loading = value; },
      setEmail: value => { state.email = value; },
      showToast: (...args) => state.toasts.push(args),
      mailRequest: async () => {
        if (failure === 'timeout') throw new Error('Yêu cầu quá thời gian chờ.');
        return { response: { ok: false }, data: { message: 'Email tạm thời không khả dụng.' } };
      },
    });
    await run({ preventDefault() {} });
    assert.equal(state.loading, false);
    assert.equal(state.email, 'owner@example.com');
    assert.equal(state.toasts[0][1], 'error');
  });
}

test('browser source contains no Resend key or direct provider call', () => {
  for (const file of fs.readdirSync(root, { recursive: true })) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    assert.doesNotMatch(read(file), /RESEND_API_KEY|api\.resend\.com|MAIL_APP_PASSWORD/);
  }
});

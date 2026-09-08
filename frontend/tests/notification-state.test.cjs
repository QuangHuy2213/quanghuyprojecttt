const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '../src/services/notification-state.ts'),
  'utf8',
);
const moduleExports = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { exports: moduleExports },
);
const { mergeNotifications } = moduleExports;
const notification = (id, extra = {}) => ({
  id,
  title: 'Bài đăng đã được duyệt',
  content: 'Tin đã hiển thị.',
  type: 'POST_UPDATE',
  createdAt: '2026-09-07T08:00:00Z',
  ...extra,
});

test('realtime replay and refetch do not duplicate an existing event', () => {
  const rows = mergeNotifications([
    notification(10, { isRead: true, eventKey: 'post:1:approved' }),
    notification(10, { isRead: false, eventKey: 'post:1:approved' }),
    notification(11, { eventKey: 'post:1:approved' }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isRead, true);
});

test('legacy duplicate rows are collapsed without discarding later legitimate approvals', () => {
  const rows = mergeNotifications([
    notification(12, { createdAt: '2026-09-07T09:00:00Z' }),
    notification(11, { createdAt: '2026-09-07T08:00:01Z' }),
    notification(10),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 12);
});

test('different event keys and different posts remain distinct', () => {
  const rows = mergeNotifications([
    notification(12, { eventKey: 'post:1:approval' }),
    notification(11, { eventKey: 'post:2:approval' }),
    notification(10, { title: 'Tin khác đã được duyệt' }),
  ]);
  assert.equal(rows.length, 3);
});

test('distinct identical admin warnings remain queued while replay keeps one row per ID', () => {
  const rows = mergeNotifications([
    notification(1, { type: 'WARNING_POPUP' }),
    notification(2, { type: 'WARNING_POPUP' }),
    notification(1, { type: 'WARNING_POPUP' }),
  ]);
  assert.equal(rows.length, 2);
});

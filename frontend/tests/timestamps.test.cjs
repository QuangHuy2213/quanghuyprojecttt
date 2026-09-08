const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/services/timestamps.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject });
const { formatMessageTime, normalizeTimestamp, parseTimestamp } = exportsObject;

test('API history, send response and naive Realtime show the same Vietnam time without reload', () => {
  for (const value of ['2026-09-08T02:57:00.000Z', '2026-09-08T02:57:00', '2026-09-08 02:57:00.123456',
    '2026-09-08T09:57:00+07:00', '2026-09-07T22:57:00-04:00', '2026-09-08T02:57:00+00']) {
    assert.equal(formatMessageTime(value), '09:57', value);
    assert.equal(formatMessageTime(normalizeTimestamp(value)), '09:57', value);
  }
});

test('existing offsets are preserved as instants rather than receiving a second Z', () => {
  assert.equal(normalizeTimestamp('2026-09-08T09:57:00+07:00'), '2026-09-08T02:57:00.000Z');
  assert.equal(normalizeTimestamp('2026-09-08T09:57:00+05:30'), '2026-09-08T04:27:00.000Z');
  assert.equal(normalizeTimestamp('2026-09-08T02:57:00Z'), '2026-09-08T02:57:00.000Z');
});

test('invalid/empty dates are safe and UTC midnight rollover displays Vietnam time', () => {
  for (const value of ['', 'invalid', '2026-09-08T99:57:00']) {
    assert.equal(parseTimestamp(value), null);
    assert.equal(formatMessageTime(value), '—');
  }
  assert.equal(formatMessageTime('2026-09-08T17:00:00Z'), '00:00');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('root warning portal acknowledges one row, then displays next; failed PATCH keeps warning', async () => {
  let notifications = [1, 2].map(id => ({ id, type: 'WARNING_POPUP', title: `warning ${id}`, content: 'long '.repeat(1000), isRead: false }));
  const states = [], calls = []; let cursor = 0, ok = true;
  const body = {};
  const dependencies = {
    react: { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-dom': { createPortal: (node, target) => ({ node, target }) },
    './InboxProvider': { useInbox: () => ({ notifications, setNotifications: fn => { notifications = fn(notifications); } }) },
    '@/services/api': { apiFetch: async (path, options) => { calls.push({ path, options }); return { ok, status: ok ? 200 : 500 }; } },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/components/WarningModal.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], document: { body }, localStorage: { getItem: () => 'test' }, console: { error() {} } });
  const render = () => { cursor = 0; return exports.default(); };
  function find(node, predicate) { if (!node) return; if (Array.isArray(node)) return node.map(item => find(item, predicate)).find(Boolean); if (predicate(node)) return node; return find(node.props?.children, predicate); }
  let portal = render(); assert.equal(portal.target, body);
  assert.match(find(portal.node, n => n.props?.className?.includes('max-h-')).props.className, /overflow-y-auto/);
  await find(portal.node, n => n.type === 'button').props.onClick();
  assert.equal(calls[0].path, 'notifications/1/read'); assert.equal(calls[0].options.method, 'PATCH');
  portal = render(); assert.equal(find(portal.node, n => n.type === 'h2').props.children, 'warning 2');
  ok = false; await find(portal.node, n => n.type === 'button').props.onClick();
  assert.equal(notifications[1].isRead, false); assert.ok(find(render().node, n => n.props?.role === 'alert'));
  ok = true; await find(render().node, n => n.type === 'button').props.onClick(); assert.equal(render(), null);
});

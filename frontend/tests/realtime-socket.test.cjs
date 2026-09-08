const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  const clients = [];
  const io = (url, options) => {
    const handlers = new Map();
    const client = { url, options, handlers, io: { reconnection(value) { client.reconnect = value; } },
      on(event, fn) { handlers.set(event, fn); }, connect() { this.started = true; },
      disconnect() { this.stopped = true; handlers.get('disconnect')?.(); }, removeAllListeners() { handlers.clear(); },
      receive(event, value) { handlers.get(event)?.(value); },
    }; clients.push(client); return client;
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/realtime-socket.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => ({ io }), process: { env: { NEXT_PUBLIC_WS_URL: 'https://backend.test' } } });
  return { service: exports, clients };
}
test('singleton authenticates through auth.token; changed token disconnects old connection', () => {
  const { service, clients } = harness();
  service.connectRealtime('one'); service.connectRealtime('one');
  assert.equal(clients.length, 1); assert.equal(clients[0].options.auth.token, 'one');
  assert.equal(clients[0].url, 'https://backend.test'); assert.equal(clients[0].options.query, undefined);
  service.connectRealtime('two'); assert.equal(clients.length, 2); assert.equal(clients[0].stopped, true);
  assert.equal(clients[1].options.auth.token, 'two'); service.disconnectRealtime(); assert.equal(clients[1].stopped, true);
});
test('logout removes listeners, ignores late events and permits a fresh login', () => {
  const { service, clients } = harness(); let events = 0;
  const stop = service.onRealtime('warning:new', () => events++);
  service.connectRealtime('one'); const late = clients[0].handlers.get('warning:new');
  clients[0].receive('warning:new', { id: 1 }); assert.equal(events, 1);
  service.disconnectRealtime(); late({ id: 2 }); assert.equal(events, 1);
  stop(); service.connectRealtime('two'); clients[1].receive('warning:new', { id: 3 }); assert.equal(events, 1);
  service.disconnectRealtime();
});
test('auth failure and expiry stop reconnect with old token; reconnect status is observable', () => {
  const { service, clients } = harness(); const states = [];
  const stop = service.onRealtimeStatus(status => states.push(status));
  service.connectRealtime('bad'); clients[0].receive('connect_error', { data: { code: 'AUTH_INVALID' } });
  assert.equal(service.getRealtimeStatus(), 'unauthorized'); assert.equal(clients[0].reconnect, false);
  service.connectRealtime('bad'); assert.equal(clients.length, 1);
  service.connectRealtime('good'); clients[1].receive('connect'); assert.equal(service.getRealtimeStatus(), 'connected');
  clients[1].receive('disconnect'); clients[1].receive('connect'); assert.equal(states.filter(value => value === 'connected').length, 2);
  clients[1].receive('auth:expired'); assert.equal(service.getRealtimeStatus(), 'unauthorized'); assert.equal(clients[1].reconnect, false);
  stop(); service.disconnectRealtime();
});
test('root lifecycle handles same-tab login/logout and cross-tab token changes', () => {
  const handlers = new Map(), calls = []; let token = null, cleanup;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/components/RealtimeProvider.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, localStorage: { getItem: () => token }, window: { addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: name => handlers.delete(name) }, require: name => name === 'react' ? { createContext: () => ({ Provider: 'provider' }), useState: () => ['disconnected', () => {}], useEffect: fn => { cleanup = fn(); } } : name === 'react/jsx-runtime' ? { jsx() {} } : { connectRealtime: value => calls.push(value), disconnectRealtime: () => calls.push(null), onRealtimeStatus: () => () => {} } });
  exports.RealtimeProvider({ children: null }); token = 'a'; handlers.get('user-updated')();
  token = 'b'; handlers.get('storage')(); token = null; handlers.get('user-updated')();
  assert.deepEqual(calls, [null, 'a', 'b', null]); cleanup(); assert.equal(handlers.size, 0);
});

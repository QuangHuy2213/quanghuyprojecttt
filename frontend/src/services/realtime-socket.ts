import { io, type Socket } from 'socket.io-client';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'unauthorized';
let socket: Socket | undefined;
let currentToken: string | undefined;
let status: RealtimeStatus = 'disconnected';
const listeners = new Map<string, Set<(payload: any) => void>>();
const statusListeners = new Set<(value: RealtimeStatus) => void>();
const setStatus = (value: RealtimeStatus) => { status = value; statusListeners.forEach(fn => fn(value)); };
export const getRealtimeSocket = () => socket;
export const getRealtimeStatus = () => status;
export function onRealtime(event: string, listener: (payload: any) => void) {
  const group = listeners.get(event) ?? new Set();
  group.add(listener); listeners.set(event, group);
  return () => { group.delete(listener); if (!group.size) listeners.delete(event); };
}
export function onRealtimeStatus(listener: (value: RealtimeStatus) => void) {
  statusListeners.add(listener); listener(status);
  return () => { statusListeners.delete(listener); };
}
export function disconnectRealtime() {
  const previous = socket; socket = undefined; currentToken = undefined;
  previous?.removeAllListeners(); previous?.disconnect();
  setStatus('disconnected');
}
export function connectRealtime(token: string) {
  if (currentToken === token) return socket;
  disconnectRealtime();
  currentToken = token;
  const url = process.env.NEXT_PUBLIC_WS_URL;
  if (!url) return;
  const client = io(url, {
    autoConnect: false, transports: ['websocket'], auth: { token },
    reconnectionAttempts: 8, reconnectionDelay: 2000, reconnectionDelayMax: 30000, timeout: 10000,
  });
  socket = client;
  const live = () => socket === client;
  const unauthorized = () => {
    if (!live()) return;
    client.io.reconnection(false); client.disconnect(); setStatus('unauthorized');
  };
  client.on('connect', () => { if (live()) setStatus('connected'); });
  client.on('disconnect', () => { if (live() && status !== 'unauthorized') setStatus('disconnected'); });
  client.on('connect_error', error => {
    if (!live()) return;
    if ((error as Error & { data?: { code?: string } }).data?.code === 'AUTH_INVALID') unauthorized();
    else setStatus('disconnected');
  });
  client.on('auth:expired', unauthorized);
  for (const event of ['warning:new', 'warning:acknowledged', 'transaction:updated', 'transaction:deleted', 'invoice:updated']) {
    client.on(event, payload => { if (live()) listeners.get(event)?.forEach(fn => fn(payload)); });
  }
  setStatus('connecting'); client.connect();
  return client;
}

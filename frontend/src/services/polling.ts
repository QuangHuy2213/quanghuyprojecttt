import { apiFetch, getApiRetryDelay } from './api';

export const BACKGROUND_POLL_MS = 60_000;

/** Completion-based scheduling: no overlapping work, hidden-tab traffic or focus bursts. */
export function startPolling(
  task: (signal: AbortSignal) => Promise<void>,
  options: {
    enabled?: () => boolean;
    retryDelay?: () => number;
    intervalMs?: number;
  } = {},
) {
  const interval = options.intervalMs ?? BACKGROUND_POLL_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let stopped = false;
  let running = false;
  let refreshPending = false;
  let due = Date.now();
  const enabled = () => document.visibilityState === 'visible' &&
    (options.enabled?.() ?? Boolean(localStorage.getItem('access_token') && localStorage.getItem('user')));
  const retryDelay = () => options.retryDelay?.() ?? getApiRetryDelay('posts');
  const schedule = () => {
    clearTimeout(timer);
    if (stopped || running || !enabled()) return;
    timer = setTimeout(run, Math.max(0, due - Date.now(), retryDelay()));
  };
  const run = async () => {
    if (stopped || running || !enabled()) return;
    if (retryDelay() > 0) { schedule(); return; }
    running = true;
    controller = new AbortController();
    try {
      await task(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) console.error('Lỗi đồng bộ dữ liệu nền:', error);
    } finally {
      running = false;
      due = Date.now() + (retryDelay() || (refreshPending ? 1000 : interval));
      refreshPending = false;
      schedule();
    }
  };
  const onVisibility = () => {
    if (!enabled()) {
      clearTimeout(timer);
      controller?.abort();
    } else schedule();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onVisibility);
  window.addEventListener('storage', onVisibility);
  window.addEventListener('user-updated', onVisibility);
  schedule();
  return {
    refresh() {
      // Realtime events are coalesced; a rapid event burst cannot start parallel fetches.
      if (running) refreshPending = true;
      due = Math.min(due, Date.now() + 1000);
      schedule();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('storage', onVisibility);
      window.removeEventListener('user-updated', onVisibility);
    },
  };
}

type Subscriber = (data: unknown) => void;
const subscriptions = new Map<string, {
  listeners: Set<Subscriber>;
  poller: ReturnType<typeof startPolling>;
  value?: unknown;
}>();

/** A single source and timer per authenticated endpoint, even with multiple Headers. */
export function subscribeApiPolling(path: string, token: string, onData: Subscriber) {
  const key = JSON.stringify([path, token]);
  let entry = subscriptions.get(key);
  if (!entry) {
    const listeners = new Set<Subscriber>();
    const poller = startPolling(async signal => {
      const response = await apiFetch(path, {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (signal.aborted) return;
      const current = subscriptions.get(key);
      if (!current) return;
      current.value = data;
      for (const listener of current.listeners) listener(data);
    }, {
      enabled: () => localStorage.getItem('access_token') === token && Boolean(localStorage.getItem('user')),
      retryDelay: () => getApiRetryDelay(path),
    });
    entry = { listeners, poller };
    subscriptions.set(key, entry);
  }
  const current = entry;
  current.listeners.add(onData);
  if (current.value !== undefined) onData(current.value);
  return {
    refresh: current.poller.refresh,
    stop() {
      current.listeners.delete(onData);
      if (current.listeners.size === 0) {
        current.poller.stop();
        subscriptions.delete(key);
      }
    },
  };
}

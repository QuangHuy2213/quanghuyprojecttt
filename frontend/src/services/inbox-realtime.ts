import { apiFetch, getApiRetryDelay } from './api';
import { supabase, isSupabaseConfigured } from './supabase';
import { mergeNotifications, notificationFromRow, type InboxNotification } from './notification-state';

type Snapshot = { notifications: InboxNotification[]; unreadIds: number[] };
type Change = { new: Record<string, unknown> };

async function loadInbox(token: string, signal: AbortSignal): Promise<Snapshot> {
  const read = async (path: string) => {
    const response = await apiFetch(path, { signal, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Inbox sync: HTTP ${response.status}`);
    return response.json();
  };
  const [notifications, messages] = await Promise.all([read('notifications'), read('chat/unread-count')]);
  if (!Array.isArray(notifications) || !Array.isArray(messages?.unreadIds))
    throw new Error('Inbox snapshot is invalid; deploy the matching backend first.');
  return { notifications, unreadIds: messages.unreadIds };
}

/** One provider-owned subscription, independent of how many Headers are mounted. */
export function watchInbox(options: {
  userId: string;
  token: string;
  onNotifications: (items: InboxNotification[]) => void;
  onUnreadMessages: (count: number) => void;
  onToast: (item: InboxNotification) => void;
  onMessage?: () => void;
  onError?: (error: unknown) => void;
  load?: (token: string, signal: AbortSignal) => Promise<Snapshot>;
}) {
  let rows: InboxNotification[] = [];
  let unread = new Set<number>();
  const seen = new Set<number>();
  const readMessages = new Set<number>();
  const notificationChanges = new Map<number, InboxNotification>();
  const messageChanges = new Map<number, boolean>();
  const controller = new AbortController();
  let channel: ReturnType<typeof supabase.channel> | undefined;
  let generation = 0;
  let stopped = false, connected = false, closed = false, running = false, pending = false;
  let initialized = false, lastSync = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState === 'visible';
  const emit = () => { options.onNotifications(rows); options.onUnreadMessages(unread.size); };
  const announce = (item: InboxNotification, toast: boolean) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    if (toast && !item.isRead && !item.is_read && item.type !== 'WARNING_POPUP') options.onToast(item);
  };
  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (!stopped && visible()) timer = setTimeout(() => {
      if (closed) connect();
      void sync();
    }, Math.max(delay, getApiRetryDelay('notifications')));
  };
  const sync = async () => {
    if (stopped || !visible()) return;
    if (running) { pending = true; return; }
    const delay = Math.max(getApiRetryDelay('notifications'), lastSync + 1000 - Date.now());
    if (delay > 0) { schedule(delay); return; }
    running = true;
    pending = false;
    notificationChanges.clear();
    messageChanges.clear();
    let failed = false;
    try {
      const snapshot = await (options.load ?? loadInbox)(options.token, controller.signal);
      if (stopped) return;
      const owned = snapshot.notifications.filter(item => (item.userId ?? item.user_id) === options.userId);
      // INSERT/UPDATE and local read acknowledgements arriving during GET win over its snapshot.
      const acknowledged = new Set(rows.filter(item => item.isRead || item.is_read).map(item => item.id));
      rows = mergeNotifications([...notificationChanges.values(), ...owned])
        .map(item => acknowledged.has(item.id) ? { ...item, isRead: true } : item);
      unread = new Set(snapshot.unreadIds.filter(id => !readMessages.has(id)));
      for (const [id, isUnread] of messageChanges) {
        if (isUnread) unread.add(id); else unread.delete(id);
      }
      for (const item of rows) announce(item, initialized);
      initialized = true;
      emit();
    } catch (error) {
      failed = true;
      if (!stopped) options.onError?.(error);
    } finally {
      running = false;
      lastSync = Date.now();
      if (!stopped && (failed || !connected || pending)) schedule(failed || !connected ? 60_000 : 1000);
    }
  };
  const notification = (event: 'INSERT' | 'UPDATE', payload: Change) => {
    if (stopped) return;
    const item = notificationFromRow(payload.new, options.userId);
    if (!item) return;
    // Read flags are monotonic; a replayed INSERT must not undo an acknowledgement.
    const previous = rows.find(row => row.id === item.id);
    if (previous?.isRead || previous?.is_read) item.isRead = true;
    if (running) notificationChanges.set(item.id, item);
    rows = mergeNotifications([item, ...rows]);
    announce(item, event === 'INSERT');
    options.onNotifications(rows);
  };
  const message = (payload: Change) => {
    if (stopped) return;
    const row = payload.new;
    if (row.receiver_id !== options.userId || !Number.isInteger(row.id) ||
        !(row.read_at === null || typeof row.read_at === 'string')) return;
    const id = row.id as number;
    if (row.read_at !== null) readMessages.add(id);
    const isUnread = row.read_at === null && !readMessages.has(id);
    if (running) messageChanges.set(id, isUnread);
    if (isUnread) unread.add(id); else unread.delete(id);
    options.onUnreadMessages(unread.size);
    options.onMessage?.();
  };
  const connect = () => {
    const ownGeneration = ++generation;
    if (channel) void supabase.removeChannel(channel);
    closed = false;
    channel = supabase.channel(`inbox:${options.userId}:${crypto.randomUUID()}`);
    for (const event of ['INSERT', 'UPDATE'] as const) {
      channel.on('postgres_changes', {
        event, schema: 'public', table: 'notifications', filter: `user_id=eq.${options.userId}`,
      }, payload => { if (generation === ownGeneration) notification(event, payload); });
      channel.on('postgres_changes', {
        event, schema: 'public', table: 'messages', filter: `receiver_id=eq.${options.userId}`,
      }, payload => { if (generation === ownGeneration) message(payload); });
    }
    channel.subscribe(status => {
      if (stopped || generation !== ownGeneration) return;
      if (status === 'SUBSCRIBED') {
        const recover = !connected;
        connected = true;
        clearTimeout(timer);
        if (recover) void sync();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        connected = false;
        closed = status === 'CLOSED';
        if (!lastSync && !running) void sync(); else schedule(60_000);
      }
    });
  };
  const visibility = () => {
    if (!visible()) clearTimeout(timer);
    else if (!connected || !initialized) void sync();
  };
  if (isSupabaseConfigured) { schedule(10_000); connect(); }
  else schedule(0);
  document.addEventListener('visibilitychange', visibility);
  return {
    refresh: () => { void sync(); },
    updateNotifications(update: InboxNotification[] | ((current: InboxNotification[]) => InboxNotification[])) {
      if (stopped) return;
      rows = mergeNotifications(typeof update === 'function' ? update(rows) : update);
      if (running) for (const item of rows) notificationChanges.set(item.id, item);
      options.onNotifications(rows);
    },
    stop() {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
      if (channel) void supabase.removeChannel(channel);
    },
  };
}

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
  onMessageToast?: (message: { id: number; senderId: string; postId: number | null }) => void;
  onMessage?: () => void;
  onTransactionDetected?: () => void;
  onError?: (error: unknown) => void;
  load?: (token: string, signal: AbortSignal) => Promise<Snapshot>;
}) {
  let rows: InboxNotification[] = [];
  let unread = new Set<number>();
  const seen = new Set<number>();
  const transactionSignals = new Set<number>();
  const toastedMessages = new Set<number>();
  const readMessages = new Set<number>();
  const notificationChanges = new Map<number, InboxNotification>();
  const messageChanges = new Map<number, boolean>();
  const controller = new AbortController();
  let channel: ReturnType<typeof supabase.channel> | undefined;
  let messageChannel: ReturnType<typeof supabase.channel> | undefined;
  let messageGeneration = 0;
  let messageReconnect: ReturnType<typeof setTimeout> | undefined;
  let messageNeedsRecovery = false;
  let generation = 0;
  let stopped = false, connected = false, closed = false, running = false, pending = false;
  let initialized = false, lastSync = 0;
  let warningConnected = true;
  let warningNeedsSync = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState === 'visible';
  const emit = () => { options.onNotifications(rows); options.onUnreadMessages(unread.size); };
  const announce = (item: InboxNotification, toast: boolean) => {
    // Domain updates must not depend on toast eligibility (read flags/history/replay).
    if (item.type === 'SYSTEM' && item.eventKey?.includes(':proposal:') && !transactionSignals.has(item.id)) {
      transactionSignals.add(item.id);
      options.onTransactionDetected?.();
    }
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
      const owned = snapshot.notifications.filter(item => item.type !== 'MESSAGE' && (item.userId ?? item.user_id) === options.userId);
      // INSERT/UPDATE and local read acknowledgements arriving during GET win over its snapshot.
      const acknowledged = new Set(rows.filter(item => item.isRead || item.is_read).map(item => item.id));
      const newerWarnings = rows.filter(item => item.type === 'WARNING_POPUP' &&
        Date.parse(item.updatedAt || '') > Date.parse(owned.find(row => row.id === item.id)?.updatedAt || '1970-01-01'));
      rows = mergeNotifications([...notificationChanges.values(), ...newerWarnings, ...owned, ...rows])
        .map(item => acknowledged.has(item.id) ? { ...item, isRead: true } : item);
      unread = new Set(snapshot.unreadIds.filter(id => !readMessages.has(id)));
      for (const [id, isUnread] of messageChanges) {
        if (isUnread) unread.add(id); else unread.delete(id);
      }
      for (const item of rows) announce(item, initialized);
      initialized = true;
      warningNeedsSync = false;
      emit();
    } catch (error) {
      failed = true;
      if (!stopped) options.onError?.(error);
    } finally {
      running = false;
      lastSync = Date.now();
      if (!stopped && (failed || !connected || !warningConnected || pending)) schedule(failed || !connected || !warningConnected ? 60_000 : 1000);
    }
  };
  const notification = (event: 'INSERT' | 'UPDATE', payload: Change) => {
    if (stopped) return;
    const item = notificationFromRow(payload.new, options.userId);
    if (!item || item.type === 'MESSAGE' || item.type === 'WARNING_POPUP') return;
    // Read flags are monotonic; a replayed INSERT must not undo an acknowledgement.
    const previous = rows.find(row => row.id === item.id);
    if (previous?.isRead || previous?.is_read) item.isRead = true;
    if (running) notificationChanges.set(item.id, item);
    rows = mergeNotifications([item, ...rows]);
    announce(item, event === 'INSERT');
    options.onNotifications(rows);
  };
  const message = (event: 'INSERT' | 'UPDATE', payload: Change) => {
    if (stopped) return;
    const row = payload.new;
    if (row.receiver_id !== options.userId || typeof row.sender_id !== 'string' ||
        row.sender_id === options.userId || !Number.isInteger(row.id)) return;
    // INSERT defaults to unread; optional listing/read metadata must not suppress a toast.
    if (event === 'UPDATE' && row.read_at === undefined) return;
    const id = row.id as number;
    if (typeof row.read_at === 'string') readMessages.add(id);
    const isUnread = row.read_at == null && !readMessages.has(id);
    if (running) messageChanges.set(id, isUnread);
    if (isUnread) unread.add(id); else unread.delete(id);
    options.onUnreadMessages(unread.size);
    if (event === 'INSERT' && !toastedMessages.has(id)) {
      toastedMessages.add(id);
      options.onMessageToast?.({ id, senderId: row.sender_id, postId: Number.isInteger(row.post_id) ? row.post_id as number : null });
    }
    options.onMessage?.();
  };
  // Keep chat delivery independent of the notifications table's subscription health.
  const connectMessages = () => {
    const ownGeneration = ++messageGeneration;
    if (messageChannel) void supabase.removeChannel(messageChannel);
    messageChannel = supabase.channel(`global-messages:${options.userId}:${crypto.randomUUID()}`);
    for (const event of ['INSERT', 'UPDATE'] as const) {
      messageChannel.on('postgres_changes', {
        event, schema: 'public', table: 'messages', filter: `receiver_id=eq.${options.userId}`,
      }, payload => { if (messageGeneration === ownGeneration) message(event, payload); });
    }
    messageChannel.subscribe((status, error) => {
      if (stopped || messageGeneration !== ownGeneration) return;
      if (status === 'SUBSCRIBED') {
        clearTimeout(messageReconnect);
        if (messageNeedsRecovery) { messageNeedsRecovery = false; void sync(); }
      }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        messageNeedsRecovery = true;
        options.onError?.(new Error(`Global messages Realtime ${status}: ${error?.message || 'connection interrupted'}`));
        // SDK rejoins errors/timeouts; CLOSED is terminal and needs a fresh channel.
        if (status === 'CLOSED') {
          clearTimeout(messageReconnect);
          messageReconnect = setTimeout(() => { if (!stopped) connectMessages(); }, 60_000);
        }
      }
    });
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
    }
    channel.subscribe((status, error) => {
      if (stopped || generation !== ownGeneration) return;
      if (status === 'SUBSCRIBED') {
        const recover = !connected;
        connected = true;
        clearTimeout(timer);
        if (recover) void sync();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        options.onError?.(new Error(`Notifications Realtime ${status}: ${error?.message || 'connection interrupted'}`));
        connected = false;
        closed = status === 'CLOSED';
        if (!lastSync && !running) void sync(); else schedule(60_000);
      }
    });
  };
  const visibility = () => {
    if (!visible()) clearTimeout(timer);
    else if (!connected || !warningConnected || warningNeedsSync || !initialized) void sync();
  };
  if (isSupabaseConfigured) { schedule(10_000); connect(); connectMessages(); }
  else schedule(0);
  document.addEventListener('visibilitychange', visibility);
  return {
    setWarningConnection(value: boolean) {
      const previous = warningConnected;
      warningConnected = value;
      if (value && !previous) { warningNeedsSync = true; clearTimeout(timer); void sync(); }
      else if (!value) schedule(60_000);
    },
    receiveWarning(value: InboxNotification) {
      if (stopped || !value || value.type !== 'WARNING_POPUP' ||
          (value.userId ?? value.user_id) !== options.userId || !Number.isInteger(value.id)) return;
      const old = rows.find(item => item.id === value.id);
      const incoming = old && Date.parse(old.updatedAt as string) > Date.parse(value.updatedAt as string) ? old : value;
      const item = old?.isRead || old?.is_read ? { ...incoming, isRead: true } : incoming;
      if (running) notificationChanges.set(item.id, item);
      rows = mergeNotifications([item, ...rows]);
      options.onNotifications(rows);
    },
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
      clearTimeout(messageReconnect);
      document.removeEventListener('visibilitychange', visibility);
      if (channel) void supabase.removeChannel(channel);
      if (messageChannel) void supabase.removeChannel(messageChannel);
    },
  };
}

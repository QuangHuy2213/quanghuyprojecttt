import { supabase, isSupabaseConfigured } from './supabase';
import { getApiRetryDelay } from './api';
import { normalizeTimestamp } from './timestamps';

export type Message = {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
  postId: number | null;
};

// Column names verified against prisma/schema.prisma and the chat migrations.
export function messageFromRow(row: Record<string, unknown>): Message | null {
  if (!Number.isInteger(row.id) || typeof row.sender_id !== 'string' ||
      typeof row.receiver_id !== 'string' || typeof row.text !== 'string' ||
      typeof row.created_at !== 'string' ||
      !(row.post_id === null || Number.isInteger(row.post_id)) ||
      !(row.read_at === null || typeof row.read_at === 'string')) return null;
  return {
    id: row.id as number, senderId: row.sender_id, receiverId: row.receiver_id,
    text: row.text, createdAt: row.created_at, readAt: row.read_at as string | null,
    postId: row.post_id as number | null,
  };
}

export const mergeMessages = (items: Message[]) =>
  [...new Map(items.map((item) => [item.id, {
    ...item, createdAt: normalizeTimestamp(item.createdAt),
    readAt: item.readAt ? normalizeTimestamp(item.readAt) : null,
  }])).values()].sort((a, b) => a.id - b.id);

export function belongsToConversation(message: Message, userId: string, receiverId: string, postId?: number) {
  return message.postId === (postId ?? null) &&
    ((message.senderId === userId && message.receiverId === receiverId) ||
     (message.senderId === receiverId && message.receiverId === userId));
}

/** One channel per mounted conversation; the shared client owns the WebSocket. */
export function watchConversation(options: {
  userId: string;
  receiverId: string;
  postId?: number;
  load: (signal: AbortSignal, before?: number) => Promise<Message[]>;
  onMessages: (messages: Message[]) => void;
  onError: (error: unknown) => void;
}) {
  const { userId, receiverId, postId } = options;
  const controller = new AbortController();
  let stopped = false;
  let connected = false;
  let closed = false;
  let running = false;
  let pending = false;
  let lastSync = 0;
  let latestSyncedId = 0;
  let historyLoaded = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let channel: ReturnType<typeof supabase.channel>;
  let generation = 0;
  const visible = () => document.visibilityState === 'visible';
  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (!stopped && visible()) timer = setTimeout(() => {
      if (closed) connect();
      void sync();
    }, Math.max(delay, getApiRetryDelay('chat/messages')));
  };
  const sync = async () => {
    if (stopped || !visible()) return;
    if (running) { pending = true; return; }
    const delay = Math.max(getApiRetryDelay('chat/messages'), lastSync + 1000 - Date.now());
    if (delay > 0) { schedule(delay); return; }
    running = true;
    pending = false;
    let failed = false;
    try {
      let page = await options.load(controller.signal);
      const newest = page[page.length - 1]?.id ?? latestSyncedId;
      const recovered = [...page];
      // Reconnect may have missed more than the API's 50-row page.
      while (!stopped && historyLoaded && page.length === 50 && page[0].id > latestSyncedId) {
        const before = page[0].id;
        page = await options.load(controller.signal, before);
        recovered.push(...page);
        if (page.length && page[0].id >= before) break;
      }
      if (!stopped) {
        options.onMessages(recovered);
        latestSyncedId = Math.max(latestSyncedId, newest);
        historyLoaded = true;
      }
    } catch (error) {
      failed = true;
      if (!stopped) options.onError(error);
    } finally {
      running = false;
      lastSync = Date.now();
      if (!stopped && (failed || !connected || pending)) schedule(failed || !connected ? 60_000 : 1000);
    }
  };
  const receive = (payload: { new: Record<string, unknown> }) => {
    if (stopped) return;
    const message = messageFromRow(payload.new);
    if (message && belongsToConversation(message, userId, receiverId, postId)) options.onMessages([message]);
  };
  const connect = () => {
    const ownGeneration = ++generation;
    if (channel) void supabase.removeChannel(channel);
    closed = false;
    channel = supabase.channel(`chat:${userId}:${receiverId}:${postId ?? 'direct'}:${crypto.randomUUID()}`);
    // Two directional filters; never subscribe to the entire messages table.
    for (const sender of [userId, receiverId]) {
      channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${sender}`,
      }, (payload) => { if (generation === ownGeneration) receive(payload); });
    }
    channel.subscribe((status) => {
      if (stopped || generation !== ownGeneration) return;
      if (status === 'SUBSCRIBED') {
        const needsSync = !connected;
        connected = true;
        clearTimeout(timer);
        if (needsSync) void sync();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        connected = false;
        closed = status === 'CLOSED';
        // SDK retries errors/timeouts. Terminal CLOSED is recreated at fallback cadence.
        if (!lastSync && !running) void sync();
        else schedule(60_000);
      }
    });
  };
  const visibility = () => {
    if (visible()) void sync();
    else clearTimeout(timer);
  };
  // Avoid a snapshot/subscription gap; buffer INSERTs by merging while history loads.
  // Still load history if the socket never completes its handshake.
  if (isSupabaseConfigured) {
    schedule(10_000);
    connect();
  } else {
    console.warn('Chat Realtime requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY; using 60s history fallback.');
    schedule(0);
  }
  document.addEventListener('visibilitychange', visibility);
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller.abort();
    document.removeEventListener('visibilitychange', visibility);
    if (channel) void supabase.removeChannel(channel);
  };
}

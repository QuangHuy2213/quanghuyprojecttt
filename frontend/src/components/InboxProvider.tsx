'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import {
  mergeNotifications,
  type InboxNotification,
} from '@/services/notification-state';
import { subscribeApiPolling } from '@/services/polling';
import { supabase } from '@/services/supabase';

export type SessionUser = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
};
type Popup = { id: string; title: string; content: string; link: string };
type Inbox = {
  user: SessionUser | null;
  token: string | null;
  notifications: InboxNotification[];
  unreadMessages: number;
  setNotifications: React.Dispatch<React.SetStateAction<InboxNotification[]>>;
  refreshMessages: () => void;
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
};
const InboxContext = createContext<Inbox | null>(null);

function InboxToast({ popup, dismiss }: { popup: Popup; dismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(popup.id), 3000);
    return () => clearTimeout(timer);
  }, [popup.id, dismiss]);
  return (
    <div
      role="status"
      className="flex gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-slate-900 shadow-xl"
    >
      <Link
        href={popup.link}
        onClick={() => dismiss(popup.id)}
        className="min-w-0 flex-1"
      >
        <p className="text-sm font-bold">{popup.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{popup.content}</p>
      </Link>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => dismiss(popup.id)}
        className="h-7 w-7 rounded-lg text-xl text-slate-500 hover:bg-slate-100"
      >
        ×
      </button>
    </div>
  );
}

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const refreshRef = useRef<() => void>(() => {});
  const dismiss = useCallback(
    (id: string) => setPopups((current) => current.filter((popup) => popup.id !== id)),
    [],
  );
  const refreshMessages = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const sync = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || 'null');
        const accessToken = localStorage.getItem('access_token');
        setUser(stored?.id && accessToken ? stored : null);
        setToken(stored?.id ? accessToken : null);
      } catch {
        setUser(null);
        setToken(null);
      }
    };
    sync();
    window.addEventListener('user-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('user-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    setNotifications([]);
    setUnreadMessages(0);
    setPopups([]);
    if (!user?.id || !token) return;
    let active = true;
    const seen = new Set<string>();
    const popup = (entry: Popup) => {
      if (!active || seen.has(entry.id)) return;
      seen.add(entry.id);
      if (seen.size > 1000) seen.delete(seen.values().next().value!);
      setPopups((current) => [...current, entry].slice(-3));
    };
    let notificationIds: Set<string> | null = null;
    let latestMessageId: number | undefined;
    const notificationSync = subscribeApiPolling('notifications', token, (data) => {
      if (!active || !Array.isArray(data)) return;
      const items = mergeNotifications(data);
      for (const item of items) {
        const id = `notification:${item.eventKey || item.id}`;
        if (
          notificationIds &&
          !notificationIds.has(id) &&
          item.type !== 'WARNING_POPUP'
        ) {
          popup({
            id,
            title: 'Bạn có 1 thông báo mới',
            content: item.title,
            link: item.link || '/my-transactions',
          });
          window.dispatchEvent(new Event('transactions-updated'));
        }
      }
      notificationIds = new Set(
        items.map((item) => `notification:${item.eventKey || item.id}`),
      );
      setNotifications(items);
    });
    const messageSync = subscribeApiPolling('chat/unread-count', token, (data) => {
      if (!active || !data || typeof data !== 'object' || !('count' in data)) return;
      setUnreadMessages(Number(data.count) || 0);
      const latest = (
        data as {
          latest?: {
            id: number;
            senderId: string;
            postId: number | null;
            text: string;
          };
        }
      ).latest;
      if (latest && latestMessageId !== undefined && latest.id > latestMessageId) {
        popup({
          id: `message:${latest.id}`,
          title: 'Bạn có tin nhắn mới',
          content: latest.text,
          link: `/chat?receiverId=${encodeURIComponent(latest.senderId)}${latest.postId ? `&postId=${latest.postId}` : ''}`,
        });
        window.dispatchEvent(new Event('messages-updated'));
      }
      latestMessageId = Math.max(latestMessageId ?? 0, latest?.id ?? 0);
    });
    refreshRef.current = messageSync.refresh;
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!active || payload.eventType === 'DELETE') return;
          const notification = payload.new as InboxNotification;
          setNotifications((current) =>
            mergeNotifications([
              notification,
              ...current.filter((item) => item.id !== notification.id),
            ]),
          );
          if (payload.eventType === 'INSERT' && notification.type !== 'WARNING_POPUP')
            popup({
              id: `notification:${notification.eventKey || notification.id}`,
              title: 'Bạn có 1 thông báo mới',
              content: notification.title,
              link: notification.link || '/my-transactions',
            });
          window.dispatchEvent(new Event('transactions-updated'));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const message = payload.new as {
            id: number;
            sender_id: string;
            post_id?: number;
            text: string;
            read_at?: string;
          };
          if (!active || seen.has(`message:${message.id}`)) return;
          if (!message.read_at) setUnreadMessages((count) => count + 1);
          popup({
            id: `message:${message.id}`,
            title: 'Bạn có 1 tin nhắn mới',
            content: message.text,
            link: `/chat?receiverId=${encodeURIComponent(message.sender_id)}${message.post_id ? `&postId=${message.post_id}` : ''}`,
          });
          messageSync.refresh();
          window.dispatchEvent(new Event('messages-updated'));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => messageSync.refresh(),
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Kết nối Realtime hộp thư bị gián đoạn:', status, error?.message);
        }
      });
    const refreshInbox = () => {
      messageSync.refresh();
      notificationSync.refresh();
    };
    window.addEventListener('messages-updated', refreshInbox);
    return () => {
      active = false;
      window.removeEventListener('messages-updated', refreshInbox);
      refreshRef.current = () => {};
      notificationSync.stop();
      messageSync.stop();
      supabase.removeChannel(channel);
    };
  }, [user?.id, token]);

  return (
    <InboxContext.Provider
      value={{
        user,
        token,
        notifications,
        setNotifications,
        unreadMessages,
        setUnreadMessages,
        refreshMessages,
      }}
    >
      {children}
      <div
        className="fixed right-4 top-24 z-[100001] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        aria-live="polite"
      >
        {popups.map((popup) => (
          <InboxToast key={popup.id} popup={popup} dismiss={dismiss} />
        ))}
      </div>
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) throw new Error('useInbox must be used inside InboxProvider');
  return context;
}

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
import type { InboxNotification } from '@/services/notification-state';
import { watchInbox } from '@/services/inbox-realtime';

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
  const inboxRef = useRef<ReturnType<typeof watchInbox> | null>(null);
  const updateNotifications = useCallback<React.Dispatch<React.SetStateAction<InboxNotification[]>>>(
    (update) => inboxRef.current?.updateNotifications(update), [],
  );
  const dismiss = useCallback(
    (id: string) => setPopups((current) => current.filter((popup) => popup.id !== id)),
    [],
  );
  const refreshMessages = useCallback(() => inboxRef.current?.refresh(), []);

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
    const inbox = watchInbox({
      userId: user.id,
      token,
      onNotifications: setNotifications,
      onUnreadMessages: setUnreadMessages,
      onToast: (item) => {
        setPopups((current) => [...current, {
          id: `notification:${item.id}`,
          title: 'Bạn có 1 thông báo mới',
          content: item.title,
          link: item.link || '/my-transactions',
        }].slice(-3));
        window.dispatchEvent(new Event('transactions-updated'));
      },
      onMessageToast: (message) => {
        setPopups(current => [...current, {
          id: `message:${message.id}`,
          title: 'B\u1ea1n c\u00f3 1 tin nh\u1eafn m\u1edbi',
          content: '',
          link: `/chat?receiverId=${encodeURIComponent(message.senderId)}${message.postId ? `&postId=${message.postId}` : ''}`,
        }].slice(-3));
      },
      onMessage: () => window.dispatchEvent(new Event('messages-updated')),
      onError: (error) => console.warn('Inbox sync interrupted:', error),
    });
    inboxRef.current = inbox;
    return () => {
      inboxRef.current = null;
      inbox.stop();
    };
  }, [user?.id, token]);

  return (
    <InboxContext.Provider
      value={{
        user,
        token,
        notifications,
        setNotifications: updateNotifications,
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

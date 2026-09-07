'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from './Header';
import UserAvatar from './UserAvatar';
import TransactionPrompt, { TransactionSummary } from './TransactionPrompt';
import { useInbox } from './InboxProvider';
import { apiFetch } from '@/services/api';
import { startPolling } from '@/services/polling';

type Message = {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
  postId: number | null;
};
type Thread = {
  peer: { id: string; fullName: string; avatarUrl?: string };
  post: { id: number; title: string } | null;
  lastMessage?: Message;
  unread?: number;
};
const keyOf = (thread: Thread) => `${thread.peer.id}:${thread.post?.id || ''}`;
const mergeMessages = (items: Message[]) =>
  [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => a.id - b.id);

async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Không thể tải dữ liệu.');
  return data;
}

export default function ChatWorkspace() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ postId?: string }>();
  const { user, token, setUnreadMessages } = useInbox();
  const receiverId = search.get('receiverId') || search.get('sellerId') || '';
  const rawPostId = params.postId || search.get('postId') || '';
  const postId = rawPostId ? Number(rawPostId) : undefined;
  const conversationKey = `${receiverId}:${rawPostId}`;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transaction, setTransaction] = useState<TransactionSummary | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [older, setOlder] = useState(true);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const draft = useRef<{ key: string; text: string; id: string } | null>(null);
  const activeKey = useRef(conversationKey);
  activeKey.current = conversationKey;

  useEffect(() => {
    if (!user || !token) {
      setThreads([]);
      return;
    }
    const poller = startPolling(async (signal) => {
      const data = await jsonRequest<Thread[]>('chat/threads', { signal });
      if (!signal.aborted) setThreads(data);
    });
    window.addEventListener('messages-updated', poller.refresh);
    return () => {
      poller.stop();
      window.removeEventListener('messages-updated', poller.refresh);
    };
  }, [user?.id, token]);

  useEffect(() => {
    setActive(null);
    setMessages([]);
    setTransaction(null);
    setError('');
    setOlder(true);
    setText('');
    if (!user || !token || !receiverId) return;
    if (postId !== undefined && (!Number.isInteger(postId) || postId < 1)) {
      setError('Mã bài đăng không hợp lệ.');
      return;
    }
    const query = new URLSearchParams({
      receiverId,
      ...(postId ? { postId: String(postId) } : {}),
    });
    const controller = new AbortController();
    jsonRequest<Thread>(`chat/conversation?${query}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setActive(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    const poller = startPolling(async (signal) => {
      try {
        const data = await jsonRequest<Message[]>(`chat/messages?${query}`, { signal });
        if (!signal.aborted)
          setMessages((current) => mergeMessages([...current, ...data]));
        if (postId) {
          const tx = await jsonRequest<TransactionSummary | null>(
            `transactions/check?user1=${user.id}&user2=${receiverId}&postId=${postId}`,
            { signal },
          );
          if (!signal.aborted) setTransaction(tx);
        }
      } catch (error) {
        if (!signal.aborted)
          setError(
            error instanceof Error ? error.message : 'Không thể đồng bộ hội thoại.',
          );
      }
    });
    window.addEventListener('messages-updated', poller.refresh);
    window.addEventListener('transactions-updated', poller.refresh);
    return () => {
      controller.abort();
      poller.stop();
      window.removeEventListener('messages-updated', poller.refresh);
      window.removeEventListener('transactions-updated', poller.refresh);
    };
  }, [user?.id, token, receiverId, postId]);

  useEffect(() => {
    if (!user || !receiverId) return;
    const unread = messages.filter(
      (message) => message.receiverId === user.id && !message.readAt,
    );
    if (!unread.length) return;
    const controller = new AbortController();
    const read = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const throughId = Math.max(...unread.map((message) => message.id));
        const result = await jsonRequest<{ unreadCount: number }>('chat/read', {
          method: 'PATCH',
          signal: controller.signal,
          body: JSON.stringify({ receiverId, postId, throughId }),
        });
        if (controller.signal.aborted) return;
        setUnreadMessages(result.unreadCount);
        setThreads((current) =>
          current.map((thread) =>
            keyOf(thread) === conversationKey ? { ...thread, unread: 0 } : thread,
          ),
        );
        setMessages((current) =>
          current.map((message) =>
            message.receiverId === user.id && message.id <= throughId
              ? { ...message, readAt: new Date().toISOString() }
              : message,
          ),
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Chưa thể đánh dấu đã đọc.');
      }
    };
    const timer = setTimeout(read, 100);
    document.addEventListener('visibilitychange', read);
    return () => {
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', read);
    };
  }, [messages, user?.id, receiverId, postId, conversationKey, setUnreadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[messages.length - 1]?.id]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !active || !user || sending) return;
    const key = conversationKey;
    if (draft.current?.key !== key || draft.current.text !== content)
      draft.current = { key, text: content, id: crypto.randomUUID() };
    setSending(true);
    setError('');
    try {
      const result = await jsonRequest<{ message: Message }>('chat/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId,
          postId,
          content,
          clientMessageId: draft.current.id,
        }),
      });
      if (activeKey.current === key) {
        setMessages((current) => mergeMessages([...current, result.message]));
        setText('');
      }
      draft.current = null;
      window.dispatchEvent(new Event('messages-updated'));
      window.dispatchEvent(new Event('transactions-updated'));
    } catch (error) {
      if (activeKey.current === key)
        setError(error instanceof Error ? error.message : 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoading(true);
    const key = conversationKey;
    try {
      const query = new URLSearchParams({
        receiverId,
        before: String(messages[0].id),
        ...(postId ? { postId: String(postId) } : {}),
      });
      const data = await jsonRequest<Message[]>(`chat/messages?${query}`);
      if (activeKey.current !== key) return;
      setOlder(data.length === 50);
      setMessages((current) => mergeMessages([...data, ...current]));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể tải tin cũ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <Header />
      {!user ? (
        <main className="m-auto p-8 text-center">
          <p className="mb-4">Đăng nhập để xem và gửi tin nhắn.</p>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Đăng nhập
          </Link>
        </main>
      ) : (
        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden border-x border-slate-200 bg-white">
          <aside
            className={`${receiverId ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-slate-200 md:w-80 md:shrink-0`}
          >
            <div className="border-b p-5">
              <h1 className="text-xl font-bold text-slate-900">Tin nhắn</h1>
              <p className="mt-1 text-xs text-slate-500">Trao đổi theo từng bài đăng</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {!threads.length && (
                <p className="p-5 text-sm text-slate-500">Chưa có cuộc trò chuyện nào.</p>
              )}
              {threads.map((thread) => (
                <button
                  key={keyOf(thread)}
                  onClick={() =>
                    router.push(
                      `/chat?receiverId=${thread.peer.id}${thread.post ? `&postId=${thread.post.id}` : ''}`,
                    )
                  }
                  className={`mb-1 flex w-full gap-3 rounded-xl p-3 text-left ${keyOf(thread) === conversationKey ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <UserAvatar user={thread.peer} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {thread.peer.fullName}
                    </p>
                    {thread.post && (
                      <p className="truncate text-xs text-blue-700">
                        {thread.post.title}
                      </p>
                    )}
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {thread.lastMessage?.text}
                    </p>
                  </div>
                  {!!thread.unread && (
                    <span className="h-fit rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                      {thread.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>
          <section
            className={`${receiverId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}
          >
            {!receiverId ? (
              <p className="m-auto p-8 text-center text-slate-500">
                Chọn một cuộc trò chuyện để bắt đầu.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b p-4">
                  <Link href="/chat" className="text-sm text-blue-600 md:hidden">
                    ←
                  </Link>
                  <UserAvatar user={active?.peer} className="h-10 w-10" />
                  <div className="min-w-0">
                    <h2 className="font-bold">
                      {active?.peer.fullName || 'Cuộc trò chuyện'}
                    </h2>
                    {active?.post && (
                      <Link
                        href={`/posts/${active.post.id}`}
                        className="block truncate text-xs text-blue-600"
                      >
                        {active.post.title}
                      </Link>
                    )}
                  </div>
                </div>
                {transaction && (
                  <div className="p-3">
                    <TransactionPrompt
                      key={`${transaction.id}:${transaction.status}`}
                      transaction={transaction}
                      userId={user.id}
                      onUpdated={setTransaction}
                    />
                  </div>
                )}
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {older && messages.length >= 50 && (
                    <button
                      disabled={loading}
                      onClick={loadOlder}
                      className="mx-auto block text-sm text-blue-600"
                    >
                      {loading ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}
                    </button>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${message.senderId === user.id ? 'bg-blue-600 text-white' : 'border bg-white text-slate-900'}`}
                      >
                        <p>{message.text}</p>
                        <time className="mt-1 block text-right text-[10px] opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  ))}
                  <div ref={bottom} />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="border-t bg-rose-50 px-4 py-2 text-sm text-rose-700"
                  >
                    {error}
                  </p>
                )}
                <form onSubmit={send} className="flex gap-3 border-t p-4">
                  <input
                    aria-label="Nội dung tin nhắn"
                    maxLength={4000}
                    disabled={sending}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm
                      outline-none focus:border-blue-500"
                  />
                  <button
                    disabled={sending || !text.trim() || !active}
                    className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {sending ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </form>
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

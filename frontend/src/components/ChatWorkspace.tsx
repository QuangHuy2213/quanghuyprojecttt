'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from './Header';
import UserAvatar from './UserAvatar';
import TransactionPrompt from './TransactionPrompt';
import { useInbox } from './InboxProvider';
import { useTransactions } from './TransactionProvider';
import { mergeRows } from '@/services/transaction-state';
import { apiFetch } from '@/services/api';
import { startPolling } from '@/services/polling';
import { watchConversation, mergeMessages, type Message } from '@/services/chat-realtime';
import { formatMessageTime } from '@/services/timestamps';

type Thread = {
  peer: { id: string; fullName: string; avatarUrl?: string };
  post: { id: number; title: string } | null;
  lastMessage?: Message;
  unread?: number;
};
const keyOf = (thread: Thread) => `${thread.peer.id}:${thread.post?.id || ''}`;
async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  const body = await response.text();
  let data;
  try {
    data = body.trim() ? JSON.parse(body) : null;
  } catch {
    throw new Error(`Máy chủ trả dữ liệu không hợp lệ (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(data?.message || `Không thể tải dữ liệu (HTTP ${response.status}).`);
  }
  // Nest returns an empty body for a nullable transaction when no agreement exists.
  if (data === null && !path.startsWith('transactions/check?')) {
    throw new Error('Máy chủ trả phản hồi trống. Vui lòng thử lại.');
  }
  return data;
}

export default function ChatWorkspace() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ postId?: string }>();
  const { user, token, setUnreadMessages, refreshMessages } = useInbox();
  const receiverId = search.get('receiverId') || search.get('sellerId') || '';
  const rawPostId = params.postId || search.get('postId') || '';
  const postId = rawPostId ? Number(rawPostId) : undefined;
  const conversationKey = `${receiverId}:${rawPostId}`;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { transactions, setTransactions } = useTransactions();
  const transaction = transactions.filter(row => row.postId === (postId ?? null) &&
    ((row.buyerId === user?.id && row.sellerId === receiverId) || (row.sellerId === user?.id && row.buyerId === receiverId)))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [older, setOlder] = useState(true);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const draft = useRef<{ key: string; text: string; id: string } | null>(null);
  const sessionKey = `${user?.id || ''}:${token || ''}:${conversationKey}`;
  const activeKey = useRef(sessionKey);
  activeKey.current = sessionKey;
  const olderRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    activeKey.current = sessionKey;
    return () => {
      olderRequest.current?.abort();
      activeKey.current = '';
    };
  }, [sessionKey]);

  const deleteConversation = async () => {
    if (!active || sending || deleting) return;
    if (
      !window.confirm(
        'Xóa tin nhắn của cuộc trò chuyện này cho cả hai bên? Không thể hoàn tác.',
      )
    )
      return;
    setDeleting(true);
    try {
      const query = new URLSearchParams({ receiverId });
      if (postId) query.set('postId', String(postId));
      await jsonRequest(`chat/conversation?${query}`, { method: 'DELETE' });
      setThreads((current) => current.filter((item) => keyOf(item) !== conversationKey));
      setMessages([]);
      refreshMessages();
      window.dispatchEvent(new Event('messages-updated'));
      router.push('/chat');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể xóa hội thoại.');
    } finally {
      setDeleting(false);
    }
  };

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
    setError('');
    setOlder(true);
    setLoading(false);
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
    const stopMessages = watchConversation({
      userId: user.id,
      receiverId,
      postId,
      load: (signal, before) => {
        const historyQuery = new URLSearchParams(query);
        if (before !== undefined) historyQuery.set('before', String(before));
        return jsonRequest<Message[]>(`chat/messages?${historyQuery}`, { signal });
      },
      onMessages: (data) => setMessages((current) => mergeMessages([...current, ...data])),
      onError: (error) => setError(error instanceof Error ? error.message : 'Không thể đồng bộ hội thoại.'),
    });
    return () => {
      controller.abort();
      stopMessages();
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
    const key = sessionKey;
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
    if (!messages.length || loading) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    setLoading(true);
    const key = sessionKey;
    try {
      const query = new URLSearchParams({
        receiverId,
        before: String(messages[0].id),
        ...(postId ? { postId: String(postId) } : {}),
      });
      const data = await jsonRequest<Message[]>(`chat/messages?${query}`, { signal: controller.signal });
      if (activeKey.current !== key) return;
      setOlder(data.length === 50);
      setMessages((current) => mergeMessages([...data, ...current]));
    } catch (error) {
      if (!controller.signal.aborted && activeKey.current === key)
        setError(error instanceof Error ? error.message : 'Không thể tải tin cũ.');
    } finally {
      if (activeKey.current === key) setLoading(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');

  const filteredThreads = threads.filter((thread) => {
    if (!normalizedSearch) return true;

    const fullName = thread.peer.fullName?.toLocaleLowerCase('vi-VN') || '';
    const postTitle = thread.post?.title?.toLocaleLowerCase('vi-VN') || '';
    const lastMessage = thread.lastMessage?.text?.toLocaleLowerCase('vi-VN') || '';

    return (
      fullName.includes(normalizedSearch) ||
      postTitle.includes(normalizedSearch) ||
      lastMessage.includes(normalizedSearch)
    );
  });

  return (
    <div className="flex h-dvh flex-col bg-[#f3f6fb] text-slate-900">
      <Header />

      {!user ? (
        <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
          </div>

          <section className="relative w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h8M8 14h5m7-2a8 8 0 1 1-3.1-6.33A8 8 0 0 1 20 12Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="m7 19-2.5 2 .7-3.2" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-950">
              Tin nhắn Nhà Tốt
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Đăng nhập để trao đổi với người mua, người bán và theo dõi hội thoại theo từng bài đăng.
            </p>

            <Link
              href="/login"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
            >
              Đăng nhập để tiếp tục
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </section>
        </main>
      ) : (
        <main className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 overflow-hidden bg-white shadow-[0_20px_70px_-45px_rgba(15,23,42,0.45)] md:my-4 md:rounded-[28px] md:border md:border-slate-200/80">
          <aside
            className={`${
              receiverId ? 'hidden md:flex' : 'flex'
            } w-full flex-col bg-white md:w-[360px] md:shrink-0 md:border-r md:border-slate-200/80`}
          >
            <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Trung tâm hội thoại
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                    Tin nhắn
                  </h1>
                </div>

                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-blue-50 px-3 text-sm font-extrabold text-blue-700">
                  {threads.length}
                </div>
              </div>

              <div className="relative mt-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35"
                  />
                  <circle cx="11" cy="11" r="7" />
                </svg>

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm người dùng, bài đăng..."
                  aria-label="Tìm kiếm cuộc trò chuyện"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Xóa nội dung tìm kiếm"
                    title="Xóa tìm kiếm"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-medium text-slate-400">
                <span>Tìm theo tên, bài đăng hoặc tin nhắn gần nhất</span>
                {searchTerm && (
                  <span className="shrink-0 pl-3 text-blue-600">
                    {filteredThreads.length}/{threads.length}
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {!threads.length && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 8h10M7 12h7m6 0a8 8 0 1 1-3.1-6.33A8 8 0 0 1 20 12Z"
                      />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-700">Chưa có cuộc trò chuyện</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Khi bạn liên hệ về một bài đăng, hội thoại sẽ xuất hiện tại đây.
                  </p>
                </div>
              )}

              {threads.length > 0 && filteredThreads.length === 0 && (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-4.35-4.35"
                      />
                      <circle cx="11" cy="11" r="7" />
                    </svg>
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    Không tìm thấy cuộc trò chuyện
                  </p>
                  <p className="mt-1 max-w-[240px] text-xs leading-5 text-slate-500">
                    Thử tìm bằng tên người dùng, tên bài đăng hoặc nội dung tin nhắn khác.
                  </p>

                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-200"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {filteredThreads.map((thread) => {
                  const selected = keyOf(thread) === conversationKey;

                  return (
                    <button
                      key={keyOf(thread)}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/chat?receiverId=${thread.peer.id}${
                            thread.post ? `&postId=${thread.post.id}` : ''
                          }`,
                        )
                      }
                      className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                        selected
                          ? 'border-blue-500/60 bg-blue-600/15 shadow-sm ring-1 ring-blue-500/10'
                          : 'border-transparent bg-transparent hover:border-slate-300/40 hover:bg-white/5'
                      }`}
                    >
                      {selected && (
                        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-blue-600" />
                      )}

                      <div className="shrink-0">
                        <UserAvatar user={thread.peer} className="h-11 w-11" />
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={`min-w-0 flex-1 truncate text-sm font-extrabold ${
                              selected ? 'text-blue-50' : 'text-slate-100'
                            }`}
                          >
                            {thread.peer.fullName}
                          </p>

                          {thread.lastMessage?.createdAt && (
                            <time
                              className={`shrink-0 text-[10px] font-medium ${
                                selected ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {formatMessageTime(thread.lastMessage.createdAt)}
                            </time>
                          )}
                        </div>

                        {thread.post && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            <p
                              className={`truncate text-xs font-semibold ${
                                selected ? 'text-blue-200' : 'text-blue-400'
                              }`}
                            >
                              {thread.post.title}
                            </p>
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center gap-2">
                          <p
                            className={`min-w-0 flex-1 truncate text-xs ${
                              selected
                                ? thread.unread
                                  ? 'font-semibold text-blue-100'
                                  : 'text-blue-200/90'
                                : thread.unread
                                  ? 'font-semibold text-slate-200'
                                  : 'text-slate-400'
                            }`}
                          >
                            {thread.lastMessage?.text || 'Bắt đầu cuộc trò chuyện'}
                          </p>

                          {!!thread.unread && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-blue-500/20">
                              {thread.unread > 99 ? '99+' : thread.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden border-t border-slate-100 px-5 py-4 md:block">
              <p className="text-xs leading-5 text-slate-400">
                Tin nhắn được đồng bộ tự động để bạn không bỏ lỡ trao đổi quan trọng.
              </p>
            </div>
          </aside>

          <section
            className={`${
              receiverId ? 'flex' : 'hidden md:flex'
            } min-w-0 flex-1 flex-col bg-[#f8fafc]`}
          >
            {!receiverId ? (
              <div className="relative m-auto flex max-w-md flex-col items-center px-8 py-12 text-center">
                <div className="absolute inset-0 -z-10 rounded-full bg-blue-100/50 blur-3xl" />
                <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-blue-600 shadow-lg shadow-slate-200/80 ring-1 ring-slate-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-10 w-10"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 9h8M8 13h5m7-1a8 8 0 1 1-3.1-6.33A8 8 0 0 1 20 12Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 19-3 1.5 1-3.4" />
                  </svg>
                </div>
                <h2 className="mt-6 text-xl font-extrabold text-slate-900">
                  Chọn một cuộc trò chuyện
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Chọn người dùng ở danh sách bên trái để xem nội dung trao đổi và thông tin bài đăng.
                </p>
              </div>
            ) : (
              <>
                <div className="flex min-h-[76px] items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-5">
                  <Link
                    href="/chat"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 md:hidden"
                    aria-label="Quay lại danh sách hội thoại"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                    </svg>
                  </Link>

                  <div className="shrink-0">
                    <UserAvatar user={active?.peer} className="h-11 w-11 sm:h-12 sm:w-12" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center">
                      <h2 className="truncate text-sm font-extrabold text-slate-950 sm:text-base">
                        {active?.peer.fullName || 'Cuộc trò chuyện'}
                      </h2>
                    </div>

                    {active?.post ? (
                      <Link
                        href={`/posts/${active.post.id}`}
                        className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v10H7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="m10 14 4-4M11 10h3v3" />
                        </svg>
                        <span className="truncate">{active.post.title}</span>
                      </Link>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400">Trao đổi trực tiếp</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={deleteConversation}
                    disabled={!active || sending || deleting}
                    title="Xóa cuộc trò chuyện"
                    aria-label="Xóa cuộc trò chuyện"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                  >
                    {deleting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">{deleting ? 'Đang xóa...' : 'Xóa chat'}</span>
                  </button>
                </div>

                {transaction && (
                  <div className="border-b border-slate-200/70 bg-transparent px-3 py-2 sm:px-5">
                    <TransactionPrompt
                      key={`${transaction.id}:${transaction.status}`}
                      transaction={transaction}
                      userId={user.id}
                      onUpdated={(row) =>
                        setTransactions((current) => mergeRows(current, [row]))
                      }
                    />
                  </div>
                )}

                <div className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.06),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.06),_transparent_28%)] px-3 py-5 sm:px-6">
                  <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
                    {older && messages.length >= 50 && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={loadOlder}
                        className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
                      >
                        {loading && (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                        )}
                        {loading ? 'Đang tải tin cũ...' : 'Xem tin nhắn cũ hơn'}
                      </button>
                    )}

                    {!messages.length && !error && (
                      <div className="m-auto flex max-w-sm flex-col items-center px-6 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-7 w-7"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 8h10M7 12h6m7 0a8 8 0 1 1-3.1-6.33A8 8 0 0 1 20 12Z"
                            />
                          </svg>
                        </div>
                        <p className="mt-4 text-sm font-extrabold text-slate-800">
                          Bắt đầu cuộc trò chuyện
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Gửi lời chào hoặc trao đổi thêm thông tin về bài đăng này.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {messages.map((message) => {
                        const mine = message.senderId === user.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex items-end gap-2.5 ${
                              mine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {!mine && (
                              <UserAvatar
                                user={active?.peer}
                                className="mb-1 h-8 w-8 shrink-0 shadow-sm"
                              />
                            )}

                            <div
                              className={`flex max-w-[82%] flex-col sm:max-w-[72%] ${
                                mine ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`whitespace-pre-wrap break-words px-4 py-3 text-sm leading-5 shadow-sm ${
                                  mine
                                    ? 'rounded-[20px] rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/10'
                                    : 'rounded-[20px] rounded-bl-md border border-slate-200/80 bg-white text-slate-800'
                                }`}
                              >
                                <p>{message.text}</p>
                              </div>

                              <div
                                className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] font-medium text-slate-400 ${
                                  mine ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <time>{formatMessageTime(message.createdAt)}</time>
                                {mine && (
                                  <span
                                    className={message.readAt ? 'text-blue-500' : 'text-slate-400'}
                                    title={message.readAt ? 'Đã xem' : 'Đã gửi'}
                                  >
                                    {message.readAt ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div ref={bottom} />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:px-6"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
                    </svg>
                    <span className="min-w-0 break-words">{error}</span>
                  </div>
                )}

                <form
                  onSubmit={send}
                  className="border-t border-slate-200/80 bg-white px-3 py-3 sm:px-5 sm:py-4"
                >
                  <div className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pl-4 shadow-sm transition-colors hover:border-slate-300 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 sm:gap-3 sm:pl-5">
                    <input
                      aria-label="Nội dung tin nhắn"
                      maxLength={4000}
                      disabled={sending}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Nhập tin nhắn..."
                      className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />

                    <div className="hidden shrink-0 text-[10px] font-medium tabular-nums text-slate-400 sm:block">
                      {text.length}/4000
                    </div>

                    <button
                      type="submit"
                      disabled={sending || !text.trim() || !active}
                      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:px-4"
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4 4 16 8-16 8 3-8-3-8Z" />
                          <path strokeLinecap="round" d="M7 12h8" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">{sending ? 'Đang gửi' : 'Gửi'}</span>
                    </button>
                  </div>

                  <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">
                    Tin nhắn được đồng bộ theo thời gian thực và gắn với bài đăng đang trao đổi.
                  </p>
                </form>
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

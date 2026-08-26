'use client';

import React, {
  useEffect,
  useRef,
  useState,
  Suspense,
} from 'react';

import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import Header from '@/components/Header';

import { supabase } from '@/services/supabase';
import { apiUrl } from '@/services/api';

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_AVATAR =
  'https://i.imgur.com/L1nYE9z.jpg';

// =====================================================
// TYPES
// =====================================================

interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  postId?: string | null;
}

interface Message {
  id: string | number;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
}

interface Toast {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

// =====================================================
// CHAT CONTENT
// =====================================================

function ChatContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // ===================================================
  // ROUTE DATA
  // ===================================================

  const routePostId = Array.isArray(
    params.postId
  )
    ? params.postId[0]
    : params.postId;

  const sellerId =
    searchParams.get('sellerId');

  const sellerName =
    searchParams.get('sellerName');

  const fromInbox =
    searchParams.get('fromInbox') ===
    'true';

  // Nếu mở từ inbox thì không dùng "inbox"
  // làm postId

  const postId = fromInbox
    ? null
    : routePostId ||
      searchParams.get('postId');

  // ===================================================
  // STATE
  // ===================================================

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [activeChat, setActiveChat] =
    useState<ChatItem | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [messageInput, setMessageInput] =
    useState('');

  const [showAuthModal, setShowAuthModal] =
    useState(false);

  const [transaction, setTransaction] =
    useState<any>(null);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [toast, setToast] =
    useState<Toast>({
      show: false,
      message: '',
      type: 'success',
    });

  // ===================================================
  // REFS
  // ===================================================

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const activeChatRef =
    useRef<ChatItem | null>(null);

  // ===================================================
  // ACTIVE CHAT REF
  // ===================================================

  useEffect(() => {
    activeChatRef.current =
      activeChat;
  }, [activeChat]);

  // ===================================================
  // SHOW TOAST
  // ===================================================

  const showToast = (
    message: string,
    type: 'success' | 'error'
  ) => {
    setToast({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: '',
        type: 'success',
      });
    }, 3500);
  };

  // ===================================================
  // 1. GET CURRENT USER
  // ===================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem('user');

    if (!storedUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      const user =
        JSON.parse(storedUser);

      setCurrentUser(user);
    } catch (error) {
      console.error(
        'Lỗi đọc thông tin người dùng:',
        error
      );

      localStorage.removeItem('user');

      setShowAuthModal(true);
    }
  }, []);

  // ===================================================
  // 2. CREATE OR OPEN CHAT
  // ===================================================

  useEffect(() => {
    if (
      !sellerId ||
      !sellerName ||
      !currentUser
    ) {
      return;
    }

    // Không cho phép chat với chính mình

    if (
      String(sellerId) ===
      String(currentUser.id)
    ) {
      showToast(
        'Bạn không thể tự chat với chính mình!',
        'error'
      );

      if (postId) {
        router.replace(
          `/posts/${postId}`
        );
      } else {
        router.replace('/chat');
      }

      return;
    }

    const chatTarget: ChatItem = {
      id: String(sellerId),

      name: sellerName,

      avatar: DEFAULT_AVATAR,

      lastMessage:
        'Bắt đầu cuộc trò chuyện...',

      time: new Date().toLocaleTimeString(
        'vi-VN',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      ),

      postId: postId
        ? String(postId)
        : null,
    };

    setActiveChat(chatTarget);
  }, [
    sellerId,
    sellerName,
    postId,
    currentUser,
    router,
  ]);

  // ===================================================
  // 3. LOAD MESSAGES
  // ===================================================

  useEffect(() => {
    if (
      !currentUser?.id ||
      !activeChat?.id
    ) {
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } =
          await supabase
            .from('messages')
            .select('*')
            .or(
              `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`
            )
            .order('created_at', {
              ascending: true,
            });

        if (error) {
          console.error(
            'Lỗi lấy tin nhắn:',
            error
          );

          return;
        }

        setMessages(
          (data || []) as Message[]
        );
      } catch (error) {
        console.error(
          'Lỗi tải tin nhắn:',
          error
        );
      }
    };

    loadMessages();
  }, [
    currentUser?.id,
    activeChat?.id,
  ]);

  // ===================================================
  // 4. CHECK TRANSACTION
  // ===================================================

  useEffect(() => {
    if (
      !currentUser?.id ||
      !activeChat?.id
    ) {
      return;
    }

    const checkTransaction =
      async () => {
        try {
          const token =
            localStorage.getItem(
              'access_token'
            );

          const res = await fetch(
            apiUrl(
              `transactions/check?user1=${currentUser.id}&user2=${activeChat.id}&postId=${postId || activeChat.postId || ''}`
            ),
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

          if (res.ok) {
            const data =
              await res.json();

            setTransaction(
              data || null
            );
          }
        } catch (error) {
          console.log(
            'Không thể kiểm tra giao dịch:',
            error
          );
        }
      };

    checkTransaction();
  }, [
    currentUser?.id,
    activeChat?.id,
  ]);

  // ===================================================
  // 5. SUPABASE REALTIME
  // ===================================================

  useEffect(() => {
    if (
      !currentUser?.id ||
      !activeChat?.id
    ) {
      return;
    }

    const channel = supabase
      .channel(
        `messages_${currentUser.id}_${activeChat.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage =
            payload.new as Message;

          const isCurrentConversation =
            (
              String(
                newMessage.sender_id
              ) ===
                String(currentUser.id) &&
              String(
                newMessage.receiver_id
              ) ===
                String(activeChat.id)
            ) ||
            (
              String(
                newMessage.sender_id
              ) ===
                String(activeChat.id) &&
              String(
                newMessage.receiver_id
              ) ===
                String(currentUser.id)
            );

          if (!isCurrentConversation) {
            return;
          }

          setMessages((prev) => {
            const exists =
              prev.some(
                (message) =>
                  String(message.id) ===
                  String(newMessage.id)
              );

            if (exists) {
              return prev;
            }

            return [
              ...prev,
              newMessage,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUser?.id,
    activeChat?.id,
  ]);

  // ===================================================
  // 6. AUTO SCROLL
  // ===================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  // ===================================================
  // 7. SEND MESSAGE
  // ===================================================

  const handleSendMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !messageInput.trim() ||
      !currentUser ||
      !activeChat
    ) {
      return;
    }

    const textToSend =
      messageInput.trim();

    setMessageInput('');

    try {
      // ===============================================
      // SAVE TO SUPABASE
      // ===============================================

      const { error } =
        await supabase
          .from('messages')
          .insert([
            {
              sender_id:
                String(currentUser.id),

              receiver_id:
                String(activeChat.id),

              text: textToSend,
            },
          ]);

      if (error) {
        console.error(
          'Lỗi gửi tin nhắn:',
          error
        );

        showToast(
          'Không thể gửi tin nhắn!',
          'error'
        );

        setMessageInput(
          textToSend
        );

        return;
      }

      // ===============================================
      // SEND TO BACKEND FOR AI CHECK
      // ===============================================

      try {
        const token =
          localStorage.getItem(
            'access_token'
          );

        const aiResponse = await fetch(
          apiUrl('chat/send'),
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              postId: activeChat.postId,

              receiverId:
                activeChat.id,

              content: textToSend,
            }),
          }
        );
        if (aiResponse.ok) {
          const checkResponse = await fetch(
            apiUrl(`transactions/check?user1=${currentUser.id}&user2=${activeChat.id}&postId=${activeChat.postId || postId || ''}`),
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (checkResponse.ok) setTransaction(await checkResponse.json());
        }
      } catch (error) {
        console.log(
          'Không thể gọi API AI:',
          error
        );
      }
    } catch (error) {
      console.error(
        'Lỗi gửi tin nhắn:',
        error
      );

      showToast(
        'Không thể gửi tin nhắn.',
        'error'
      );

      setMessageInput(
        textToSend
      );
    }
  };

  // ===================================================
  // 8. VERIFY TRANSACTION
  // ===================================================

  const handleVerifyTransaction =
    async (
      isConfirmed: boolean
    ) => {
      if (!transaction) {
        return;
      }

      setIsVerifying(true);

      try {
        const token =
          localStorage.getItem(
            'access_token'
          );

        const res = await fetch(
          apiUrl(
            `transactions/${transaction.id}/verify`
          ),
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              isConfirmed,
            }),
          }
        );

        if (res.ok) {
          const data =
            await res.json();

          showToast(
            data.message ||
              'Đã xác nhận thành công!',
            'success'
          );

          setTransaction(null);
        } else {
          showToast(
            'Có lỗi xảy ra khi xác nhận.',
            'error'
          );
        }
      } catch (error) {
        showToast(
          'Không thể kết nối máy chủ.',
          'error'
        );
      } finally {
        setIsVerifying(false);
      }
    };

  // ===================================================
  // 9. DELETE CHAT
  // ===================================================

  const handleDeleteChat =
    async () => {
      if (
        !currentUser ||
        !activeChat
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          'Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này?'
        );

      if (!confirmed) {
        return;
      }

      try {
        const { error } =
          await supabase
            .from('messages')
            .delete()
            .or(
              `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`
            );

        if (error) {
          showToast(
            'Không thể xóa cuộc trò chuyện.',
            'error'
          );

          return;
        }

        setMessages([]);

        showToast(
          'Đã xóa cuộc trò chuyện.',
          'success'
        );

        setTimeout(() => {
          router.push('/chat');
        }, 500);
      } catch (error) {
        console.error(
          'Lỗi xóa cuộc trò chuyện:',
          error
        );

        showToast(
          'Có lỗi xảy ra khi xóa.',
          'error'
        );
      }
    };

  // ===================================================
  // FORMAT TIME
  // ===================================================

  const formatMsgTime = (
    timestamp: string
  ) => {
    if (!timestamp) {
      return '';
    }

    return new Date(
      timestamp
    ).toLocaleTimeString(
      'vi-VN',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeUp {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }

              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            .animate-fade-up {
              animation:
                fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)
                forwards;
            }
          `,
        }}
      />

      {/* ============================================= */}
      {/* AUTH MODAL */}
      {/* ============================================= */}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-fade-up">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">
                🔒
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">
              Yêu cầu đăng nhập
            </h3>

            <p className="text-gray-500 text-sm mb-8">
              Bạn cần đăng nhập để xem
              và gửi tin nhắn.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  router.push('/login')
                }
                className="w-full py-3.5 bg-[#1877F2] text-white font-bold rounded-2xl"
              >
                Đăng nhập ngay
              </button>

              <button
                onClick={() =>
                  router.push('/')
                }
                className="w-full py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl"
              >
                Quay lại trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* TOAST */}
      {/* ============================================= */}

      <div
        className={`fixed top-24 left-1/2 z-[200] -translate-x-1/2 transition-all duration-300 ${
          toast.show
            ? 'translate-y-0 opacity-100'
            : '-translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`px-6 py-3 rounded-full text-white font-semibold shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-[#1877F2]'
          }`}
        >
          {toast.type === 'error'
            ? '⚠️ '
            : '✨ '}

          {toast.message}
        </div>
      </div>

      {/* ============================================= */}
      {/* CHAT PAGE */}
      {/* ============================================= */}

      <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 overflow-hidden h-screen">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
            <div className="text-center">
              <div className="text-6xl mb-4">
                💬
              </div>

              <h2 className="text-2xl font-bold text-gray-800">
                Đang tải cuộc trò chuyện...
              </h2>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#f8f9fa]">

            {/* CHAT HEADER */}

            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeChat.avatar}
                  alt={activeChat.name}
                  className="w-11 h-11 rounded-full object-cover"
                />

                <div>
                  <h3 className="font-bold text-gray-800">
                    {activeChat.name}
                  </h3>

                  <span className="text-xs text-green-500">
                    Đang hoạt động
                  </span>
                </div>
              </div>

              <button
                onClick={handleDeleteChat}
                className="text-red-500 hover:text-red-700 font-bold px-3 py-2"
              >
                Xóa cuộc trò chuyện
              </button>
            </div>

            {/* TRANSACTION VERIFY */}

            {transaction?.status ===
              'VERIFYING' && (
              <div className="bg-amber-50 border-b border-amber-200 p-5 text-center">
                <div className="text-2xl">
                  ⚠️
                </div>

                <h4 className="font-black text-amber-900">
                  Hệ thống phát hiện dấu hiệu chốt giao dịch!
                </h4>

                <p className="text-xs text-amber-700 mt-2">
                  Vui lòng xác nhận giao dịch này
                  đã thành công hay chưa.
                </p>

                <div className="mt-4 flex justify-center gap-3">
                  <button
                    disabled={isVerifying}
                    onClick={() =>
                      handleVerifyTransaction(
                        true
                      )
                    }
                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold"
                  >
                    CÓ
                  </button>

                  <button
                    disabled={isVerifying}
                    onClick={() =>
                      handleVerifyTransaction(
                        false
                      )
                    }
                    className="bg-rose-600 text-white px-5 py-2 rounded-xl font-bold"
                  >
                    KHÔNG
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGES */}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-10">
                  Hãy gửi lời chào đến{' '}
                  {activeChat.name}!
                </div>
              ) : (
                messages.map((message) => {
                  const isMine =
                    String(
                      message.sender_id
                    ) ===
                    String(
                      currentUser?.id
                    );

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isMine
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div className="max-w-[70%] flex flex-col gap-1">
                        <div
                          className={`px-5 py-3 text-[15px] font-medium shadow-sm ${
                            isMine
                              ? 'bg-[#1877F2] text-white rounded-[1.2rem] rounded-tr-sm'
                              : 'bg-white text-gray-800 border rounded-[1.2rem] rounded-tl-sm'
                          }`}
                        >
                          {message.text}
                        </div>

                        <span
                          className={`text-[10px] text-gray-400 ${
                            isMine
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          {formatMsgTime(
                            message.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              <div
                ref={messagesEndRef}
              />
            </div>

            {/* MESSAGE INPUT */}

            <div className="bg-white p-4 border-t border-gray-200">
              <form
                onSubmit={
                  handleSendMessage
                }
                className="flex items-center gap-3 max-w-4xl mx-auto"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) =>
                    setMessageInput(
                      e.target.value
                    )
                  }
                  placeholder={`Nhắn tin cho ${activeChat.name}...`}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />

                <button
                  type="submit"
                  disabled={
                    !messageInput.trim()
                  }
                  className={`p-3.5 rounded-full ${
                    messageInput.trim()
                      ? 'bg-[#1877F2] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// =====================================================
// PAGE
// =====================================================

export default function ChatPage() {
  return (
    <div className="min-h-screen h-screen overflow-hidden flex flex-col bg-[#f4f7f6]">
      <Header />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-white text-[#1877F2] font-bold">
            Đang tải tin nhắn...
          </div>
        }
      >
        <ChatContent />
      </Suspense>
    </div>
  );
}

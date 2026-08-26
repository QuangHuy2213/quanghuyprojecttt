'use client';

import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
} from 'react';

import Header from '@/components/Header';

import {
  useRouter,
  useSearchParams,
  useParams,
} from 'next/navigation';

import { supabase } from '@/services/supabase';
import { apiUrl } from '@/services/api';

const DEFAULT_AVATAR =
  'https://i.imgur.com/L1nYE9z.jpg';

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

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  // =====================================================
  // LẤY POST ID TỪ ROUTE: /chat/[postId]
  // =====================================================

  const routePostId = Array.isArray(params.postId)
    ? params.postId[0]
    : params.postId;

  // =====================================================
  // LẤY THÔNG TIN NGƯỜI BÁN TỪ QUERY STRING
  // =====================================================

  const sellerId = searchParams.get('sellerId');
  const sellerName = searchParams.get('sellerName');

  // Ưu tiên postId từ route
  const postId =
    routePostId ||
    searchParams.get('postId');

  // =====================================================
  // STATE
  // =====================================================

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [activeChat, setActiveChat] =
    useState<ChatItem | null>(null);

  const [messageInput, setMessageInput] =
    useState('');

  const [chatList, setChatList] =
    useState<ChatItem[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [showAuthModal, setShowAuthModal] =
    useState(false);

  const [transaction, setTransaction] =
    useState<any>(null);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const activeChatRef =
    useRef<ChatItem | null>(null);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // =====================================================
  // REF ACTIVE CHAT
  // =====================================================

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // =====================================================
  // TOAST
  // =====================================================

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

  // =====================================================
  // 1. KIỂM TRA ĐĂNG NHẬP
  // =====================================================

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

      const savedChatList = JSON.parse(
        localStorage.getItem(
          `chat_list_${user.id}`
        ) || '[]'
      );

      const uniqueChats =
        Array.from(
          new Map(
            savedChatList.map(
              (item: ChatItem) => [
                `${item.id}_${item.postId || ''}`,
                item,
              ]
            )
          ).values()
        ) as ChatItem[];

      setChatList(uniqueChats);

      localStorage.setItem(
        `chat_list_${user.id}`,
        JSON.stringify(uniqueChats)
      );
    } catch (error) {
      console.error(
        'Lỗi đọc thông tin người dùng:',
        error
      );

      localStorage.removeItem('user');

      setShowAuthModal(true);
    }
  }, []);

  // =====================================================
  // 2. TẠO HOẶC MỞ CUỘC TRÒ CHUYỆN
  // URL:
  // /chat/614?sellerId=xxx&sellerName=xxx
  // =====================================================

  useEffect(() => {
    if (
      !sellerId ||
      !sellerName ||
      !currentUser ||
      !postId
    ) {
      return;
    }

    // Không cho chat với chính mình
    if (
      String(sellerId) ===
      String(currentUser.id)
    ) {
      showToast(
        'Bạn không thể tự chat trong bài đăng của chính mình!',
        'error'
      );

      // QUAN TRỌNG:
      // Không redirect về /chat vì route đó không tồn tại
      router.replace(`/posts/${postId}`);

      return;
    }

    setChatList((prevList) => {
      // Tìm đúng người bán + bài đăng
      const existingChat =
        prevList.find(
          (chat) =>
            String(chat.id) ===
              String(sellerId) &&
            String(chat.postId) ===
              String(postId)
        );

      if (existingChat) {
        setActiveChat(existingChat);
        return prevList;
      }

      const newChatTarget: ChatItem = {
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
        postId: String(postId),
      };

      const updatedList = [
        newChatTarget,
        ...prevList,
      ];

      const cleanList =
        Array.from(
          new Map(
            updatedList.map((item) => [
              `${item.id}_${item.postId || ''}`,
              item,
            ])
          ).values()
        ) as ChatItem[];

      localStorage.setItem(
        `chat_list_${currentUser.id}`,
        JSON.stringify(cleanList)
      );

      setActiveChat(newChatTarget);

      return cleanList;
    });
  }, [
    sellerId,
    sellerName,
    postId,
    currentUser,
    router,
  ]);

  // =====================================================
  // 3. LẤY LỊCH SỬ TIN NHẮN
  // =====================================================

  useEffect(() => {
    if (!currentUser || !activeChat) {
      return;
    }

    const fetchMessagesAndTransaction =
      async () => {
        try {
          // LẤY TIN NHẮN
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
          } else if (data) {
            setMessages(data);
          }

          // KIỂM TRA GIAO DỊCH ĐỒNG KIỂM
          try {
            const token =
              localStorage.getItem(
                'access_token'
              );

            const res = await fetch(
              apiUrl(
                `transactions/check?user1=${currentUser.id}&user2=${activeChat.id}`
              ),
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

            if (res.ok) {
              const txData =
                await res.json();

              setTransaction(
                txData || null
              );
            }
          } catch (err) {
            console.log(
              'Không thể kiểm tra giao dịch:',
              err
            );
          }
        } catch (error) {
          console.error(
            'Lỗi tải dữ liệu chat:',
            error
          );
        }
      };

    fetchMessagesAndTransaction();
  }, [activeChat, currentUser]);

  // =====================================================
  // 4. REALTIME SUPABASE
  // =====================================================

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const channel = supabase
      .channel(
        `global_messages_${currentUser.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg =
            payload.new as Message;

          if (
            String(newMsg.receiver_id) !==
              String(currentUser.id) &&
            String(newMsg.sender_id) !==
              String(currentUser.id)
          ) {
            return;
          }

          const currentActiveChat =
            activeChatRef.current;

          // Nếu tin nhắn thuộc chat đang mở
          if (
            currentActiveChat &&
            (
              (
                String(newMsg.sender_id) ===
                  String(currentActiveChat.id) &&
                String(newMsg.receiver_id) ===
                  String(currentUser.id)
              ) ||
              (
                String(newMsg.sender_id) ===
                  String(currentUser.id) &&
                String(newMsg.receiver_id) ===
                  String(currentActiveChat.id)
              )
            )
          ) {
            setMessages((prev) => {
              const exists =
                prev.some(
                  (message) =>
                    String(message.id) ===
                    String(newMsg.id)
                );

              if (exists) {
                return prev;
              }

              return [
                ...prev,
                newMsg,
              ];
            });
          }

          // Xác định người còn lại
          const otherPersonId =
            String(newMsg.sender_id) ===
            String(currentUser.id)
              ? String(newMsg.receiver_id)
              : String(newMsg.sender_id);

          const timeNow =
            new Date(
              newMsg.created_at
            ).toLocaleTimeString(
              'vi-VN',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            );

          const isMine =
            String(newMsg.sender_id) ===
            String(currentUser.id);

          const msgSnippet = isMine
            ? `Bạn: ${newMsg.text}`
            : newMsg.text;

          let realName =
            `Người dùng ${otherPersonId.substring(
              0,
              4
            )}`;

          let realAvatar =
            DEFAULT_AVATAR;

          try {
            const { data: userData } =
              await supabase
                .from('User')
                .select('*')
                .eq(
                  'id',
                  otherPersonId
                )
                .single();

            if (userData) {
              realName =
                userData.fullName ||
                userData.name ||
                realName;

              realAvatar =
                userData.avatarUrl ||
                realAvatar;
            }
          } catch (error) {
            console.log(
              'Không lấy được thông tin người dùng'
            );
          }

          setChatList((prevList) => {
            const existingIndex =
              prevList.findIndex(
                (chat) =>
                  String(chat.id) ===
                  otherPersonId
              );

            let updatedList = [
              ...prevList,
            ];

            if (
              existingIndex !== -1
            ) {
              const existingChat =
                updatedList[
                  existingIndex
                ];

              updatedList[
                existingIndex
              ] = {
                ...existingChat,
                name:
                  existingChat.name.startsWith(
                    'Người dùng'
                  )
                    ? realName
                    : existingChat.name,
                avatar: realAvatar,
                lastMessage:
                  msgSnippet,
                time: timeNow,
              };

              const [item] =
                updatedList.splice(
                  existingIndex,
                  1
                );

              updatedList.unshift(
                item
              );
            } else {
              updatedList.unshift({
                id: otherPersonId,
                name: realName,
                avatar: realAvatar,
                lastMessage:
                  msgSnippet,
                time: timeNow,
                postId: null,
              });
            }

            localStorage.setItem(
              `chat_list_${currentUser.id}`,
              JSON.stringify(
                updatedList
              )
            );

            return updatedList;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [currentUser]);

  // =====================================================
  // 5. TỰ ĐỘNG CUỘN XUỐNG
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  // =====================================================
  // 6. GỬI TIN NHẮN
  // =====================================================

  const handleSendMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !messageInput.trim() ||
      !activeChat ||
      !currentUser
    ) {
      return;
    }

    const textToSend =
      messageInput.trim();

    setMessageInput('');

    try {
      // LƯU SUPABASE
      const { error } =
        await supabase
          .from('messages')
          .insert([
            {
              sender_id:
                String(
                  currentUser.id
                ),
              receiver_id:
                String(
                  activeChat.id
                ),
              text: textToSend,
            },
          ]);

      if (error) {
        console.error(
          'Lỗi gửi tin:',
          error
        );

        showToast(
          'Gửi lỗi! Hãy kiểm tra lại kết nối.',
          'error'
        );

        setMessageInput(
          textToSend
        );

        return;
      }

      // CẬP NHẬT DANH SÁCH CHAT
      const currentTime =
        new Date().toLocaleTimeString(
          'vi-VN',
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        );

      setChatList((prev) => {
        const updated = prev.map(
          (chat) => {
            if (
              String(chat.id) ===
              String(activeChat.id)
            ) {
              return {
                ...chat,
                lastMessage:
                  `Bạn: ${textToSend}`,
                time: currentTime,
              };
            }

            return chat;
          }
        );

        const selected =
          updated.find(
            (chat) =>
              String(chat.id) ===
              String(activeChat.id)
          );

        const others =
          updated.filter(
            (chat) =>
              String(chat.id) !==
              String(activeChat.id)
          );

        const finalList = selected
          ? [
              selected,
              ...others,
            ]
          : updated;

        localStorage.setItem(
          `chat_list_${currentUser.id}`,
          JSON.stringify(
            finalList
          )
        );

        return finalList;
      });

      // GỬI SANG BACKEND ĐỂ AI QUÉT TỪ KHÓA
      try {
        const token =
          localStorage.getItem(
            'access_token'
          );

        await fetch(
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
              postId:
                activeChat.postId ||
                postId,
              receiverId:
                activeChat.id,
              content:
                textToSend,
            }),
          }
        );
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

  // =====================================================
  // 7. XÁC NHẬN GIAO DỊCH
  // =====================================================

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
              'Đã gửi xác nhận thành công!',
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
          'Không thể kết nối đến máy chủ.',
          'error'
        );
      } finally {
        setIsVerifying(false);
      }
    };

  // =====================================================
  // 8. XÓA CUỘC TRÒ CHUYỆN
  // =====================================================

  const handleDeleteChat =
    async () => {
      if (
        !activeChat ||
        !currentUser
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

      const { error } =
        await supabase
          .from('messages')
          .delete()
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`
          );

      if (error) {
        showToast(
          'Lỗi khi xóa cuộc trò chuyện',
          'error'
        );

        return;
      }

      const newList =
        chatList.filter(
          (chat) =>
            !(
              String(chat.id) ===
                String(activeChat.id) &&
              String(chat.postId || '') ===
                String(
                  activeChat.postId || ''
                )
            )
        );

      setChatList(newList);

      localStorage.setItem(
        `chat_list_${currentUser.id}`,
        JSON.stringify(newList)
      );

      setActiveChat(null);
      setMessages([]);

      showToast(
        'Đã xóa cuộc trò chuyện',
        'success'
      );
    };

  // =====================================================
  // FORMAT THỜI GIAN
  // =====================================================

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

  // =====================================================
  // UI
  // =====================================================

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

      {/* MODAL ĐĂNG NHẬP */}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-fade-up border border-white/50">

            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <span className="text-4xl">
                🔒
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">
              Yêu cầu đăng nhập
            </h3>

            <p className="text-gray-500 text-sm font-medium mb-8">
              Bạn cần đăng nhập vào tài khoản
              Nhà Tốt để xem tin nhắn và
              trò chuyện với người bán.
            </p>

            <div className="flex flex-col gap-3">

              <button
                onClick={() =>
                  router.push('/login')
                }
                className="w-full py-3.5 bg-gradient-to-r from-[#1877F2] to-blue-600 text-white font-bold rounded-2xl"
              >
                Đăng nhập ngay
              </button>

              <button
                onClick={() =>
                  router.push('/')
                }
                className="w-full py-3.5 bg-gray-50 text-gray-500 font-bold rounded-2xl"
              >
                Quay lại trang chủ
              </button>

            </div>

          </div>
        </div>
      )}

      {/* TOAST */}

      <div
        className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
          toast.show
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg text-white font-semibold text-sm ${
            toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-[#1877F2]'
          }`}
        >
          <span>
            {toast.type === 'error'
              ? '⚠️'
              : '✨'}
          </span>

          {toast.message}
        </div>
      </div>

      <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 overflow-hidden h-screen">

        {/* DANH SÁCH CHAT */}

        <div className="w-[340px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">

          <div className="p-4 border-b border-gray-100">

            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
              Chat
            </h2>

            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />

          </div>

          <div className="flex-1 overflow-y-auto p-2">

            {chatList.length === 0 ? (

              <div className="text-center p-6 text-gray-400 text-sm mt-10">
                Chưa có cuộc trò chuyện nào.
                <br />
                Hãy tìm bất động sản và liên hệ!
              </div>

            ) : (

              chatList.map((chat) => (

                <div
                  key={`${chat.id}_${chat.postId || ''}`}
                  onClick={() =>
                    setActiveChat(chat)
                  }
                  className={`flex items-center gap-3 p-3 mb-1 rounded-2xl cursor-pointer transition-all ${
                    activeChat?.id === chat.id &&
                    activeChat?.postId ===
                      chat.postId
                      ? 'bg-blue-50/80 border border-blue-100'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >

                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between items-center">

                      <h4 className="font-bold text-gray-800 text-sm truncate">
                        {chat.name}
                      </h4>

                      <span className="text-[10px] text-gray-400">
                        {chat.time}
                      </span>

                    </div>

                    <p className="text-xs text-gray-500 truncate">
                      {chat.lastMessage}
                    </p>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

        {/* KHUNG CHAT */}

        <div className="flex-1 flex flex-col bg-[#f8f9fa] relative">

          {!activeChat ? (

            <div className="flex-1 flex items-center justify-center p-6">

              <div className="text-center">

                <div className="text-6xl mb-5">
                  💬
                </div>

                <h2 className="text-2xl font-extrabold text-gray-800">
                  Quản lý hộp thư
                </h2>

                <p className="text-gray-500 text-sm mt-3">
                  Chọn một cuộc trò chuyện để bắt đầu.
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* HEADER CHAT */}

              <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-10 h-10 rounded-full"
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
                  onClick={
                    handleDeleteChat
                  }
                  className="text-red-500 hover:text-red-700 font-bold px-3 py-2 rounded-lg"
                >
                  Xóa cuộc trò chuyện
                </button>

              </div>

              {/* POPUP ĐỒNG KIỂM */}

              {transaction &&
                transaction.status ===
                  'VERIFYING' && (

                  <div className="bg-amber-50 border-b border-amber-200 p-5 flex flex-col items-center text-center">

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

                    <div className="mt-4 flex gap-3">

                      <button
                        disabled={
                          isVerifying
                        }
                        onClick={() =>
                          handleVerifyTransaction(
                            true
                          )
                        }
                        className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl"
                      >
                        CÓ
                      </button>

                      <button
                        disabled={
                          isVerifying
                        }
                        onClick={() =>
                          handleVerifyTransaction(
                            false
                          )
                        }
                        className="bg-rose-600 text-white font-bold px-5 py-2 rounded-xl"
                      >
                        KHÔNG
                      </button>

                    </div>

                  </div>

                )}

              {/* TIN NHẮN */}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {messages.length === 0 ? (

                  <div className="text-center text-gray-400 font-medium text-sm mt-10">
                    Hãy gửi lời chào đến{' '}
                    {activeChat.name}!
                  </div>

                ) : (

                  messages.map((msg) => {

                    const isMine =
                      String(
                        msg.sender_id
                      ) ===
                      String(
                        currentUser?.id
                      );

                    return (

                      <div
                        key={msg.id}
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
                                : 'bg-white text-gray-800 rounded-[1.2rem] rounded-tl-sm border'
                            }`}
                          >
                            {msg.text}
                          </div>

                          <span
                            className={`text-[10px] text-gray-400 ${
                              isMine
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {formatMsgTime(
                              msg.created_at
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

              {/* NHẬP TIN NHẮN */}

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

            </>

          )}

        </div>

      </main>
    </>
  );
}

// =====================================================
// COMPONENT CHÍNH
// =====================================================

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col h-screen overflow-hidden">

      <Header />

      <Suspense
        fallback={
          <div className="flex-grow flex items-center justify-center text-[#1877F2] font-bold bg-white text-lg">
            <span className="animate-pulse">
              Đang kết nối tin nhắn...
            </span>
          </div>
        }
      >
        <ChatContent />
      </Suspense>

    </div>
  );
}
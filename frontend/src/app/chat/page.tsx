'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/services/supabase';

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

const DEFAULT_AVATAR =
  'https://i.imgur.com/L1nYE9z.jpg';

export default function ChatListPage() {
  const router = useRouter();

  const [chatList, setChatList] =
    useState<ChatItem[]>([]);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  // =============================================
  // LẤY USER HIỆN TẠI
  // =============================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem('user');

    if (!storedUser) {
      router.push('/login');
      return;
    }

    try {
      const user =
        JSON.parse(storedUser);

      setCurrentUser(user);
    } catch (error) {
      console.error(
        'Không thể đọc thông tin user:',
        error
      );

      router.push('/login');
    }
  }, [router]);

  // =============================================
  // LẤY DANH SÁCH CHAT TỪ SUPABASE
  // =============================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const loadChats = async () => {
      setIsLoading(true);

      try {
        // Lấy tất cả tin nhắn có liên quan
        // đến user hiện tại

        const { data, error } =
          await supabase
            .from('messages')
            .select('*')
            .or(
              `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            );

        if (error) {
          console.error(
            'Lỗi lấy danh sách tin nhắn:',
            error
          );

          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setChatList([]);
          setIsLoading(false);
          return;
        }

        // =============================================
        // GOM CÁC MESSAGE THEO NGƯỜI CHAT
        // =============================================

        const uniqueUsers =
          new Map<string, Message>();

        data.forEach((message: Message) => {
          const otherUserId =
            String(message.sender_id) ===
            String(currentUser.id)
              ? String(message.receiver_id)
              : String(message.sender_id);

          // Chỉ lấy message mới nhất
          if (!uniqueUsers.has(otherUserId)) {
            uniqueUsers.set(
              otherUserId,
              message
            );
          }
        });

        // =============================================
        // LẤY THÔNG TIN USER
        // =============================================

        const chats: ChatItem[] = [];

        for (
          const [
            otherUserId,
            lastMessage,
          ] of uniqueUsers
        ) {
          let userName =
            `Người dùng ${otherUserId.slice(
              0,
              6
            )}`;

          let avatar =
            DEFAULT_AVATAR;

          try {
            const { data: userData } =
              await supabase
                .from('User')
                .select(
                  'id, fullName, name, avatarUrl'
                )
                .eq(
                  'id',
                  otherUserId
                )
                .single();

            if (userData) {
              userName =
                userData.fullName ||
                userData.name ||
                userName;

              avatar =
                userData.avatarUrl ||
                DEFAULT_AVATAR;
            }
          } catch (error) {
            console.log(
              'Không lấy được thông tin user:',
              otherUserId
            );
          }

          const isMine =
            String(
              lastMessage.sender_id
            ) ===
            String(currentUser.id);

          chats.push({
            id: otherUserId,

            name: userName,

            avatar,

            lastMessage: isMine
              ? `Bạn: ${lastMessage.text}`
              : lastMessage.text,

            time: new Date(
              lastMessage.created_at
            ).toLocaleTimeString(
              'vi-VN',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            ),

            postId: null,
          });
        }

        setChatList(chats);

        // Có thể cache localStorage
        // nhưng Supabase mới là dữ liệu chính

        localStorage.setItem(
          `chat_list_${currentUser.id}`,
          JSON.stringify(chats)
        );
      } catch (error) {
        console.error(
          'Lỗi tải danh sách chat:',
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();
  }, [currentUser]);

  // =============================================
  // UI
  // =============================================

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Liên hệ
        </h1>

        {isLoading ? (
          <div className="text-center py-16">
            Đang tải cuộc trò chuyện...
          </div>
        ) : chatList.length === 0 ? (

          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">

            <div className="text-5xl mb-4">
              💬
            </div>

            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Chưa có cuộc trò chuyện nào
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              Khi có người nhắn tin cho bạn,
              cuộc trò chuyện sẽ xuất hiện ở đây.
            </p>

            <button
              onClick={() =>
                router.push('/')
              }
              className="bg-[#1877F2] text-white px-6 py-3 rounded-xl font-semibold"
            >
              Về trang chủ
            </button>

          </div>

        ) : (

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

            {chatList.map(
              (chat) => (

                <button
                  key={chat.id}

                  onClick={() => {
                    router.push(
                      `/chat/inbox?sellerId=${encodeURIComponent(
                        chat.id
                      )}&sellerName=${encodeURIComponent(
                        chat.name
                      )}`
                    );
                  }}

                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
                >

                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between items-center">

                      <h3 className="font-bold text-gray-900 truncate">
                        {chat.name}
                      </h3>

                      <span className="text-xs text-gray-400">
                        {chat.time}
                      </span>

                    </div>

                    <p className="text-sm text-gray-500 truncate mt-1">
                      {chat.lastMessage}
                    </p>

                  </div>

                </button>

              )
            )}

          </div>

        )}

      </main>
    </div>
  );
}
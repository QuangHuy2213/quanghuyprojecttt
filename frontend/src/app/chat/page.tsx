'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function ChatListPage() {
  const router = useRouter();
  const [chatList, setChatList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      setCurrentUser(user);

      const savedChats = JSON.parse(
        localStorage.getItem(`chat_list_${user.id}`) || '[]'
      );

      setChatList(savedChats);
    } catch (error) {
      console.error('Lỗi lấy danh sách chat:', error);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Tin nhắn
        </h1>

        {chatList.length === 0 ? (

          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">

            <div className="text-5xl mb-4">
              💬
            </div>

            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Chưa có cuộc trò chuyện nào
            </h2>

            <p className="text-gray-500 text-sm mb-6">
              Hãy tìm bất động sản và liên hệ với người bán.
            </p>

            <button
              onClick={() => router.push('/')}
              className="bg-[#1877F2] text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition"
            >
              Tìm bất động sản
            </button>

          </div>

        ) : (

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

            {chatList.map((chat, index) => (

              <button
                key={`${chat.id}_${chat.postId || index}`}
                onClick={() => {
                  if (!chat.postId) {
                    return;
                  }

                  router.push(
                    `/chat/${chat.postId}?sellerId=${encodeURIComponent(
                      String(chat.id)
                    )}&sellerName=${encodeURIComponent(
                      chat.name
                    )}`
                  );
                }}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
              >

                <img
                  src={
                    chat.avatar ||
                    'https://i.imgur.com/L1nYE9z.jpg'
                  }
                  alt={chat.name}
                  className="w-12 h-12 rounded-full object-cover"
                />

                <div className="flex-1 min-w-0">

                  <div className="flex justify-between items-center gap-3">

                    <h3 className="font-bold text-gray-900 truncate">
                      {chat.name}
                    </h3>

                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {chat.time}
                    </span>

                  </div>

                  <p className="text-sm text-gray-500 truncate mt-1">
                    {chat.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                  </p>

                </div>

              </button>

            ))}

          </div>

        )}

      </main>
    </div>
  );
}
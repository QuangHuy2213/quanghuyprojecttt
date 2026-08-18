'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Header from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabase'; // Import file supabase bạn vừa tạo

const DEFAULT_AVATAR = 'https://i.imgur.com/L1nYE9z.jpg'; 

// =====================================================================
// 1. COMPONENT CON: XỬ LÝ LOGIC CHAT VỚI SUPABASE REALTIME
// =====================================================================
function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const sellerId = searchParams.get('sellerId');
  const sellerName = searchParams.get('sellerName');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const [chatList, setChatList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // [1] Kiểm tra đăng nhập và tải danh sách người đã chat
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Vui lòng đăng nhập để sử dụng tính năng chat!');
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    // Tạm thời lấy danh sách chat từ LocalStorage (Sau này bạn có thể nâng cấp lấy từ bảng conversations của Supabase)
    const savedChatList = JSON.parse(localStorage.getItem(`chat_list_${user.id}`) || '[]');
    setChatList(savedChatList);
  }, [router]);

  // [2] Khởi tạo cuộc hội thoại mới nếu đi từ trang Chi tiết qua
  useEffect(() => {
    if (sellerId && sellerName && currentUser) {
      if (sellerId === String(currentUser.id)) return;

      setChatList((prevList) => {
        const isExist = prevList.find(chat => chat.id === sellerId);
        if (isExist) {
          setActiveChat(isExist);
          return prevList;
        }

        const newChatTarget = {
          id: sellerId,
          name: sellerName,
          avatar: DEFAULT_AVATAR, 
          lastMessage: 'Bắt đầu cuộc trò chuyện...',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };

        const updatedList = [newChatTarget, ...prevList];
        localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(updatedList));
        setActiveChat(newChatTarget);
        return updatedList;
      });
    }
  }, [sellerId, sellerName, currentUser]);

  // [3] Lấy lịch sử tin nhắn & Bật tính năng lắng nghe REALTIME
  useEffect(() => {
    if (!currentUser || !activeChat) return;

    const fetchMessagesAndSubscribe = async () => {
      // 1. Tải lịch sử tin nhắn cũ giữa 2 người
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);

      // 2. Mở "Tai nghe" Realtime để bắt tin nhắn mới ngay lập tức
      const channel = supabase
        .channel(`chat_${currentUser.id}_${activeChat.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages' 
          }, 
          (payload) => {
            const newMsg = payload.new;
            // Nếu tin nhắn mới thuộc về đúng cuộc hội thoại này thì hiển thị lên màn hình
            if (
              (newMsg.sender_id === String(currentUser.id) && newMsg.receiver_id === String(activeChat.id)) ||
              (newMsg.sender_id === String(activeChat.id) && newMsg.receiver_id === String(currentUser.id))
            ) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel); // Tắt lắng nghe khi chuyển sang người khác
      };
    };

    fetchMessagesAndSubscribe();
  }, [activeChat, currentUser]);

  // [4] Tự động cuộn xuống dưới cùng khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // [5] Gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !currentUser) return;

    const textToSend = messageInput.trim();
    setMessageInput(''); // Xóa ô nhập liệu ngay lập tức cho mượt

    // Bắn tin nhắn lên Supabase
    await supabase.from('messages').insert([
      {
        sender_id: String(currentUser.id),
        receiver_id: String(activeChat.id),
        text: textToSend
      }
    ]);

    // Cập nhật lại tin nhắn cuối cùng ở Cột trái
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setChatList((prevList) => {
      const updatedList = prevList.map(chat => 
        chat.id === activeChat.id ? { ...chat, lastMessage: `Bạn: ${textToSend}`, time: timeNow } : chat
      );
      const sortedList = updatedList.sort((a, b) => a.id === activeChat.id ? -1 : 1);
      localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(sortedList));
      return sortedList;
    });
  };

  // Helper format giờ cho từng tin nhắn
  const formatMsgTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 overflow-hidden">
      
      {/* ============ CỘT TRÁI: DANH SÁCH CHAT ============ */}
      <div className="w-[340px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4">Chat</h2>
          <div className="relative flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input type="text" placeholder="Tìm kiếm..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chatList.length === 0 ? (
            <div className="text-center p-6 text-gray-400 text-sm mt-10">Chưa có cuộc trò chuyện nào.<br/>Hãy tìm bất động sản và liên hệ!</div>
          ) : (
            chatList.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`flex items-center gap-3 p-3 mb-1 rounded-2xl cursor-pointer transition-all ${activeChat?.id === chat.id ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{chat.name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{chat.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate font-medium">{chat.lastMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ CỘT PHẢI: KHUNG CHAT ============ */}
      <div className="flex-1 flex flex-col bg-[#f8f9fa] relative">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Quản lý hộp thư</h2>
              <div className="relative w-40 h-40 mx-auto mb-6 bg-white rounded-full shadow-lg p-4 flex items-center justify-center transform hover:scale-105 transition-all">
                <span className="text-6xl">💬</span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">Chọn một cuộc trò chuyện để bắt đầu nhắn tin an toàn.</h3>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{activeChat.name}</h3>
                  <span className="text-xs text-green-500 font-bold flex items-center gap-1">Đang hoạt động</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 font-medium text-sm mt-10">Hãy gửi lời chào đến {activeChat.name}!</div>
              ) : (
                messages.map((msg) => {
                  const isMine = String(msg.sender_id) === String(currentUser.id);
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] flex flex-col gap-1">
                        <div className={`px-5 py-3 text-[15px] font-medium shadow-sm ${
                          isMine 
                            ? 'bg-gradient-to-r from-[#1877F2] to-blue-600 text-white rounded-[1.2rem] rounded-tr-sm' 
                            : 'bg-white text-gray-800 rounded-[1.2rem] rounded-tl-sm border border-gray-100'
                        }`}>
                          {msg.text}
                        </div>
                        <span className={`text-[10px] font-bold text-gray-400 ${isMine ? 'text-right' : 'text-left'}`}>
                          {formatMsgTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Nhắn tin cho ${activeChat.name}...`} 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-6 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!messageInput.trim()}
                  className={`p-3.5 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                    messageInput.trim() ? 'bg-gradient-to-r from-[#1877F2] to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// =====================================================================
// 2. COMPONENT CHÍNH: BỌC SUSPENSE
// =====================================================================
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col h-screen overflow-hidden">
      <Header />
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center text-[#1877F2] font-bold bg-white text-lg">
          <span className="animate-pulse">Đang kết nối tin nhắn...</span>
        </div>
      }>
        <ChatContent />
      </Suspense>
    </div>
  );
}
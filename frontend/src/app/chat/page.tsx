'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Header from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';

// Đường dẫn ảnh Avatar mặc định
const DEFAULT_AVATAR = 'https://i.imgur.com/L1nYE9z.jpg'; 

// 1. COMPONENT CON: XỬ LÝ TOÀN BỘ LOGIC CHAT VÀ URL (Bắt buộc tách ra)

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

  // Kiểm tra đăng nhập và Lấy danh sách chat đã lưu
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Vui lòng đăng nhập để sử dụng tính năng chat!');
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    // Lấy danh sách những người đã chat từ LocalStorage
    const savedChatList = JSON.parse(localStorage.getItem(`chat_list_${user.id}`) || '[]');
    setChatList(savedChatList);
  }, [router]);

  // Xử lý khi được điều hướng từ trang Chi tiết (Tạo cuộc hội thoại mới)
  useEffect(() => {
    if (sellerId && sellerName && currentUser) {
      if (sellerId === String(currentUser.id)) {
        alert('Đây là bài đăng của chính bạn!');
        return;
      }

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

  // Khi bấm vào 1 người, tải toàn bộ tin nhắn của người đó lên
  useEffect(() => {
    if (currentUser && activeChat) {
      const roomKey = `chat_messages_${currentUser.id}_${activeChat.id}`;
      const savedMessages = JSON.parse(localStorage.getItem(roomKey) || '[]');
      setMessages(savedMessages);
    }
  }, [activeChat, currentUser]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  // Hàm xử lý Gửi tin nhắn và Lưu lại
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !currentUser) return;

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = {
      id: Date.now(),
      senderId: currentUser.id,
      text: messageInput.trim(),
      time: timeNow,
      isMine: true,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setMessageInput('');

    const roomKey = `chat_messages_${currentUser.id}_${activeChat.id}`;
    localStorage.setItem(roomKey, JSON.stringify(updatedMessages));

    setChatList((prevList) => {
      const updatedList = prevList.map(chat => 
        chat.id === activeChat.id 
          ? { ...chat, lastMessage: `Bạn: ${newMessage.text}`, time: timeNow } 
          : chat
      );
      const sortedList = updatedList.sort((a, b) => a.id === activeChat.id ? -1 : 1);
      localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(sortedList));
      return sortedList;
    });
  };

  return (
    <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 overflow-hidden">
      
      {/* CỘT TRÁI: DANH SÁCH CHAT */}
      <div className="w-[340px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4">Chat</h2>
          <div className="relative flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2] transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatList.length === 0 ? (
            <div className="text-center p-6 text-gray-400 text-sm">Chưa có cuộc trò chuyện nào.<br/>Hãy tìm bất động sản và liên hệ!</div>
          ) : (
            chatList.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-50 ${activeChat?.id === chat.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{chat.name}</h4>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{chat.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{chat.lastMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CỘT PHẢI: KHUNG CHAT HOẶC BANNER */}
      <div className="flex-1 flex flex-col bg-[#f8f9fa] relative">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Quản lý hộp thư</h2>
              <div className="relative w-48 h-48 mx-auto mb-6 bg-white rounded-full shadow-xl p-4 flex items-center justify-center">
                <span className="text-6xl">💬</span>
              </div>
              <h3 className="text-gray-500 text-sm">Chọn một cuộc trò chuyện để bắt đầu nhắn tin.</h3>
            </div>
          </div>
        ) : (
          <>
            {/* Header khung chat */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full border border-gray-200" />
                <div>
                  <h3 className="font-bold text-gray-800">{activeChat.name}</h3>
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Đang hoạt động
                  </span>
                </div>
              </div>
            </div>

            {/* Vùng hiển thị tin nhắn */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-10">Hãy gửi lời chào đến {activeChat.name}!</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%] flex flex-col gap-1">
                      <div className={`px-4 py-2.5 text-sm ${
                        msg.isMine 
                          ? 'bg-[#1877F2] text-white rounded-2xl rounded-tr-sm shadow-sm' 
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <span className={`text-[10px] text-gray-400 ${msg.isMine ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Ô nhập tin nhắn */}
            <div className="bg-white p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Nhắn tin cho ${activeChat.name}...`} 
                  className="flex-1 bg-gray-100 border-transparent rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!messageInput.trim()}
                  className={`p-3 rounded-full flex items-center justify-center transition-all ${
                    messageInput.trim() ? 'bg-[#1877F2] text-white shadow-md hover:bg-blue-600' : 'bg-gray-100 text-gray-400'
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

// 2. COMPONENT CHÍNH: BỌC BẰNG SUSPENSE ĐỂ FIX LỖI BUILD NEXT.JS
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      <Header />
      {/* Suspense giúp Next.js bỏ qua lỗi prerender khi dùng useSearchParams */}
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center text-[#1877F2] font-bold bg-white text-lg">
          <span className="animate-pulse">Đang tải dữ liệu trò chuyện...</span>
        </div>
      }>
        <ChatContent />
      </Suspense>
    </div>
  );
}
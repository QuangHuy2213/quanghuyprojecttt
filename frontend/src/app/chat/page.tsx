'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Header from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabase'; 

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
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const [chatList, setChatList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // [1] Kiểm tra đăng nhập và tải danh sách chat (ĐÃ FIX LỖI TRÙNG LẶP)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Vui lòng đăng nhập để sử dụng tính năng chat!');
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    // Lấy dữ liệu từ LocalStorage
    const savedChatList = JSON.parse(localStorage.getItem(`chat_list_${user.id}`) || '[]');
    
    // FIX TẬN GỐC: Dùng Map để lọc sạch các liên hệ bị trùng ID
    const uniqueChats = Array.from(new Map(savedChatList.map((item: any) => [String(item.id), item])).values());
    
    setChatList(uniqueChats);
    
    // Lưu ngược lại danh sách đã làm sạch vào LocalStorage
    localStorage.setItem(`chat_list_${user.id}`, JSON.stringify(uniqueChats));
  }, [router]);

  // [2] CHẶN TỰ CHAT VÀ TẠO CUỘC TRÒ CHUYỆN MỚI TỪ URL
  useEffect(() => {
    if (sellerId && sellerName && currentUser) {
      if (String(sellerId) === String(currentUser.id)) {
        showToast('Bạn không thể tự chat trong bài đăng của chính mình!', 'error');
        router.replace('/chat'); 
        return;
      }

      setChatList((prevList) => {
        // FIX: Ép kiểu chuỗi String() để so sánh ID chính xác 100%
        const isExist = prevList.find(chat => String(chat.id) === String(sellerId));
        if (isExist) {
          setActiveChat(isExist);
          return prevList;
        }

        const newChatTarget = {
          id: String(sellerId),
          name: sellerName,
          avatar: DEFAULT_AVATAR, 
          lastMessage: 'Bắt đầu cuộc trò chuyện...',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };

        const updatedList = [newChatTarget, ...prevList];
        
        // FIX: Lọc trùng một lần nữa trước khi lưu cho chắc chắn
        const cleanList = Array.from(new Map(updatedList.map((item: any) => [String(item.id), item])).values());
        
        localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(cleanList));
        setActiveChat(newChatTarget);
        return cleanList;
      });
    }
  }, [sellerId, sellerName, currentUser, router]);

  // [3] LẤY LỊCH SỬ TIN NHẮN 
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };
    fetchMessages();
  }, [activeChat, currentUser]);

  // [4] LẮNG NGHE TIN NHẮN MỚI TOÀN CẦU (ĐÃ CẬP NHẬT FIX TRÙNG ID)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`global_messages_${currentUser.id}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          const newMsg = payload.new;
          
          if (newMsg.receiver_id === String(currentUser.id) || newMsg.sender_id === String(currentUser.id)) {
            
            const currentActiveChat = activeChatRef.current;
            if (currentActiveChat && (
              (newMsg.sender_id === String(currentActiveChat.id) && newMsg.receiver_id === String(currentUser.id)) ||
              (newMsg.sender_id === String(currentUser.id) && newMsg.receiver_id === String(currentActiveChat.id))
            )) {
              setMessages((prev) => {
                if (prev.find(m => m.id === newMsg.id)) return prev; 
                return [...prev, newMsg];
              });
            }

            setChatList((prevList) => {
              const otherPersonId = String(newMsg.sender_id) === String(currentUser.id) ? String(newMsg.receiver_id) : String(newMsg.sender_id);
              const timeNow = new Date(newMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const isMine = String(newMsg.sender_id) === String(currentUser.id);
              const msgSnippet = isMine ? `Bạn: ${newMsg.text}` : newMsg.text;

              // FIX: Tìm bằng String()
              const existingChatIndex = prevList.findIndex(c => String(c.id) === otherPersonId);
              let updatedList = [...prevList];

              if (existingChatIndex !== -1) {
                const updatedChat = { ...updatedList[existingChatIndex], lastMessage: msgSnippet, time: timeNow };
                updatedList.splice(existingChatIndex, 1);
                updatedList.unshift(updatedChat);
              } else {
                const newChat = {
                  id: otherPersonId,
                  name: `Người dùng ${otherPersonId.substring(0, 4)}`,
                  avatar: DEFAULT_AVATAR,
                  lastMessage: msgSnippet,
                  time: timeNow
                };
                updatedList.unshift(newChat);
              }
              
              const cleanList = Array.from(new Map(updatedList.map((item: any) => [String(item.id), item])).values());
              localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(cleanList));
              return cleanList;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // [5] Tự động cuộn xuống dưới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // [6] XỬ LÝ GỬI TIN NHẮN 
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !currentUser) return;

    const textToSend = messageInput.trim();
    setMessageInput(''); 

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: String(currentUser.id),
        receiver_id: String(activeChat.id),
        text: textToSend
      }
    ]);

    if (error) {
      console.error("Lỗi gửi tin:", error);
      showToast('Gửi lỗi! Hãy kiểm tra bạn đã Disable RLS trên Supabase chưa nhé.', 'error');
      setMessageInput(textToSend); 
      return;
    }
  };

  const formatMsgTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* ================= GIAO DIỆN POPUP (TOAST) ================= */}
      <div 
        className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${
          toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'
        }`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

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
    </>
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
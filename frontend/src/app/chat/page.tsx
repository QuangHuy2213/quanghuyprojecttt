'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Header from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabase';

const DEFAULT_AVATAR = 'https://i.imgur.com/L1nYE9z.jpg';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sellerId = searchParams.get('sellerId');
  const sellerName = searchParams.get('sellerName');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeChat, setActiveChat] = useState<any>(null); // activeChat bây giờ là 1 Conversation
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

  // ==========================================
  // [1] LẤY DANH SÁCH CHAT TỪ API MỚI
  // ==========================================
  const fetchConversations = async (userId: string) => {
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setChatList(data);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách chat:", error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Vui lòng đăng nhập để sử dụng tính năng chat!');
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);
    fetchConversations(user.id);
  }, [router]);

  // ==========================================
  // [2] XỬ LÝ CLICK TỪ BÀI ĐĂNG (SELLER_ID)
  // ==========================================
  useEffect(() => {
    if (sellerId && sellerName && currentUser && chatList.length > 0) {
      if (String(sellerId) === String(currentUser.id)) {
        showToast('Bạn không thể tự chat trong bài đăng của chính mình!', 'error');
        router.replace('/chat');
        return;
      }

      // Tìm xem đã có conversation với người này chưa
      const existingChat = chatList.find((c) =>
        c.users.some((u: any) => u.id === sellerId)
      );

      if (existingChat) {
        setActiveChat(existingChat);
      } else {
        // Tạo "Draft Chat" (Chỉ hiện UI, chưa lưu DB. Khi gửi tin nhắn đầu tiên API sẽ tạo)
        const draftChat = {
          id: 'draft_' + sellerId,
          isDraft: true, // Cờ đánh dấu chưa có trong DB
          participantIds: [currentUser.id, sellerId],
          users: [
            { id: currentUser.id },
            { id: sellerId, fullName: sellerName, avatarUrl: DEFAULT_AVATAR }
          ],
          messages: []
        };
        setActiveChat(draftChat);
        setChatList((prev) => [draftChat, ...prev]);
      }
    }
  }, [sellerId, sellerName, currentUser, chatList.length, router]);

  // ==========================================
  // [3] LẤY TIN NHẮN THEO CONVERSATION_ID
  // ==========================================
  const fetchMessages = async (conversationId: string) => {
    if (conversationId.startsWith('draft_')) return setMessages([]); // Chat nháp chưa có tin
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat.id);
  }, [activeChat]);

  // ==========================================
  // [4] SUPABASE REALTIME (ĐÃ FIX THEO SCHEMA MỚI)
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`public:messages`) // Lắng nghe toàn bộ thay đổi ở bảng messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;

        // Nếu tin nhắn mới thuộc về activeChat đang mở -> Cập nhật UI ngay
        if (activeChatRef.current && activeChatRef.current.id === newMsg.conversation_id) {
          setMessages((prev) => [...prev, newMsg]);
        }

        // Cập nhật lại danh sách chat (Chạy ngầm API để load lại preview tin nhắn)
        fetchConversations(currentUser.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==========================================
  // [5] GỬI TIN NHẮN QUA API MỚI
  // ==========================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !currentUser) return;

    const textToSend = messageInput.trim();
    setMessageInput('');

    // Lấy ID người nhận
    const partnerId = activeChat.users.find((u: any) => u.id !== currentUser.id)?.id;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          receiverId: partnerId,
          currentUserId: currentUser.id
        })
      });

      if (!res.ok) throw new Error('Lỗi gửi tin');

      const savedMsg = await res.json();

      // Nếu là tin nhắn đầu tiên của đoạn chat nháp (Draft), cập nhật lại ActiveChat
      if (activeChat.isDraft) {
        fetchConversations(currentUser.id);
        setActiveChat({ ...activeChat, id: savedMsg.conversationId, isDraft: false });
      }
    } catch (error) {
      showToast('Gửi lỗi! Vui lòng thử lại sau.', 'error');
      setMessageInput(textToSend);
    }
  };

  // ==========================================
  // [6] TÍNH NĂNG XÓA ĐOẠN CHAT
  // ==========================================
  const handleDeleteChat = async (conversationId: string) => {
    if (conversationId.startsWith('draft_')) {
      setChatList((prev) => prev.filter((c) => c.id !== conversationId));
      setActiveChat(null);
      return;
    }

    const confirmDel = confirm("Bạn có chắc muốn xóa cuộc trò chuyện này?");
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });

      if (res.ok) {
        setChatList((prev) => prev.filter((chat) => chat.id !== conversationId));
        if (activeChat?.id === conversationId) setActiveChat(null);
        showToast("Đã xóa đoạn chat", "success");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatMsgTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Lấy thông tin partner của Active Chat
  const activePartner = activeChat?.users?.find((u: any) => u.id !== currentUser?.id);

  return (
    <>
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'}`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

      <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 overflow-hidden">
        
        {/* ============ BÊN TRÁI: DANH SÁCH CHAT ============ */}
        <div className="w-[340px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {chatList.length === 0 ? (
              <div className="text-center p-6 text-gray-400 text-sm mt-10">Chưa có cuộc trò chuyện nào.</div>
            ) : (
              chatList.map((chat) => {
                const partner = chat.users.find((u: any) => u.id !== currentUser?.id);
                const lastMsg = chat.messages?.[0]?.text || 'Bắt đầu cuộc trò chuyện...';

                return (
                  <div 
                    key={chat.id} 
                    onClick={() => setActiveChat(chat)}
                    className={`group relative flex items-center gap-3 p-3 mb-1 rounded-2xl cursor-pointer transition-all ${activeChat?.id === chat.id ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
                  >
                    <img src={partner?.avatarUrl || DEFAULT_AVATAR} alt="avatar" className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{partner?.fullName || 'Người dùng'}</h4>
                      </div>
                      <p className="text-xs text-gray-500 truncate font-medium">{lastMsg}</p>
                    </div>

                    {/* NÚT XÓA CHAT */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="absolute right-3 hidden group-hover:block text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md"
                    >
                      Xóa
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============ BÊN PHẢI: KHUNG CHAT ============ */}
        <div className="flex-1 flex flex-col bg-[#f8f9fa] relative">
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center p-6 text-gray-500">Chọn cuộc trò chuyện để bắt đầu.</div>
          ) : (
            <>
              {/* HEADER CHAT */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center gap-3 shadow-sm z-10">
                <img src={activePartner?.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full border shadow-sm" />
                <div>
                  <h3 className="font-bold text-gray-800">{activePartner?.fullName || 'Người dùng'}</h3>
                  <span className="text-xs text-green-500 font-bold">Đang hoạt động</span>
                </div>
              </div>

              {/* LỊCH SỬ TIN NHẮN */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => {
                  const isMine = String(msg.sender_id) === String(currentUser?.id);
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
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Ô NHẬP TIN NHẮN */}
              <div className="bg-white p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                  <input 
                    type="text" 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Nhập tin nhắn..." 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-6 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10"
                  />
                  <button type="submit" disabled={!messageInput.trim()} className="bg-[#1877F2] p-3 rounded-full text-white">Gửi</button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col h-screen overflow-hidden">
      <Header />
      <Suspense fallback={<div>Đang tải...</div>}>
        <ChatContent />
      </Suspense>
    </div>
  );
}
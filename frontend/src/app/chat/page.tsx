'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/services/supabase';
import { apiUrl } from '@/services/api';

const DEFAULT_AVATAR = 'https://i.imgur.com/L1nYE9z.jpg';

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

function ChatApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params để bắt đầu chat từ bài đăng
  const sellerId = searchParams.get('sellerId');
  const sellerName = searchParams.get('sellerName');
  const postId = searchParams.get('postId');

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Escrow & Popup States
  const [transaction, setTransaction] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 1. Kiểm tra đăng nhập
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setShowAuthModal(true);
      return;
    }
    setCurrentUser(JSON.parse(storedUser));
  }, []);

  // 2. Load danh sách Chat và khởi tạo Active Chat (nếu có sellerId từ URL)
  useEffect(() => {
    if (!currentUser) return;

    const fetchChats = async () => {
      setIsLoadingList(true);
      try {
        // Lấy toàn bộ tin nhắn liên quan đến user hiện tại
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Gom nhóm tin nhắn theo đối tác
        const uniqueUsers = new Map<string, Message>();
        (data || []).forEach((msg: Message) => {
          const otherId = String(msg.sender_id) === String(currentUser.id) ? String(msg.receiver_id) : String(msg.sender_id);
          if (!uniqueUsers.has(otherId)) uniqueUsers.set(otherId, msg);
        });

        const chats: ChatItem[] = [];

        // Lấy thông tin Name, Avatar của đối tác
        for (const [otherId, lastMsg] of uniqueUsers) {
          let uName = `Người dùng ${otherId.slice(0, 4)}`;
          let uAvatar = DEFAULT_AVATAR;

          try {
            // 🌟 ĐÃ SỬA LỖI: Chỉ select các trường tồn tại (id, fullName, avatarUrl)
            const { data: uData } = await supabase
              .from('User')
              .select('id, fullName, avatarUrl')
              .eq('id', otherId)
              .single();

            if (uData) {
              uName = uData.fullName || uName;
              uAvatar = uData.avatarUrl || uAvatar;
            }
          } catch (err) {}

          chats.push({
            id: otherId,
            name: uName,
            avatar: uAvatar,
            lastMessage: String(lastMsg.sender_id) === String(currentUser.id) ? `Bạn: ${lastMsg.text}` : lastMsg.text,
            time: new Date(lastMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            postId: null
          });
        }

        // Xử lý tạo chat mới từ URL nếu chưa có trong danh sách
        if (sellerId && sellerName && String(sellerId) !== String(currentUser.id)) {
          const existIdx = chats.findIndex(c => c.id === String(sellerId));
          let targetChat: ChatItem;

          if (existIdx >= 0) {
            targetChat = chats[existIdx];
            chats.splice(existIdx, 1);
            chats.unshift(targetChat);
          } else {
            targetChat = {
              id: String(sellerId),
              name: sellerName,
              avatar: DEFAULT_AVATAR,
              lastMessage: 'Bắt đầu cuộc trò chuyện...',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              postId: postId || null
            };
            chats.unshift(targetChat);
          }
          setActiveChat(targetChat);
        }

        setChatList(chats);
      } catch (err) {
        console.error("Lỗi lấy danh sách:", err);
      } finally {
        setIsLoadingList(false);
      }
    };

    fetchChats();
  }, [currentUser, sellerId, sellerName, postId]);

  // 3. Load nội dung tin nhắn chi tiết & Realtime & Escrow
  useEffect(() => {
    if (!currentUser || !activeChat) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    // Hàm check giao dịch tách riêng để gọi nhiều lần
    const checkTransaction = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(apiUrl(`transactions/check?user1=${currentUser.id}&user2=${activeChat.id}&postId=${activeChat.postId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setTransaction(await res.json());
      } catch (error) {}
    };

    loadMessages();
    checkTransaction();

    // Đăng ký Realtime Lắng nghe tin nhắn mới
    const channel = supabase.channel(`chat_${currentUser.id}_${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        if (
          (String(newMsg.sender_id) === String(currentUser.id) && String(newMsg.receiver_id) === String(activeChat.id)) ||
          (String(newMsg.sender_id) === String(activeChat.id) && String(newMsg.receiver_id) === String(currentUser.id))
        ) {
          setMessages(prev => {
            if (prev.find(m => String(m.id) === String(newMsg.id))) return prev;
            return [...prev, newMsg];
          });
          
          // Cập nhật lại Last Message
          setChatList(prev => {
            const newList = [...prev];
            const idx = newList.findIndex(c => c.id === activeChat.id);
            if (idx > -1) {
              newList[idx].lastMessage = String(newMsg.sender_id) === String(currentUser.id) ? `Bạn: ${newMsg.text}` : newMsg.text;
              newList[idx].time = new Date(newMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const item = newList.splice(idx, 1)[0];
              newList.unshift(item);
            }
            return newList;
          });

          // 🌟 BÍ QUYẾT: Khi có tin nhắn bất kỳ bay tới, ngầm tự động check lại giao dịch!
          // Việc này giúp đối tác (người nhận tin nhắn "chốt") cũng hiện popup ngay lập tức.
          checkTransaction();
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeChat]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 // 4. Gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUser || !activeChat) return;

    const textToSend = messageInput.trim();
    setMessageInput('');

    // BƯỚC 1: Lưu vào Supabase để hiện lên khung chat nhanh nhất
    const { error } = await supabase.from('messages').insert([
      { sender_id: String(currentUser.id), receiver_id: String(activeChat.id), text: textToSend }
    ]);

    if (error) {
      showToast('Không thể gửi tin nhắn!', 'error');
      setMessageInput(textToSend);
      return;
    }

    // BƯỚC 2: Gửi báo cho Backend quét AI
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl('chat/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId: activeChat.postId, receiverId: activeChat.id, content: textToSend })
      });

      // 🌟 BƯỚC 3: Nếu AI quét xong, NGAY LẬP TỨC gọi API check lại giao dịch để bật Popup cho người gửi
      if (res.ok) {
        const checkRes = await fetch(apiUrl(`transactions/check?user1=${currentUser.id}&user2=${activeChat.id}&postId=${activeChat.postId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (checkRes.ok) {
          const txData = await checkRes.json();
          if (txData && txData.status === 'VERIFYING') {
            setTransaction(txData); // Bật popup ngay!
          }
        }
      }
    } catch (error) {
      console.error("Lỗi gửi/quét AI:", error);
    }
  };
  // 5. Giải quyết Đồng kiểm (Escrow)
  const handleVerifyTransaction = async (isConfirmed: boolean) => {
    if (!transaction) return;
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`transactions/${transaction.id}/verify`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isConfirmed })
      });
      if (res.ok) {
        showToast('Đã gửi phản hồi thành công!', 'success');
        setTransaction(null);
      } else {
        showToast('Có lỗi xảy ra khi xác nhận.', 'error');
      }
    } catch (error) {
      showToast('Không thể kết nối máy chủ.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Xóa chat
  const handleDeleteChat = async () => {
    if (!activeChat || !window.confirm('Chắc chắn xóa cuộc trò chuyện này?')) return;
    const { error } = await supabase.from('messages').delete().or(
      `and(sender_id.eq.${currentUser?.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser?.id})`
    );
    if (!error) {
      setChatList(prev => prev.filter(c => c.id !== activeChat.id));
      setActiveChat(null);
      setMessages([]);
      showToast('Đã xóa cuộc trò chuyện', 'success');
    }
  };

  // GIAO DIỆN
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <Header />
      
      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className={`px-6 py-3 rounded-full text-white font-semibold shadow-lg ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#1877F2]'}`}>
          {toast.type === 'error' ? '⚠️ ' : '✨ '} {toast.message}
        </div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Yêu cầu đăng nhập</h3>
            <p className="text-gray-500 text-sm mb-6">Bạn cần đăng nhập để xem và gửi tin nhắn.</p>
            <button onClick={() => router.push('/login')} className="w-full bg-[#1877F2] text-white py-3 rounded-xl font-bold mb-3 shadow-md">Đăng nhập</button>
            <button onClick={() => router.push('/')} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Quay lại</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl mx-auto w-full bg-white shadow-sm border-x border-gray-200 mt-2 rounded-t-2xl overflow-hidden">
        
        {/* CỘT TRÁI: DANH SÁCH CHAT */}
        <div className="w-full sm:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-5 border-b border-gray-50">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 tracking-tight">Tin nhắn</h2>
            <input type="text" placeholder="Tìm kiếm cuộc trò chuyện..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] focus:outline-none transition-all" />
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {isLoadingList ? (
              <div className="text-center text-sm text-gray-400 py-10">Đang tải danh sách...</div>
            ) : chatList.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-10">Chưa có cuộc trò chuyện nào</div>
            ) : (
              chatList.map((chat) => (
                <button 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all ${activeChat?.id === chat.id ? 'bg-blue-50/50 shadow-sm border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-900 text-[15px] truncate">{chat.name}</h3>
                      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">{chat.time}</span>
                    </div>
                    <p className={`text-[13px] truncate ${activeChat?.id === chat.id ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{chat.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG CHAT */}
        <div className={`flex-1 flex flex-col bg-[#fcfcfc] ${!activeChat ? 'hidden sm:flex' : 'flex'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center mb-6 border border-gray-100 text-5xl">👋</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Chào mừng đến với tin nhắn</h2>
              <p className="text-gray-500 max-w-sm">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin và giao dịch an toàn.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={activeChat.avatar} alt={activeChat.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{activeChat.name}</h3>
                    <span className="text-xs text-emerald-500 font-medium">Đang hoạt động</span>
                  </div>
                </div>
                <button onClick={handleDeleteChat} className="text-rose-500 hover:bg-rose-50 text-sm font-bold px-4 py-2 rounded-xl transition-all">Xóa chat</button>
              </div>

              {/* Popup Escrow */}
              {transaction?.status === 'VERIFYING' && (
                <div className="bg-amber-50 border-y border-amber-200 p-4 sm:p-5 flex flex-col items-center text-center shadow-inner">
                  <div className="text-2xl mb-1">⚠️</div>
                  <h4 className="font-black text-amber-900 text-sm">Hệ thống phát hiện dấu hiệu chốt giao dịch!</h4>
                  <p className="text-xs text-amber-700 mt-1 max-w-lg leading-relaxed">
                    Vui lòng xác nhận trung thực: <b>Giao dịch này đã thành công chưa?</b> Khai báo gian dối sẽ dẫn đến khóa tài khoản vĩnh viễn.
                  </p>
                  <div className="mt-4 flex gap-3 w-full max-w-[250px]">
                    <button disabled={isVerifying} onClick={() => handleVerifyTransaction(true)} className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-md hover:bg-emerald-700 text-xs transition-transform active:scale-95">CÓ (Đã chốt)</button>
                    <button disabled={isVerifying} onClick={() => handleVerifyTransaction(false)} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl shadow-md hover:bg-rose-700 text-xs transition-transform active:scale-95">KHÔNG</button>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {messages.map((msg) => {
                  const isMine = String(msg.sender_id) === String(currentUser?.id);
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] flex flex-col gap-1">
                        <div className={`px-5 py-3 text-[15px] shadow-sm leading-relaxed ${isMine ? 'bg-gradient-to-br from-[#1877F2] to-blue-600 text-white rounded-[1.2rem] rounded-tr-sm font-medium' : 'bg-white text-gray-800 border border-gray-100 rounded-[1.2rem] rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <span className={`text-[10px] text-gray-400 font-medium ${isMine ? 'text-right pr-1' : 'text-left pl-1'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="bg-white p-4 border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-12 py-3.5 text-sm focus:outline-none focus:border-[#1877F2] focus:ring-4 focus:ring-[#1877F2]/10 transition-all font-medium text-gray-800" />
                  </div>
                  <button type="submit" disabled={!messageInput.trim()} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 flex-shrink-0 ${messageInput.trim() ? 'bg-gradient-to-r from-[#1877F2] to-blue-600 text-white hover:shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                    <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-[#1877F2] font-bold text-lg">Đang kết nối tin nhắn...</div>}>
      <ChatApp />
    </Suspense>
  );
}

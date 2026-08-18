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

  // [1] Load danh sách chat từ LocalStorage và lọc trùng
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    const savedChatList = JSON.parse(localStorage.getItem(`chat_list_${user.id}`) || '[]');
    const uniqueMap = new Map();
    savedChatList.forEach((item: any) => uniqueMap.set(String(item.id), item));
    setChatList(Array.from(uniqueMap.values()));
  }, []);

  // [2] Tạo chat mới từ URL
  useEffect(() => {
    if (sellerId && sellerName && currentUser) {
      if (String(sellerId) === String(currentUser.id)) {
        router.replace('/chat');
        return;
      }
      setChatList((prevList) => {
        const existingIndex = prevList.findIndex(c => String(c.id) === String(sellerId));
        let newList = [...prevList];
        
        if (existingIndex > -1) {
          newList[existingIndex] = { ...newList[existingIndex], name: sellerName };
          setActiveChat(newList[existingIndex]);
        } else {
          const newChat = { id: String(sellerId), name: sellerName, avatar: DEFAULT_AVATAR, lastMessage: 'Bắt đầu...', time: '' };
          newList = [newChat, ...newList];
          setActiveChat(newChat);
        }
        localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(newList));
        return newList;
      });
    }
  }, [sellerId, sellerName, currentUser, router]);

  // [3] Lấy tin nhắn từ DB
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [activeChat, currentUser]);

  // [4] Lắng nghe realtime (cập nhật danh sách + tin nhắn)
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel(`global_messages_${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            // Nếu đang ở khung chat này, hiện tin nhắn mới
            if (activeChatRef.current && (String(newMsg.sender_id) === String(activeChatRef.current.id) || String(newMsg.receiver_id) === String(activeChatRef.current.id))) {
                setMessages(prev => [...prev, newMsg]);
            }
            // Luôn cập nhật danh sách chat bên trái
            updateListWithNewMsg(newMsg);
        } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const updateListWithNewMsg = (msg: any) => {
    setChatList(prev => {
        const otherId = String(msg.sender_id) === String(currentUser.id) ? String(msg.receiver_id) : String(msg.sender_id);
        const idx = prev.findIndex(c => String(c.id) === otherId);
        let list = [...prev];
        if (idx > -1) {
            list[idx] = { ...list[idx], lastMessage: String(msg.sender_id) === String(currentUser.id) ? `Bạn: ${msg.text}` : msg.text };
        } else {
            list.unshift({ id: otherId, name: `Người dùng ${otherId.substring(0,4)}`, avatar: DEFAULT_AVATAR, lastMessage: msg.text });
        }
        localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(list));
        return list;
    });
  };

  // [5] Xóa cuộc hội thoại
  const handleDeleteChat = async () => {
    if (!activeChat || !confirm("Xóa sạch đoạn chat này?")) return;
    const { error } = await supabase.from('messages').delete().or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`
    );
    if (!error) {
      const newList = chatList.filter(c => String(c.id) !== String(activeChat.id));
      setChatList(newList);
      localStorage.setItem(`chat_list_${currentUser.id}`, JSON.stringify(newList));
      setActiveChat(null); setMessages([]);
      showToast('Đã xóa sạch!', 'success');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;
    const text = messageInput; setMessageInput('');
    await supabase.from('messages').insert([{ sender_id: String(currentUser.id), receiver_id: String(activeChat.id), text }]);
  };

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  return (
    <main className="flex-grow flex max-w-[1400px] mx-auto w-full bg-white shadow-sm border-x border-gray-200 h-screen">
      <div className="w-[340px] border-r border-gray-200 overflow-y-auto">
        {chatList.map((chat) => (
          <div key={chat.id} onClick={() => setActiveChat(chat)} className={`p-4 cursor-pointer border-b flex items-center gap-3 ${activeChat?.id === chat.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
            <img src={chat.avatar} className="w-10 h-10 rounded-full" />
            <div className="font-bold text-sm">{chat.name}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col bg-gray-50">
        {activeChat ? (
          <>
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <span className="font-bold text-lg">{activeChat.name}</span>
              <button onClick={handleDeleteChat} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-bold">Xóa cuộc trò chuyện</button>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${String(msg.sender_id) === String(currentUser?.id) ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl max-w-[70%] ${String(msg.sender_id) === String(currentUser?.id) ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-2">
              <input className="flex-1 border p-3 rounded-full" value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Nhắn tin..." />
              <button type="submit" className="bg-blue-600 text-white px-6 rounded-full font-bold">Gửi</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">Chọn cuộc trò chuyện để bắt đầu</div>
        )}
      </div>
    </main>
  );
}

export default function ChatPage() { return <Suspense fallback={<div>Loading...</div>}><ChatContent /></Suspense>; }
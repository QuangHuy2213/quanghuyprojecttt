'use client';

import { Suspense } from 'react';
import ChatWorkspace from '@/components/ChatWorkspace';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải tin nhắn...</div>}>
      <ChatWorkspace />
    </Suspense>
  );
}

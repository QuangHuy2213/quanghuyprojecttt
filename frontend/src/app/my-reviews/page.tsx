'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function MyReviews() {
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(async () => {
    const response = await fetch(apiUrl('community/my-reviews'), {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    const data = await response.json();
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: number) => {
    await fetch(apiUrl(`community/reviews/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    await load();
  };

  return (
    <div className="user-page-shell min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-black text-slate-900">Đánh giá từ tôi</h1>
        <p className="mt-2 text-slate-500">Các nhận xét bạn đã chia sẻ về bài đăng và người bán.</p>
        <div className="mt-7 space-y-4">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center text-slate-400">Bạn chưa viết đánh giá nào.</div>
          ) : items.map((item) => (
            <article key={item.id} className="flex gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <img src={item.post?.thumbnail || 'https://via.placeholder.com/120'} alt={item.post?.title || 'Ảnh bài đăng'} className="h-20 w-24 rounded-2xl object-cover" />
              <div className="flex-1">
                <Link href={`/posts/${item.postId}`} className="font-black text-slate-900 hover:text-blue-600">{item.post?.title}</Link>
                <div className="mt-1 text-amber-500">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</div>
                <p className="mt-2 text-sm text-slate-600">{item.content}</p>
              </div>
              <button type="button" onClick={() => remove(item.id)} className="self-start text-xs font-bold text-rose-500">Xóa</button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

'use client';
import { useState } from 'react';

export default function UserAvatar({ user, className = 'h-10 w-10' }: { user: any; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = typeof user?.avatarUrl === 'string' ? user.avatarUrl.trim() : '';
  if (avatarUrl && !imageFailed) {
    return <img src={avatarUrl} alt={user?.fullName ? `Ảnh đại diện của ${user.fullName}` : 'Ảnh đại diện'} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className={`${className} rounded-full object-cover bg-slate-100`} />;
  }
  return <span aria-label="Chưa có ảnh đại diện" className={`${className} inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400`}><svg className="h-3/5 w-3/5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.5 0-9 2.75-9 5.5V22h18v-2.5C21 16.75 17.5 14 12 14Z"/></svg></span>;
}

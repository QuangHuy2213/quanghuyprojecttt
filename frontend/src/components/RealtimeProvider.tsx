'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { connectRealtime, disconnectRealtime, onRealtimeStatus, type RealtimeStatus } from '@/services/realtime-socket';

const Context = createContext<RealtimeStatus>('disconnected');
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  useEffect(() => {
    const unsubscribe = onRealtimeStatus(setStatus);
    const sync = () => {
      const token = localStorage.getItem('access_token');
      if (token) connectRealtime(token); else disconnectRealtime();
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('user-updated', sync);
    return () => {
      window.removeEventListener('storage', sync); window.removeEventListener('user-updated', sync);
      unsubscribe(); disconnectRealtime();
    };
  }, []);
  return <Context.Provider value={status}>{children}</Context.Provider>;
}
export const useRealtimeStatus = () => useContext(Context);

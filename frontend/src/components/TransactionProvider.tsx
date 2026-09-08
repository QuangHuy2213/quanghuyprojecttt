'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useInbox } from './InboxProvider';
import { apiFetch, getApiRetryDelay } from '@/services/api';
import { onRealtime, onRealtimeStatus } from '@/services/realtime-socket';
import { invoiceForDisplay, mergeRows, mergeSnapshot, transactionStatuses, type VersionedRow, type TransactionRow } from '@/services/transaction-state';

type Store = {
  transactions: TransactionRow[]; invoices: VersionedRow[]; loading: boolean; refreshing: boolean;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionRow[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<VersionedRow[]>>;
  removeTransaction: (id: string) => void;
  refresh: (full?: boolean) => Promise<void>;
};
const Context = createContext<Store | null>(null);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useInbox();
  const [transactions, writeTransactions] = useState<TransactionRow[]>([]);
  const [invoices, writeInvoices] = useState<VersionedRow[]>([]);
  const transactionRef = useRef<TransactionRow[]>([]);
  const invoiceRef = useRef<VersionedRow[]>([]);
  const deletedRef = useRef(new Set<string>());
  const setTransactions = useCallback<Store['setTransactions']>(update => writeTransactions(current => {
    const next = typeof update === 'function' ? update(current) : update;
    transactionRef.current = next; return next;
  }), []);
  const setInvoices = useCallback<Store['setInvoices']>(update => writeInvoices(current => {
    const next = typeof update === 'function' ? update(current) : update;
    invoiceRef.current = next; return next;
  }), []);
  const removeTransaction = useCallback((id: string) => {
    deletedRef.current.add(id);
    setTransactions(current => current.filter(row => row.id !== id));
  }, [setTransactions]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(async () => refreshRef.current(), []);
  useEffect(() => {
    setTransactions([]); setInvoices([]);
    deletedRef.current = new Set();
    if (!user || !token) { setLoading(false); return; }
    setLoading(true);
    const admin = user.role === 'ADMIN';
    const transactionPath = admin ? 'admin/transactions' : 'transactions/my-transactions';
    const invoicePath = admin ? 'transactions/invoices/admin/all' : 'transactions/my-invoices';
    const retryDelay = () => Math.max(getApiRetryDelay(transactionPath), getApiRetryDelay(invoicePath));
    let stopped = false, running = false, pending = false;
    let connected = false;
    let needsSync = true;
    const deleted = deletedRef.current;
    const controllers = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSync = 0;
    const schedule = (delay = 60_000) => {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === 'visible') timer = setTimeout(() => void sync(), Math.max(delay, retryDelay()));
    };
    const sync = async () => {
      if (stopped) return;
      if (running) { pending = true; return; }
      const delay = Math.max(retryDelay(), lastSync + 1000 - Date.now());
      if (delay > 0) { schedule(delay); return; }
      running = true; pending = false; setRefreshing(true);
      const transactionBaseline = transactionRef.current;
      const invoiceBaseline = invoiceRef.current;
      let failed = false;
      try {
        const read = async (path: string) => {
          const res = await apiFetch(path, { signal: controllers.signal, headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error(`Transaction sync HTTP ${res.status}`);
          const rows = await res.json();
          if (!Array.isArray(rows)) throw new Error('Invalid transaction snapshot');
          return rows;
        };
        const [tx, inv] = await Promise.all([
          read(transactionPath),
          read(invoicePath),
        ]);
        if (!stopped) {
          setTransactions(current => mergeSnapshot(current, tx.filter(row => !deleted.has(row.id)), transactionBaseline));
          setInvoices(current => mergeSnapshot(current, inv, invoiceBaseline));
          needsSync = false;
        }
      } catch (error) { failed = true; needsSync = true; if (!stopped) console.warn('Transaction sync interrupted:', error); }
      finally {
        running = false; lastSync = Date.now();
        if (!stopped) {
          setLoading(false); setRefreshing(false);
          if (failed || !connected || pending) schedule(pending && !failed ? 1000 : 60_000);
        }
      }
    };
    const owned = (row: any) => row && typeof row.id === 'string' && typeof row.updatedAt === 'string' &&
      (admin || row.buyerId === user.id || row.sellerId === user.id);
    const unsubscribeTransaction = onRealtime('transaction:updated', row => {
      if (stopped || !owned(row) || deleted.has(row.id) || !transactionStatuses.includes(row.status)) return;
      setTransactions(current => mergeRows(current, [row]));
    });
    const unsubscribeDelete = onRealtime('transaction:deleted', row => {
      if (stopped || !owned(row)) return;
      removeTransaction(row.id);
    });
    const unsubscribeInvoice = onRealtime('invoice:updated', row => {
      if (stopped || !row || typeof row.id !== 'string' || typeof row.updatedAt !== 'string' || (!admin && row.userId !== user.id)) return;
      setInvoices(current => mergeRows(current, [row]));
    });
    refreshRef.current = sync;
    const unsubscribeStatus = onRealtimeStatus(status => {
      if (stopped) return;
      const wasConnected = connected;
      connected = status === 'connected';
      if (connected && !wasConnected) { clearTimeout(timer); void sync(); }
      else if (!connected) schedule();
    });
    void sync();
    const visibility = () => {
      if (document.visibilityState === 'hidden') clearTimeout(timer);
      else if (!connected || needsSync) void sync();
    };
    const recover = () => { if (!connected) void sync(); };
    window.addEventListener('transactions-updated', recover);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true; controllers.abort(); clearTimeout(timer);
      unsubscribeTransaction(); unsubscribeDelete(); unsubscribeInvoice(); unsubscribeStatus();
      refreshRef.current = async () => {};
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('transactions-updated', recover);
    };
  }, [user?.id, user?.role, token]);
  const relatedTransactions = useMemo(() => transactions.map(row => {
    const invoice = invoices.find(item => item.transactionId === row.id);
    return invoice ? { ...row, invoice: mergeRows(row.invoice ? [row.invoice] : [], [invoice])[0] } : row;
  }), [transactions, invoices]);
  const relatedInvoices = useMemo(() => invoices.map(row => {
    const transaction = transactions.find(item => item.id === row.transactionId);
    const display = invoiceForDisplay(row);
    return transaction ? { ...display, transaction: { ...row.transaction, ...transaction, post: { ...row.transaction?.post, ...transaction.post } } } : display;
  }), [transactions, invoices]);
  return <Context.Provider value={{ transactions: relatedTransactions, invoices: relatedInvoices, loading, refreshing, setTransactions, setInvoices, removeTransaction, refresh }}>{children}</Context.Provider>;
}
export function useTransactions() {
  const value = useContext(Context);
  if (!value) throw new Error('TransactionProvider is missing');
  return value;
}

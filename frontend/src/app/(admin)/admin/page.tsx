'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/services/api';

type Stats = {
  totalUsers: number; pendingPosts: number; activePosts: number; successfulTransactions: number;
  totalRevenue: number; projectedRevenue: number; outstandingRevenue: number; revenueThisMonth: number;
  paidInvoices: number; pendingInvoices: number; monthlyRevenue: { label: string; amount: number }[];
};

const emptyStats: Stats = { totalUsers: 0, pendingPosts: 0, activePosts: 0, successfulTransactions: 0, totalRevenue: 0, projectedRevenue: 0, outstandingRevenue: 0, revenueThisMonth: 0, paidInvoices: 0, pendingInvoices: 0, monthlyRevenue: [] };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(apiUrl('admin/stats'), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw new Error('Không thể tải dữ liệu tổng quan.'); return res.json(); })
      .then(data => setStats({ ...emptyStats, ...data }))
      .catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-slate-100 bg-white"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/><p className="mt-4 text-sm font-semibold text-slate-500">Đang tổng hợp dữ liệu...</p></div></div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-semibold text-rose-700">{error}</div>;

  const maxRevenue = Math.max(...stats.monthlyRevenue.map(item => item.amount), 1);
  const cards = [
    { label: 'Người dùng', value: stats.totalUsers.toLocaleString('vi-VN'), note: 'Tổng tài khoản', icon: '👥', color: 'from-blue-500 to-indigo-600' },
    { label: 'Tin đang hiển thị', value: stats.activePosts.toLocaleString('vi-VN'), note: `${stats.pendingPosts} tin chờ duyệt`, icon: '🏠', color: 'from-cyan-500 to-blue-600' },
    { label: 'Giao dịch thành công', value: stats.successfulTransactions.toLocaleString('vi-VN'), note: `${stats.paidInvoices} hóa đơn đã thu`, icon: '✓', color: 'from-emerald-500 to-teal-600' },
    { label: 'Doanh thu tháng này', value: money(stats.revenueThisMonth), note: 'Theo hóa đơn đã thanh toán', icon: '₫', color: 'from-violet-500 to-fuchsia-600' },
  ];

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-8 text-white shadow-2xl shadow-blue-950/20">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"/>
      <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-blue-100">Tổng quan hệ thống</span><h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Chào mừng trở lại 👋</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Theo dõi hoạt động, giao dịch và dòng tiền của Nhà Tốt trong một màn hình.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-blue-200">Tổng tiền thực thu</p><p className="mt-1 text-3xl font-black">{money(stats.totalRevenue)}</p></div>
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{card.label}</p><p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{card.value}</p><p className="mt-1 text-xs font-medium text-slate-400">{card.note}</p></div><div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${card.color} text-xl font-black text-white shadow-lg`}>{card.icon}</div></div></div>)}</section>

    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_.85fr]">
      <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-lg font-black text-slate-900">Doanh thu 6 tháng</h2><p className="mt-1 text-sm text-slate-400">Chỉ tính hóa đơn đã thanh toán</p></div><span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Thực thu</span></div><div className="mt-8 flex h-60 items-end gap-3 border-b border-slate-100 px-2">{stats.monthlyRevenue.map(item => <div key={item.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="invisible rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white group-hover:visible">{money(item.amount)}</div><div className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-700 group-hover:from-indigo-600 group-hover:to-violet-400" style={{ height: `${Math.max((item.amount / maxRevenue) * 78, item.amount ? 8 : 2)}%` }}/><span className="pb-3 text-xs font-bold text-slate-400">{item.label}</span></div>)}</div></div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm"><h2 className="text-lg font-black text-slate-900">Dòng tiền</h2><p className="mt-1 text-sm text-slate-400">Tình trạng thu phí nền tảng</p><div className="mt-6 space-y-4"><MoneyBox label="Đã thu" value={stats.totalRevenue} tone="emerald"/><MoneyBox label="Chờ thu" value={stats.outstandingRevenue} note={`${stats.pendingInvoices} hóa đơn`} tone="amber"/><MoneyBox label="Phí dự kiến" value={stats.projectedRevenue} tone="blue"/></div><Link href="/admin/transactions" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">Xem giao dịch và hóa đơn →</Link></div>
    </section>
  </div>;
}

function MoneyBox({ label, value, note, tone }: { label: string; value: number; note?: string; tone: 'emerald' | 'amber' | 'blue' }) {
  const styles = { emerald: 'bg-emerald-50 text-emerald-800', amber: 'bg-amber-50 text-amber-800', blue: 'bg-blue-50 text-blue-800' };
  return <div className={`rounded-2xl p-5 ${styles[tone]}`}><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-wider">{label}</p>{note && <span className="text-xs font-bold">{note}</span>}</div><p className="mt-2 text-2xl font-black">{money(value)}</p></div>;
}

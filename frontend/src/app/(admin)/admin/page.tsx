'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/services/api';

type Stats = {
  totalUsers: number;
  pendingPosts: number;
  activePosts: number;
  successfulTransactions: number;
  totalRevenue: number;
  projectedRevenue: number;
  outstandingRevenue: number;
  revenueThisMonth: number;
  paidInvoices: number;
  pendingInvoices: number;
  monthlyRevenue: { label: string; amount: number }[];
};

const emptyStats: Stats = {
  totalUsers: 0,
  pendingPosts: 0,
  activePosts: 0,
  successfulTransactions: 0,
  totalRevenue: 0,
  projectedRevenue: 0,
  outstandingRevenue: 0,
  revenueThisMonth: 0,
  paidInvoices: 0,
  pendingInvoices: 0,
  monthlyRevenue: [],
};

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    apiFetch('admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Không thể tải dữ liệu tổng quan.');
        }

        return res.json();
      })
      .then((data) => setStats({ ...emptyStats, ...data }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[460px] place-items-center overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>
          <p className="mt-5 text-base font-black text-slate-900">
            Đang tổng hợp dữ liệu
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Hệ thống đang chuẩn bị báo cáo tổng quan...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg font-black text-rose-600">
            !
          </div>
          <div>
            <div className="text-base font-black text-rose-800">
              Không thể tải bảng điều khiển
            </div>
            <div className="mt-1 text-sm font-semibold leading-6 text-rose-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(
    ...stats.monthlyRevenue.map((item) => item.amount),
    1
  );

  const cards = [
    {
      label: 'Người dùng',
      value: stats.totalUsers.toLocaleString('vi-VN'),
      note: 'Tổng tài khoản trong hệ thống',
      tone: 'blue',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: 'Tin đang hiển thị',
      value: stats.activePosts.toLocaleString('vi-VN'),
      note: `${stats.pendingPosts} tin đang chờ duyệt`,
      tone: 'cyan',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 11 12 3l9 8v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
        </svg>
      ),
    },
    {
      label: 'Giao dịch thành công',
      value: stats.successfulTransactions.toLocaleString('vi-VN'),
      note: `${stats.paidInvoices} hóa đơn đã thu`,
      tone: 'emerald',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
    {
      label: 'Doanh thu tháng này',
      value: money(stats.revenueThisMonth),
      note: 'Theo hóa đơn đã thanh toán',
      tone: 'violet',
      icon: <span className="text-xl font-black">₫</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[30px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-7 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Tổng quan hệ thống
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Trung tâm điều hành Nhà Tốt
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] font-medium leading-7 text-slate-300">
              Theo dõi người dùng, bài đăng, giao dịch và dòng tiền của nền
              tảng trong một màn hình tổng quan.
            </p>
          </div>

          <div className="min-w-[260px] rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-200">
              Tổng tiền thực thu
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-white">
              {money(stats.totalRevenue)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Theo hóa đơn đã thanh toán
            </div>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      {/* CHART + MONEY */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_.85fr]">
        {/* REVENUE CHART */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
                Phân tích doanh thu
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Doanh thu 6 tháng
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Chỉ tính các hóa đơn đã thanh toán thành công.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Thực thu
            </span>
          </div>

          {stats.monthlyRevenue.length === 0 ? (
            <div className="mt-7 flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ₫
              </div>
              <div className="mt-3 text-sm font-black text-slate-700">
                Chưa có dữ liệu doanh thu
              </div>
              <div className="mt-1 text-sm font-medium text-slate-400">
                Biểu đồ sẽ hiển thị khi có hóa đơn thanh toán.
              </div>
            </div>
          ) : (
            <div className="mt-8 flex h-64 items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 pt-5">
              {stats.monthlyRevenue.map((item) => (
                <div
                  key={item.label}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="invisible rounded-lg bg-slate-950 px-2 py-1.5 text-[11px] font-extrabold text-white shadow-lg group-hover:visible">
                    {money(item.amount)}
                  </div>

                  <div
                    className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-blue-700 via-blue-600 to-cyan-400 shadow-[0_10px_30px_-15px_rgba(37,99,235,0.65)] transition-all duration-700 group-hover:from-indigo-700 group-hover:to-violet-400"
                    style={{
                      height: `${Math.max(
                        (item.amount / maxRevenue) * 78,
                        item.amount ? 8 : 2
                      )}%`,
                    }}
                  />

                  <span className="pb-3 text-xs font-extrabold text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MONEY OVERVIEW */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
            Tổng quan tài chính
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Dòng tiền nền tảng
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Tình trạng thu phí giao dịch hiện tại.
          </p>

          <div className="mt-6 space-y-3">
            <MoneyBox
              label="Đã thu"
              value={stats.totalRevenue}
              note={`${stats.paidInvoices} hóa đơn`}
              tone="emerald"
            />
            <MoneyBox
              label="Chờ thu"
              value={stats.outstandingRevenue}
              note={`${stats.pendingInvoices} hóa đơn`}
              tone="amber"
            />
            <MoneyBox
              label="Phí dự kiến"
              value={stats.projectedRevenue}
              tone="blue"
            />
          </div>

          <Link
            href="/admin/transactions"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/20"
          >
            Xem giao dịch và hóa đơn
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink
          href="/admin/users"
          title="Quản lý người dùng"
          description="Xem tài khoản, phân quyền và trạng thái người dùng."
          tone="blue"
        />
        <QuickLink
          href="/admin/posts"
          title="Kiểm duyệt bài đăng"
          description={`${stats.pendingPosts} bài đăng đang chờ xử lý.`}
          tone="amber"
        />
        <QuickLink
          href="/admin/reports"
          title="Báo cáo vi phạm"
          description="Theo dõi và xử lý nội dung được người dùng báo cáo."
          tone="rose"
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  icon: React.ReactNode;
}) {
  const styles: Record<string, { icon: string; bar: string }> = {
    blue: {
      icon: 'border-blue-100 bg-blue-50 text-blue-700',
      bar: 'from-blue-600 to-indigo-600',
    },
    cyan: {
      icon: 'border-cyan-100 bg-cyan-50 text-cyan-700',
      bar: 'from-cyan-500 to-blue-600',
    },
    emerald: {
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      bar: 'from-emerald-500 to-teal-600',
    },
    violet: {
      icon: 'border-violet-100 bg-violet-50 text-violet-700',
      bar: 'from-violet-500 to-fuchsia-600',
    },
  };

  const selected = styles[tone] || styles.blue;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected.bar}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-500">{label}</p>
          <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm font-medium leading-5 text-slate-500">
            {note}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${selected.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function MoneyBox({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone: 'emerald' | 'amber' | 'blue';
}) {
  const styles = {
    emerald:
      'border-emerald-100 bg-emerald-50/80 text-emerald-900',
    amber: 'border-amber-100 bg-amber-50/80 text-amber-900',
    blue: 'border-blue-100 bg-blue-50/80 text-blue-900',
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold">{label}</p>
        {note && (
          <span className="rounded-lg bg-white/60 px-2 py-1 text-xs font-extrabold">
            {note}
          </span>
        )}
      </div>

      <p className="mt-2 text-xl font-black tracking-tight">
        {money(value)}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  tone: 'blue' | 'amber' | 'rose';
}) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50/60 text-blue-700',
    amber: 'border-amber-100 bg-amber-50/60 text-amber-700',
    rose: 'border-rose-100 bg-rose-50/60 text-rose-700',
  };

  return (
    <Link
      href={href}
      className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`inline-flex rounded-xl border px-3 py-1.5 text-xs font-extrabold ${styles[tone]}`}
      >
        Truy cập nhanh
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all group-hover:bg-blue-600 group-hover:text-white">
          →
        </div>
      </div>
    </Link>
  );
}

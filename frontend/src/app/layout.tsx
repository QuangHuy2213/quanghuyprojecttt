import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nhà Tốt - Nền tảng Bất động sản hàng đầu',
  description:
    'Tìm kiếm, mua bán và cho thuê ngôi nhà mơ ước của bạn tại Nhà Tốt.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const themeScript = `(function(){try{var saved=localStorage.getItem('theme');var dark=saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}})()`;
  return (
    <html
      lang="vi"
      className="h-full scroll-smooth antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full bg-slate-100 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}

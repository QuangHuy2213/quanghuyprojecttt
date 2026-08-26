import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'Nhà Tốt - Nền tảng Bất động sản hàng đầu',
  description: 'Tìm kiếm, mua bán và cho thuê ngôi nhà mơ ước của bạn tại Nhà Tốt.',
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

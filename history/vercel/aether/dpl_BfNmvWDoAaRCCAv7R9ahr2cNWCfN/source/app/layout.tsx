import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SINE FINE｜无中之庭',
  description:
    '观察一个现代魔法街区里的日常、关系与完整人生。制定规则，让故事在生活里发生。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { FateProvider } from '@/components/fate-provider';

export const metadata: Metadata = {
  title: 'SINE FINE｜无中之庭',
  description:
    '从冬木街道开始，观察相遇与日常。自然界、人类社会与自由创造，共同构成无中之庭。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <FateProvider>{children}</FateProvider>
      </body>
    </html>
  );
}

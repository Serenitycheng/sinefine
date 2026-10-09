import type { Metadata } from 'next';
import FateEmiyaLifePlaytest from '@/components/fate-emiya-life';

export const metadata: Metadata = {
  title: '卫宫宅家庭生活试玩 · SINE FINE',
  description: '卫宫宅2.5D家庭生活、居民日常与独立本地试玩记录。',
};
export default function EmiyaLifePage() {
  return <FateEmiyaLifePlaytest />;
}

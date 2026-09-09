'use client';
import { useRouter } from 'next/navigation';
import { FateAISettings } from '@/components/fate-conversation';
export default function ConnectDeepSeekPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100svh', background: '#142023' }}>
      <FateAISettings onClose={() => router.replace('/fate/street')} />
    </main>
  );
}

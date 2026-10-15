'use client';
import { useRouter } from 'next/navigation';
import { FateAISettings } from '@/components/fate-conversation';
export default function ConnectDeepSeekPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100svh', background: '#f6f3eb' }}>
      <FateAISettings onClose={() => router.replace('/fate/street')} />
    </main>
  );
}

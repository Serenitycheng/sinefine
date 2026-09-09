import type { Metadata } from 'next';
import FateStreetSession from '@/components/fate-street-session';

export const metadata: Metadata = {
  title: '冬木街道 · SINE FINE｜无中之庭',
  description: '以自己的角色或熟悉的 Fate 角色走进冬木的生活街道。',
};

export default function StreetPage() {
  return <FateStreetSession />;
}

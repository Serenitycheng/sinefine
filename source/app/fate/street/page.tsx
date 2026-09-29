import type { Metadata } from 'next';
import FateStreetSession from '@/components/fate-street-session';

export const metadata: Metadata = {
  title: '冬木市 · SINE FINE｜无终之庭',
  description: '以自己的角色或熟悉的 Fate 角色走进冬木市的连续街道。',
};

export default function StreetPage() {
  return <FateStreetSession />;
}

import type { Metadata } from 'next';
import FateStreetSession from '@/components/fate-street-session';

export const metadata: Metadata = {
  title: '冬木 2.5D 街区 · SINE FINE｜无终之庭',
  description:
    '沿冬木市道路漫游，进入住宅与公共建筑，体验柔和融合版 2.5D 场景。',
};
export default function CityArtPage() {
  return <FateStreetSession />;
}

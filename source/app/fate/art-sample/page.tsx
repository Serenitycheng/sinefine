import type { Metadata } from 'next';
import FateArtSample from '@/components/fate-art-sample';

export const metadata: Metadata = {
  title: '融合版样板街区 · SINE FINE｜无终之庭',
  description: '独立的融合版画风与操作样板，支持纯2D总览和2.5D取景；冬木地图扩展另有制作入口。',
};

export default function ArtSamplePage() {
  return <FateArtSample />;
}

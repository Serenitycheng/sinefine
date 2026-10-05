import type { Metadata } from 'next';
import FateArtSample from '@/components/fate-art-sample';

export const metadata: Metadata = {
  title: '街道美术小样 · SINE FINE｜无终之庭',
  description: '住宅街与街角咖啡店的一段融合版画面小样。',
};

export default function ArtSamplePage() {
  return <FateArtSample />;
}

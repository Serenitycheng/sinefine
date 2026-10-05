import type { Metadata } from 'next';
import FateArtSample3D from '@/components/fate-art-sample-3d';

export const metadata: Metadata = {
  title: '3D街道小样 · SINE FINE｜无终之庭',
  description: '住宅街与街角咖啡店的可旋转3D场景，独立美术对照。',
};

export default function ArtSample3DPage() {
  return <FateArtSample3D />;
}

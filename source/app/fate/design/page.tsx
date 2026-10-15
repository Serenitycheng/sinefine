import type { Metadata } from 'next';
import SinefineDesignPreview from '@/components/sinefine-design-preview';

export const metadata: Metadata = { title: '庭间 · 界面预览｜SINE FINE' };
export default function DesignPage() {
  return <SinefineDesignPreview />;
}

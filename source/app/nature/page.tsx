import type { Metadata } from 'next';
import NatureWorld from '@/components/nature-world';

export const metadata: Metadata = {
  title: '自然界 · SINE FINE｜无终之庭',
  description:
    '从一片草木开始，观察山谷里的天气、觅食与新生。一个可以亲手照料的简化生态。',
};

export default function NaturePage() {
  return <NatureWorld />;
}

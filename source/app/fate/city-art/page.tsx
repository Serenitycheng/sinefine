import type { Metadata } from 'next';
import FateCityArt from '@/components/fate-city-art';

export const metadata: Metadata = {
  title: '冬木街区制作 · SINE FINE｜无终之庭',
  description: '按冬木地图制作街区、角色和室内；纯2D总览与融合版2.5D住宅坂试点。',
};
export default function CityArtPage() { return <FateCityArt/>; }

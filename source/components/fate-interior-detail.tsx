'use client';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { runtimeArt } from '@/lib/fate-runtime-art';
import { interiorDetailCrop } from '@/lib/fate-interior-detail';
import type { CityPoint } from '@/lib/fate-city-layout';
import type { InteriorRect } from '@/lib/fate-city-interior-scenes';
import styles from './fate-interior-detail.module.css';

export function FateInteriorDetail({
  painting,
  target,
  title,
  detail,
  layers,
  frame,
  onClose,
}: {
  painting: string;
  target: CityPoint;
  title: string;
  detail: string;
  layers?: ReactNode;
  frame?: InteriorRect;
  onClose: () => void;
}) {
  const crop = frame ?? interiorDetailCrop(target);
  return (
    <aside
      className={styles.detail}
      data-game-detail
      aria-label={`${title}特写`}
    >
      <header>
        <span>{title}</span>
        <button type="button" aria-label="收起物件特写" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <svg
        className={styles.picture}
        viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
        aria-label={`${title}局部放大`}
      >
        <title>{title}局部放大</title>
        <image href={runtimeArt(painting)} width="1600" height="900" />
        {layers && (
          <foreignObject x="0" y="0" width="1600" height="900">
            <div style={{ position: 'relative', width: 1600, height: 900 }}>
              {layers}
            </div>
          </foreignObject>
        )}
      </svg>
      <p>{detail}</p>
    </aside>
  );
}

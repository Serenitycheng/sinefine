'use client';
import { useEffect, useState } from 'react';
import type { PreviewSprite } from '@/lib/fate-preview-house';
import { loadArtImages } from '@/lib/fate-art-loader';
import { runtimeArt } from '@/lib/fate-runtime-art';
import { ILLYA_DISPLAY_SCALE } from '@/lib/fate-actor-proportions';
import { FateArtRig } from './fate-art-rig';
import styles from './fate-city-art.module.css';

export function FateCityResident({
  id,
  name,
  sprite,
  x,
  y,
  scale,
  selected,
  hidden,
  direction,
  gait,
}: {
  id: string;
  name: string;
  sprite: PreviewSprite;
  x: number;
  y: number;
  scale: number;
  selected: boolean;
  hidden?: boolean;
  direction?: string;
  gait?: number;
}) {
  const [decoded, setDecoded] = useState('');
  const [failed, setFailed] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void loadArtImages([sprite.file])
      .then(() => {
        if (active) setDecoded(sprite.file);
      })
      .catch(() => {
        if (active) setFailed(sprite.file);
      });
    return () => {
      active = false;
    };
  }, [sprite.file, retry]);
  const size = (scale * sprite.scale) / ILLYA_DISPLAY_SCALE;
  if (!hidden && failed === sprite.file && decoded !== sprite.file)
    return (
      <button
        type="button"
        className={styles.residentRetry}
        style={{ left: x, top: y }}
        onClick={() => setRetry((value) => value + 1)}
      >
        {name} · 重新载入
      </button>
    );
  return (
    <div
      className={styles.actor}
      hidden={hidden || decoded !== sprite.file}
      style={{ left: x, top: y, zIndex: Math.round(y) }}
      aria-label={`${name}${selected ? ' · 当前人物' : ''}`}
      data-city-actor={id}
      data-city-controlled={selected}
      data-walk-direction={direction}
      data-walk-phase={gait}
      data-body-facing={sprite.bodyFacing}
      data-body-art={sprite.materialVersion}
      data-foot-x={x}
      data-foot-y={y}
    >
      <span
        className={styles.shadow}
        style={{ transform: `scale(${scale})` }}
      />
      {sprite.rig ? (
        <FateArtRig sprite={sprite} scale={size} />
      ) : (
        <span
          className={styles.sprite}
          style={{
            width: sprite.cellWidth * size,
            height: sprite.cellHeight * size,
            backgroundImage: `url(${runtimeArt(sprite.file)})`,
            backgroundSize: `${sprite.imageWidth * size}px ${sprite.imageHeight * size}px`,
            backgroundPosition: `${-sprite.cropX * size}px ${-sprite.cropY * size}px`,
            clipPath: sprite.clip
              ? `polygon(${sprite.clip.map(([x, y]) => `${(x / sprite.cellWidth) * 100}% ${(y / sprite.cellHeight) * 100}%`).join(',')})`
              : undefined,
            transform: `translate(${-sprite.anchorX * size}px,${-sprite.anchorY * size}px)${sprite.mirror ? ' scaleX(-1)' : ''}`,
          }}
        />
      )}
    </div>
  );
}

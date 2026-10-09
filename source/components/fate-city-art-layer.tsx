'use client';

import Image from 'next/image';
import { cityArtCamera, type CityArtMode } from '@/lib/fate-city-art-camera';
import { CITY_ART_SCENES, type CityArtScene } from '@/lib/fate-city-art-scenes';
import { cityPilotPaint } from '@/lib/fate-city-art';
import { cityArtDepth } from '@/lib/fate-city-art-registration';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import { ILLYA_ART_SPRITE } from '@/lib/fate-character-art';
import type { CityPoint } from '@/lib/fate-city-layout';
import styles from './fate-city-art.module.css';

export type CityArtActorView = {
  point: CityPoint;
  direction: 'down' | 'left' | 'right' | 'up';
  frame: number;
};

/** Every layer is a complete painting with its own registered floor. The
 * departing layer is decorative; only the incoming view owns interactions. */
export default function FateCityArtLayer({
  mode,
  scene = 'residential',
  view,
  origin,
  scale,
  actorScale,
  departing = false,
  arriving = false,
  inert = false,
}: {
  mode: CityArtMode;
  scene?: CityArtScene;
  view: CityArtActorView;
  origin: CityPoint;
  scale: number;
  actorScale: number;
  departing?: boolean;
  arriving?: boolean;
  inert?: boolean;
}) {
  const camera = cityArtCamera(mode, scene);
  const player = cityPilotPaint(view.point, mode, scene);
  const anchor = ART_SPRITE_FRAMES[view.direction][view.frame];
  const depth = cityArtDepth(view.point, mode, scene);
  const spriteScale = actorScale * anchor.scale;
  return (
    <div
      className={`${styles.world} ${departing ? styles.departing : arriving ? styles.arriving : ''}`}
      style={{
        width: camera.width,
        height: camera.height,
        transform: `translate(${origin.x}px,${origin.y}px) scale(${scale})`,
      }}
      inert={inert || departing}
      aria-hidden={departing || undefined}
      data-painting-mode={mode}
      data-painting-scene={scene}
    >
      <Image
        src={camera.painting}
        width={camera.width}
        height={camera.height}
        unoptimized
        loading="eager"
        alt={
          departing
            ? ''
            : `柔和融合版${CITY_ART_SCENES[scene].name}，${camera.label}，${CITY_ART_SCENES[scene].description}，共用连续铺装`
        }
        draggable={false}
        className={styles.painting}
      />
      <div
        className={styles.actor}
        hidden={departing}
        style={{ left: player.x, top: player.y }}
        aria-label={departing ? undefined : '伊莉雅的当前站位'}
        data-foot-x={player.x.toFixed(3)}
        data-foot-y={player.y.toFixed(3)}
        data-walk-direction={view.direction}
        data-walk-frame={view.frame}
      >
        <span
          className={styles.shadow}
          style={{ transform: `scale(${depth})` }}
        />
        <span
          className={styles.sprite}
          style={{
            width: 256 * spriteScale,
            height: 256 * spriteScale,
            backgroundImage: `url(${ILLYA_ART_SPRITE})`,
            backgroundPosition: `${(view.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.direction) / 3) * 100}%`,
            transform: `translate(${-anchor.x * spriteScale}px,${-anchor.y * spriteScale}px)`,
          }}
        />
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { cityArtCamera, type CityArtMode } from '@/lib/fate-city-art-camera';
import { CITY_ART_SCENES, type CityArtScene } from '@/lib/fate-city-art-scenes';
import { cityPilotPaint } from '@/lib/fate-city-art';
import { cityArtDepth } from '@/lib/fate-city-art-registration';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import { ILLYA_ART_SPRITE } from '@/lib/fate-character-art';
import { runtimeArt } from '@/lib/fate-runtime-art';
import { houseResidentSprite } from '@/lib/fate-house-sprites';
import { fatePerson, type PartnerId, type WaverStage } from '@/lib/fate-cast';
import { cityPilotWalkable } from '@/lib/fate-city-art-navigation';
import { FateCityResident } from './fate-city-resident';
import { isPartner } from '@/lib/fate-cast';
import type { ActorId } from '@/lib/street';
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
  actorReady = true,
  actor,
  stage = 'adult',
  residents = [],
  actorInside = false,
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
  actorReady?: boolean;
  actor?: ActorId;
  stage?: WaverStage;
  residents?: (CityArtActorView & { id: PartnerId })[];
  actorInside?: boolean;
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
        src={runtimeArt(camera.painting)}
        width={camera.width}
        height={camera.height}
        unoptimized
        loading="eager"
        fetchPriority="high"
        alt={
          departing
            ? ''
            : `柔和融合版${CITY_ART_SCENES[scene].name}，${camera.label}，${CITY_ART_SCENES[scene].description}，共用连续铺装`
        }
        draggable={false}
        className={styles.painting}
      />
      {actor &&
        [
          ...residents.filter(
            (person) =>
              person.id !== actor && cityPilotWalkable(person.point, 1, scene),
          ),
          { ...view, id: actor },
        ].map((person) => {
          if (!isPartner(person.id)) return null;
          const sprite = houseResidentSprite(
            person.id,
            person.direction,
            person.frame,
            stage,
          );
          if (!sprite) return null;
          const foot = cityPilotPaint(person.point, mode, scene);
          const depthRatio =
            cityArtDepth(person.point, mode, scene) / Math.max(0.01, depth);
          return (
            <FateCityResident
              key={person.id}
              id={person.id}
              name={fatePerson(person.id, stage)!.name}
              sprite={sprite}
              x={foot.x}
              y={foot.y}
              scale={actorScale * depthRatio}
              selected={person.id === actor}
              hidden={
                departing || !actorReady || (person.id === actor && actorInside)
              }
            />
          );
        })}
      {!actor && (
        <div
          className={styles.actor}
          hidden={departing || !actorReady}
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
              backgroundImage: `url(${runtimeArt(ILLYA_ART_SPRITE)})`,
              backgroundPosition: `${(view.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.direction) / 3) * 100}%`,
              transform: `translate(${-anchor.x * spriteScale}px,${-anchor.y * spriteScale}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}

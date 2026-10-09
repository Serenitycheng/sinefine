'use client';

import { ArrowUp, DoorOpen, Signpost } from 'lucide-react';
import { cityPilotPaint } from '@/lib/fate-city-art';
import {
  cityArtGuidePositions,
  type CityArtPlace,
} from '@/lib/fate-city-art-map';
import { cityArtExits } from '@/lib/fate-city-art-portals';
import { CITY_ART_SCENES, type CityArtScene } from '@/lib/fate-city-art-scenes';
import type { CityArtMode } from '@/lib/fate-city-art-camera';
import type { CityPoint } from '@/lib/fate-city-layout';
import styles from './fate-city-art.module.css';

export default function FateCityWayfinding({
  scene,
  mode,
  origin,
  scale,
  size,
  places,
  onPlace,
  onExit,
  inert,
  actorBounds,
}: {
  scene: CityArtScene;
  mode: CityArtMode;
  origin: CityPoint;
  scale: number;
  size: { width: number; height: number };
  places: CityArtPlace[];
  onPlace: (place: CityArtPlace) => void;
  onExit: (scene: CityArtScene, point: CityPoint) => void;
  inert: boolean;
  actorBounds?: { x: number; y: number; width: number; height: number };
}) {
  const guides = [
    ...places.map((place) => ({
      id: place.id,
      point: place.point,
      name: place.name.split(' · ')[0],
      exit: false,
      action: () => onPlace(place),
    })),
    ...cityArtExits(scene).map((exit) => ({
      id: exit.id,
      point: exit.point,
      name: CITY_ART_SCENES[exit.scene].name,
      exit: true,
      action: () => onExit(exit.scene, exit.point),
    })),
  ];
  const screens = guides.map((guide) => {
    const paint = cityPilotPaint(guide.point, mode, scene);
    return { x: origin.x + paint.x * scale, y: origin.y + paint.y * scale };
  });
  const marks = cityArtGuidePositions(screens, size, actorBounds);
  return (
    <div className={styles.wayfinding} inert={inert}>
      {guides.map((guide, index) => {
        const screen = screens[index];
        const mark = marks[index];
        const angle =
          (Math.atan2(screen.y - mark.y, screen.x - mark.x) * 180) / Math.PI +
          90;
        return (
          <span key={guide.id}>
            <i
              aria-hidden="true"
              className={`${styles.threshold} ${guide.exit ? styles.exitThreshold : ''}`}
              style={{ left: screen.x, top: screen.y }}
            />
            <button
              key={guide.id}
              type="button"
              disabled={inert}
              className={`${styles.guide} ${guide.exit ? styles.exitGuide : ''}`}
              style={{ left: mark.x, top: mark.y }}
              onClick={guide.action}
              data-street-exit={guide.exit ? guide.id : undefined}
              data-street-entrance={!guide.exit ? guide.id : undefined}
              data-guide-pinned={mark.pinned}
              aria-label={
                guide.exit
                  ? `出口：前往${guide.name}`
                  : `入口：前往${guide.name}`
              }
            >
              {mark.pinned ? (
                <ArrowUp
                  size={13}
                  style={{ transform: `rotate(${angle}deg)` }}
                />
              ) : guide.exit ? (
                <Signpost size={14} />
              ) : (
                <DoorOpen size={14} />
              )}
              <span>
                <small>{guide.exit ? '出口' : '入口'}</small>
                {guide.name}
              </span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

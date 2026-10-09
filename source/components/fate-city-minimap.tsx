'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- An inline SVG exposes the vector map as one accessible image. */

import { CITY_ROADS, type CityPoint } from '@/lib/fate-city-layout';
import { HOME_ENTRANCES } from '@/lib/fate-home-entrances';
import { CITY_ART_SCENES, type CityArtScene } from '@/lib/fate-city-art-scenes';
import { cityArtExits } from '@/lib/fate-city-art-portals';
import {
  cityArtMapBounds,
  cityArtScenePlaces,
  CITY_ART_RIVER_PATH,
  CITY_ART_SEA_PATH,
} from '@/lib/fate-city-art-map';
import styles from './fate-city-art.module.css';

export default function FateCityMinimap({
  point,
  scene,
  onOpen,
  inert,
}: {
  point: CityPoint;
  scene: CityArtScene;
  onOpen: () => void;
  inert: boolean;
}) {
  const bounds = cityArtMapBounds(scene, point);
  const unit = bounds.width / 192;
  const line = (points: readonly CityPoint[]) =>
    points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <div className={styles.minimap} inert={inert}>
      <button type="button" onClick={onOpen} aria-label="打开冬木总览">
        <svg
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          role="img"
          aria-label={`${CITY_ART_SCENES[scene].name}定位图：当前位置、道路、入口与出口`}
          data-minimap-scene={scene}
        >
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="#dce1c8"
          />
          <path d={CITY_ART_SEA_PATH} fill="#87acae" />
          <path d={CITY_ART_RIVER_PATH} fill="#87acae" />
          {CITY_ROADS.map((road) => (
            <polyline
              key={road.id}
              points={line(road.points)}
              fill="none"
              stroke="#f2ecda"
              strokeWidth={road.width * 0.65}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {Object.values(HOME_ENTRANCES).map((entry) => (
            <polyline
              key={entry.home}
              points={line(entry.points)}
              fill="none"
              stroke="#a9b49b"
              strokeWidth={entry.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <polyline
            points={line(CITY_ART_SCENES[scene].points)}
            fill="none"
            stroke="#71866a"
            strokeWidth={3 * unit}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {cityArtScenePlaces(scene).map((place) => (
            <rect
              key={place.id}
              x={place.point.x - 3 * unit}
              y={place.point.y - 3 * unit}
              width={6 * unit}
              height={6 * unit}
              fill="#956f61"
              data-minimap-place={place.id}
            >
              <title>{`${place.name}入口`}</title>
            </rect>
          ))}
          {cityArtExits(scene).map((exit) => (
            <path
              key={exit.id}
              transform={`translate(${exit.point.x} ${exit.point.y}) scale(${unit})`}
              d="M0-5L5 0L0 5L-5 0Z"
              fill="#537f87"
              stroke="#f4eedb"
              strokeWidth="1.5"
              data-minimap-exit={exit.id}
            >
              <title>{`出口：${CITY_ART_SCENES[exit.scene].name}`}</title>
            </path>
          ))}
          <circle
            cx={point.x}
            cy={point.y}
            r={4.5 * unit}
            fill="#f3d88b"
            stroke="#405746"
            strokeWidth={1.8 * unit}
            data-minimap-player
            data-world-x={point.x.toFixed(3)}
            data-world-y={point.y.toFixed(3)}
          />
        </svg>
        <span>
          <b>●</b> 当前位置 <i>◆</i> 出口 <small>总览 ↗</small>
        </span>
      </button>
    </div>
  );
}

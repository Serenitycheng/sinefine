'use client';

import { memo, useId } from 'react';
import { DISTRICT_LANDMARKS, STREET_SCENE_SCALE } from '@/lib/fate-district';
import {
  ATLAS_SIZE,
  BUILDING_ATLAS,
  BUILDING_FRAMES,
  LANDMARK_BUILDINGS,
  NEIGHBOURHOOD_BUILDINGS,
  PROP_ATLAS,
  PROP_FRAMES,
  TERRAIN_ATLAS,
  overlapsStreet,
  type BuildingFrame,
  type PropFrame,
} from '@/lib/fate-environment';
import { STREET } from '@/lib/street';
import {
  HOME_ENTRANCES,
  overlapsHomeApproach,
} from '@/lib/fate-home-entrances';
import {
  CITY_ROADS,
  CITY_SEGMENTS,
  type CityRoad,
} from '@/lib/fate-city-layout';
import styles from './street-walk.module.css';

function PaintedBuilding({
  frame,
  x,
  bottom,
  width,
  height,
}: {
  frame: BuildingFrame;
  x: number;
  bottom: number;
  width: number;
  height?: number;
}) {
  const [sx, sy, sw, sh] = BUILDING_FRAMES[frame];
  const h = height ?? (width * sh) / sw;
  return (
    <svg
      x={x - width / 2}
      y={bottom - h}
      width={width}
      height={h}
      viewBox={`${sx} ${sy} ${sw} ${sh}`}
      overflow="hidden"
      preserveAspectRatio="xMidYMax meet"
    >
      <image href={BUILDING_ATLAS} width={ATLAS_SIZE} height={ATLAS_SIZE} />
    </svg>
  );
}

function PaintedProp({
  frame,
  x,
  bottom,
  size,
}: {
  frame: PropFrame;
  x: number;
  bottom: number;
  size: number;
}) {
  const [sx, sy, sw, sh] = PROP_FRAMES[frame];
  return (
    <svg
      x={x - size / 2}
      y={bottom - size}
      width={size}
      height={size}
      viewBox={`${sx} ${sy} ${sw} ${sh}`}
      overflow="hidden"
      preserveAspectRatio="xMidYMax meet"
    >
      <image href={PROP_ATLAS} width={ATLAS_SIZE} height={ATLAS_SIZE} />
    </svg>
  );
}

const LANDMARK_PROPS: Partial<
  Record<
    BuildingFrame,
    ReadonlyArray<{
      frame: PropFrame;
      dx: number;
      dy: number;
      size: number;
    }>
  >
> = {
  einzbern: [
    { frame: 'gate', dx: -132, dy: -57, size: 77 },
    { frame: 'hedge', dx: 128, dy: -50, size: 105 },
  ],
  emiya: [
    { frame: 'gate', dx: -132, dy: -56, size: 82 },
    { frame: 'bicycle', dx: 134, dy: -53, size: 58 },
  ],
  tohsaka: [
    { frame: 'wall', dx: -152, dy: -53, size: 112 },
    { frame: 'maple', dx: 147, dy: -54, size: 105 },
  ],
  matou: [
    { frame: 'gate', dx: -141, dy: -57, size: 85 },
    { frame: 'tree', dx: 139, dy: -55, size: 110 },
  ],
  waver: [
    { frame: 'bicycle', dx: -120, dy: -55, size: 58 },
    { frame: 'plants', dx: 120, dy: -54, size: 64 },
  ],
  temple: [
    { frame: 'riverSteps', dx: 0, dy: 15, size: 94 },
    { frame: 'tree', dx: 160, dy: -54, size: 125 },
  ],
  church: [
    { frame: 'wall', dx: -147, dy: -55, size: 113 },
    { frame: 'tree', dx: 148, dy: -54, size: 105 },
  ],
  kayneth: [
    { frame: 'wall', dx: -142, dy: -55, size: 118 },
    { frame: 'gate', dx: 142, dy: -54, size: 79 },
  ],
  fujimura: [
    { frame: 'maple', dx: -148, dy: -52, size: 118 },
    { frame: 'gate', dx: 142, dy: -54, size: 82 },
  ],
  natalia: [
    { frame: 'bicycle', dx: -125, dy: -50, size: 55 },
    { frame: 'hedge', dx: 124, dy: -49, size: 100 },
  ],
  school: [
    { frame: 'schoolGate', dx: -173, dy: -53, size: 100 },
    { frame: 'tree', dx: 179, dy: -55, size: 114 },
  ],
  cafe: [
    { frame: 'shopfront', dx: -134, dy: -54, size: 94 },
    { frame: 'bicycle', dx: 132, dy: -51, size: 54 },
  ],
  shops: [
    { frame: 'vending', dx: -145, dy: -54, size: 78 },
    { frame: 'postbox', dx: 151, dy: -55, size: 64 },
  ],
  park: [
    { frame: 'bench', dx: -141, dy: -56, size: 92 },
    { frame: 'tree', dx: 151, dy: -55, size: 118 },
  ],
};

const ROAD_PROPS = CITY_SEGMENTS.filter(
  (s) => s.road.kind !== 'bridge',
).flatMap((s, i) => {
  const dx = s.b.x - s.a.x,
    dy = s.b.y - s.a.y,
    length = Math.hypot(dx, dy);
  const size = i % 3 === 0 ? 78 : 94,
    offset = s.radius + 75;
  return [-1, 1]
    .map((side) => ({
      x: (s.a.x + s.b.x) / 2 - (dy / length) * offset * side,
      bottom: (s.a.y + s.b.y) / 2 + (dx / length) * offset * side + size / 2,
      frame: (s.road.kind === 'avenue'
        ? 'lamp'
        : i % 3 === 0
          ? 'hedge'
          : 'tree') as PropFrame,
      size,
    }))
    .filter(
      (p) =>
        !(p.x > 1490 && p.x < 1780) &&
        !overlapsStreet(p.x, p.bottom, p.size * 0.65, p.size) &&
        !LANDMARK_BUILDINGS.some(
          (b) =>
            Math.abs(b.x - p.x) < b.width / 2 + 45 &&
            p.bottom > b.y - b.height &&
            p.bottom - p.size < b.y,
        ),
    );
});

const RIVER_PROPS = [220, 670, 1100, 1570].flatMap((y) => [
  { frame: 'riverSteps' as const, x: 1460, bottom: y, size: 95 },
  { frame: 'riverSteps' as const, x: 1807, bottom: y + 60, size: 95 },
]);

function RoadSurface({ prefix }: { prefix: string }) {
  const d = (r: CityRoad) =>
    r.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  // Draw all outer edges before every surface, so a branch never leaves a curb
  // across the middle of another road. Stroke widths match collision capsules.
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {CITY_ROADS.map((r) => (
        <path
          key={`${r.id}-edge`}
          d={d(r)}
          stroke="#d8d3bd"
          strokeWidth={r.width + 9}
        />
      ))}
      {CITY_ROADS.map((r) => (
        <path
          key={r.id}
          d={d(r)}
          stroke={`url(#${prefix}-asphalt)`}
          strokeWidth={r.width}
        />
      ))}
      {CITY_ROADS.filter((r) => r.kind === 'avenue' || r.kind === 'bridge').map(
        (r) => (
          <path
            key={`${r.id}-line`}
            d={d(r)}
            stroke="#eee2c7"
            strokeWidth="2"
            strokeDasharray="18 26"
            opacity=".7"
          />
        ),
      )}
      {CITY_ROADS.filter((r) => r.kind === 'bridge').map((r) => {
        const a = r.points[0],
          b = r.points[1];
        return (
          <g key={`${r.id}-rail`} stroke="#607678" strokeWidth="5">
            <path
              d={`M${a.x} ${a.y - r.width / 2 - 7}H${b.x}M${a.x} ${a.y + r.width / 2 + 7}H${b.x}`}
            />
            {Array.from({ length: 10 }, (_, i) => (
              <path
                key={i}
                d={`M${a.x + 8 + i * 28} ${a.y - r.width / 2 - 14}v14M${a.x + 8 + i * 28} ${a.y + r.width / 2}v14`}
              />
            ))}
          </g>
        );
      })}
      {[770, 860, 950].map((y) => (
        <path
          key={y}
          d={`M282 ${y}q110 -70 180 -40M50 ${y + 510}q200 -75 350 -40`}
          stroke="#526f50"
          strokeWidth="3"
          opacity=".2"
        />
      ))}
    </g>
  );
}

const TREES = Array.from({ length: 110 }, (_, i) => ({
  x: 85 + ((i * 337) % 2920),
  y: 165 + ((i * 257) % 1390),
  size: 18 + (i % 7),
})).filter(
  (p) =>
    !(p.x > 1470 && p.x < 1800) &&
    !overlapsStreet(p.x, p.y, 45, 52) &&
    !DISTRICT_LANDMARKS.some(
      (l) => Math.abs(l.x - p.x) < 150 && p.y > l.y - 270 && p.y < l.y + 30,
    ),
);
const LAMPS = ROAD_PROPS.filter((p) => p.frame === 'lamp').map((p) => ({
  x: p.x,
  y: p.bottom,
}));

export const FateStreetScenery = memo(function FateStreetScenery({
  period = '午后',
  map = false,
  miniature = false,
  labels = true,
}: {
  period?: string;
  map?: boolean;
  miniature?: boolean;
  labels?: boolean;
}) {
  const prefix = useId().replace(/:/g, '');
  const night = period === '夜间';
  const sunset = period === '傍晚';
  return (
    <div
      className={map ? styles.mapScenery : styles.continuousScenery}
      aria-hidden="true"
      style={
        map
          ? undefined
          : {
              width: STREET.width * STREET_SCENE_SCALE,
              height: STREET.height * STREET_SCENE_SCALE,
            }
      }
    >
      <svg
        className={styles.sceneryWorld}
        viewBox={`0 0 ${STREET.width} ${STREET.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`${prefix}-land`} x2="0" y2="1">
            <stop stopColor="#a7b692" />
            <stop offset="1" stopColor="#b6c39c" />
          </linearGradient>
          <radialGradient id={`${prefix}-glow`}>
            <stop stopColor="#ffd697" stopOpacity=".65" />
            <stop offset="1" stopColor="#ffc774" stopOpacity="0" />
          </radialGradient>
          <pattern
            id={`${prefix}-asphalt`}
            width="230"
            height="230"
            patternUnits="userSpaceOnUse"
          >
            <image href={TERRAIN_ATLAS} width="460" height="460" />
          </pattern>
          <pattern
            id={`${prefix}-sidewalk`}
            width="230"
            height="230"
            patternUnits="userSpaceOnUse"
          >
            <image href={TERRAIN_ATLAS} x="-230" width="460" height="460" />
          </pattern>
          <pattern
            id={`${prefix}-grass`}
            width="230"
            height="230"
            patternUnits="userSpaceOnUse"
          >
            <image href={TERRAIN_ATLAS} y="-230" width="460" height="460" />
          </pattern>
          <pattern
            id={`${prefix}-water`}
            width="230"
            height="230"
            patternUnits="userSpaceOnUse"
          >
            <image
              href={TERRAIN_ATLAS}
              x="-230"
              y="-230"
              width="460"
              height="460"
            />
          </pattern>
        </defs>
        <rect width="3100" height="1660" fill={`url(#${prefix}-land)`} />
        <rect
          width="3100"
          height="1660"
          fill={`url(#${prefix}-grass)`}
          opacity=".58"
        />
        <path
          d="M0 800q220-70 410 20t280 250 440 430l80 160H0Z"
          fill="#668667"
          opacity=".28"
        />
        <path
          d="M0 1130q210-110 320-30t180 150 330 220M20 1510q120-160 260-70t200 145"
          fill="none"
          stroke="#6c8b63"
          strokeWidth="22"
          opacity=".22"
        />
        <path
          d="M1780 1050q220-65 420-20t390-35 510-30v315H1780Z"
          fill="#d3c6a9"
          opacity=".25"
        />
        <path
          d="M2350 720q140-80 225 40t55 165q-100 55-220-15t-60-190Z"
          fill="#8caa83"
          opacity=".7"
        />
        <path
          d="M2490 410q150-60 320-10t260 180v-270Z"
          fill="#82996f"
          opacity=".28"
        />
        <rect
          x="1500"
          width="272"
          height="1660"
          fill={`url(#${prefix}-sidewalk)`}
        />
        <rect
          x="1530"
          width="210"
          height="1660"
          fill={`url(#${prefix}-water)`}
        />
        <path d="M1527 0v1660M1743 0v1660" stroke="#8a9384" strokeWidth="7" />
        <path
          d="M1540 0v1660M1731 0v1660"
          stroke="#d8d6be"
          strokeWidth="2"
          opacity=".8"
        />
        <path
          d="M0 0H3100V110q-400 70-800 20t-670 20-650-15-650 0L0 150Z"
          fill={`url(#${prefix}-water)`}
        />
        <path
          d="M0 155q320-45 650-15t650 15 670-20 630-5 500-20"
          fill="none"
          stroke="#e6ddbf"
          strokeWidth="12"
          opacity=".8"
        />
        {NEIGHBOURHOOD_BUILDINGS.map((b, i) => (
          <PaintedBuilding key={i} {...b} bottom={b.y} />
        ))}
        <RoadSurface prefix={prefix} />
        {Object.values(HOME_ENTRANCES).map((entrance) => (
          <g key={`approach-${entrance.home}`}>
            <polyline
              points={entrance.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#ece2c6"
              strokeWidth={entrance.width + 4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={entrance.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#c1bba5"
              strokeWidth={entrance.width}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}
        {RIVER_PROPS.map((p, i) => (
          <PaintedProp key={`river-${i}`} {...p} />
        ))}
        {TREES.filter(
          (p) => !overlapsHomeApproach(p.x, p.y, 72 + p.size, 72 + p.size),
        ).map((p, i) => (
          <PaintedProp
            key={`tree-${i}`}
            frame={i % 7 === 0 ? 'maple' : 'tree'}
            x={p.x}
            bottom={p.y}
            size={72 + p.size}
          />
        ))}
        {ROAD_PROPS.filter(
          (p) => !overlapsHomeApproach(p.x, p.bottom, p.size, p.size),
        ).map((p, i) => (
          <PaintedProp key={`road-prop-${i}`} {...p} />
        ))}
        {LANDMARK_BUILDINGS.map((b) => (
          <g key={b.id}>
            <PaintedBuilding {...b} bottom={b.y} />
            {LANDMARK_PROPS[b.frame]
              ?.filter(
                (p) =>
                  !overlapsStreet(
                    b.x + p.dx,
                    b.y + p.dy + 55,
                    p.size,
                    p.size,
                  ) &&
                  !overlapsHomeApproach(
                    b.x + p.dx,
                    b.y + p.dy + 55,
                    p.size,
                    p.size,
                  ),
              )
              .map((decoration, i) => (
                <PaintedProp
                  key={i}
                  frame={decoration.frame}
                  x={b.x + decoration.dx}
                  bottom={b.y + decoration.dy + 55}
                  size={decoration.size}
                />
              ))}
          </g>
        ))}
        {DISTRICT_LANDMARKS.map((place) => {
          const p =
            place.kind === 'home'
              ? HOME_ENTRANCES[place.id as keyof typeof HOME_ENTRANCES].door
              : place;
          return (
            <g key={`entrance-${place.id}`}>
              <ellipse
                cx={p.x}
                cy={p.y - 2}
                rx="12"
                ry="6"
                fill="#ece2bc"
                stroke="#7b8c77"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
        {(night || sunset) && (
          <rect
            width="3100"
            height="1660"
            fill={night ? '#152c47' : '#db9c61'}
            opacity={night ? '.52' : '.15'}
          />
        )}
        {LAMPS.map((p, i) => (
          <g key={i}>
            {night && (
              <ellipse
                cx={p.x}
                cy={p.y + 12}
                rx="75"
                ry="46"
                fill={`url(#${prefix}-glow)`}
              />
            )}
          </g>
        ))}
        {night &&
          LANDMARK_BUILDINGS.map((p) => (
            <ellipse
              key={p.id}
              cx={p.x}
              cy={p.y - 37}
              rx="39"
              ry="40"
              fill={`url(#${prefix}-glow)`}
            />
          ))}
        {map && labels && (
          <g
            fontFamily="Arial, Microsoft YaHei, sans-serif"
            fill="#f7edcd"
            stroke="#3d5850"
            strokeWidth="5"
            paintOrder="stroke"
            fontWeight="650"
            letterSpacing="5"
          >
            <text x="125" y="270" fontSize={miniature ? 65 : 40}>
              深山町
            </text>
            <text x="2210" y="270" fontSize={miniature ? 65 : 40}>
              新都
            </text>
            <text
              x="1610"
              y="650"
              fontSize={miniature ? 50 : 28}
              transform="rotate(90 1610 650)"
            >
              未远川
            </text>
            {!miniature && (
              <g fontSize="25" letterSpacing="2" fill="#e9e5ca" strokeWidth="4">
                <text x="1340" y="80">
                  北 · 入海口
                </text>
                <text x="920" y="730">
                  深山中心路口
                </text>
                <text x="1080" y="1280">
                  深山商店街
                </text>
                <text x="120" y="1590">
                  圆藏山
                </text>
                <text x="2390" y="850">
                  中央公园
                </text>
                <text x="2690" y="330">
                  教会丘陵
                </text>
                <text x="2730" y="1460">
                  站前街
                </text>
                <text x="1500" y="1310" fontSize="19">
                  南桥 · 日常分支
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
});

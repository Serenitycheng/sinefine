'use client';

import { memo, useId } from 'react';
import { DISTRICT_LANDMARKS, STREET_SCENE_SCALE } from '@/lib/fate-district';
import { ATLAS_SIZE, BUILDING_ATLAS, BUILDING_FRAMES, LANDMARK_WIDTH,
  NEIGHBOURHOOD_BUILDINGS, PROP_ATLAS, PROP_FRAMES, TERRAIN_ATLAS,
  overlapsStreet, type BuildingFrame, type PropFrame } from '@/lib/fate-environment';
import { STREET, WALK_AREAS, type Rect } from '@/lib/street';
import styles from './street-walk.module.css';

function PaintedBuilding({ frame, x, bottom, width, height }: {
  frame: BuildingFrame; x: number; bottom: number; width: number; height?: number;
}) {
  const [sx, sy, sw, sh] = BUILDING_FRAMES[frame];
  const h = height ?? width * sh / sw;
  return <svg x={x - width / 2} y={bottom - h} width={width} height={h}
    viewBox={`${sx} ${sy} ${sw} ${sh}`} overflow="hidden" preserveAspectRatio="xMidYMax meet">
    <image href={BUILDING_ATLAS} width={ATLAS_SIZE} height={ATLAS_SIZE} />
  </svg>;
}

function PaintedProp({ frame, x, bottom, size }: {
  frame: PropFrame; x: number; bottom: number; size: number;
}) {
  const [sx, sy, sw, sh] = PROP_FRAMES[frame];
  return <svg x={x - size / 2} y={bottom - size} width={size} height={size}
    viewBox={`${sx} ${sy} ${sw} ${sh}`} overflow="hidden" preserveAspectRatio="xMidYMax meet">
    <image href={PROP_ATLAS} width={ATLAS_SIZE} height={ATLAS_SIZE} />
  </svg>;
}

const LANDMARK_PROPS: Partial<Record<BuildingFrame, ReadonlyArray<{
  frame: PropFrame; dx: number; dy: number; size: number;
}>>> = {
  einzbern: [{frame: 'gate', dx: -132, dy: -57, size: 77}, {frame: 'hedge', dx: 128, dy: -50, size: 105}],
  emiya: [{frame: 'gate', dx: -132, dy: -56, size: 82}, {frame: 'bicycle', dx: 134, dy: -53, size: 58}],
  tohsaka: [{frame: 'wall', dx: -152, dy: -53, size: 112}, {frame: 'maple', dx: 147, dy: -54, size: 105}],
  matou: [{frame: 'gate', dx: -141, dy: -57, size: 85}, {frame: 'tree', dx: 139, dy: -55, size: 110}],
  waver: [{frame: 'bicycle', dx: -120, dy: -55, size: 58}, {frame: 'plants', dx: 120, dy: -54, size: 64}],
  temple: [{frame: 'riverSteps', dx: 0, dy: 15, size: 94}, {frame: 'tree', dx: 160, dy: -54, size: 125}],
  church: [{frame: 'wall', dx: -147, dy: -55, size: 113}, {frame: 'tree', dx: 148, dy: -54, size: 105}],
  kayneth: [{frame: 'wall', dx: -142, dy: -55, size: 118}, {frame: 'gate', dx: 142, dy: -54, size: 79}],
  fujimura: [{frame: 'maple', dx: -148, dy: -52, size: 118}, {frame: 'gate', dx: 142, dy: -54, size: 82}],
  natalia: [{frame: 'bicycle', dx: -125, dy: -50, size: 55}, {frame: 'hedge', dx: 124, dy: -49, size: 100}],
  school: [{frame: 'schoolGate', dx: -173, dy: -53, size: 100}, {frame: 'tree', dx: 179, dy: -55, size: 114}],
  cafe: [{frame: 'shopfront', dx: -134, dy: -54, size: 94}, {frame: 'bicycle', dx: 132, dy: -51, size: 54}],
  shops: [{frame: 'vending', dx: -145, dy: -54, size: 78}, {frame: 'postbox', dx: 151, dy: -55, size: 64}],
  park: [{frame: 'bench', dx: -141, dy: -56, size: 92}, {frame: 'tree', dx: 151, dy: -55, size: 118}],
};

const ROAD_PROPS = WALK_AREAS.filter((r) => r.right - r.left > 1000).flatMap((r, row) =>
  Array.from({length: 5}, (_, i) => ({
    x: r.left + 175 + i * 235,
    bottom: r.top - 12,
    frame: (row === 3 || row === 4 ? (i % 2 ? 'pole' : 'lamp') :
      (i % 2 ? 'hedge' : 'tree')) as PropFrame,
    size: row === 3 || row === 4 ? 84 : 108,
  })).filter((p) => !DISTRICT_LANDMARKS.some((l) =>
    Math.abs(l.x - p.x) < 180 && Math.abs(l.y - (r.top + 55)) < 100)));

const LANE_CENTRES = [505, 890, 1255, 1860, 2245, 2685];
const ROAD_EDGES = WALK_AREAS.filter((r) => r.right - r.left > 1000).flatMap((r, row) =>
  Array.from({length: Math.floor((r.right - r.left) / 110)}, (_, i) => {
    const x = r.left + 65 + i * 110;
    return [
      {x, bottom: r.top - 3, frame: (row === 4 ? 'hedge' : 'wall') as PropFrame, size: 112},
      {x, bottom: r.bottom + 106, frame: (row === 3 || row === 5 ? 'hedge' : 'wall') as PropFrame, size: 112},
    ];
  }).flat().filter((p) =>
    !LANE_CENTRES.some((lane) => Math.abs(lane - p.x) < 95) &&
    !DISTRICT_LANDMARKS.some((place) => Math.abs(place.x - p.x) < 150 &&
      Math.abs(place.y - (r.top + 55)) < 115)));

const RIVER_PROPS = [220, 670, 1100, 1570].flatMap((y) => [
  {frame: 'riverSteps' as const, x: 1460, bottom: y, size: 95},
  {frame: 'riverSteps' as const, x: 1807, bottom: y + 60, size: 95},
]);

function Road({ road, prefix }: { road: Rect; prefix: string }) {
  const w = road.right - road.left;
  const h = road.bottom - road.top;
  const horizontal = w > h;
  const bridge = road.left === 1500;
  const surfaceTop = horizontal ? road.top + 18 : road.top;
  const surfaceHeight = horizontal ? h - 36 : h;
  return <g>
    {horizontal && <rect x={road.left - 15} y={road.top - 15} width={w + 30} height={h + 30}
      fill={`url(#${prefix}-sidewalk)`} rx="3" />}
    <rect x={road.left} y={surfaceTop} width={w} height={surfaceHeight} rx="2" fill={`url(#${prefix}-asphalt)`} />
    <rect x={road.left} y={surfaceTop} width={w} height={surfaceHeight} rx="2" fill="#6e797a" opacity=".12" />
    {horizontal ? <>
      <path d={`M${road.left} ${surfaceTop + 3}h${w}M${road.left} ${surfaceTop + surfaceHeight - 3}h${w}`}
        stroke="#e9ddc6" strokeWidth="2" opacity=".72" />
      <path d={`M${road.left} ${road.top + h / 2}h${w}`} stroke="#f7e8c6"
        strokeWidth="1.8" strokeDasharray="18 24" opacity=".72" />
    </> : null}
    {bridge && <g stroke="#57696b" strokeWidth="4">
      <path d={`M1500 ${road.top - 10}h270M1500 ${road.bottom + 10}h270`} />
      {Array.from({length: 10}, (_, i) => <path key={i}
        d={`M${1503 + i * 29} ${road.top - 17}v14M${1503 + i * 29} ${road.bottom + 3}v14`} />)}
    </g>}
  </g>;
}

const TREES = Array.from({ length: 110 }, (_, i) => ({
  x: 85 + (i * 337) % 2920, y: 165 + (i * 257) % 1390, size: 18 + i % 7,
})).filter((p) => !(p.x > 1470 && p.x < 1800) && !overlapsStreet(p.x, p.y, 45, 52) &&
  !DISTRICT_LANDMARKS.some((l) => Math.abs(l.x - p.x) < 150 && p.y > l.y - 270 && p.y < l.y + 30));
const LAMPS = WALK_AREAS.filter((r) => r.right - r.left > 1000).flatMap((r) =>
  Array.from({ length: 5 }, (_, i) => ({x: r.left + 115 + i * 245, y: r.top - 12})));

export const FateStreetScenery = memo(function FateStreetScenery({
  period = '午后', map = false, miniature = false, labels = true,
}: { period?: string; map?: boolean; miniature?: boolean; labels?: boolean }) {
  const prefix = useId().replace(/:/g, '');
  const night = period === '夜间';
  const sunset = period === '傍晚';
  return <div className={map ? styles.mapScenery : styles.continuousScenery} aria-hidden="true"
    style={map ? undefined : {width: STREET.width * STREET_SCENE_SCALE, height: STREET.height * STREET_SCENE_SCALE}}>
    <svg className={styles.sceneryWorld} viewBox={`0 0 ${STREET.width} ${STREET.height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${prefix}-land`} x2="0" y2="1"><stop stopColor="#a7b692"/><stop offset="1" stopColor="#b6c39c"/></linearGradient>
        <radialGradient id={`${prefix}-glow`}><stop stopColor="#ffd697" stopOpacity=".65"/><stop offset="1" stopColor="#ffc774" stopOpacity="0"/></radialGradient>
        <pattern id={`${prefix}-asphalt`} width="230" height="230" patternUnits="userSpaceOnUse">
          <image href={TERRAIN_ATLAS} width="460" height="460" />
        </pattern>
        <pattern id={`${prefix}-sidewalk`} width="230" height="230" patternUnits="userSpaceOnUse">
          <image href={TERRAIN_ATLAS} x="-230" width="460" height="460" />
        </pattern>
        <pattern id={`${prefix}-grass`} width="230" height="230" patternUnits="userSpaceOnUse">
          <image href={TERRAIN_ATLAS} y="-230" width="460" height="460" />
        </pattern>
        <pattern id={`${prefix}-water`} width="230" height="230" patternUnits="userSpaceOnUse">
          <image href={TERRAIN_ATLAS} x="-230" y="-230" width="460" height="460" />
        </pattern>
      </defs>
      <rect width="3100" height="1660" fill={`url(#${prefix}-land)`}/>
      <rect width="3100" height="1660" fill={`url(#${prefix}-grass)`} opacity=".58"/>
      <path d="M0 0h1450v400H0Z" fill="#668667" opacity=".24"/>
      <path d="M0 20q220 75 400 10t340 30 300-5 380 50" fill="none" stroke="#a4c092" strokeWidth="25" opacity=".32"/>
      <path d="M0 225q170-85 330-45t310-30 340-60 490 45v170H0Z" fill="#71916c" opacity=".19"/>
      <path d="M1780 1050q220-65 420-20t390-35 510-30v315H1780Z" fill="#d3c6a9" opacity=".25"/>
      <path d="M163 370q140-20 250-10M2040 1120q350-25 600-10" fill="none"
        stroke="#ece4c9" strokeWidth="16" opacity=".36" strokeLinecap="round"/>
      <rect x="755" y="600" width="286" height="239" rx="24" fill={`url(#${prefix}-sidewalk)`} opacity=".3"/>
      <rect x="1767" y="620" width="282" height="220" rx="42" fill="#8caa83" opacity=".32"/>
      <rect x="1780" y="1015" width="1110" height="248" rx="20" fill={`url(#${prefix}-sidewalk)`} opacity=".24"/>
      <rect x="1500" width="272" height="1660" fill={`url(#${prefix}-sidewalk)`}/>
      <rect x="1530" width="210" height="1660" fill={`url(#${prefix}-water)`}/>
      <path d="M1527 0v1660M1743 0v1660" stroke="#8a9384" strokeWidth="7"/>
      <path d="M1540 0v1660M1731 0v1660" stroke="#d8d6be" strokeWidth="2" opacity=".8"/>
      {NEIGHBOURHOOD_BUILDINGS.map((b, i) => <PaintedBuilding key={i} {...b} bottom={b.y}/>)}
      {WALK_AREAS.map((road, i) => <Road key={i} road={road} prefix={prefix}/>)}
      {RIVER_PROPS.map((p, i) => <PaintedProp key={`river-${i}`} {...p}/>)}
      {[940, 1465, 1820, 2380].map((x) => <g key={`crossing-${x}`} opacity=".42">
        {Array.from({length: 4}, (_, i) => <rect key={i} x={x - 20 + i * 11}
          y={x === 1820 ? 1327 : 864} width="6" height="22" fill="#f3e8d0"/>)}
      </g>)}
      {TREES.map((p, i) => <PaintedProp key={`tree-${i}`}
        frame={i % 7 === 0 ? 'maple' : 'tree'} x={p.x} bottom={p.y} size={72 + p.size}/>)}
      {ROAD_EDGES.map((p, i) => <PaintedProp key={`road-edge-${i}`} {...p}/>)}
      {ROAD_PROPS.map((p, i) => <PaintedProp key={`road-prop-${i}`} {...p}/>)}
      {DISTRICT_LANDMARKS.map((p) => <g key={p.id}>
        <PaintedBuilding frame={p.id as BuildingFrame} x={p.x}
          bottom={p.y >= 1300 ? p.y - 110 : p.y - 54}
          width={LANDMARK_WIDTH[p.id as BuildingFrame] ?? 235}/>
        {LANDMARK_PROPS[p.id as BuildingFrame]?.map((decoration, i) =>
          <PaintedProp key={i} frame={decoration.frame} x={p.x + decoration.dx}
            bottom={p.y + decoration.dy - (p.y >= 1300 ? 56 : 0)} size={decoration.size}/>)}
        <ellipse cx={p.x} cy={p.y - 2} rx="12" ry="6" fill="#ece2bc" stroke="#7b8c77" strokeWidth="1.5"/>
      </g>)}
      {(night || sunset) && <rect width="3100" height="1660" fill={night ? '#152c47' : '#db9c61'} opacity={night ? '.52' : '.15'}/>}
      {LAMPS.map((p, i) => <g key={i}>
        {night && <ellipse cx={p.x} cy={p.y + 12} rx="75" ry="46" fill={`url(#${prefix}-glow)`}/>}
        <PaintedProp frame="lamp" x={p.x} bottom={p.y} size={69}/>
      </g>)}
      {night && DISTRICT_LANDMARKS.map((p) => <ellipse key={p.id} cx={p.x} cy={p.y - 37} rx="39" ry="40" fill={`url(#${prefix}-glow)`}/>)}
      {map && labels && <g fontFamily="Arial, Microsoft YaHei, sans-serif" fill="#f7edcd"
        stroke="#3d5850" strokeWidth="5" paintOrder="stroke" fontWeight="650" letterSpacing="5">
        <text x="185" y="110" fontSize={miniature ? 65 : 40}>深山町</text>
        <text x="2070" y="110" fontSize={miniature ? 65 : 40}>新都</text>
        <text x="1610" y="650" fontSize={miniature ? 50 : 28} transform="rotate(90 1610 650)">未远川</text>
      </g>}
    </svg>
  </div>;
});

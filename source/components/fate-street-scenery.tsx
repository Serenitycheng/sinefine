'use client';

import { memo, useId } from 'react';
import { DISTRICT_LANDMARKS, STREET_SCENE_SCALE } from '@/lib/fate-district';
import { ATLAS_SIZE, BUILDING_ATLAS, BUILDING_FRAMES, LANDMARK_WIDTH,
  NEIGHBOURHOOD_BUILDINGS, overlapsStreet, type BuildingFrame } from '@/lib/fate-environment';
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

function Road({ road, prefix }: { road: Rect; prefix: string }) {
  const w = road.right - road.left;
  const h = road.bottom - road.top;
  const horizontal = w > h;
  const bridge = road.left === 1500;
  return <g>
    <rect x={road.left - 10} y={road.top - 10} width={w + 20} height={h + 20}
      fill={bridge ? '#c7c3b0' : `url(#${prefix}-paving)`} rx="5" />
    <rect x={road.left} y={road.top} width={w} height={h} rx="3" fill={`url(#${prefix}-asphalt)`} />
    <rect x={road.left} y={road.top} width={w} height={h} rx="3" fill={`url(#${prefix}-grain)`} opacity=".25" />
    {horizontal ? <>
      <path d={`M${road.left} ${road.top + 6}h${w}M${road.left} ${road.bottom - 6}h${w}`}
        stroke="#e3dcc3" strokeWidth="2" opacity=".7" />
      <path d={`M${road.left} ${road.top + h / 2}h${w}`} stroke="#dfd7b6"
        strokeWidth="2" strokeDasharray="22 22" opacity=".5" />
    </> : <path d={`M${road.left + 5} ${road.top}v${h}M${road.right - 5} ${road.top}v${h}`}
      stroke="#ddd6ba" strokeWidth="2" opacity=".6" />}
    {bridge && <g stroke="#53646a" strokeWidth="4">
      <path d={`M1500 ${road.top - 7}h270M1500 ${road.bottom + 7}h270`} />
      {Array.from({length: 10}, (_, i) => <path key={i}
        d={`M${1503 + i * 29} ${road.top - 14}v14M${1503 + i * 29} ${road.bottom}v14`} />)}
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
        <linearGradient id={`${prefix}-land`} x2="0" y2="1"><stop stopColor="#a9b693"/><stop offset="1" stopColor="#c4c1a1"/></linearGradient>
        <linearGradient id={`${prefix}-asphalt`} x2="0" y2="1"><stop stopColor="#778181"/><stop offset="1" stopColor="#89908b"/></linearGradient>
        <linearGradient id={`${prefix}-river`} x2="1" y2="0"><stop stopColor="#799e9d"/><stop offset=".5" stopColor="#8db7ad"/><stop offset="1" stopColor="#6e9296"/></linearGradient>
        <radialGradient id={`${prefix}-glow`}><stop stopColor="#ffd697" stopOpacity=".65"/><stop offset="1" stopColor="#ffc774" stopOpacity="0"/></radialGradient>
        <pattern id={`${prefix}-paving`} width="24" height="18" patternUnits="userSpaceOnUse">
          <rect width="24" height="18" fill="#c0bda5"/><path d="M0 0h24M0 9h24M12 0v9M0 9v9M24 9v9" stroke="#a8aa97" strokeWidth=".7"/>
        </pattern>
        <pattern id={`${prefix}-grain`} width="37" height="29" patternUnits="userSpaceOnUse">
          <path d="M3 4h2m13 4h1m-5 15h2m17-6h1" stroke="#ddd9c6" strokeWidth=".7"/>
        </pattern>
        <pattern id={`${prefix}-water`} width="97" height="73" patternUnits="userSpaceOnUse">
          <path d="M3 18q16-4 31 0m23 26q15-4 26 0m-72 22q10-3 24 0" stroke="#c5ddd1" strokeWidth="1.4" fill="none" opacity=".5"/>
        </pattern>
      </defs>
      <rect width="3100" height="1660" fill={`url(#${prefix}-land)`}/>
      <path d="M0 0h1410l-135 100-240 20-200-45-310 80-290-30L0 180Z" fill="#718c6f" opacity=".5"/>
      <path d="M0 18q220 75 400 10t340 30 300-5 380 50" fill="none" stroke="#b3c49e" strokeWidth="24" opacity=".45"/>
      <rect x="1505" width="258" height="1660" fill={`url(#${prefix}-paving)`}/>
      <rect x="1530" width="210" height="1660" fill={`url(#${prefix}-river)`}/>
      <rect x="1530" width="210" height="1660" fill={`url(#${prefix}-water)`}/>
      <path d="M1526 0v1660M1744 0v1660" stroke="#667b73" strokeWidth="6"/>
      {NEIGHBOURHOOD_BUILDINGS.map((b, i) => <PaintedBuilding key={i} {...b} bottom={b.y}/>)}
      {WALK_AREAS.map((road, i) => <Road key={i} road={road} prefix={prefix}/>)}
      {[490, 890, 1255, 1880, 2245, 2685].flatMap((x) => [495, 907, 1390].map((y) =>
        <g key={`${x}-${y}`} opacity=".75">
          {Array.from({length: 5}, (_, i) => <rect key={i} x={x - 25 + i * 12} y={y - 40} width="6" height="22" fill="#e8e3ce"/>)}
        </g>))}
      {TREES.map((p, i) => <g key={i} transform={`translate(${p.x} ${p.y})`}>
        <ellipse cy="7" cx="9" rx={p.size * 1.2} ry="12" fill="#3e534a" opacity=".24"/>
        <path d="M0 0v-19" stroke="#6d6650" strokeWidth="5"/>
        <path d={`M-${p.size} -15q-9-17 4-29q9-12 23-7q18-8 27 8q13 21-9 33q-24 13-45-5Z`} fill={i % 3 === 0 ? '#789668' : '#658869'} stroke="#536f58" strokeWidth="1.5"/>
        <path d="M-15-28q-2-17 15-18m5 7q15-7 20 6m-28 14q13 8 24-1" stroke="#b4c795" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".5"/>
      </g>)}
      {DISTRICT_LANDMARKS.map((p) => <g key={p.id}>
        <path d={`M${p.x - 17} ${p.y - 58}h34v58h-34Z`} fill={`url(#${prefix}-paving)`}/>
        <PaintedBuilding frame={p.id as BuildingFrame} x={p.x} bottom={p.y - 54} width={LANDMARK_WIDTH[p.id as BuildingFrame] ?? 235}/>
        <ellipse cx={p.x} cy={p.y - 2} rx="12" ry="6" fill="#ece2bc" stroke="#7b8c77" strokeWidth="1.5"/>
      </g>)}
      {(night || sunset) && <rect width="3100" height="1660" fill={night ? '#152c47' : '#db9c61'} opacity={night ? '.52' : '.15'}/>}
      {LAMPS.map((p, i) => <g key={i}>
        {night && <ellipse cx={p.x} cy={p.y + 12} rx="75" ry="46" fill={`url(#${prefix}-glow)`}/>}
        <path d={`M${p.x} ${p.y}v-35h9`} stroke="#58665c" strokeWidth="3"/>
        <rect x={p.x + 4} y={p.y - 39} width="10" height="7" rx="2" fill={night ? '#ffe1a2' : '#eee1b8'} stroke="#667065"/>
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

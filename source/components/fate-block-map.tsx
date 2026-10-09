'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { Minus, Plus, Focus, Footprints } from 'lucide-react';
import {
  BLOCK_AREAS,
  BLOCK_CONNECTIONS,
  BLOCK_PLACES,
  blockAreaForPlace,
} from '@/lib/fate-art-block';
import { type SamplePoint, type SamplePlace } from '@/lib/fate-art-sample';
import type { SampleScene } from '@/lib/fate-art-alley';
import styles from './fate-block-map.module.css';

const BOUNDS = { x: 70, y: -565, width: 1770, height: 1430 };
const FIT_CENTER = {
  x: BOUNDS.x + BOUNDS.width / 2,
  y: BOUNDS.y + BOUNDS.height / 2,
};
// Flat cartographic planting stays outside the walkable paving. It is not a
// second collision layout or an isometric building atlas.
const GREEN_PATCHES = [
  { x: 570, y: 448, r: 68 },
  { x: 807, y: 393, r: 48 },
  { x: 750, y: 42, r: 68 },
  { x: 1208, y: 108, r: 138 },
  { x: 1430, y: -70, r: 76 },
  { x: 1553, y: 536, r: 72 },
  { x: 1610, y: -190, r: 55 },
  { x: 1008, y: 546, r: 52 },
];
const polygon = (points: readonly SamplePoint[]) =>
  points.map((p) => `${p.x},${p.y}`).join(' ');
function localPoint(
  svg: SVGSVGElement | null,
  event: { clientX: number; clientY: number },
) {
  const matrix = svg?.getScreenCTM();
  if (!matrix) return null;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return { x: p.x, y: p.y };
}

export default function FateBlockMap({
  point,
  area,
  onWalk,
  onReturn,
}: {
  point: SamplePoint;
  area: SampleScene;
  onWalk: (point: SamplePoint, place?: SamplePlace) => void;
  onReturn: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    at: SamplePoint;
    moved: boolean;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<SamplePoint>(FIT_CENTER);
  const [size, setSize] = useState({ width: 1280, height: 600 });
  const width = BOUNDS.width / zoom,
    height = BOUNDS.height / zoom;
  const scale = Math.min(size.width / width, size.height / height);
  const detailedLabels = (size.width >= 650 && zoom >= 0.7) || zoom >= 1.8;
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = () => {
    setZoom(1);
    setCenter(FIT_CENTER);
  };
  const zoomAt = useCallback(
    (value: number, at?: SamplePoint) => {
      const next = Math.max(0.4, Math.min(8, value));
      if (at)
        setCenter((c) => ({
          x: at.x + ((c.x - at.x) * zoom) / next,
          y: at.y + ((c.y - at.y) * zoom) / next,
        }));
      setZoom(next);
    },
    [zoom],
  );
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(
        zoom * Math.exp(-event.deltaY * 0.0015),
        localPoint(element, event) ?? undefined,
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom, zoomAt]);
  const pointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const p = localPoint(svg.current, e);
    if (!p) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: p,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    if (!d.moved) return;
    const p = localPoint(svg.current, e);
    if (!p) return;
    setCenter((c) => ({
      x: Math.max(-300, Math.min(2200, c.x + d.at.x - p.x)),
      y: Math.max(-800, Math.min(1200, c.y + d.at.y - p.y)),
    }));
  };
  return (
    <section
      className={styles.map}
      aria-label="住宅街区纯 2D 总览"
      data-block-map
    >
      <div className={styles.heading}>
        <div>
          <span>MIYAMA · RESIDENTIAL</span>
          <h2>住宅生活街区</h2>
          <p>住宅主街 → 小巷 → 林荫支路 → 榉树坡道 → 主街</p>
        </div>
        <button type="button" onClick={onReturn}>
          <Footprints size={16} />
          返回 2.5D 街区
        </button>
      </div>
      <svg
        ref={svg}
        className={styles.canvas}
        viewBox={`${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`}
        aria-label="四个连通街段、七处地点与人物当前位置"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <mask id="block-map-gardens">
            <rect x="-900" y="-1300" width="4400" height="3300" fill="white" />
            {Object.values(BLOCK_AREAS).flatMap((a) =>
              a.paving.map((p, i) => (
                <polygon
                  key={`${a.id}-${i}`}
                  points={polygon(p)}
                  fill="black"
                  stroke="black"
                  strokeWidth="15"
                />
              )),
            )}
          </mask>
          <pattern
            id="block-map-tiles"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 3h8m-4 0v5m8-5v5" stroke="#b5c4cc" strokeWidth=".65" />
          </pattern>
          <pattern
            id="block-map-grain"
            patternUnits="userSpaceOnUse"
            width="32"
            height="32"
          >
            <path
              d="M2 6h2m16 15h3m-12 6h1"
              stroke="#657b6330"
              strokeWidth="2"
            />
          </pattern>
          <filter
            id="block-road-outline"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feMorphology
              in="SourceAlpha"
              operator="dilate"
              radius="3"
              result="edge"
            />
            <feFlood floodColor="#ece6cc" />
            <feComposite in2="edge" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="-900" y="-1300" width="4400" height="3300" fill="#a2b193" />
        <rect
          x="-900"
          y="-1300"
          width="4400"
          height="3300"
          fill="url(#block-map-grain)"
        />
        <g mask="url(#block-map-gardens)">
          {GREEN_PATCHES.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <ellipse
                rx={p.r * 1.45}
                ry={p.r}
                fill={i % 2 ? '#90a486' : '#98aa88'}
              />
              {[0, 1, 2, 3, 4].map((n) => (
                <g
                  key={n}
                  transform={`translate(${Math.cos(n * 2.3 + i) * p.r * 0.9} ${Math.sin(n * 2.3 + i) * p.r * 0.62})`}
                >
                  <circle
                    r={16 + n * 2}
                    fill={i % 3 === 0 ? '#758c64' : '#809569'}
                    stroke="#aabb88"
                    strokeWidth="3"
                  />
                  <path
                    d="M-9 1q8-15 20-1"
                    fill="none"
                    stroke="#c4cf9c"
                    strokeWidth="2"
                  />
                </g>
              ))}
              <path
                d={`M${-p.r * 0.65} ${p.r * 0.15}q${p.r} ${-p.r * 0.5} ${p.r * 1.3} 0`}
                fill="none"
                stroke="#afbb93"
                strokeWidth="2"
              />
            </g>
          ))}
        </g>
        <g filter="url(#block-road-outline)">
          {Object.values(BLOCK_AREAS).map((a) => (
            <g key={a.id} className={styles.roads}>
              {a.paving.map((p, i) => (
                <polygon
                  key={i}
                  points={polygon(p)}
                  fill={a.id === 'alley' ? '#d8ccb0' : '#c5c4b7'}
                />
              ))}
            </g>
          ))}
        </g>
        {BLOCK_PLACES.map((place, index) => {
          const a = blockAreaForPlace(place.id);
          // Offset only the cartographic roof symbols. Ground pins retain the
          // actual shared world coordinates, including the two close slope doors.
          const roofOffset =
            place.id === 'slope-home' ? -105 : place.id === 'bakery' ? 105 : 0;
          return (
            <g
              key={place.id}
              transform={`translate(${place.point.x} ${place.point.y})`}
              className={styles.landmark}
            >
              {roofOffset !== 0 && (
                <path
                  d={`M0 0L${roofOffset} -10`}
                  stroke="#6f8168"
                  strokeWidth="3"
                  fill="none"
                />
              )}
              <g transform={`translate(${roofOffset} 0)`}>
                <rect
                  x="-53"
                  y="-87"
                  width="106"
                  height="86"
                  rx="8"
                  fill="#aeb68f"
                  stroke="#d5d4b7"
                  strokeWidth="2"
                />
                <path
                  d="M-46-13H46M-42-20v13m20-13v13m22-13v13m22-13v13m20-13v13"
                  stroke="#e7dfc5"
                  strokeWidth="2"
                />
                <rect
                  x={place.id === 'bench' ? '-24' : '-37'}
                  y="-75"
                  width={place.id === 'bench' ? '48' : '74'}
                  height={place.id === 'bench' ? '15' : '48'}
                  rx="3"
                  fill={
                    place.id === 'bench'
                      ? '#8d7752'
                      : place.id.includes('shop') ||
                          place.id === 'bakery' ||
                          place.id === 'cafe'
                        ? '#9f7969'
                        : '#75828b'
                  }
                  stroke="#f3ecd8"
                  strokeWidth="2"
                />
                {place.id !== 'bench' && (
                  <>
                    <rect
                      x="-36"
                      y="-74"
                      width="72"
                      height="46"
                      fill="url(#block-map-tiles)"
                    />
                    <path d="M-36-51H36" stroke="#e0d5c0" strokeWidth="3" />
                    <rect
                      x="-10"
                      y="-29"
                      width="20"
                      height="14"
                      fill="#eee4c8"
                    />
                  </>
                )}
                <circle
                  cx="-38"
                  cy="-18"
                  r="10"
                  fill="#839b6d"
                  stroke="#bac791"
                  strokeWidth="2"
                />
                <circle
                  cx="35"
                  cy="-15"
                  r="8"
                  fill={
                    a.id === 'neighborhood'
                      ? '#969fc0'
                      : a.id === 'slope'
                        ? '#d4cfab'
                        : '#ce9d89'
                  }
                />
                <text
                  y="-101"
                  textAnchor="middle"
                  fill="#283f34"
                  fontSize={12 / scale}
                  fontWeight="600"
                  paintOrder="stroke"
                  stroke="#e1e5ce"
                  strokeWidth="6"
                >
                  {detailedLabels ? place.name : index + 1}
                </text>
              </g>
              <circle r="6" fill="#7b674a" />
              <title>
                {a.name} · {place.description}
              </title>
            </g>
          );
        })}
        {BLOCK_CONNECTIONS.map((c) => (
          <g key={c.id}>
            <circle
              cx={c.at.x}
              cy={c.at.y}
              r="10"
              fill="#eee6c8"
              stroke="#7f8f74"
              strokeWidth="3"
            />
            <title>{c.landmark}</title>
          </g>
        ))}
        {Object.values(BLOCK_AREAS).map((a) => (
          <text
            key={a.id}
            x={a.center.x}
            y={a.center.y + 66}
            textAnchor="middle"
            fill="#364a3e"
            fontSize={11 / scale}
            letterSpacing="2"
            paintOrder="stroke"
            stroke="#d4dcc2"
            strokeWidth="6"
          >
            {a.name}
          </text>
        ))}
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r="24" fill="#325a4690" />
          <circle r="10" fill="#f8e9aa" stroke="#354e40" strokeWidth="4" />
          <text
            y="-31"
            textAnchor="middle"
            fill="#283d32"
            fontSize={11 / scale}
            fontWeight="700"
          >
            你在这里
          </text>
        </g>
      </svg>
      <div className={styles.controls}>
        <button
          type="button"
          aria-label="缩小地图"
          onClick={() => zoomAt(zoom / 1.2)}
        >
          <Minus size={17} />
        </button>
        <output>{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="放大地图"
          onClick={() => zoomAt(zoom * 1.2)}
        >
          <Plus size={17} />
        </button>
        <button type="button" aria-label="显示完整街区" onClick={fit}>
          <Focus size={17} />
        </button>
      </div>
      <aside className={styles.locations}>
        <p>当前位置：{BLOCK_AREAS[area].name}</p>
        <span>拖动查看 · 滚轮缩放 · 选择地点沿路前往</span>
        <div>
          {BLOCK_PLACES.map((p, index) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onWalk(p.point, p)}
              aria-label={p.name}
            >
              {index + 1}. {p.name}
              <Footprints size={14} />
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The map application has keyboard panning, Escape return, and focusable destination buttons. */

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import { Focus, Minus, Plus, Footprints } from 'lucide-react';
import { CITY_SIZE, type CityPoint } from '@/lib/fate-city-layout';
import {
  CITY_ART_ROADS,
  CITY_ART_PLACES,
  CITY_LOCAL_PLACES,
} from '@/lib/fate-city-art';
import styles from './fate-city-art.module.css';
import { CITY_ART_SCENES, type CityArtScene } from '@/lib/fate-city-art-scenes';
import { HOME_ENTRANCES } from '@/lib/fate-home-entrances';
import type { CityArtDestinationRequest } from '@/lib/fate-city-art-destinations';
import {
  CITY_ART_RIVER_PATH,
  CITY_ART_SEA_PATH,
} from '@/lib/fate-city-art-map';

export default function FateCityAtlas({
  point,
  scene,
  onEnter,
  onPreview,
  onDestination,
}: {
  point: CityPoint;
  scene: CityArtScene;
  onEnter: (scene: CityArtScene) => void;
  onPreview: (scene: CityArtScene) => void;
  onDestination: (request: CityArtDestinationRequest) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [camera, setCamera] = useState({
    x: CITY_SIZE.width / 2,
    y: CITY_SIZE.height / 2,
    zoom: 1,
  });
  const [selected, setSelected] = useState<string>(
    CITY_ART_SCENES[scene].roadId,
  );
  const drag = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
    unit: number;
  } | null>(null);
  const dragged = useRef(false);
  const placeControls = (id: string, name: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    className: styles.mapDestination,
    'aria-label': `沿路前往${name.split(' · ')[0]}`,
    'data-city-map-place': id,
    onClick: (event: MouseEvent<SVGGElement | SVGCircleElement>) => {
      event.stopPropagation();
      if (!dragged.current) onDestination({ type: 'place', id });
    },
    onKeyDown: (event: KeyboardEvent<SVGGElement | SVGCircleElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onDestination({ type: 'place', id });
      }
    },
  });
  const zoomAt = useRef<(rate: number, client?: CityPoint) => void>(() => {});
  const record = CITY_ART_ROADS.find((entry) => entry.road.id === selected)!;
  const selectedPlaces = CITY_ART_PLACES.filter((place) =>
    record.quarter.places.some((id) => id === place.id),
  );
  const width = CITY_SIZE.width / camera.zoom,
    height = CITY_SIZE.height / camera.zoom;
  const viewBox = `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`;
  const worldAt = (client: CityPoint) => {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(client.x, client.y).matrixTransform(matrix.inverse())
      : null;
  };
  useEffect(() => {
    zoomAt.current = (rate, client) => {
      const anchor = client ? worldAt(client) : null;
      setCamera((old) => {
        const zoom = Math.max(0.4, Math.min(8, rate));
        const ratio = old.zoom / zoom;
        return {
          zoom,
          x: anchor ? anchor.x - (anchor.x - old.x) * ratio : old.x,
          y: anchor ? anchor.y - (anchor.y - old.y) * ratio : old.y,
        };
      });
    };
  });
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt.current(camera.zoom * Math.exp(-event.deltaY * 0.001), {
        x: event.clientX,
        y: event.clientY,
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [camera.zoom]);

  return (
    <div className={styles.atlas}>
      <svg
        ref={svg}
        className={styles.map}
        viewBox={viewBox}
        role="application"
        tabIndex={0}
        aria-label="冬木市总览；点击地点或道路沿路前往，拖动浏览，滚轮缩放"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onEnter(scene);
          }
          const arrows: Record<string, CityPoint> = {
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
          };
          const direction = arrows[event.key];
          if (direction) {
            event.preventDefault();
            setCamera((old) => ({
              ...old,
              x: old.x + (direction.x * 120) / old.zoom,
              y: old.y + (direction.y * 120) / old.zoom,
            }));
          }
        }}
        onClick={(event) => {
          if (dragged.current) return;
          const point = worldAt({ x: event.clientX, y: event.clientY });
          if (point)
            onDestination({ type: 'point', point: { x: point.x, y: point.y } });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const p = worldAt({ x: event.clientX, y: event.clientY });
          if (!p) return;
          dragged.current = false;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            cx: camera.x,
            cy: camera.y,
            unit: svg.current?.getScreenCTM()?.a || 1,
          };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          if (
            !dragged.current &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
          )
            return;
          dragged.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          // Original client displacement avoids feedback from the moved viewBox
          // and repeated events arriving before React paints the next frame.
          setCamera((old) => ({
            ...old,
            x: start.cx - (event.clientX - start.x) / start.unit,
            y: start.cy - (event.clientY - start.y) / start.unit,
          }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          dragged.current = true;
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="city-paper"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <rect width="60" height="60" fill="#dce1c8" />
            <path
              d="M0 40L60 35M12 0L8 60"
              stroke="#bec9ac"
              strokeOpacity=".12"
              fill="none"
            />
          </pattern>
          <pattern
            id="city-water"
            width="70"
            height="55"
            patternUnits="userSpaceOnUse"
          >
            <rect width="70" height="55" fill="#87acae" />
            <path
              d="M0 18Q20 12 42 18T84 18M-25 42Q0 36 25 42T75 42"
              stroke="#e0ecdf"
              opacity=".35"
              fill="none"
            />
          </pattern>
        </defs>
        <rect
          x="-4000"
          y="-4000"
          width="11000"
          height="10000"
          fill="url(#city-paper)"
        />
        <path d={CITY_ART_SEA_PATH} fill="url(#city-water)" />
        <path d={CITY_ART_RIVER_PATH} fill="url(#city-water)" />
        <path
          d="M0 1460Q440 1330 900 1490T1550 1630L1550 2100H0Z"
          fill="#b7c6a3"
        />
        <path
          d="M2340 270Q2740 260 3070 420L3140 740Q2740 690 2520 500Z"
          fill="#c3cdae"
        />
        {CITY_ART_ROADS.map(({ road }) => (
          <g key={road.id}>
            <polyline
              points={road.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#eee8d4"
              strokeWidth={road.width + 18}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={road.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={road.id === selected ? '#8f9f8c' : '#aaa99a'}
              strokeWidth={road.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {road.kind === 'bridge' && (
              <polyline
                points={road.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#ebe6d3"
                strokeWidth="3"
                strokeDasharray="18 20"
              />
            )}
          </g>
        ))}
        {Object.values(HOME_ENTRANCES).map((entry) => (
          <polyline
            key={entry.home}
            points={entry.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#a9b49b"
            strokeWidth={entry.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {Object.values(CITY_ART_SCENES).map((painted) => (
          <polyline
            key={painted.id}
            points={painted.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#bba46c"
            strokeWidth="9"
            strokeDasharray="12 10"
          />
        ))}
        {CITY_ART_PLACES.map((place) => (
          <g
            key={place.id}
            transform={`translate(${place.x} ${place.y})`}
            {...placeControls(place.id, place.name)}
          >
            <rect x="-48" y="-92" width="96" height="100" fill="transparent" />
            <path
              d="M-26-33L0-50L26-33V-5H-26Z"
              fill={
                place.id === 'church'
                  ? '#c7c5b4'
                  : place.id === 'cafe'
                    ? '#b99e88'
                    : '#96a494'
              }
              stroke="#eef0da"
              strokeWidth="4"
            />
            <circle r="5" fill="#f8eed0" />
            <text
              y="-63"
              textAnchor="middle"
              fontSize={camera.zoom > 1.7 ? 17 : 24}
              fill="#33483d"
              stroke="#e5e8d4"
              strokeWidth="5"
              paintOrder="stroke"
            >
              {place.name.split(' · ')[0]}
            </text>
            <title>{place.name}</title>
          </g>
        ))}
        {CITY_LOCAL_PLACES.map((place) => (
          <g
            key={place.id}
            transform={`translate(${place.point.x} ${place.point.y})`}
            {...placeControls(place.id, place.name)}
          >
            <rect x="-36" y="-48" width="72" height="65" fill="transparent" />
            <circle r="10" fill="#bc8e9b" stroke="#f3ebd7" strokeWidth="3" />
            {
              <text
                y="-24"
                textAnchor="middle"
                fontSize="17"
                fill="#4a5a44"
                stroke="#e5e8d4"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {place.name}
              </text>
            }
            <title>{`${place.name} · 原创小地点`}</title>
          </g>
        ))}
        {CITY_ART_PLACES.map((place) => (
          <circle
            key={`entrance-${place.id}`}
            {...placeControls(place.id, `${place.name}入口`)}
            cx={place.entrance.x}
            cy={place.entrance.y}
            r="6"
            fill="#956f61"
            stroke="#f3ebd7"
            strokeWidth="2"
          >
            <title>{`${place.name} · 实际入口`}</title>
          </circle>
        ))}
        <g fill="#4e6b56" opacity=".75" fontSize="45" letterSpacing="8">
          <text x="800" y="255">
            深山町
          </text>
          <text x="2290" y="260">
            新都
          </text>
          <text x="1550" y="480" fontSize="26" writingMode="vertical-rl">
            未远川
          </text>
          <text x="140" y="1530" fontSize="25">
            圆藏山
          </text>
        </g>
        <circle
          cx={point.x}
          cy={point.y}
          r="18"
          fill="#f3d88b"
          stroke="#405746"
          strokeWidth="7"
        />
      </svg>
      <div className={styles.mapTools}>
        <button
          type="button"
          aria-label="缩小地图"
          onClick={() => zoomAt.current(camera.zoom / 1.25)}
        >
          <Minus size={17} />
        </button>
        <output>{Math.round(camera.zoom * 100)}%</output>
        <button
          type="button"
          aria-label="放大地图"
          onClick={() => zoomAt.current(camera.zoom * 1.25)}
        >
          <Plus size={17} />
        </button>
        <button
          type="button"
          aria-label="显示整个冬木市"
          onClick={() =>
            setCamera({
              x: CITY_SIZE.width / 2,
              y: CITY_SIZE.height / 2,
              zoom: 1,
            })
          }
        >
          <Focus size={17} />
        </button>
        <button
          type="button"
          aria-expanded={directoryOpen}
          aria-controls="city-map-directory"
          onClick={() => setDirectoryOpen((old) => !old)}
        >
          街道目录
        </button>
      </div>
      <aside
        id="city-map-directory"
        className={styles.directory}
        hidden={!directoryOpen}
      >
        <span className={styles.eyebrow}>FUYUKI · 冬木市</span>
        <h2>点击地点，沿路前往</h2>
        <p>
          点击建筑、店面或道路，人物会从当前位置沿通路走过去。拖动可以浏览地图。
        </p>
        <button
          className={styles.primary}
          type="button"
          onClick={() => onEnter(scene)}
        >
          <Footprints size={16} /> 返回当前街区
        </button>
        <details className={styles.mapDirectory}>
          <summary>街道目录与预览</summary>
          <h3>{record.quarter.name}</h3>
          <label>
            选择街道
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                const next = CITY_ART_ROADS.find(
                  (entry) => entry.road.id === event.target.value,
                )!;
                const middle =
                  next.road.points[Math.floor(next.road.points.length / 2)];
                setCamera({ x: middle.x, y: middle.y, zoom: 2.1 });
              }}
            >
              {CITY_ART_ROADS.map(({ road }) => (
                <option key={road.id} value={road.id}>
                  {road.name}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.places}>
            {selectedPlaces
              .map((place) => place.name.split(' · ')[0])
              .join(' · ')}
          </p>
          {record.scenes.length ? (
            <>
              {record.scenes.map((paintedScene) => (
                <div key={paintedScene} className={styles.streetChoice}>
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={() => onEnter(paintedScene)}
                  >
                    <Footprints size={16} />
                    {paintedScene === scene ? '回到' : '沿路前往'}
                    {CITY_ART_SCENES[paintedScene].name}
                  </button>
                  <button type="button" onClick={() => onPreview(paintedScene)}>
                    预览此街
                  </button>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.note}>
              这条街的原画待制作。地点已登记，暂不以样板街代替。
            </p>
          )}
        </details>
      </aside>
    </div>
  );
}

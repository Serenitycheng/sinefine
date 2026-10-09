/* oxlint-disable jsx-a11y/prefer-tag-over-role -- An SVG scene uses the accessible img role without creating an extra raster image. */
import { memo } from 'react';
import {
  EMIYA_ROOMS,
  EMIYA_ROOM_IDS,
  emiyaRoomDoors,
  emiyaDoorSilhouette,
  type EmiyaDoor,
  type EmiyaFurniture,
  type EmiyaRoomId,
} from '@/lib/fate-emiya-house';
import {
  interiorDepth,
  interiorProject,
} from '@/lib/fate-city-interior-scenes';
import type { CityPoint } from '@/lib/fate-city-layout';
import styles from './fate-emiya-house.module.css';

const modelPoint = (room: EmiyaRoomId, point: CityPoint, height = 0) => {
  const floor = EMIYA_ROOMS[room].scene.floor;
  const p = interiorProject(point, floor);
  return { x: p.x, y: p.y - height * interiorDepth(point, floor) * 0.85 };
};
const polygon = (points: readonly CityPoint[]) =>
  points.map((p) => `${p.x},${p.y}`).join(' ');
const quad = (
  room: EmiyaRoomId,
  x: number,
  y: number,
  w: number,
  d: number,
  h = 0,
) => [
  modelPoint(room, { x, y }, h),
  modelPoint(room, { x: x + w, y }, h),
  modelPoint(room, { x: x + w, y: y + d }, h),
  modelPoint(room, { x, y: y + d }, h),
];
export const emiyaDoorKey = (door: EmiyaDoor) =>
  [door.from, door.to].sort().join(':');

/** Authored paintings share the tested ground projection. Furniture and doors
 * remain independent volumes; opening the paper window changes its own layer. */
export const FateEmiyaRoomBackdrop = memo(function FateEmiyaRoomBackdrop({
  room,
  windowOpen,
}: {
  room: EmiyaRoomId;
  windowOpen: boolean;
}) {
  const data = EMIYA_ROOMS[room];
  const hasWindow = !['forecourt', 'garden', 'lounge'].includes(room);
  return (
    <div className={styles.backdrop} data-house-backdrop={room}>
      {/* The native PNG stays intact; only its viewport is scaled. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.scene.painting}
        width={1600}
        height={900}
        className={styles.painting}
        alt={data.name + '：' + data.description}
        draggable={false}
      />
      {hasWindow && (
        <svg
          viewBox="0 0 1600 900"
          className={styles.windowLayer}
          aria-hidden="true"
          data-house-window={windowOpen ? 'open' : 'closed'}
        >
          <defs>
            <linearGradient
              id={'window-light-' + room}
              x1="1"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop stopColor="#fff2bf" stopOpacity="0.16" />
              <stop offset="1" stopColor="#f1edce" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g opacity={windowOpen ? 0 : 0.88} className={styles.paperWindow}>
            <rect x="800" y="145" width="285" height="250" fill="#eee5cf" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d={
                  'M' +
                  (805 + i * 56) +
                  ' 145v250M800 ' +
                  (152 + i * 47) +
                  'h285'
                }
                stroke="#aa9270"
                strokeWidth="3"
                opacity="0.65"
              />
            ))}
          </g>
          {windowOpen ? (
            <path
              d="M1060 390L1480 620L480 810L40 740Z"
              fill={'url(#window-light-' + room + ')'}
            />
          ) : (
            <rect width="1600" height="900" fill="#53666a" opacity="0.07" />
          )}
        </svg>
      )}
    </div>
  );
});

export const FateEmiyaFurniture = memo(function FateEmiyaFurniture({
  room,
  piece,
  active,
  mealReady,
}: {
  room: EmiyaRoomId;
  piece: EmiyaFurniture;
  active: boolean;
  mealReady: boolean;
}) {
  const { x, y, width: w, height: d } = piece.footprint;
  const base = quad(room, x, y, w, d),
    top = quad(room, x, y, w, d, piece.height);
  const id = `${room}-${piece.id}`,
    center = modelPoint(room, { x: x + w / 2, y: y + d / 2 }, piece.height);
  const style = { zIndex: Math.round(y + d) + 10 };
  if (piece.painted) {
    const points = EMIYA_ROOMS[room].scene.furniture.find(
      (p) => p.id === piece.id,
    )?.silhouette;
    return (
      <div
        className={styles.paintedPiece}
        style={{
          ...style,
          backgroundImage: `url(${EMIYA_ROOMS[room].scene.painting})`,
          clipPath: `polygon(${points?.map((p) => `${p.x / 16}% ${p.y / 9}%`).join(',')})`,
        }}
        data-furniture-id={piece.id}
        aria-hidden="true"
      />
    );
  }
  const fabric = piece.kind === 'futon';
  const material = fabric
    ? 1
    : piece.kind === 'basin'
      ? 2
      : piece.kind === 'counter'
        ? 3
        : 0;
  return (
    <svg
      viewBox="0 0 1600 900"
      className={styles.piece}
      style={style}
      aria-hidden="true"
      data-furniture-id={piece.id}
      data-furniture-active={active}
    >
      <defs>
        <pattern
          id={`${id}-material`}
          width="180"
          height="180"
          patternUnits="userSpaceOnUse"
        >
          <image
            href="/fate/interior-art/emiya-materials-soft-v1.png"
            width="360"
            height="360"
            x={-(material % 2) * 180}
            y={-Math.floor(material / 2) * 180}
          />
        </pattern>
        <pattern
          id={`${id}-cedar`}
          width="180"
          height="180"
          patternUnits="userSpaceOnUse"
        >
          <image
            href="/fate/interior-art/emiya-materials-soft-v1.png"
            width="360"
            height="360"
          />
        </pattern>
        <linearGradient id={`${id}-top`} x2="0.2" y2="1">
          <stop
            stopColor={
              fabric
                ? '#dddccb'
                : piece.kind === 'basin'
                  ? '#b7c0b7'
                  : '#bcaf99'
            }
          />
          <stop
            offset="1"
            stopColor={
              fabric
                ? '#bbc6b9'
                : piece.kind === 'counter'
                  ? '#bec5ba'
                  : '#a69a87'
            }
          />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor={fabric ? '#b7c1b2' : '#ab9d88'} />
          <stop offset="1" stopColor={fabric ? '#a4b3aa' : '#8f9289'} />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={fabric ? '#b2bdae' : '#a49d8d'} />
          <stop offset="1" stopColor={fabric ? '#98aaa2' : '#7f8c86'} />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#63776d" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#63776d" stopOpacity="0.09" />
          <stop offset="1" stopColor="#63776d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse
        cx={center.x}
        cy={Math.max(...base.map((p) => p.y)) - 5}
        rx={Math.abs(base[2].x - base[3].x) * 0.7}
        ry="23"
        fill={`url(#${id}-shadow)`}
      />
      {piece.kind === 'table' || piece.kind === 'bench' ? (
        base.map((p, i) => (
          <path
            key={i}
            d={`M${top[i].x} ${top[i].y}L${p.x} ${p.y}`}
            stroke="#9b927f"
            strokeWidth="8"
            strokeLinecap="round"
          />
        ))
      ) : (
        <polygon
          points={polygon([top[3], top[2], base[2], base[3]])}
          fill={`url(#${id}-front)`}
          stroke="#8f978c"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
      )}
      <polygon
        points={polygon([top[1], top[2], base[2], base[1]])}
        fill={`url(#${id}-side)`}
      />
      {piece.kind !== 'table' && piece.kind !== 'bench' && (
        <polygon
          points={polygon([top[3], top[2], base[2], base[3]])}
          fill={`url(#${id}-${fabric || piece.kind === 'basin' ? 'material' : 'cedar'})`}
          opacity="0.32"
        />
      )}
      <polygon
        points={polygon(top)}
        fill={`url(#${id}-top)`}
        stroke={fabric ? '#a4b4a7' : '#978f7d'}
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <polygon
        points={polygon(top)}
        fill={`url(#${id}-material)`}
        opacity={fabric ? 0.48 : 0.38}
      />
      {piece.id === 'bookshelf' &&
        Array.from({ length: 3 }, (_, row) => {
          const a = modelPoint(
            room,
            { x: x + 10, y: y + d + 1 },
            piece.height * (0.2 + row * 0.26),
          );
          const b = modelPoint(
            room,
            { x: x + w - 10, y: y + d + 1 },
            piece.height * (0.2 + row * 0.26),
          );
          return (
            <g key={row}>
              <path
                d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                stroke="#6f634b"
                strokeWidth="6"
              />
              <path
                d={`M${a.x + 7} ${a.y - 17}h11m7 0h8m9 0h12m8 0h9`}
                stroke={['#7c8e79', '#ccb482', '#9b7c65'][row]}
                strokeWidth="28"
                opacity="0.8"
              />
            </g>
          );
        })}
      {piece.kind === 'shelf' && piece.id !== 'bookshelf' && (
        <>
          <path
            d={`M${(top[3].x + top[2].x) / 2} ${(top[3].y + top[2].y) / 2}L${(base[3].x + base[2].x) / 2} ${(base[3].y + base[2].y) / 2}`}
            stroke="#70634a"
            strokeWidth="3"
          />
          <path
            d={`M${center.x - 10} ${center.y + 30}v15m20-15v15`}
            stroke="#d9c397"
            strokeWidth="4"
          />
        </>
      )}
      {fabric && (
        <>
          <polygon
            points={polygon(
              quad(room, x + 20, y + 20, w - 40, d * 0.25, piece.height + 4),
            )}
            fill="#e7e5d0"
            stroke="#b6c1a6"
            strokeWidth="2"
          />
          <polygon
            points={polygon(
              quad(
                room,
                x + 12,
                y + d * 0.35,
                w - 24,
                d * 0.63,
                piece.height + 3,
              ),
            )}
            fill="#94aaa0"
            opacity="0.72"
          />
          <path
            d={`M${center.x - 30} ${center.y}q30 10 70 4`}
            fill="none"
            stroke="#d6e0ca"
            strokeWidth="3"
          />
        </>
      )}
      {piece.kind === 'counter' && (
        <>
          <ellipse
            cx={center.x}
            cy={center.y - 3}
            rx="37"
            ry="13"
            fill="#aeb7af"
            stroke="#dde0cf"
            strokeWidth="4"
          />
          <path
            d={`M${center.x + 13} ${center.y - 8}v-30q0-9-12-9`}
            fill="none"
            stroke="#9faea2"
            strokeWidth="5"
          />
          <ellipse
            cx={center.x}
            cy={center.y + 25}
            rx="29"
            ry="12"
            fill="#5c6760"
          />
          <path
            d={`M${center.x - 22} ${center.y + 21}q22-10 44 0v12q-22 12-44 0z`}
            fill="#bda27a"
            stroke="#766b56"
            strokeWidth="2"
          />
        </>
      )}
      {piece.kind === 'basin' && (
        <>
          <ellipse
            cx={center.x}
            cy={center.y}
            rx="46"
            ry="15"
            fill="#778e81"
            stroke="#d1d2ba"
            strokeWidth="9"
          />
          <ellipse
            cx={center.x - 5}
            cy={center.y - 2}
            rx="21"
            ry="4"
            fill="#b8cebc"
            opacity="0.75"
          />
        </>
      )}
      {(piece.id === 'writing-desk' ||
        (piece.id === 'kitchen-table' && mealReady)) && (
        <>
          <path
            d={`M${center.x - 37} ${center.y}l39-8 38 8-39 10z`}
            fill={
              mealReady && piece.id === 'kitchen-table' ? '#eadbb9' : '#eee7cb'
            }
            stroke="#b6ac88"
            strokeWidth="1.5"
          />
          <path
            d={`M${center.x + 3} ${center.y - 6}v13`}
            stroke="#c3b88e"
            strokeWidth="2"
          />
          {piece.id === 'kitchen-table' && (
            <ellipse
              cx={center.x + 3}
              cy={center.y - 5}
              rx="20"
              ry="7"
              fill="#9b9e7f"
            />
          )}
        </>
      )}
      {active && (
        <g className={styles.activityGlow}>
          <ellipse
            cx={center.x}
            cy={center.y}
            rx="60"
            ry="22"
            fill="#f2dd93"
            opacity="0.2"
          />
          <path
            d={`M${center.x - 9} ${center.y - 20}q-13-15 0-25t0-25m22 25q-13-15 0-25`}
            fill="none"
            stroke="#f7eed3"
            strokeWidth="3"
            opacity="0.7"
          />
        </g>
      )}
    </svg>
  );
});

export const FateEmiyaDoorFrame = memo(function FateEmiyaDoorFrame({
  room,
  door,
  open,
}: {
  room: EmiyaRoomId;
  door: EmiyaDoor;
  open: boolean;
}) {
  // The front wall is off-camera. Draw its floor threshold rather than a
  // floating upright door panel in front of the player.
  if (door.at.y > 580 || room === 'forecourt')
    return (
      <svg
        viewBox="0 0 1600 900"
        className={styles.doorFrame}
        aria-hidden="true"
        data-door-id={door.id}
        data-door-open={open}
      >
        <polygon
          points={polygon(emiyaDoorSilhouette(door))}
          fill="#b8b4a0"
          fillOpacity="0.48"
          stroke="#9ba795"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
      </svg>
    );
  const side = door.at.x < 80 || door.at.x > 920;
  const a = { x: door.at.x - (side ? 0 : 85), y: door.at.y - (side ? 70 : 0) };
  const b = { x: door.at.x + (side ? 0 : 85), y: door.at.y + (side ? 70 : 0) };
  const points = [
    modelPoint(room, a, 310),
    modelPoint(room, b, 310),
    modelPoint(room, b),
    modelPoint(room, a),
  ];
  return (
    <svg
      viewBox="0 0 1600 900"
      className={styles.doorFrame}
      aria-hidden="true"
      data-door-id={door.id}
      data-door-open={open}
    >
      <polygon
        points={polygon(points)}
        fill={open ? '#81968d' : '#d4d7c8'}
        fillOpacity={open ? 0.22 : 0.72}
        stroke="#a49e88"
        strokeWidth="4"
        strokeOpacity="0.5"
      />
      <polygon
        points={polygon(
          points.map((p, i) => ({
            x: p.x + (open ? (side ? -12 : 48) : 0),
            y: p.y + (open && side ? -28 : 0) + (i < 2 ? 3 : -3),
          })),
        )}
        fill="#dadccb"
        stroke="#a5a895"
        strokeWidth="1.5"
        opacity={open ? 0.12 : 0.64}
      />
      {!open && (
        <path
          d={`M${(points[0].x + points[1].x) / 2} ${(points[0].y + points[1].y) / 2}L${(points[2].x + points[3].x) / 2} ${(points[2].y + points[3].y) / 2}`}
          stroke="#a58d66"
          strokeWidth="3"
        />
      )}
    </svg>
  );
});

export function EmiyaHouseMap({
  room,
  point,
  resident,
  residents = [],
  onChoose,
}: {
  room: EmiyaRoomId;
  point: CityPoint;
  resident: { room: EmiyaRoomId; point: CityPoint } | null;
  residents?: readonly { room: EmiyaRoomId; point: CityPoint }[];
  onChoose: (id: EmiyaRoomId) => void;
}) {
  const position = (id: EmiyaRoomId, p: CityPoint) => ({
    x: 5 + EMIYA_ROOMS[id].map.x * 57 + (p.x / 1000) * 49,
    y: 5 + EMIYA_ROOMS[id].map.y * 35 + (p.y / 660) * 27,
  });
  const p = position(room, point),
    npc = resident ? position(resident.room, resident.point) : null;
  return (
    <nav className={styles.map} aria-label="卫宫宅室内地图">
      <svg viewBox="0 0 176 145" aria-hidden="true">
        {EMIYA_ROOM_MAP_LINKS.map(([a, b]) => (
          <path
            key={`${a}-${b}`}
            d={`M${33 + EMIYA_ROOMS[a].map.x * 57} ${18 + EMIYA_ROOMS[a].map.y * 35}L${33 + EMIYA_ROOMS[b].map.x * 57} ${18 + EMIYA_ROOMS[b].map.y * 35}`}
            stroke="#c2bd95"
            strokeWidth="4"
          />
        ))}
        {Object.values(EMIYA_ROOMS).map((r) => (
          <rect
            key={r.id}
            x={5 + r.map.x * 57}
            y={5 + r.map.y * 35}
            width="49"
            height="27"
            rx="3"
            fill={r.id === room ? '#7b8e70' : '#4b6050'}
            stroke="#c6c4a1"
            strokeWidth="0.6"
          />
        ))}
        {npc && <circle cx={npc.x} cy={npc.y} r="2.5" fill="#b7cfd1" />}
        {residents.map((resident, index) => {
          const location = position(resident.room, resident.point);
          return (
            <circle
              key={index}
              cx={location.x}
              cy={location.y}
              r="2.5"
              fill="#b7cfd1"
            />
          );
        })}
        <circle
          cx={p.x}
          cy={p.y}
          r="3.7"
          fill="#f1dfa1"
          stroke="#354939"
          strokeWidth="1"
        />
      </svg>
      {Object.values(EMIYA_ROOMS).map((r) => (
        <button
          key={r.id}
          type="button"
          aria-current={r.id === room ? 'location' : undefined}
          aria-label={`沿路去${r.name}`}
          style={{
            left: `${((5 + r.map.x * 57) / 176) * 100}%`,
            top: `${((5 + r.map.y * 35) / 145) * 100}%`,
          }}
          onClick={() => onChoose(r.id)}
        >
          {r.name
            .replace('与工作台', '')
            .replace('与走廊', '')
            .replace('与庭院', '')
            .replace('家庭', '')}
        </button>
      ))}
    </nav>
  );
}
const EMIYA_ROOM_MAP_LINKS: readonly [EmiyaRoomId, EmiyaRoomId][] =
  EMIYA_ROOM_IDS.flatMap((id) =>
    emiyaRoomDoors(id)
      .filter((d) => d.from < d.to)
      .map((d) => [d.from, d.to] as [EmiyaRoomId, EmiyaRoomId]),
  );

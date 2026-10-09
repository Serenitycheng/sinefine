import type { CityPoint } from './fate-city-layout';
import type { LifeAction } from './fate-life';
import type { RoomZone } from './fate-indoor-layout';
import {
  CITY_INTERIOR_SCENES,
  interiorDepth,
  interiorProject,
  interiorUnproject,
  type CityInteriorScene,
  type InteriorRect,
} from './fate-city-interior-scenes';
import {
  interiorRoute,
  interiorWalkable,
} from './fate-city-interior-navigation';

export const EMIYA_ROOM_IDS = [
  'forecourt',
  'hall',
  'lounge',
  'table',
  'study',
  'rest',
  'garden',
] as const;
export type EmiyaRoomId = (typeof EMIYA_ROOM_IDS)[number];
export type EmiyaFurniture = {
  id: string;
  label: string;
  kind: 'table' | 'counter' | 'shelf' | 'futon' | 'bench' | 'basin' | 'step';
  footprint: InteriorRect;
  height: number;
  solid?: boolean;
  /** The approved main painting already contains this object's colour layer. */
  painted?: boolean;
};
export type EmiyaRoom = {
  id: EmiyaRoomId;
  name: string;
  zone: RoomZone | null;
  map: CityPoint;
  material: 'tatami' | 'wood' | 'stone';
  description: string;
  pieces: readonly EmiyaFurniture[];
  scene: CityInteriorScene;
};
export type EmiyaDoor = {
  id: string;
  from: EmiyaRoomId;
  to: EmiyaRoomId;
  at: CityPoint;
  arrival: CityPoint;
  label: string;
};
export type EmiyaActivity = {
  id: string;
  label: string;
  room: EmiyaRoomId;
  zone: RoomZone | null;
  piece: string;
  point: CityPoint;
  kind: LifeAction | 'look';
  seconds: number;
  progress: string;
  complete: string;
};
export type EmiyaLocation = { room: EmiyaRoomId; point: CityPoint };
export type EmiyaLeg = {
  room: EmiyaRoomId;
  points: CityPoint[];
  door?: EmiyaDoor;
};

const main = CITY_INTERIOR_SCENES.emiya;
const piece = (
  id: string,
  label: string,
  kind: EmiyaFurniture['kind'],
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: number,
): EmiyaFurniture => ({
  id,
  label,
  kind,
  footprint: { x, y, width, height },
  height: elevation,
});
const definitions: Omit<EmiyaRoom, 'scene'>[] = [
  {
    id: 'forecourt',
    name: '门前庭院',
    zone: null,
    map: { x: 1, y: 3 },
    material: 'stone',
    description:
      '从街道大门进入的独立前庭；碎石与踏石通向玄关，院墙、木门、樟树和栀子围出安静的门前空间。',
    pieces: [
      piece('forecourt-bench', '庭院木凳', 'bench', 90, 385, 220, 95, 42),
      piece('forecourt-basin', '门前洗手钵', 'basin', 755, 175, 140, 125, 65),
    ],
  },
  {
    id: 'hall',
    name: '玄关与走廊',
    zone: null,
    map: { x: 1, y: 2 },
    material: 'wood',
    description: '石踏台连着杉木走廊；鞋柜、坐凳与通向和室和缘侧的门各自成层。',
    pieces: [
      piece('shoe-cabinet', '木鞋柜', 'shelf', 45, 150, 165, 230, 100),
      piece('hall-bench', '换鞋坐凳', 'bench', 735, 280, 160, 95, 42),
      {
        ...piece('entry-step', '玄关踏台', 'step', 220, 540, 560, 95, 9),
        solid: false,
      },
    ],
  },
  {
    id: 'lounge',
    name: '家庭和室',
    zone: 'lounge',
    map: { x: 1, y: 1 },
    material: 'tatami',
    description: '保留已确认的卫宫宅原画；家庭饭桌按原画轮廓单独遮挡与交互。',
    pieces: [
      {
        id: 'family-table',
        label: '家庭饭桌',
        kind: 'table',
        footprint: main.furniture[0].footprint,
        height: 42,
        painted: true,
      },
    ],
  },
  {
    id: 'table',
    name: '厨房与餐桌',
    zone: 'table',
    map: { x: 0, y: 1 },
    material: 'wood',
    description:
      '实用的家常厨房；水槽、灶台、储物与小餐桌沿墙布置，中央留出通路。',
    pieces: [
      piece('kitchen-counter', '水槽与灶台', 'counter', 35, 145, 205, 325, 100),
      piece('pantry', '碗碟柜', 'shelf', 740, 70, 140, 165, 210),
      piece('kitchen-table', '小餐桌', 'table', 740, 385, 150, 130, 76),
    ],
  },
  {
    id: 'study',
    name: '书房与工作台',
    zone: 'study',
    map: { x: 0, y: 0 },
    material: 'tatami',
    description: '书、笔记和修理小物靠墙收纳；低书桌面向障子窗，中央可以绕行。',
    pieces: [
      piece('bookshelf', '书柜', 'shelf', 45, 115, 150, 315, 195),
      piece('writing-desk', '书桌', 'table', 590, 145, 280, 165, 65),
    ],
  },
  {
    id: 'rest',
    name: '卧室',
    zone: 'rest',
    map: { x: 1, y: 0 },
    material: 'tatami',
    description: '朴素的榻榻米休息间，铺床与衣物柜分开；纸门引入柔和庭院光。',
    pieces: [
      piece('wardrobe', '衣物柜', 'shelf', 60, 115, 150, 285, 210),
      piece('futon', '铺床', 'futon', 540, 250, 285, 265, 22),
      piece('linen-chest', '被褥收纳', 'bench', 700, 75, 160, 100, 65),
    ],
  },
  {
    id: 'garden',
    name: '缘侧与庭院',
    zone: null,
    map: { x: 2, y: 1 },
    material: 'stone',
    description:
      '木缘侧与庭前石路相连；樟树、栀子、石钵和庭院坐凳分层，保留步行空隙。',
    pieces: [
      piece('garden-bench', '缘侧坐凳', 'bench', 625, 170, 245, 105, 42),
      piece('stone-basin', '庭前石钵', 'basin', 130, 220, 155, 120, 65),
    ],
  },
];

export const EMIYA_ROOMS = Object.fromEntries(
  definitions.map((room): [EmiyaRoomId, EmiyaRoom] => [
    room.id,
    {
      ...room,
      scene: {
        ...main,
        painting:
          room.id === 'lounge'
            ? main.painting
            : `/fate/interior-art/emiya-${room.id}-soft-v2.png`,
        room: room.name,
        description: room.description,
        furniture: room.pieces
          .filter((p) => p.solid !== false)
          .map((p) => ({
            id: p.id,
            footprint: p.footprint,
            silhouette: p.painted ? main.furniture[0].silhouette : undefined,
          })),
        spots: [],
      },
    },
  ]),
) as Record<EmiyaRoomId, EmiyaRoom>;

const links: readonly [EmiyaRoomId, CityPoint, EmiyaRoomId, CityPoint][] = [
  ['forecourt', { x: 500, y: 40 }, 'hall', { x: 500, y: 620 }],
  ['hall', { x: 500, y: 40 }, 'lounge', { x: 500, y: 620 }],
  ['lounge', { x: 40, y: 480 }, 'table', { x: 960, y: 560 }],
  ['lounge', { x: 800, y: 40 }, 'rest', { x: 800, y: 620 }],
  ['table', { x: 330, y: 40 }, 'study', { x: 330, y: 620 }],
  ['study', { x: 960, y: 450 }, 'rest', { x: 40, y: 450 }],
  ['lounge', { x: 960, y: 450 }, 'garden', { x: 40, y: 450 }],
  ['hall', { x: 960, y: 450 }, 'garden', { x: 330, y: 620 }],
];
/** Arrivals are inside the room rather than on its trigger. A return door stays
 * disarmed until the actor leaves it, preventing bounce loops at slow frames. */
const inward = (p: CityPoint): CityPoint => ({
  x: p.x < 80 ? p.x + 48 : p.x > 920 ? p.x - 48 : p.x,
  y: p.y < 80 ? p.y + 48 : p.y > 580 ? p.y - 48 : p.y,
});
export const EMIYA_DOORS: readonly EmiyaDoor[] = links.flatMap(
  ([a, pa, b, pb]) => [
    {
      id: `${a}-${b}`,
      from: a,
      to: b,
      at: pa,
      arrival: inward(pb),
      label: `去${EMIYA_ROOMS[b].name}`,
    },
    {
      id: `${b}-${a}`,
      from: b,
      to: a,
      at: pb,
      arrival: inward(pa),
      label: `去${EMIYA_ROOMS[a].name}`,
    },
  ],
);
export const EMIYA_ENTRY: EmiyaLocation = {
  room: 'forecourt',
  point: { x: 500, y: 632 },
};
export const emiyaRoomDoors = (id: EmiyaRoomId) =>
  EMIYA_DOORS.filter((d) => d.from === id);

/** The doorway is a passage with width, not a point. Screen-up walks along a
 * perspective line and may reach its opening off the world-space centre. */
export function emiyaDoorReached(point: CityPoint, door: EmiyaDoor) {
  const side = door.at.x < 80 || door.at.x > 920;
  return side
    ? Math.abs(point.x - door.at.x) < 27 && Math.abs(point.y - door.at.y) < 57
    : Math.abs(point.y - door.at.y) < 27 && Math.abs(point.x - door.at.x) < 72;
}

export function emiyaFurnitureSilhouette(
  room: EmiyaRoomId,
  piece: EmiyaFurniture,
): readonly CityPoint[] {
  if (piece.painted)
    return (
      EMIYA_ROOMS[room].scene.furniture.find((p) => p.id === piece.id)
        ?.silhouette ?? []
    );
  const r = piece.footprint,
    floor = EMIYA_ROOMS[room].scene.floor;
  const points = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
  const top = points.map((p) => {
    const q = interiorProject(p, floor);
    return { x: q.x, y: q.y - piece.height * interiorDepth(p, floor) * 0.85 };
  });
  // Include the side and front faces in the clickable volume, without a
  // crossing polygon along the projected bottom edge.
  const all = [...top, ...points.map((p) => interiorProject(p, floor))].sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );
  const cross = (o: CityPoint, a: CityPoint, b: CityPoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const chain = (source: readonly CityPoint[]) => {
    const result: CityPoint[] = [];
    for (const p of source) {
      while (
        result.length >= 2 &&
        cross(result[result.length - 2], result[result.length - 1], p) <= 0
      )
        result.pop();
      result.push(p);
    }
    return result.slice(0, -1);
  };
  return [...chain(all), ...chain([...all].reverse())];
}

export function emiyaDoorSilhouette(door: EmiyaDoor): readonly CityPoint[] {
  const side = door.at.x < 80 || door.at.x > 920,
    floor = EMIYA_ROOMS[door.from].scene.floor;
  if (door.at.y > 580)
    return [
      { x: door.at.x - 85, y: door.at.y - 14 },
      { x: door.at.x + 85, y: door.at.y - 14 },
      { x: door.at.x + 85, y: door.at.y + 14 },
      { x: door.at.x - 85, y: door.at.y + 14 },
    ].map((p) => interiorProject(p, floor));
  const points = [
    { x: door.at.x - (side ? 0 : 85), y: door.at.y - (side ? 70 : 0) },
    { x: door.at.x + (side ? 0 : 85), y: door.at.y + (side ? 70 : 0) },
  ];
  const bottom = points.map((p) => interiorProject(p, floor));
  return [
    {
      x: bottom[0].x,
      y: bottom[0].y - 310 * interiorDepth(points[0], floor) * 0.85,
    },
    {
      x: bottom[1].x,
      y: bottom[1].y - 310 * interiorDepth(points[1], floor) * 0.85,
    },
    bottom[1],
    bottom[0],
  ];
}

export function emiyaPieceApproach(
  room: EmiyaRoomId,
  piece: EmiyaFurniture,
): CityPoint | null {
  const r = piece.footprint;
  return (
    [
      { x: r.x + r.width + 38, y: r.y + r.height / 2 },
      { x: r.x - 38, y: r.y + r.height / 2 },
      { x: r.x + r.width / 2, y: r.y + r.height + 38 },
      { x: r.x + r.width / 2, y: r.y - 38 },
    ].find((p) => interiorWalkable(p, EMIYA_ROOMS[room].scene)) ?? null
  );
}

const family = EMIYA_ROOMS.lounge.pieces[0].footprint;
export const EMIYA_ACTIVITIES: readonly EmiyaActivity[] = [
  {
    id: 'sit',
    label: '坐下歇一会',
    room: 'lounge',
    zone: 'lounge',
    piece: 'family-table',
    point: { x: family.x + family.width / 2, y: family.y + family.height + 38 },
    kind: 'rest',
    seconds: 5,
    progress: '在饭桌旁歇一会…',
    complete: '休息好了，可以起身继续走走。',
  },
  {
    id: 'cook',
    label: '做一份家常饭',
    room: 'table',
    zone: 'table',
    piece: 'kitchen-counter',
    point: { x: 290, y: 355 },
    kind: 'cook',
    seconds: 7,
    progress: '正在备餐，灶台升起热气…',
    complete: '饭菜做好了，已经摆到厨房的小餐桌。',
  },
  {
    id: 'eat',
    label: '用餐',
    room: 'table',
    zone: 'table',
    piece: 'kitchen-table',
    point: { x: 695, y: 455 },
    kind: 'eat',
    seconds: 5,
    progress: '正在吃刚做好的饭…',
    complete: '用餐结束，碗筷已经收好。',
  },
  {
    id: 'read',
    label: '读一会书',
    room: 'study',
    zone: 'study',
    piece: 'writing-desk',
    point: { x: 680, y: 350 },
    kind: 'read',
    seconds: 6,
    progress: '翻开书，读到下一页…',
    complete: '合上书，把书签夹在刚读到的地方。',
  },
  {
    id: 'study',
    label: '整理笔记',
    room: 'study',
    zone: 'study',
    piece: 'writing-desk',
    point: { x: 680, y: 350 },
    kind: 'study',
    seconds: 6,
    progress: '正在整理书桌上的笔记…',
    complete: '笔记已经整理到桌边。',
  },
  {
    id: 'rest',
    label: '在卧室休息',
    room: 'rest',
    zone: 'rest',
    piece: 'futon',
    point: { x: 490, y: 385 },
    kind: 'rest',
    seconds: 6,
    progress: '在铺床旁安静休息…',
    complete: '休息结束，可以返回和室。',
  },
  {
    id: 'garden',
    label: '去缘侧看庭院',
    room: 'garden',
    zone: null,
    piece: 'garden-bench',
    point: { x: 600, y: 320 },
    kind: 'look',
    seconds: 3,
    progress: '在缘侧看看树影与栀子…',
    complete: '庭院风吹过樟树，缘侧与玄关、和室都可以通行。',
  },
];

/** Plan every floor segment as well as the room sequence. Clicking a room or
 * remote activity never jumps the actor to that room. */
export function emiyaHouseRoute(
  from: EmiyaLocation,
  to: EmiyaLocation,
  occupied?: EmiyaLocation,
): EmiyaLeg[] | null {
  if (
    !EMIYA_ROOMS[from.room] ||
    !EMIYA_ROOMS[to.room] ||
    !interiorWalkable(from.point, EMIYA_ROOMS[from.room].scene) ||
    !interiorWalkable(to.point, EMIYA_ROOMS[to.room].scene)
  )
    return null;
  const queue: { room: EmiyaRoomId; doors: EmiyaDoor[] }[] = [
    { room: from.room, doors: [] },
  ];
  const visited = new Set<EmiyaRoomId>([from.room]);
  let sequence: EmiyaDoor[] | null = null;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current.room === to.room) {
      sequence = current.doors;
      break;
    }
    for (const door of emiyaRoomDoors(current.room)) {
      if (visited.has(door.to)) continue;
      if (
        occupied?.room === door.to &&
        Math.hypot(
          door.arrival.x - occupied.point.x,
          door.arrival.y - occupied.point.y,
        ) < 30
      )
        continue;
      const at = current.doors.at(-1)?.arrival ?? from.point;
      if (
        occupied?.room === current.room &&
        !interiorRoute(at, door.at, EMIYA_ROOMS[current.room].scene, [
          occupied.point,
        ])
      )
        continue;
      visited.add(door.to);
      queue.push({ room: door.to, doors: [...current.doors, door] });
    }
  }
  if (!sequence) return null;
  const result: EmiyaLeg[] = [];
  let location = from;
  for (const door of sequence) {
    const points = interiorRoute(
      location.point,
      door.at,
      EMIYA_ROOMS[location.room].scene,
      occupied?.room === location.room ? [occupied.point] : [],
    );
    if (!points) return null;
    result.push({ room: location.room, points, door });
    location = { room: door.to, point: door.arrival };
  }
  const points = interiorRoute(
    location.point,
    to.point,
    EMIYA_ROOMS[to.room].scene,
    occupied?.room === to.room ? [occupied.point] : [],
  );
  if (!points) return null;
  result.push({ room: to.room, points });
  return result;
}

export function emiyaScreenDirection(
  point: CityPoint,
  input: CityPoint,
  room: EmiyaRoomId,
): CityPoint {
  const floor = EMIYA_ROOMS[room].scene.floor;
  const foot = interiorProject(point, floor);
  const target = interiorUnproject(
    { x: foot.x + input.x, y: foot.y + input.y },
    floor,
  );
  if (!target) return input;
  const dx = target.x - point.x,
    dy = target.y - point.y;
  const length = Math.hypot(dx, dy);
  return length ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

export function emiyaAdvanceRoute(
  from: EmiyaLocation,
  itinerary: readonly EmiyaLeg[],
  distance: number,
  occupied?: EmiyaLocation,
) {
  let location: EmiyaLocation = { room: from.room, point: { ...from.point } };
  const legs = itinerary.map((leg) => ({ ...leg, points: [...leg.points] }));
  const crossed: EmiyaDoor[] = [];
  let travelled = 0,
    blocked = false;
  for (let guard = 0; legs.length && guard < 100; guard++) {
    const leg = legs[0];
    if (leg.room !== location.room)
      return { location, legs: [], crossed, travelled, blocked: true };
    if (!leg.points.length) {
      if (leg.door) {
        const arriving = { room: leg.door.to, point: { ...leg.door.arrival } };
        if (
          occupied?.room === arriving.room &&
          Math.hypot(
            arriving.point.x - occupied.point.x,
            arriving.point.y - occupied.point.y,
          ) < 30
        ) {
          blocked = true;
          break;
        }
        location = arriving;
        crossed.push(leg.door);
      }
      legs.shift();
      continue;
    }
    if (distance <= 0) break;
    const next = leg.points[0],
      p = location.point;
    const gap = Math.hypot(next.x - p.x, next.y - p.y);
    if (gap < 0.001) {
      leg.points.shift();
      continue;
    }
    const step = Math.min(gap, distance, 5);
    const candidate =
      gap <= step
        ? { ...next }
        : {
            x: p.x + ((next.x - p.x) * step) / gap,
            y: p.y + ((next.y - p.y) * step) / gap,
          };
    if (
      occupied?.room === location.room &&
      Math.hypot(
        candidate.x - occupied.point.x,
        candidate.y - occupied.point.y,
      ) < 30
    ) {
      blocked = true;
      break;
    }
    if (!interiorWalkable(candidate, EMIYA_ROOMS[location.room].scene)) {
      blocked = true;
      break;
    }
    location = { room: location.room, point: candidate };
    travelled += step;
    distance -= step;
    if (gap <= step + 0.001) leg.points.shift();
  }
  return { location, legs, crossed, travelled, blocked };
}

/** A bounded, opt-in, one-resident preview. These IDs are the existing resident
 * and activity identities; no saves, paid AI or background timers are started. */
export const EMIYA_RESIDENT_ROUTINE = [
  {
    room: 'table',
    point: { x: 310, y: 290 },
    kind: 'cook',
    label: '准备午饭',
    seconds: 8,
  },
  {
    room: 'lounge',
    point: { x: 190, y: 545 },
    kind: 'eat',
    label: '在和室用餐',
    seconds: 7,
  },
  {
    room: 'study',
    point: { x: 540, y: 370 },
    kind: 'study',
    label: '整理笔记',
    seconds: 7,
  },
  {
    room: 'garden',
    point: { x: 570, y: 340 },
    kind: 'rest',
    label: '在缘侧歇一会',
    seconds: 7,
  },
] as const satisfies readonly (EmiyaLocation & {
  kind: LifeAction;
  label: string;
  seconds: number;
})[];

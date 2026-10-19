import type { CityPoint } from './fate-city-layout';
import {
  CITY_INTERIOR_SCENES,
  interiorUnproject,
  type CityInteriorScene,
} from './fate-city-interior-scenes';

/** Art-preview layout, not a replacement for formal HOME_ROOMS or save coordinates. */
export const TOHSAKA_ROOM_IDS = [
  'hall',
  'study',
  'dining',
  'bedroom',
  'workshop',
] as const;
export type TohsakaRoomId = (typeof TOHSAKA_ROOM_IDS)[number];
export const TOHSAKA_CAST = [
  { id: 'rin', name: '远坂凛' },
  { id: 'emiya', name: 'Archer' },
  { id: 'tokiomi', name: '远坂时臣' },
  { id: 'gilgamesh', name: '吉尔伽美什' },
] as const;
export type TohsakaActorId = (typeof TOHSAKA_CAST)[number]['id'];
export type HouseDoor = {
  id: string;
  label: string;
  point: CityPoint;
  to: TohsakaRoomId | null;
  arrival: CityPoint;
};
export type HouseAction = {
  id: string;
  pose: 'sit' | 'read';
  contact: CityPoint;
  elevation: number;
};
export type TohsakaRoom = {
  scene: CityInteriorScene;
  doors: readonly HouseDoor[];
  actions: readonly HouseAction[];
};
const front = { x: 500, y: 620 };
const hallPoints = {
  study: { x: 285, y: 30 },
  dining: { x: 35, y: 145 },
  bedroom: { x: 885, y: 115 },
  workshop: { x: 540, y: 30 },
};
const make = (
  id: Exclude<TohsakaRoomId, 'study'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'tohsaka',
  name: '远坂宅',
  room,
  basis: '远坂洋馆 · 房间布局为游戏创作',
  description,
  painting: `/fate/interior-art/tohsaka-${id}-soft-v1.png`,
  floor: {
    backLeft: 150,
    backRight: 1450,
    backY: id === 'workshop' ? 370 : id === 'hall' ? 420 : 400,
    frontLeft: 20,
    frontRight: 1580,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
const back = (id: Exclude<TohsakaRoomId, 'hall'>): HouseDoor => ({
  id: 'hall',
  label:
    id === 'bedroom'
      ? '下楼到玄关'
      : id === 'workshop'
        ? '上楼到玄关'
        : '回玄关',
  point: id === 'study' ? { x: 160, y: 24 } : front,
  to: 'hall',
  arrival: { ...hallPoints[id], y: hallPoints[id].y + 58 },
});
export const TOHSAKA_ROOMS: Record<TohsakaRoomId, TohsakaRoom> = {
  hall: {
    scene: {
      ...make(
        'hall',
        '玄关与楼梯',
        '深木护墙、会客室与餐厅门口，右侧楼梯通向卧室。',
      ),
      spots: [
        {
          id: 'coat',
          label: '整理外套',
          point: { x: 150, y: 180 },
          detail: '把外套挂好，留出玄关通路。',
        },
      ],
    },
    doors: [
      {
        id: 'street',
        label: '离屋回街道',
        point: front,
        to: null,
        arrival: front,
      },
      ...(['study', 'dining', 'bedroom', 'workshop'] as const).map((id) => ({
        id,
        label: {
          study: '会客书房',
          dining: '餐厅与厨房',
          bedroom: '上楼 · 凛的房间',
          workshop: '下楼 · 魔术工房',
        }[id],
        point: hallPoints[id],
        to: id,
        arrival: id === 'study' ? { x: 160, y: 85 } : { x: 500, y: 560 },
      })),
    ],
    actions: [],
  },
  study: {
    scene: {
      ...CITY_INTERIOR_SCENES.tohsaka,
      basis: '远坂洋馆 · 复用已确认会客书房',
      spots: [
        {
          id: 'tea',
          label: '茶具与会客区',
          point: { x: 480, y: 560 },
          detail: '茶几上摆着一套瓷茶具。',
        },
        {
          id: 'books',
          label: '书柜旁读书',
          point: { x: 70, y: 280 },
          detail: '站在书柜旁翻阅藏书。',
        },
        {
          id: 'window',
          label: '看看庭院',
          point: { x: 720, y: 50 },
          detail: '窗外的枫树下，蔷薇开得正好。',
        },
      ],
    },
    doors: [back('study')],
    actions: [
      {
        id: 'tea',
        pose: 'sit',
        contact: { x: 654.4536, y: 359.2354 },
        elevation: 0,
      },
    ],
  },
  dining: {
    scene: make('dining', '餐厅与厨房', '克制的西式家庭餐厅，侧后方连接厨房。'),
    doors: [back('dining')],
    actions: [],
  },
  bedroom: {
    scene: make(
      'bedroom',
      '凛的房间',
      '私人卧室与学习角，米色织物、整齐书桌与窗边软椅。',
    ),
    doors: [back('bedroom')],
    actions: [],
  },
  workshop: {
    scene: make(
      'workshop',
      '地下魔术工房',
      '家族魔术研究空间，石地、旧木工作台与宝石小柜，温和灯光。',
    ),
    doors: [back('workshop')],
    actions: [],
  },
};

/** Register actual painted solids independently of useful, collision-free approach points. */
function paintedPiece(
  room: TohsakaRoomId,
  id: string,
  rect: readonly number[],
  mask: readonly number[][],
) {
  const scene = TOHSAKA_ROOMS[room].scene;
  const project = (x: number, y: number) => {
    const py = Math.max(scene.floor.backY + 1, y * 9);
    const t =
      (py - scene.floor.backY) / (scene.floor.frontY - scene.floor.backY);
    const left =
      scene.floor.backLeft + (scene.floor.frontLeft - scene.floor.backLeft) * t;
    const right =
      scene.floor.backRight +
      (scene.floor.frontRight - scene.floor.backRight) * t;
    return interiorUnproject(
      { x: Math.max(left + 1, Math.min(right - 1, x * 16)), y: py },
      scene.floor,
    )!;
  };
  const corners = [
    project(rect[0], rect[1]),
    project(rect[2], rect[1]),
    project(rect[0], rect[3]),
    project(rect[2], rect[3]),
  ];
  const minX = Math.min(...corners.map((p) => p.x)),
    minY = Math.min(...corners.map((p) => p.y));
  return {
    id,
    footprint: {
      x: minX,
      y: minY,
      width: Math.max(...corners.map((p) => p.x)) - minX,
      height: Math.max(...corners.map((p) => p.y)) - minY,
    },
    collision: [corners[0], corners[1], corners[3], corners[2]],
    silhouette: mask.map(([x, y]) => ({ x: x * 16, y: y * 9 })),
  };
}
TOHSAKA_ROOMS.dining.scene.furniture = [
  paintedPiece(
    'dining',
    'table-chairs',
    [22, 47, 51, 57],
    [
      [22, 33],
      [29, 36],
      [45, 36],
      [51, 33],
      [50, 56],
      [44, 57],
      [42, 50],
      [31, 50],
      [30, 56],
      [24, 56],
    ],
  ),
  paintedPiece(
    'dining',
    'kitchen-island',
    [67, 47, 82, 52],
    [
      [66, 34],
      [83, 34],
      [83, 50],
      [81, 52],
      [68, 51],
    ],
  ),
];
TOHSAKA_ROOMS.bedroom.scene.furniture = [
  paintedPiece(
    'bedroom',
    'bed',
    [12, 50, 40, 60],
    [
      [8, 31],
      [12, 25],
      [16, 26],
      [16, 31],
      [24, 33],
      [40, 39],
      [40, 59],
      [35, 60],
      [13, 57],
    ],
  ),
  paintedPiece(
    'bedroom',
    'reading-chair',
    [47, 44, 57, 48],
    [
      [47, 33],
      [54, 29],
      [57, 32],
      [57, 46],
      [53, 48],
      [48, 47],
    ],
  ),
  paintedPiece(
    'bedroom',
    'writing-desk',
    [68, 47, 88, 58],
    [
      [67, 34],
      [74, 34],
      [77, 37],
      [90, 36],
      [88, 55],
      [82, 56],
      [81, 49],
      [78, 55],
      [72, 57],
      [69, 54],
    ],
  ),
];
TOHSAKA_ROOMS.workshop.scene.furniture = [
  paintedPiece(
    'workshop',
    'workbench',
    [17, 46, 44, 53],
    [
      [17, 32],
      [44, 34],
      [45, 47],
      [43, 52],
      [34, 51],
      [32, 44],
      [28, 44],
      [27, 52],
      [22, 53],
      [17, 50],
    ],
  ),
  paintedPiece(
    'workshop',
    'specimen-cabinet',
    [84, 48, 97, 64],
    [
      [84, 35],
      [89, 28],
      [97, 30],
      [99, 38],
      [98, 64],
      [87, 60],
    ],
  ),
];
TOHSAKA_ROOMS.dining.scene.spots = [
  {
    id: 'meal',
    label: '到餐桌旁坐下',
    point: { x: 370, y: 335 },
    detail: '在餐桌旁坐下。桌面与通路分开，进餐不增加库存规则。',
  },
  {
    id: 'kitchen',
    label: '看看厨房',
    point: { x: 590, y: 180 },
    detail: '查看厨房和水壶，保留基本生活氛围。',
  },
];
TOHSAKA_ROOMS.bedroom.scene.spots = [
  {
    id: 'read',
    label: '到软椅旁读书',
    point: { x: 550, y: 230 },
    detail: '在窗边软椅读一会儿书。移动或点击「停下」即可起身。',
  },
  {
    id: 'bed',
    label: '看看床边',
    point: { x: 240, y: 385 },
    detail: '米色织物与安静的卧室，留出床前和中间通路。',
  },
  {
    id: 'desk',
    label: '查看书桌',
    point: { x: 760, y: 360 },
    detail: '书桌上的课本和小宝石盒，延续凛的学习与魔术生活。',
  },
];
TOHSAKA_ROOMS.workshop.scene.spots = [
  {
    id: 'gems',
    label: '查看工作台',
    point: { x: 340, y: 325 },
    detail: '检查工作台上的宝石与笔记；研究摆设为游戏创作。',
  },
  {
    id: 'circle',
    label: '走到刻纹旁',
    point: { x: 580, y: 140 },
    detail: '低亮度刻纹、柔和照明，地下通路保持清楚。',
  },
];
TOHSAKA_ROOMS.dining.actions = [
  {
    id: 'meal',
    pose: 'sit',
    contact: { x: 244.3208, y: 144.8211 },
    elevation: 0,
  },
];
TOHSAKA_ROOMS.bedroom.actions = [
  {
    id: 'read',
    pose: 'read',
    contact: { x: 530.5324, y: 30.4739 },
    elevation: 0,
  },
];
export function nearestHouseDoor(point: CityPoint, room: TohsakaRoom) {
  return room.doors.find(
    (door) => Math.hypot(door.point.x - point.x, door.point.y - point.y) < 48,
  );
}

/** Clamp the painting and the full alpha bounds of the actor, including seated poses. */
export function houseCamera(
  origin: CityPoint,
  scale: number,
  size: { width: number; height: number },
  body: CityPoint & { width: number; height: number },
) {
  const axis = (
    p: number,
    viewport: number,
    painting: number,
    start: number,
    extent: number,
  ) => {
    if (painting * scale <= viewport)
      return Math.max(
        12 - start * scale,
        Math.min(
          viewport - 12 - (start + extent) * scale,
          (viewport - painting * scale) / 2,
        ),
      );
    const lo = Math.max(viewport - painting * scale, 12 - start * scale);
    const hi = Math.min(0, viewport - 12 - (start + extent) * scale);
    return lo <= hi
      ? Math.max(lo, Math.min(hi, p))
      : Math.max(
          12 - start * scale,
          Math.min(viewport - 12 - (start + extent) * scale, p),
        );
  };
  return {
    x: axis(origin.x, size.width, 1600, body.x, body.width),
    y: axis(origin.y, size.height, 900, body.y, body.height),
  };
}
export function houseZoom(
  zoom: number,
  size: { width: number; height: number },
  bodyHeight = 330,
) {
  const fit = Math.min(size.width / 1600, size.height / 900);
  return Math.max(
    1,
    Math.min(
      zoom,
      2.5,
      fit > 0 ? (size.height - 30) / (Math.max(330, bodyHeight) * fit) : 1,
    ),
  );
}

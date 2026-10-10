import type { CityPoint } from './fate-city-layout';
import {
  CITY_INTERIOR_SCENES,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import {
  paintedFurniture,
  paintedPoint,
  type PreviewRoom,
  type PreviewDoor,
} from './fate-preview-house';

export const MATOU_ROOM_IDS = [
  'hall',
  'lounge',
  'dining',
  'bedroom',
  'archive',
] as const;
export type MatouRoomId = (typeof MATOU_ROOM_IDS)[number];
export const MATOU_CAST = [
  { id: 'sakura', name: '间桐樱' },
  { id: 'kariya', name: '间桐雁夜' },
  { id: 'medusa', name: '美杜莎' },
] as const;
export type MatouActorId = (typeof MATOU_CAST)[number]['id'];
const front = { x: 500, y: 590 };
const hallPoints: Record<Exclude<MatouRoomId, 'hall'>, CityPoint> = {
  lounge: { x: 295, y: 65 },
  dining: { x: 70, y: 190 },
  bedroom: { x: 710, y: 105 },
  archive: { x: 525, y: 20 },
};
const make = (
  id: Exclude<MatouRoomId, 'lounge'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'matou',
  name: '间桐宅',
  room,
  basis: '旧宅气氛参考 · 房间布局为游戏创作',
  description,
  painting: `/fate/interior-art/matou-${id}-soft-v1.png`,
  floor: {
    backLeft: 150,
    backRight: 1450,
    backY: id === 'hall' ? 410 : id === 'archive' ? 430 : 380,
    frontLeft: 20,
    frontRight: 1580,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
const back = (id: Exclude<MatouRoomId, 'hall'>): PreviewDoor => ({
  id: 'hall',
  label:
    id === 'bedroom'
      ? '下楼到玄关'
      : id === 'archive'
        ? '上楼到玄关'
        : '回玄关',
  point: id === 'lounge' ? { x: 500, y: 24 } : front,
  to: 'hall',
  arrival: { ...hallPoints[id], y: hallPoints[id].y + 58 },
});
export const MATOU_ROOMS: Record<MatouRoomId, PreviewRoom> = {
  hall: {
    scene: {
      ...make(
        'hall',
        '玄关与旧走廊',
        '旧木护墙与暗绿窗帘，起居厅、餐厨、楼梯和地下资料间通路清楚。',
      ),
      spots: [
        {
          id: 'coat',
          label: '整理玄关',
          point: { x: 820, y: 255 },
          detail: '把外套与伞留在门边，保持中间通路清楚。',
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
      ...(['lounge', 'dining', 'bedroom', 'archive'] as const).map((id) => ({
        id,
        label: {
          lounge: '旧宅起居厅',
          dining: '餐厅与厨房',
          bedroom: '上楼 · 樱的房间',
          archive: '下楼 · 家族资料间',
        }[id],
        point: hallPoints[id],
        to: id,
        arrival: id === 'lounge' ? { x: 500, y: 85 } : { x: 500, y: 560 },
      })),
    ],
    actions: [],
  },
  lounge: {
    scene: {
      ...CITY_INTERIOR_SCENES.matou,
      spots: [
        {
          id: 'tea',
          label: '在旧扶手椅坐下',
          point: { x: 660, y: 290 },
          detail: '坐在起居厅的旧扶手椅上，窗光仍然照得见家具与通路。',
        },
        {
          id: 'window',
          label: '看看常青藤',
          point: { x: 880, y: 70 },
          detail: '窗外常青藤和蕨与门前旧宅庭院对应。',
        },
        {
          id: 'clock',
          label: '看看旧钟与藏书',
          point: { x: 750, y: 125 },
          detail: '旧钟、书柜与厚窗帘保留这栋宅子的年代感。',
        },
      ],
    },
    doors: [back('lounge')],
    actions: [],
  },
  dining: {
    scene: make(
      'dining',
      '餐厅与厨房',
      '普通旧木餐桌、暗绿餐椅与家用厨房，留出桌边和中间通道。',
    ),
    doors: [back('dining')],
    actions: [],
  },
  bedroom: {
    scene: make(
      'bedroom',
      '樱的房间',
      '简单私室、浅紫织物、课本与窗边软椅，保留樱平静的日常。',
    ),
    doors: [back('bedroom')],
    actions: [],
  },
  archive: {
    scene: {
      ...make(
        'archive',
        '地下家族资料间',
        '旧木资料架与灰石地面，窗光和小台灯保持工作区清楚。',
      ),
      basis: '有希望的项目改编 · 安全资料间与布局为游戏创作',
    },
    doors: [back('archive')],
    actions: [],
  },
};
const piece = (
  id: MatouRoomId,
  name: string,
  rect: readonly number[],
  mask: readonly number[][],
) => paintedFurniture(MATOU_ROOMS[id].scene, name, rect, mask);
MATOU_ROOMS.hall.scene.furniture = [
  piece(
    'hall',
    'left-cabinet',
    [3, 69, 12, 79],
    [
      [1, 45],
      [13, 46],
      [13, 78],
      [3, 79],
    ],
  ),
  piece(
    'hall',
    'right-cabinet',
    [88, 65, 99, 79],
    [
      [86, 48],
      [99, 48],
      [99, 79],
      [88, 78],
    ],
  ),
];
MATOU_ROOMS.dining.scene.furniture = [
  piece(
    'dining',
    'table-chairs',
    [12, 58, 44, 82],
    [
      [12, 39],
      [16, 36],
      [19, 42],
      [23, 43],
      [25, 46],
      [34, 44],
      [36, 36],
      [40, 37],
      [42, 44],
      [44, 47],
      [43, 71],
      [35, 73],
      [35, 82],
      [23, 82],
      [22, 70],
      [13, 70],
    ],
  ),
  piece(
    'dining',
    'kitchen-counter',
    [65, 49, 84, 65],
    [
      [62, 28],
      [84, 29],
      [84, 63],
      [81, 65],
      [65, 57],
    ],
  ),
];
MATOU_ROOMS.bedroom.scene.furniture = [
  piece(
    'bedroom',
    'bed',
    [9, 53, 34, 67],
    [
      [9, 30],
      [21, 27],
      [31, 29],
      [32, 35],
      [33, 61],
      [28, 67],
      [9, 65],
    ],
  ),
  piece(
    'bedroom',
    'reading-chair',
    [50, 48, 63, 56],
    [
      [50, 35],
      [56, 32],
      [62, 35],
      [63, 50],
      [60, 56],
      [50, 54],
    ],
  ),
  piece(
    'bedroom',
    'writing-desk',
    [70, 47, 84, 57],
    [
      [68, 34],
      [84, 34],
      [84, 55],
      [80, 57],
      [75, 55],
      [71, 56],
    ],
  ),
];
MATOU_ROOMS.archive.scene.furniture = [
  piece(
    'archive',
    'archive-desk',
    [20, 52, 49, 63],
    [
      [20, 43],
      [49, 43],
      [49, 62],
      [46, 63],
      [44, 52],
      [31, 52],
      [30, 63],
      [21, 62],
    ],
  ),
  piece(
    'archive',
    'storage-cabinet',
    [77, 48, 86, 53],
    [
      [75, 28],
      [86, 28],
      [86, 51],
      [83, 53],
      [77, 52],
    ],
  ),
];
MATOU_ROOMS.dining.scene.spots = [
  {
    id: 'meal',
    label: '到餐桌旁坐下',
    point: { x: 160, y: 535 },
    detail: '在餐椅旁坐下，保留基本用餐氛围。',
  },
  {
    id: 'kitchen',
    label: '看看厨房与水壶',
    point: { x: 590, y: 250 },
    detail: '家用灶台与水壶，保留现有基础生活机制。',
  },
];
MATOU_ROOMS.bedroom.scene.spots = [
  {
    id: 'read',
    label: '到窗边软椅读书',
    point: { x: 650, y: 285 },
    detail: '在软椅上翻一会儿书，移动或停下即可起身。',
  },
  {
    id: 'bed',
    label: '看看床边与书包',
    point: { x: 200, y: 450 },
    detail: '浅紫床品、学校书包与清楚的床前通路。',
  },
  {
    id: 'desk',
    label: '查看课本与花瓶',
    point: { x: 810, y: 325 },
    detail: '书桌保留课本和小花瓶，陈设属于游戏创作。',
  },
];
MATOU_ROOMS.archive.scene.spots = [
  {
    id: 'notes',
    label: '查看家族资料',
    point: { x: 340, y: 400 },
    detail: '旧资料与笔记供本地环境阅读，不扩展复杂研究系统。',
  },
  {
    id: 'window',
    label: '走到高窗旁',
    point: { x: 630, y: 80 },
    detail: '安全资料间是本项目的有希望改编，保留旧宅气氛与可读地面。',
  },
];
MATOU_ROOMS.lounge.actions = [
  {
    id: 'tea',
    pose: 'sit',
    contact: paintedPoint(MATOU_ROOMS.lounge.scene, 625, 456),
    elevation: 0,
  },
];
MATOU_ROOMS.dining.actions = [
  {
    id: 'meal',
    pose: 'sit',
    contact: paintedPoint(MATOU_ROOMS.dining.scene, 280, 630),
    elevation: 0,
    mirror: true,
    scale: 1.55,
  },
];
MATOU_ROOMS.bedroom.actions = [
  {
    id: 'read',
    pose: 'read',
    contact: paintedPoint(MATOU_ROOMS.bedroom.scene, 885, 495),
    elevation: 0,
  },
];

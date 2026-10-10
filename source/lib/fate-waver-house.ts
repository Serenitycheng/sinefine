import {
  CITY_INTERIOR_SCENES,
  interiorDepth,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import {
  paintedFurniture,
  paintedPoint,
  type PreviewRoom,
  type PreviewAction,
} from './fate-preview-house';

export const WAVER_ROOM_IDS = [
  'hall',
  'lounge',
  'kitchen',
  'bedroom',
  'engawa',
] as const;
export type WaverRoomId = (typeof WAVER_ROOM_IDS)[number];
// This art preview uses the user's chosen adult variant. It does not change
// the formal game's Waver stage, identity, housing or servant relationship.
export const WAVER_PREVIEW_STAGE = 'adult' as const;
export const WAVER_CAST = [
  { id: 'waver', name: '韦伯 · 埃尔梅罗二世' },
  { id: 'iskandar', name: '伊斯坎达尔' },
] as const;
export type WaverActorId = (typeof WAVER_CAST)[number]['id'];
const make = (
  id: Exclude<WaverRoomId, 'lounge'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'waver',
  name: '韦伯的住处',
  room,
  basis: '冬木普通日式借住处 · 成年韦伯为用户选择 · 布局为游戏创作',
  description,
  painting: `/fate/interior-art/waver-${id}-soft-v1.png`,
  floor: {
    backLeft: 100,
    backRight: 1500,
    backY:
      id === 'hall'
        ? 390
        : id === 'kitchen'
          ? 420
          : id === 'bedroom'
            ? 438
            : 495,
    frontLeft: 10,
    frontRight: 1590,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
export const WAVER_ROOMS: Record<WaverRoomId, PreviewRoom> = {
  hall: {
    scene: make(
      'hall',
      '玄关与借住走廊',
      '普通住家的鞋柜、伞架和四个清楚门槛，中央动线保持空净。',
    ),
    doors: [],
    actions: [],
  },
  lounge: {
    scene: { ...CITY_INTERIOR_SCENES.waver, spots: [] },
    doors: [],
    actions: [],
  },
  kitchen: {
    scene: make(
      'kitchen',
      '厨房与家用餐间',
      '旧木橱柜、家用水壶与普通餐桌，绿萝和竹帘延续这栋住家的气质。',
    ),
    doors: [],
    actions: [],
  },
  bedroom: {
    scene: make(
      'bedroom',
      '借住卧室与阅读桌',
      '朴素床铺、旅行箱与资料桌，深色外套和红围巾对应成年韦伯。',
    ),
    doors: [],
    actions: [],
  },
  engawa: {
    scene: make(
      'engawa',
      '缘侧与庭边长凳',
      '木缘侧通向小庭景，山茶与蕨类在栏杆外，行走留在铺好的木地面。',
    ),
    doors: [],
    actions: [],
  },
};
const p = (room: WaverRoomId, x: number, y: number) =>
  paintedPoint(WAVER_ROOMS[room].scene, x * 16, y * 9);
const front = { x: 500, y: 590 };
const thresholds = {
  lounge: p('hall', 17, 62),
  kitchen: p('hall', 41, 49),
  bedroom: p('hall', 64, 51),
  engawa: p('hall', 88, 63),
};
const returns = {
  lounge: front,
  kitchen: p('kitchen', 49, 50),
  bedroom: p('bedroom', 55, 51),
  engawa: p('engawa', 18, 68),
};
WAVER_ROOMS.hall.doors = [
  { id: 'street', label: '离屋回街道', point: front, to: null, arrival: front },
  ...(['lounge', 'kitchen', 'bedroom', 'engawa'] as const).map((id) => ({
    id,
    label: WAVER_ROOMS[id].scene.room,
    point: thresholds[id],
    to: id,
    arrival: {
      ...returns[id],
      y: returns[id].y + (id === 'lounge' ? -65 : 65),
    },
  })),
];
for (const id of ['lounge', 'kitchen', 'bedroom', 'engawa'] as const)
  WAVER_ROOMS[id].doors = [
    {
      id: 'hall',
      label: '回借住走廊',
      point: returns[id],
      to: 'hall',
      arrival: { ...thresholds[id], y: thresholds[id].y + 65 },
    },
  ];
const piece = (
  id: WaverRoomId,
  name: string,
  rect: readonly number[],
  mask: readonly number[][],
) => paintedFurniture(WAVER_ROOMS[id].scene, name, rect, mask);
const boundary = (name: string, rect: readonly number[]) => ({
  id: name,
  footprint: piece('hall', name, rect, []).footprint,
});
WAVER_ROOMS.hall.scene.furniture = [
  boundary('lounge-boundary', [0, 43, 24, 56]),
  boundary('kitchen-boundary', [32, 30, 47, 44]),
  boundary('bedroom-boundary', [58, 38, 78, 45]),
  boundary('engawa-boundary', [85, 44, 100, 57]),
  piece(
    'hall',
    'shoe-cabinet',
    [0, 66, 9, 79],
    [
      [0, 37],
      [10, 36],
      [10, 64],
      [2, 77],
      [0, 78],
    ],
  ),
  piece(
    'hall',
    'umbrella-stand',
    [95, 66, 100, 75],
    [
      [96, 43],
      [99, 44],
      [100, 71],
      [96, 73],
    ],
  ),
];
WAVER_ROOMS.lounge.scene.furniture = [
  ...WAVER_ROOMS.lounge.scene.furniture,
  piece(
    'lounge',
    'research-chair',
    [80, 48, 86, 56],
    [
      [79.3, 33],
      [81.8, 34],
      [82.5, 43],
      [86, 43],
      [86.3, 49],
      [84.5, 49.5],
      [84, 44],
      [82.5, 45],
      [81, 51],
      [79.6, 50],
      [80.6, 43],
      [79.3, 42],
    ],
  ),
];
WAVER_ROOMS.kitchen.scene.furniture = [
  piece(
    'kitchen',
    'counter',
    [0, 54, 32, 97],
    [
      [0, 42],
      [30, 33],
      [33, 42],
      [31, 54],
      [8, 94],
      [0, 97],
    ],
  ),
  piece(
    'kitchen',
    'cupboard',
    [64, 49, 84, 53],
    [
      [64, 10],
      [84, 10],
      [84, 50],
      [67, 52],
      [64, 49],
    ],
  ),
  piece(
    'kitchen',
    'dining-table',
    [76, 63, 100, 86],
    [
      [70, 45],
      [98, 46],
      [100, 51],
      [100, 82],
      [98, 85],
      [97, 61],
      [80, 61],
      [80, 85],
      [77, 85],
      [77, 61],
      [70, 49],
    ],
  ),
  piece(
    'kitchen',
    'dining-chair',
    [66, 62, 80, 82],
    [
      [67, 46],
      [71, 48],
      [73, 61],
      [80, 60],
      [80, 74],
      [77, 75],
      [76, 65],
      [73, 66],
      [71, 81],
      [68, 79],
      [69, 66],
      [67, 61],
    ],
  ),
];
WAVER_ROOMS.bedroom.scene.furniture = [
  piece(
    'bedroom',
    'single-bed',
    [0, 53, 31, 79],
    [
      [0, 44],
      [26, 36],
      [31, 44],
      [29, 59],
      [19, 77],
      [0, 77],
    ],
  ),
  piece(
    'bedroom',
    'bedside-case',
    [31, 52, 41, 56],
    [
      [31, 40],
      [37, 39],
      [41, 42],
      [40, 56],
      [32, 55],
    ],
  ),
  piece(
    'bedroom',
    'writing-desk',
    [79, 56, 100, 74],
    [
      [79, 36],
      [90, 35],
      [100, 42],
      [100, 67],
      [89, 67],
      [87, 74],
      [84, 72],
      [83, 45],
      [79, 42],
    ],
  ),
  piece(
    'bedroom',
    'reading-chair',
    [71, 56, 82, 68],
    [
      [71, 36],
      [75, 36],
      [76, 47],
      [82, 47],
      [82, 64],
      [80, 65],
      [79, 54],
      [77, 54],
      [75, 68],
      [73, 67],
      [74, 53],
      [71, 47],
    ],
  ),
];
WAVER_ROOMS.engawa.scene.furniture = [
  piece(
    'engawa',
    'bench',
    [24, 55, 45, 59],
    [
      [24, 43],
      [42, 32],
      [45, 33],
      [45, 43],
      [43, 47],
      [43, 46],
      [31, 51],
      [30, 57],
      [27, 57],
      [27, 46],
      [24, 46],
    ],
  ),
  piece(
    'engawa',
    'fern-and-can',
    [75, 55, 86, 60],
    [
      [75, 44],
      [78, 42],
      [79, 48],
      [80, 40],
      [86, 41],
      [86, 58],
      [79, 60],
      [76, 56],
    ],
  ),
];
const spot = (
  id: WaverRoomId,
  key: string,
  label: string,
  x: number,
  y: number,
  detail: string,
) => ({ id: key, label, point: p(id, x, y), detail });
WAVER_ROOMS.hall.scene.spots = [
  spot(
    'hall',
    'shoes',
    '看看玄关与便鞋',
    20,
    80,
    '住家的鞋柜和便鞋靠边，借住走廊保持空净。',
  ),
  spot(
    'hall',
    'umbrella',
    '看看门边的伞与挂画',
    89,
    83,
    '日式家屋仍是普通住家，房间连接与摆设为游戏创作。',
  ),
];
WAVER_ROOMS.lounge.scene.spots = [
  spot(
    'lounge',
    'sit',
    '在绿布沙发坐下',
    20,
    76,
    '在旧沙发歇一会儿；移动或停下即可起身。',
  ),
  spot(
    'lounge',
    'read',
    '在资料桌旁读书',
    77,
    73,
    '书、地图与灯保留资料角，预览使用成年韦伯模型，不改正式人物阶段。',
  ),
  spot(
    'lounge',
    'tea',
    '看看茶桌与地图',
    55,
    75,
    '茶桌留出绕行通路，资料和茶杯是环境陈设。',
  ),
];
WAVER_ROOMS.kitchen.scene.spots = [
  spot(
    'kitchen',
    'meal',
    '到家用餐椅坐下',
    62,
    90,
    '普通餐椅与家用餐桌，坐下动作不新增食物库存。',
  ),
  spot(
    'kitchen',
    'kettle',
    '看看水壶与杯碗',
    39,
    77,
    '厨房保持住家尺度；基础生活机制沿用原实现。',
  ),
];
WAVER_ROOMS.bedroom.scene.spots = [
  spot(
    'bedroom',
    'read',
    '在借住卧室读书',
    66,
    78,
    '阅读椅靠在资料桌旁，深色外套与围巾对应成年韦伯。',
  ),
  spot(
    'bedroom',
    'case',
    '看看旅行箱与床边物件',
    47,
    73,
    '这是冬木原借住处的游戏扩建，未改为时钟塔办公室。',
  ),
];
WAVER_ROOMS.engawa.scene.spots = [
  spot(
    'engawa',
    'sit',
    '在缘侧长凳坐下',
    49,
    78,
    '坐在木长凳上看看庭景，起身回安全木地面。',
  ),
  spot(
    'engawa',
    'garden',
    '看看栏外的山茶与蕨',
    71,
    83,
    '庭景在栏杆外，行走与交互留在安全的木缘侧。',
  ),
];
const seat = (
  id: WaverRoomId,
  key: string,
  pose: 'sit' | 'read',
  x: number,
  y: number,
  groundY: number,
  scale = 1.2,
  mirror = true,
): PreviewAction => {
  const contact = p(id, x, groundY);
  return {
    id: key,
    pose,
    contact,
    elevation:
      ((groundY - y) * 9) / interiorDepth(contact, WAVER_ROOMS[id].scene.floor),
    scale,
    mirror,
  };
};
WAVER_ROOMS.lounge.actions = [
  seat('lounge', 'sit', 'sit', 10.7, 52, 70, 1.1),
  seat('lounge', 'read', 'read', 81.3, 42.8, 65, 1.05),
];
WAVER_ROOMS.kitchen.actions = [
  seat('kitchen', 'meal', 'sit', 74, 64, 85, 1.12),
];
WAVER_ROOMS.bedroom.actions = [
  seat('bedroom', 'read', 'read', 76, 51, 73, 1.12),
];
WAVER_ROOMS.engawa.actions = [seat('engawa', 'sit', 'sit', 33, 43, 62, 1.1)];

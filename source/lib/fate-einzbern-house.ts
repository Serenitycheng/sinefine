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

export const EINZBERN_ROOM_IDS = [
  'hall',
  'lounge',
  'kitchen',
  'parents',
  'illya',
  'study',
] as const;
export type EinzbernRoomId = (typeof EINZBERN_ROOM_IDS)[number];
export const EINZBERN_CAST = [
  { id: 'kiritsugu', name: '卫宫切嗣' },
  { id: 'irisviel', name: '爱丽丝菲尔' },
  { id: 'illya', name: '伊莉雅' },
] as const;
export type EinzbernActorId = (typeof EINZBERN_CAST)[number]['id'];
const make = (
  id: Exclude<EinzbernRoomId, 'lounge'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'einzbern',
  name: '切嗣一家 · 新居',
  room,
  basis: '项目改编的冬木家庭新居 · 房间布局创作',
  description,
  painting: `/fate/interior-art/einzbern-${id}-soft-v1.png`,
  floor: {
    backLeft: id === 'hall' ? 120 : 80,
    backRight: id === 'hall' ? 1480 : 1520,
    backY: id === 'hall' ? 365 : id === 'kitchen' ? 435 : 390,
    frontLeft: 10,
    frontRight: 1590,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
export const EINZBERN_ROOMS: Record<EinzbernRoomId, PreviewRoom> = {
  hall: {
    scene: make(
      'hall',
      '玄关与家庭走廊',
      '五处真实门口连着家庭房间，鞋柜和伞架靠边，保留中间动线。',
    ),
    doors: [],
    actions: [],
  },
  lounge: {
    scene: { ...CITY_INTERIOR_SCENES.einzbern, spots: [] },
    doors: [],
    actions: [],
  },
  kitchen: {
    scene: make(
      'kitchen',
      '厨房与早餐间',
      '浅色家用橱柜、小餐桌和三只杯子，栀子窗光延续家庭起居间。',
    ),
    doors: [],
    actions: [],
  },
  parents: {
    scene: make(
      'parents',
      '父母的卧室',
      '普通双人床、蓝灰织物与窗边软椅，旧旅行箱和合照留在书架。',
    ),
    doors: [],
    actions: [],
  },
  illya: {
    scene: make(
      'illya',
      '伊莉雅的房间',
      '浅紫床品、个人书桌、书和小陈设，保留清楚的床前和窗边通路。',
    ),
    doors: [],
    actions: [],
  },
  study: {
    scene: make(
      'study',
      '切嗣的书房',
      '旧木书桌、笔记与窗边阅读椅，日常家用书房保留往事的小陈设。',
    ),
    doors: [],
    actions: [],
  },
};
const p = (id: EinzbernRoomId, x: number, y: number) =>
  paintedPoint(EINZBERN_ROOMS[id].scene, x * 16, y * 9);
const front = { x: 500, y: 590 };
const thresholds = {
  lounge: p('hall', 18, 58),
  kitchen: p('hall', 35, 45),
  study: p('hall', 55, 43),
  parents: p('hall', 73, 47),
  illya: p('hall', 90, 62),
};
const returnPoints = {
  lounge: front,
  kitchen: p('kitchen', 10, 70),
  parents: p('parents', 52, 47),
  illya: p('illya', 50, 47),
  study: p('study', 51, 48),
};
EINZBERN_ROOMS.hall.doors = [
  { id: 'street', label: '离屋回街道', point: front, to: null, arrival: front },
  ...(['lounge', 'kitchen', 'parents', 'illya', 'study'] as const).map(
    (id) => ({
      id,
      label: EINZBERN_ROOMS[id].scene.room,
      point: thresholds[id],
      to: id,
      arrival: {
        ...returnPoints[id],
        y: returnPoints[id].y + (id === 'lounge' ? -65 : 65),
      },
    }),
  ),
];
for (const id of ['lounge', 'kitchen', 'parents', 'illya', 'study'] as const) {
  EINZBERN_ROOMS[id].doors = [
    {
      id: 'hall',
      label: '回家庭走廊',
      point: returnPoints[id],
      to: 'hall',
      arrival: { ...thresholds[id], y: thresholds[id].y + 65 },
    },
  ];
}
const piece = (
  id: EinzbernRoomId,
  name: string,
  rect: readonly number[],
  mask: readonly number[][],
) => paintedFurniture(EINZBERN_ROOMS[id].scene, name, rect, mask);
/** Register the ground separately from the disconnected visible woodwork. */
const illyaPiece = (
  name: string,
  ground: readonly number[][],
  masks: readonly (readonly number[][])[],
) => {
  const collision = ground.map(([x, y]) => p('illya', x, y));
  const xs = collision.map((q) => q.x),
    ys = collision.map((q) => q.y);
  return {
    id: name,
    footprint: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    },
    collision,
    silhouettes: masks.map((mask) =>
      mask.map(([x, y]) => ({ x: x * 16, y: y * 9 })),
    ),
  };
};
const boundary = (name: string, rect: readonly number[]) => ({
  id: name,
  footprint: piece('hall', name, rect, []).footprint,
});
EINZBERN_ROOMS.hall.scene.furniture = [
  // Visible neighbouring floors belong to their rooms. Block the area behind
  // each threshold so manual walking cannot silently wander into those paintings.
  boundary('lounge-boundary', [0, 41, 24, 54]),
  boundary('kitchen-boundary', [29, 41, 40, 42]),
  boundary('parents-boundary', [67, 41, 80, 44]),
  boundary('illya-boundary', [85, 41, 100, 58]),
  piece(
    'hall',
    'shoe-cabinet',
    [1, 71, 15, 93],
    [
      [0, 53],
      [14, 51],
      [15, 86],
      [12, 94],
      [0, 98],
    ],
  ),
  piece(
    'hall',
    'coat-stand',
    [94, 71, 99, 92],
    [
      [95, 17],
      [99, 17],
      [100, 93],
      [92, 92],
      [92, 81],
      [94, 77],
    ],
  ),
];
EINZBERN_ROOMS.kitchen.scene.furniture = [
  piece(
    'kitchen',
    'counter',
    [27, 50, 74, 65],
    [
      [26, 33],
      [36, 29],
      [74, 31],
      [74, 51],
      [35, 52],
      [28, 63],
    ],
  ),
  piece(
    'kitchen',
    'breakfast-table',
    [71, 60, 98, 81],
    [
      [70, 44],
      [75, 42],
      [80, 43],
      [81, 48],
      [93, 41],
      [97, 43],
      [96, 64],
      [90, 66],
      [89, 80],
      [80, 81],
      [79, 67],
      [72, 73],
    ],
  ),
];
EINZBERN_ROOMS.parents.scene.furniture = [
  piece(
    'parents',
    'double-bed',
    [1, 55, 42, 71],
    [
      [0, 32],
      [16, 37],
      [38, 41],
      [42, 52],
      [39, 70],
      [0, 71],
    ],
  ),
  piece(
    'parents',
    'reading-chair',
    [82, 56, 98, 68],
    [
      [82, 42],
      [87, 35],
      [100, 38],
      [100, 63],
      [93, 68],
      [82, 61],
    ],
  ),
  piece(
    'parents',
    'keepsakes',
    [62, 46, 78, 51],
    [
      [62, 29],
      [78, 29],
      [78, 51],
      [62, 48],
    ],
  ),
];
EINZBERN_ROOMS.illya.scene.furniture = [
  piece(
    'illya',
    'single-bed',
    [0, 55, 30, 67],
    [
      [0, 31],
      [12, 29],
      [29, 40],
      [30, 65],
      [23, 68],
      [0, 64],
    ],
  ),
  illyaPiece(
    'desk-chair',
    [
      [66.1, 51],
      [75.7, 49],
      [77.3, 61.8],
      [68.4, 63.4],
      [65.8, 58.5],
    ],
    [
      [
        [65.3, 31.1],
        [66.2, 31.7],
        [68.9, 32.4],
        [69.1, 35],
        [66, 34],
      ],
      [
        [65.7, 33.2],
        [66.3, 34],
        [67.8, 46.7],
        [67.1, 47],
      ],
      [
        [68.7, 34.5],
        [69.2, 34.7],
        [70.2, 46.7],
        [69.6, 46.5],
      ],
      [
        [66.7, 35],
        [67, 35],
        [68.3, 45.7],
        [68, 45.6],
      ],
      [
        [67.5, 35.2],
        [67.8, 35.3],
        [68.9, 46],
        [68.6, 46],
      ],
      [
        [68.2, 35.4],
        [68.5, 35.5],
        [69.4, 46.5],
        [69.1, 46.4],
      ],
      [
        [67.4, 45.3],
        [73.5, 43.1],
        [76.9, 46.4],
        [77.2, 49.5],
        [69.1, 51.1],
        [67.6, 48],
      ],
      [
        [66.4, 46.7],
        [67.3, 47],
        [66.8, 58.6],
        [66, 58.6],
      ],
      [
        [69, 50],
        [69.9, 50],
        [69.1, 63.2],
        [68.3, 63.1],
      ],
      [
        [76, 49],
        [76.9, 49],
        [77.2, 61.6],
        [76.3, 61.9],
      ],
      [
        [73, 50],
        [73.7, 50],
        [73.8, 57.5],
        [73, 57.4],
      ],
      [
        [69.5, 51.9],
        [76.2, 50.8],
        [76.3, 52],
        [69.5, 53],
      ],
    ],
  ),
  illyaPiece(
    'writing-desk',
    [
      [70.2, 44.5],
      [89.5, 45],
      [92.3, 62.5],
      [80, 67.5],
      [78.8, 52],
      [70.4, 49],
    ],
    [
      [
        [69.5, 31.7],
        [75, 30.8],
        [92.4, 39.3],
        [92.4, 41.2],
        [80, 43.5],
        [70.4, 35],
      ],
      [
        [70, 34],
        [79.3, 42.8],
        [79.5, 47.2],
        [70.4, 38.3],
      ],
      [
        [69.8, 34.3],
        [70.5, 34.8],
        [70.8, 44],
        [70.1, 44.3],
      ],
      [
        [79.2, 42.5],
        [92.2, 40.5],
        [91.7, 62.4],
        [80, 67.1],
      ],
    ],
  ),
  illyaPiece(
    'right-sideboard',
    [
      [87, 66.8],
      [97, 69],
      [98, 89.8],
      [87.2, 77.3],
    ],
    [
      [
        [86.3, 44.1],
        [93, 43.2],
        [100, 49],
        [100, 90],
        [87.2, 77.5],
      ],
    ],
  ),
  piece(
    'illya',
    'bookcase',
    [23, 44, 37, 48],
    [
      [23, 15],
      [37, 15],
      [37, 48],
      [23, 47],
    ],
  ),
];
EINZBERN_ROOMS.study.scene.furniture = [
  piece(
    'study',
    'writing-desk',
    [5, 53, 36, 67],
    [
      [5, 42],
      [31, 38],
      [36, 42],
      [35, 67],
      [31, 66],
      [30, 49],
      [13, 49],
      [11, 65],
      [6, 65],
    ],
  ),
  piece(
    'study',
    'reading-chair',
    [76, 64, 99, 79],
    [
      [76, 45],
      [83, 43],
      [86, 37],
      [100, 36],
      [100, 77],
      [90, 79],
      [78, 70],
    ],
  ),
  piece(
    'study',
    'bookcase',
    [64, 47, 78, 52],
    [
      [64, 7],
      [78, 7],
      [78, 52],
      [64, 48],
    ],
  ),
];
const spot = (
  id: EinzbernRoomId,
  key: string,
  label: string,
  x: number,
  y: number,
  detail: string,
) => ({ id: key, label, point: p(id, x, y), detail });
EINZBERN_ROOMS.hall.scene.spots = [
  spot(
    'hall',
    'flowers',
    '看看玄关的合照与栀子',
    23,
    80,
    '合照、成人鞋与小紫靴记录着这个冬木新家的普通生活。',
  ),
  spot(
    'hall',
    'coats',
    '看看门边的外套与伞',
    86,
    82,
    '衣帽架靠在门边，家庭走廊保持畅通。',
  ),
];
EINZBERN_ROOMS.lounge.scene.spots = [
  spot(
    'lounge',
    'sit',
    '在家庭沙发坐下',
    28,
    75,
    '坐在柔软沙发上歇一会儿；移动或停下即可起身。',
  ),
  spot(
    'lounge',
    'garden',
    '看看窗外的栀子',
    58,
    57,
    '窗外庭院和门前栀子相呼应，欧洲小陈设留在冬木的普通新家里。',
  ),
  spot(
    'lounge',
    'table',
    '看看家庭餐桌',
    62,
    70,
    '餐桌上放着花瓶，三把椅子收在桌边。',
  ),
];
EINZBERN_ROOMS.kitchen.scene.spots = [
  spot(
    'kitchen',
    'breakfast',
    '到早餐桌旁坐下',
    67,
    87,
    '在小餐桌旁坐下，三个杯子和淡色桌布保留日常氛围。',
  ),
  spot(
    'kitchen',
    'recipe',
    '看看食谱与水壶',
    50,
    70,
    '食谱和家用水壶是环境陈设，基础烹饪与日程沿用原机制。',
  ),
];
EINZBERN_ROOMS.parents.scene.spots = [
  spot(
    'parents',
    'read',
    '在卧室窗边读书',
    78,
    76,
    '在窗边软椅读一会儿；起身后继续沿安全地面行走。',
  ),
  spot(
    'parents',
    'bed',
    '看看床边与旧旅行箱',
    47,
    75,
    '普通双人床、外套与旧旅行箱保留家人的生活痕迹。',
  ),
];
EINZBERN_ROOMS.illya.scene.spots = [
  {
    ...spot(
      'illya',
      'read',
      '到伊莉雅的书桌读书',
      61,
      77,
      '在小书桌旁读一会儿。',
    ),
    target: { x: 73 * 16, y: 43 * 9 },
  },
  {
    ...spot(
      'illya',
      'bed',
      '看看伊莉雅的床边',
      38,
      75,
      '浅紫床品和叠好的外套，保留属于伊莉雅自己的空间。',
    ),
    target: { x: 21 * 16, y: 49 * 9 },
  },
];
EINZBERN_ROOMS.study.scene.spots = [
  spot(
    'study',
    'read',
    '在书房软椅读书',
    72,
    86,
    '在书房窗边读书，不把日常新居画成军事据点。',
  ),
  spot(
    'study',
    'notes',
    '看看切嗣的笔记',
    40,
    72,
    '旧笔记与家庭合照留在书桌旁，陈设布局为游戏创作。',
  ),
];
/** Align the pelvis to the painted seat. The approach remains a separate safe
 * floor point; children can naturally have their feet hanging from a sofa. */
const seat = (
  id: EinzbernRoomId,
  key: string,
  pose: 'sit' | 'read',
  x: number,
  y: number,
  groundY: number,
  scale = 1.2,
  mirror = false,
): PreviewAction => {
  const contact = p(id, x, groundY);
  return {
    id: key,
    pose,
    contact,
    elevation:
      ((groundY - y) * 9) /
      interiorDepth(contact, EINZBERN_ROOMS[id].scene.floor),
    scale,
    mirror,
  };
};
EINZBERN_ROOMS.lounge.actions = [
  seat('lounge', 'sit', 'sit', 18.6, 48, 67, 1.2),
];
EINZBERN_ROOMS.kitchen.actions = [
  seat('kitchen', 'breakfast', 'sit', 83, 61, 83, 1.25, true),
];
EINZBERN_ROOMS.parents.actions = [
  seat('parents', 'read', 'read', 89.5, 51, 73, 1.15, true),
];
EINZBERN_ROOMS.illya.actions = [seat('illya', 'read', 'read', 70, 50, 74, 1.1)];
EINZBERN_ROOMS.study.actions = [
  seat('study', 'read', 'read', 87, 62, 83, 1.25, true),
];

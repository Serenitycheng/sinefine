import {
  CITY_INTERIOR_SCENES,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import {
  paintedPoint,
  paintedFurniture,
  type PreviewRoom,
  type PreviewAction,
} from './fate-preview-house';

export const CHURCH_ROOM_IDS = [
  'hall',
  'chapel',
  'vestry',
  'quarters',
  'cellar',
] as const;
export type ChurchRoomId = (typeof CHURCH_ROOM_IDS)[number];
export const CHURCH_CAST = [
  { id: 'kirei', name: '言峰绮礼' },
  { id: 'cu', name: '库·丘林' },
] as const;
export type ChurchActorId = (typeof CHURCH_CAST)[number]['id'];
const make = (
  id: Exclude<ChurchRoomId, 'chapel'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'church',
  name: '教会 · 绮礼的住处',
  room,
  basis: '原作教会形制参考 · 新增辅助空间布局为游戏创作',
  description,
  painting: `/fate/interior-art/church-${id}-soft-v1.png`,
  floor: {
    backLeft: 100,
    backRight: 1500,
    backY: 380,
    frontLeft: 10,
    frontRight: 1590,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
export const CHURCH_ROOMS: Record<ChurchRoomId, PreviewRoom> = {
  hall: {
    scene: make(
      'hall',
      '教会门厅与侧廊',
      '门厅连着礼拜堂、祭衣间、生活间与地下资料室，石阶前留着可走的门槛。',
    ),
    doors: [],
    actions: [],
  },
  chapel: {
    scene: {
      ...CITY_INTERIOR_SCENES.church,
      description: '两列长椅之间留着中轴过道；门厅连接教会的生活与辅助空间。',
      furniture: [...CITY_INTERIOR_SCENES.church.furniture],
      spots: [],
    },
    doors: [],
    actions: [],
  },
  vestry: {
    scene: make(
      'vestry',
      '祭衣间与准备室',
      '深木柜收好素色织物，纸页与杯子放在窗边桌案。',
    ),
    doors: [],
    actions: [],
  },
  quarters: {
    scene: make(
      'quarters',
      '绮礼生活间',
      '朴素床铺、茶桌与书案，黑外套挂在墙边。',
    ),
    doors: [],
    actions: [],
  },
  cellar: {
    scene: make(
      'cellar',
      '地下资料与准备室',
      '石拱与旧书柜下是一间安静的资料室；灯光照着木案和折好的布。',
    ),
    doors: [],
    actions: [],
  },
};
const p = (id: ChurchRoomId, x: number, y: number) =>
  paintedPoint(CHURCH_ROOMS[id].scene, x * 16, y * 9);
const front = { x: 500, y: 590 };
const branches = ['chapel', 'vestry', 'quarters', 'cellar'] as const;
const thresholds = {
  chapel: p('hall', 50, 54),
  vestry: p('hall', 16, 58),
  quarters: p('hall', 73.5, 55.5),
  cellar: p('hall', 91, 71.5),
};
const returns = {
  chapel: front,
  vestry: p('vestry', 48, 63.5),
  quarters: p('quarters', 50, 48.8),
  cellar: p('cellar', 50, 62.5),
};
const labels = {
  chapel: '礼拜堂',
  vestry: '祭衣间',
  quarters: '生活间',
  cellar: '地下室',
};
CHURCH_ROOMS.hall.doors = [
  {
    id: 'street',
    label: '出门回教会坡',
    point: front,
    to: null,
    arrival: front,
  },
  ...branches.map((id) => ({
    id,
    label: labels[id],
    point: thresholds[id],
    to: id,
    arrival: {
      ...returns[id],
      y: returns[id].y + (id === 'chapel' ? -65 : 65),
    },
  })),
];
for (const id of branches)
  CHURCH_ROOMS[id].doors = [
    {
      id: 'hall',
      label: '回教会门厅',
      point: returns[id],
      to: 'hall',
      arrival: {
        ...thresholds[id],
        y: thresholds[id].y + (id === 'cellar' ? -65 : 65),
      },
    },
  ];
const piece = (
  id: ChurchRoomId,
  name: string,
  rect: readonly number[],
  mask: readonly number[][],
) => paintedFurniture(CHURCH_ROOMS[id].scene, name, rect, mask);
const boundary = (
  name: string,
  rect: readonly number[],
  room: ChurchRoomId = 'hall',
) => ({
  id: name,
  footprint: piece(room, name, rect, []).footprint,
});
// Keep the approved bank footprints, but give each drawn pew its own depth
// layer. A whole-bank mask would hide a seated person's head and torso.
CHURCH_ROOMS.chapel.scene.furniture = [
  ...CITY_INTERIOR_SCENES.church.furniture.map(({ id, footprint }) => ({
    id,
    footprint,
  })),
  ...[
    [20, 39, 43.5, 49],
    [16, 38, 47, 53],
    [12, 37, 51, 57],
    [8, 36, 54.5, 63],
    [3, 35, 58.5, 74],
  ].flatMap(([left, right, top, bottom], row) => [
    piece(
      'chapel',
      `left-pew-${row}`,
      [left, bottom - 3, right, bottom],
      [
        [left + 2, top],
        [right, top - 1],
        [right, bottom],
        [left, bottom - 1],
      ],
    ),
    piece(
      'chapel',
      `right-pew-${row}`,
      [100 - right, bottom - 3, 100 - left, bottom],
      [
        [100 - right, top - 1],
        [98 - left, top],
        [100 - left, bottom - 1],
        [100 - right, bottom],
      ],
    ),
  ]),
];
CHURCH_ROOMS.hall.scene.furniture = [
  boundary('chapel-boundary', [40, 40, 60, 49]),
  boundary('vestry-boundary', [9, 44, 23, 53]),
  boundary('quarters-boundary', [68, 41, 80, 51]),
  boundary('cellar-boundary', [83, 75, 100, 99]),
  piece(
    'hall',
    'umbrella-corner',
    [0, 66, 8, 81],
    [
      [0, 48],
      [7, 49],
      [8, 78],
      [0, 81],
    ],
  ),
];
CHURCH_ROOMS.vestry.scene.furniture = [
  boundary('vestry-return-boundary', [31, 42, 65, 59.5], 'vestry'),
  piece(
    'vestry',
    'robe-cabinet',
    [0, 49, 30, 76],
    [
      [0, 17],
      [29, 18],
      [30, 73],
      [0, 76],
    ],
  ),
  piece(
    'vestry',
    'wash-basin',
    [0, 75, 17, 99],
    [
      [0, 55],
      [17, 57],
      [17, 99],
      [0, 99],
    ],
  ),
  piece(
    'vestry',
    'desk',
    [82, 66, 100, 96],
    [
      [76, 50],
      [100, 49],
      [100, 96],
      [87, 93],
      [82, 67],
    ],
  ),
  piece(
    'vestry',
    'chair',
    [69, 70, 82, 84],
    [
      [69, 47],
      [72, 47],
      [74, 62],
      [81, 62],
      [82, 83],
      [70, 84],
    ],
  ),
];
CHURCH_ROOMS.quarters.scene.furniture = [
  boundary('quarters-return-boundary', [39, 42, 60, 46.5], 'quarters'),
  piece(
    'quarters',
    'plain-bed',
    [0, 47, 37, 61],
    [
      [0, 36],
      [31, 28],
      [37, 50],
      [24, 59],
      [1, 61],
    ],
  ),
  piece(
    'quarters',
    'tea-table',
    [0, 68, 24, 94],
    [
      [0, 56],
      [23, 54],
      [24, 84],
      [14, 94],
      [0, 89],
    ],
  ),
  piece(
    'quarters',
    'tea-chair',
    [20, 72, 37, 94],
    [
      [32, 47],
      [36, 48],
      [35, 89],
      [32, 94],
      [20, 89],
      [20, 71],
    ],
  ),
  piece(
    'quarters',
    'writing-desk',
    [87, 67, 100, 98],
    [
      [82, 46],
      [100, 49],
      [100, 98],
      [87, 94],
      [86, 67],
    ],
  ),
  piece(
    'quarters',
    'writing-chair',
    [73, 72, 89, 92],
    [
      [73, 46],
      [77, 47],
      [78, 65],
      [89, 66],
      [87, 91],
      [73, 90],
    ],
  ),
];
CHURCH_ROOMS.cellar.scene.furniture = [
  boundary('cellar-return-boundary', [40, 42, 60, 59.5], 'cellar'),
  piece(
    'cellar',
    'archive-shelf',
    [0, 49, 28, 76],
    [
      [0, 19],
      [27, 24],
      [28, 73],
      [0, 76],
    ],
  ),
  piece(
    'cellar',
    'preparation-table',
    [80, 67, 100, 99],
    [
      [76, 53],
      [100, 54],
      [100, 99],
      [80, 81],
    ],
  ),
  piece(
    'cellar',
    'archive-chair',
    [68, 70, 80, 83],
    [
      [68, 51],
      [72, 51],
      [73, 63],
      [80, 64],
      [80, 80],
      [69, 83],
    ],
  ),
];
type Spot = {
  id: string;
  label: string;
  x: number;
  y: number;
  detail: string;
  pose?: PreviewAction['pose'];
  cx?: number;
  cy?: number;
  elevation?: number;
  mirror?: boolean;
  scale?: number;
};
const spots: Record<ChurchRoomId, Spot[]> = {
  hall: [
    {
      id: 'umbrella',
      label: '看看门边',
      x: 16,
      y: 80,
      detail: '雨伞与旧木凳靠在侧墙，门前留着通路。',
    },
    {
      id: 'notices',
      label: '看看布告栏',
      x: 32,
      y: 62,
      detail: '教会的纸页整齐夹着，房间标识指向真实门槛。',
    },
  ],
  chapel: [
    {
      id: 'sit',
      label: '在长椅坐一会',
      x: 41,
      y: 70,
      detail: '走到长椅侧边，再在木椅上安静坐下。',
      pose: 'sit',
      cx: 33.5,
      cy: 57.5,
      elevation: 18,
    },
    {
      id: 'altar',
      label: '看看祭坛',
      x: 50,
      y: 46,
      detail: '窄窗的柔光落在深木与石台上。',
    },
    {
      id: 'window',
      label: '看看彩窗',
      x: 90,
      y: 85,
      detail: '侧窗色彩映在石地，过道保持可走。',
    },
  ],
  vestry: [
    {
      id: 'read',
      label: '坐下看看纸页',
      x: 59,
      y: 88,
      detail: '在书案旁坐下，翻看一会儿教会的纸页。',
      pose: 'read',
      cx: 74,
      cy: 68.5,
      elevation: 18,
      scale: 1.4,
    },
    {
      id: 'robes',
      label: '看看祭衣柜',
      x: 35,
      y: 61,
      detail: '衣柜里的深色长衣和素色布料收得整齐。',
    },
    {
      id: 'basin',
      label: '看看盥洗处',
      x: 23,
      y: 86,
      detail: '盥洗盆边放着干净毛巾。',
    },
  ],
  quarters: [
    {
      id: 'sit',
      label: '在茶桌旁坐下',
      x: 43,
      y: 96,
      detail: '简单的茶杯摆在侧桌，坐下歇一会儿。',
      pose: 'sit',
      cx: 28.5,
      cy: 74,
      elevation: 18,
      mirror: true,
      scale: 1.4,
    },
    {
      id: 'read',
      label: '坐到书案边',
      x: 61,
      y: 95.5,
      detail: '书案与床铺之间留着完整通路。',
      pose: 'read',
      cx: 79.5,
      cy: 74,
      elevation: 18,
      scale: 1.4,
    },
    {
      id: 'bed',
      label: '看看床边',
      x: 43,
      y: 62,
      detail: '被褥、书与黑外套各自收好。',
    },
  ],
  cellar: [
    {
      id: 'read',
      label: '坐下查阅资料',
      x: 59,
      y: 88,
      detail: '暖灯下的木案可供安静读书。',
      pose: 'read',
      cx: 73,
      cy: 68,
      elevation: 18,
      scale: 1.3,
    },
    {
      id: 'books',
      label: '看看地下书柜',
      x: 32,
      y: 70,
      detail: '地下空间采用本项目的安静资料室改编，木柜与石拱保留教会气质。',
    },
  ],
};
for (const id of CHURCH_ROOM_IDS) {
  const room = CHURCH_ROOMS[id];
  room.scene.spots = spots[id].map((s) => ({
    id: s.id,
    label: s.label,
    point: p(id, s.x, s.y),
    detail: s.detail,
  }));
  room.actions = spots[id]
    .filter((s) => s.pose)
    .map((s) => ({
      id: s.id,
      pose: s.pose!,
      contact: p(id, s.cx!, s.cy!),
      elevation: s.elevation!,
      mirror: s.mirror,
      scale: s.scale,
    }));
}

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

export const SCHOOL_ROOM_IDS = [
  'hall',
  'classroom',
  'archery',
  'staffroom',
  'library',
] as const;
export type SchoolRoomId = (typeof SCHOOL_ROOM_IDS)[number];
export const SCHOOL_CAST = [
  { id: 'shirou', name: '卫宫士郎' },
  { id: 'rin', name: '远坂凛' },
  { id: 'sakura', name: '间桐樱' },
] as const;
export type SchoolActorId = (typeof SCHOOL_CAST)[number]['id'];

const make = (
  id: Exclude<SchoolRoomId, 'classroom'>,
  room: string,
  description: string,
  backY: number,
): CityInteriorScene => ({
  id: 'school',
  name: '穗群原学园',
  room,
  basis: '原作学园日常参考 · 区域连接与家具布局为项目创作',
  description,
  painting: `/fate/interior-art/school-${id}-soft-v1.png`,
  floor: {
    backLeft: 100,
    backRight: 1500,
    backY,
    frontLeft: 10,
    frontRight: 1590,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
export const SCHOOL_ROOMS: Record<SchoolRoomId, PreviewRoom> = {
  hall: {
    scene: make(
      'hall',
      '玄关与学园走廊',
      '换鞋柜和布告栏靠着侧墙，四处门口通向学园各室。',
      425,
    ),
    doors: [],
    actions: [],
  },
  classroom: {
    scene: {
      ...CITY_INTERIOR_SCENES.school,
      room: '教室',
      description: '窗边的两列课桌之间留着过道，左侧门口连接走廊。',
      // Re-register this preview's floor to include the painted left-hand doorway.
      floor: {
        backLeft: 70,
        backRight: 1530,
        backY: 400,
        frontLeft: 0,
        frontRight: 1600,
        frontY: 890,
      },
      furniture: [],
      spots: [],
    },
    doors: [],
    actions: [],
  },
  archery: {
    scene: make(
      'archery',
      '弓道场',
      '弓架与长凳靠墙摆放，木地板连着庭外的练习场。',
      425,
    ),
    doors: [],
    actions: [],
  },
  staffroom: {
    scene: make(
      'staffroom',
      '教员室',
      '书柜、茶桌和批阅桌沿墙排列，中央过道通向学园走廊。',
      395,
    ),
    doors: [],
    actions: [],
  },
  library: {
    scene: make(
      'library',
      '图书室',
      '书架环绕阅览桌，侧窗的光落在空出的中央过道上。',
      380,
    ),
    doors: [],
    actions: [],
  },
};
const p = (id: SchoolRoomId, x: number, y: number) =>
  paintedPoint(SCHOOL_ROOMS[id].scene, x * 16, y * 9);
const branches = ['classroom', 'archery', 'staffroom', 'library'] as const;
const thresholds = {
  classroom: p('hall', 25.2, 51.5),
  archery: p('hall', 83.5, 53.5),
  staffroom: p('hall', 44, 53.5),
  library: p('hall', 64, 51.5),
};
const returns = {
  classroom: p('classroom', 6, 57),
  archery: p('archery', 44, 52),
  staffroom: p('staffroom', 50, 51),
  library: p('library', 50, 49),
};
const labels = {
  classroom: '教室',
  archery: '弓道场',
  staffroom: '教员室',
  library: '图书室',
};
const front = { x: 500, y: 590 };
SCHOOL_ROOMS.hall.doors = [
  { id: 'street', label: '走出校门', point: front, to: null, arrival: front },
  ...branches.map((id) => ({
    id,
    label: labels[id],
    point: thresholds[id],
    to: id,
    arrival: { ...returns[id], y: returns[id].y + 65 },
  })),
];
for (const id of branches)
  SCHOOL_ROOMS[id].doors = [
    {
      id: 'hall',
      label: '回学园走廊',
      point: returns[id],
      to: 'hall',
      arrival: { ...thresholds[id], y: thresholds[id].y + 65 },
    },
  ];

const piece = (
  room: SchoolRoomId,
  id: string,
  rect: readonly number[],
  mask: readonly number[][] = [],
) => paintedFurniture(SCHOOL_ROOMS[room].scene, id, rect, mask);
const boundary = (room: SchoolRoomId, id: string, rect: readonly number[]) => ({
  id,
  footprint: piece(room, id, rect).footprint,
  collision: piece(room, id, rect).collision,
});
SCHOOL_ROOMS.hall.scene.furniture = [
  boundary('hall', 'classroom-boundary', [20, 43, 30, 49]),
  boundary('hall', 'archery-boundary', [79, 43, 89, 49]),
  boundary('hall', 'staffroom-boundary', [39, 43, 49, 49]),
  boundary('hall', 'library-boundary', [59, 43, 69, 49]),
  piece(
    'hall',
    'shoe-lockers',
    [0, 48, 10, 75],
    [
      [0, 26],
      [9, 30],
      [10, 75],
      [0, 76],
    ],
  ),
  piece(
    'hall',
    'stair-and-bench',
    [91, 49, 100, 81],
    [
      [93, 35],
      [100, 30],
      [100, 81],
      [91, 79],
    ],
  ),
];
SCHOOL_ROOMS.classroom.scene.furniture = [
  boundary('classroom', 'classroom-return-boundary', [0, 40, 8, 53]),
  // Banks are collision footprints; individual foreground desks own their masks.
  boundary('classroom', 'left-desks', [9, 47, 38.5, 74]),
  boundary('classroom', 'right-desks', [64, 47, 93, 74]),
  piece(
    'classroom',
    'rear-bookcase',
    [40, 43, 79, 49],
    [
      [40, 31],
      [79, 31],
      [79, 48],
      [40, 49],
    ],
  ),
  piece(
    'classroom',
    'left-front-desk',
    [9, 71, 38.5, 74],
    [
      [9, 59],
      [34, 57],
      [38.5, 67],
      [36, 74],
      [9, 73],
    ],
  ),
  piece(
    'classroom',
    'right-front-desk',
    [64, 71, 93, 74],
    [
      [64, 59],
      [91, 59],
      [93, 73],
      [66, 74],
    ],
  ),
];
SCHOOL_ROOMS.archery.scene.furniture = [
  boundary('archery', 'archery-return-boundary', [36, 42, 52, 47.5]),
  piece(
    'archery',
    'bow-rack',
    [0, 43, 31, 55],
    [
      [0, 18],
      [28, 26],
      [31, 55],
      [0, 58],
    ],
  ),
  piece(
    'archery',
    'equipment-chest',
    [55, 42, 69, 51],
    [
      [55, 39],
      [69, 39],
      [69, 51],
      [55, 51],
    ],
  ),
  piece(
    'archery',
    'bench',
    [0, 64, 21, 78],
    [
      [0, 61],
      [20, 58],
      [21, 77],
      [0, 78],
    ],
  ),
  boundary('archery', 'range-edge', [77, 47, 100, 67]),
];
SCHOOL_ROOMS.staffroom.scene.furniture = [
  boundary('staffroom', 'staffroom-return-boundary', [43, 40, 57, 46]),
  piece(
    'staffroom',
    'cabinet',
    [16, 44, 39, 55],
    [
      [16, 16],
      [39, 19],
      [39, 55],
      [16, 55],
    ],
  ),
  piece(
    'staffroom',
    'back-right-desk',
    [62, 45, 100, 59],
    [
      [62, 40],
      [100, 40],
      [100, 59],
      [62, 57],
    ],
  ),
  piece(
    'staffroom',
    'tea-table',
    [0, 61, 22, 88],
    [
      [0, 53],
      [20, 51],
      [22, 86],
      [0, 88],
    ],
  ),
  piece(
    'staffroom',
    'tea-chair',
    [22, 65, 35, 86],
    [
      [27, 52],
      [34, 54],
      [35, 85],
      [22, 86],
      [22, 65],
    ],
  ),
  piece(
    'staffroom',
    'work-desk',
    [83, 57, 100, 98],
    [
      [78, 48],
      [100, 52],
      [100, 98],
      [83, 97],
      [83, 68],
    ],
  ),
  piece(
    'staffroom',
    'work-chair',
    [68.5, 68, 82, 93],
    [
      [69, 49],
      [76, 50],
      [78, 70],
      [82, 79],
      [82, 92],
      [69, 93],
    ],
  ),
];
SCHOOL_ROOMS.library.scene.furniture = [
  boundary('library', 'library-return-boundary', [43, 39, 57, 44]),
  piece(
    'library',
    'left-shelves',
    [0, 43, 18, 69],
    [
      [0, 0],
      [18, 14],
      [18, 67],
      [0, 69],
    ],
  ),
  piece(
    'library',
    'right-shelves',
    [79, 43, 100, 64],
    [
      [79, 12],
      [100, 0],
      [100, 64],
      [79, 63],
    ],
  ),
  piece(
    'library',
    'left-chair',
    [18, 64, 32, 88],
    [
      [19, 51],
      [26, 51],
      [29, 72],
      [32, 82],
      [32, 88],
      [18, 88],
    ],
  ),
  piece(
    'library',
    'side-table',
    [0, 69, 16, 88],
    [
      [0, 60],
      [16, 60],
      [16, 88],
      [0, 88],
    ],
  ),
  piece(
    'library',
    'reading-table',
    [82, 62, 100, 99],
    [
      [77, 54],
      [100, 58],
      [100, 99],
      [83, 98],
      [82, 70],
    ],
  ),
  piece(
    'library',
    'reading-chair',
    [67, 68, 82, 95],
    [
      [67, 53],
      [74, 53],
      [77, 75],
      [82, 84],
      [82, 94],
      [67, 95],
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
  sx?: number;
  sy?: number;
};
const spots: Record<SchoolRoomId, Spot[]> = {
  hall: [
    {
      id: 'shoes',
      label: '看看换鞋柜',
      x: 15,
      y: 80,
      detail: '室内鞋整齐收在木柜里。',
    },
    {
      id: 'notice',
      label: '看看布告栏',
      x: 38,
      y: 63,
      detail: '布告栏上夹着课程表和社团通知。',
    },
  ],
  classroom: [
    {
      id: 'sit',
      label: '在课桌旁坐下',
      x: 17,
      y: 92,
      detail: '在窗边课桌坐下。',
      pose: 'sit',
      cx: 17,
      cy: 75,
      elevation: 18,
      sx: 15.5,
      sy: 59,
    },
    {
      id: 'read',
      label: '坐下读书',
      x: 76.5,
      y: 92,
      detail: '翻开课桌上的书。',
      pose: 'read',
      cx: 76.5,
      cy: 73,
      elevation: 18,
      sx: 71.5,
      sy: 59,
    },
    {
      id: 'board',
      label: '看看黑板',
      x: 50,
      y: 54,
      detail: '黑板上留着粉笔字，板擦放在槽边。',
    },
  ],
  archery: [
    {
      id: 'sit',
      label: '在长凳坐下',
      x: 25,
      y: 88,
      detail: '在练习场边的长凳歇一会。',
      pose: 'sit',
      cx: 14.5,
      cy: 76.5,
      elevation: 18,
      sx: 9.53,
      sy: 65.29,
    },
    {
      id: 'bows',
      label: '看看弓架',
      x: 33,
      y: 63,
      detail: '弓与箭袋按次序挂在木架上。',
    },
    {
      id: 'range',
      label: '看看练习场',
      x: 84,
      y: 78,
      detail: '走廊外的草地尽头摆着靶架。',
    },
  ],
  staffroom: [
    {
      id: 'sit',
      label: '在茶桌旁坐下',
      x: 41,
      y: 91,
      detail: '在茶桌旁坐下。',
      pose: 'sit',
      cx: 28.5,
      cy: 85.5,
      elevation: 18,
      mirror: true,
      scale: 1.6,
      sx: 28,
      sy: 69.5,
    },
    {
      id: 'read',
      label: '坐下翻看资料',
      x: 62,
      y: 94,
      detail: '翻看书桌上的纸页。',
      pose: 'read',
      cx: 80.5,
      cy: 88,
      elevation: 18,
      scale: 1.7,
      sx: 75.5,
      sy: 70.8,
    },
    {
      id: 'papers',
      label: '看看资料柜',
      x: 44,
      y: 65,
      detail: '资料夹分门别类放在柜中。',
    },
  ],
  library: [
    {
      id: 'sit',
      label: '在窗边坐下',
      x: 39,
      y: 94,
      detail: '在窗边椅子坐下。',
      pose: 'sit',
      cx: 32,
      cy: 90,
      elevation: 18,
      scale: 1.6,
      sx: 22.5,
      sy: 68.5,
    },
    {
      id: 'read',
      label: '在阅览桌读书',
      x: 60,
      y: 96,
      detail: '翻开阅览桌上的书。',
      pose: 'read',
      cx: 83,
      cy: 95.5,
      elevation: 18,
      scale: 1.8,
      sx: 74.8,
      sy: 74,
    },
    {
      id: 'books',
      label: '看看书架',
      x: 40,
      y: 56,
      detail: '书脊上贴着分类标签。',
    },
  ],
};
for (const id of SCHOOL_ROOM_IDS) {
  SCHOOL_ROOMS[id].scene.spots = spots[id].map((s) => ({
    id: s.id,
    label: s.label,
    point: p(id, s.x, s.y),
    detail: s.detail,
  }));
  SCHOOL_ROOMS[id].actions = spots[id]
    .filter((s) => s.pose)
    .map((s) => ({
      id: s.id,
      pose: s.pose!,
      contact: p(id, s.cx!, s.cy!),
      elevation: s.elevation!,
      mirror: s.mirror,
      scale: s.scale,
      ...(s.sx !== undefined && s.sy !== undefined
        ? { seat: { x: s.sx * 16, y: s.sy * 9 } }
        : {}),
    }));
}

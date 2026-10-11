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

export const TEMPLE_ROOM_IDS = [
  'hall',
  'lounge',
  'kitchen',
  'quarters',
  'craft',
  'engawa',
] as const;
export type TempleRoomId = (typeof TEMPLE_ROOM_IDS)[number];
export const TEMPLE_CAST = [
  { id: 'kuzuki', name: '葛木宗一郎' },
  { id: 'medea', name: '美狄亚' },
] as const;
export type TempleActorId = (typeof TEMPLE_CAST)[number]['id'];
const make = (
  id: Exclude<TempleRoomId, 'lounge'>,
  room: string,
  description: string,
): CityInteriorScene => ({
  id: 'temple',
  name: '柳洞寺 · 葛木的住处',
  room,
  basis: '原作寺院木构参考 · 僧房与手作空间布局为游戏创作',
  description,
  painting: `/fate/interior-art/temple-${id}-soft-v1.png`,
  floor: {
    backLeft: 100,
    backRight: 1500,
    backY: id === 'hall' ? 350 : id === 'engawa' ? 500 : 420,
    frontLeft: 10,
    frontRight: 1590,
    frontY: 890,
  },
  furniture: [],
  spots: [],
});
export const TEMPLE_ROOMS: Record<TempleRoomId, PreviewRoom> = {
  hall: {
    scene: make(
      'hall',
      '寺院玄关与木廊',
      '旧木门、便鞋与扫帚靠在廊边，五处门槛连起寺院日常。',
    ),
    doors: [],
    actions: [],
  },
  lounge: {
    scene: { ...CITY_INTERIOR_SCENES.temple, spots: [] },
    doors: [],
    actions: [],
  },
  kitchen: {
    scene: make(
      'kitchen',
      '斋堂与厨房',
      '旧灶台、杯碗和低餐桌，杉林的光透过木窗落在榻榻米上。',
    ),
    doors: [],
    actions: [],
  },
  quarters: {
    scene: make(
      'quarters',
      '葛木僧房与阅览角',
      '朴素被褥与教师的书案，黑外套收在衣架旁。',
    ),
    doors: [],
    actions: [],
  },
  craft: {
    scene: make(
      'craft',
      '手作与资料静室',
      '布料、小木件与书本各自收好，紫灰座布团靠着低案。',
    ),
    doors: [],
    actions: [],
  },
  engawa: {
    scene: make(
      'engawa',
      '庭边木廊',
      '缘侧隔着栏杆望向苔石、枫与杉松，廊下留出安静坐处。',
    ),
    doors: [],
    actions: [],
  },
};
const p = (id: TempleRoomId, x: number, y: number) =>
  paintedPoint(TEMPLE_ROOMS[id].scene, x * 16, y * 9);
const front = { x: 500, y: 590 };
const thresholds = {
  lounge: p('hall', 14.5, 61),
  kitchen: p('hall', 35.7, 49),
  quarters: p('hall', 53.5, 49),
  craft: p('hall', 68.5, 49),
  engawa: p('hall', 91, 66),
};
const returns = {
  lounge: front,
  kitchen: p('kitchen', 52, 52),
  quarters: p('quarters', 49, 52),
  craft: p('craft', 45, 52),
  engawa: p('engawa', 16, 66),
};
const branches = ['lounge', 'kitchen', 'quarters', 'craft', 'engawa'] as const;
const thresholdLabels = {
  lounge: '共用生活间',
  kitchen: '斋堂',
  quarters: '僧房',
  craft: '手作间',
  engawa: '庭边木廊',
};
TEMPLE_ROOMS.hall.doors = [
  { id: 'street', label: '离寺回参道', point: front, to: null, arrival: front },
  ...branches.map((id) => ({
    id,
    label: thresholdLabels[id],
    point: thresholds[id],
    to: id,
    arrival: {
      ...returns[id],
      y: returns[id].y + (id === 'lounge' ? -65 : 65),
    },
  })),
];
for (const id of branches)
  TEMPLE_ROOMS[id].doors = [
    {
      id: 'hall',
      label: '回寺院木廊',
      point: returns[id],
      to: 'hall',
      arrival: { ...thresholds[id], y: thresholds[id].y + 65 },
    },
  ];
const piece = (
  id: TempleRoomId,
  name: string,
  rect: readonly number[],
  mask: readonly number[][],
) => paintedFurniture(TEMPLE_ROOMS[id].scene, name, rect, mask);
const boundary = (name: string, rect: readonly number[]) => ({
  id: name,
  footprint: piece('hall', name, rect, []).footprint,
});
TEMPLE_ROOMS.hall.scene.furniture = [
  boundary('lounge-boundary', [0, 42, 23, 55]),
  boundary('kitchen-boundary', [24, 34, 43, 45]),
  boundary('quarters-boundary', [44, 34, 61, 45]),
  boundary('craft-boundary', [62, 34, 80, 45]),
  boundary('engawa-boundary', [84, 43, 100, 58]),
  piece(
    'hall',
    'shoe-cabinet',
    [0, 63, 10, 81],
    [
      [0, 43],
      [10, 40],
      [11, 66],
      [1, 81],
      [0, 82],
    ],
  ),
  piece(
    'hall',
    'broom-and-umbrella',
    [94, 64, 100, 77],
    [
      [95, 45],
      [99, 45],
      [100, 74],
      [96, 76],
      [94, 73],
    ],
  ),
];
TEMPLE_ROOMS.kitchen.scene.furniture = [
  piece(
    'kitchen',
    'stove-and-counter',
    [0, 51, 31, 66],
    [
      [0, 36],
      [30, 31],
      [31, 50],
      [21, 58],
      [0, 63],
    ],
  ),
  piece(
    'kitchen',
    'dish-cabinet',
    [64, 46, 86, 51],
    [
      [66, 15],
      [85, 16],
      [85, 49],
      [67, 50],
      [64, 46],
    ],
  ),
  piece(
    'kitchen',
    'low-dining-table',
    [72, 56, 100, 82],
    [
      [71, 54],
      [98, 54],
      [100, 59],
      [100, 78],
      [98, 80],
      [98, 69],
      [80, 70],
      [80, 80],
      [77, 80],
      [77, 66],
      [72, 66],
      [71, 57],
    ],
  ),
];
TEMPLE_ROOMS.quarters.scene.furniture = [
  piece(
    'quarters',
    'futon',
    [0, 51, 26, 72],
    [
      [0, 49],
      [22, 46],
      [26, 51],
      [24, 66],
      [5, 71],
      [0, 69],
    ],
  ),
  piece(
    'quarters',
    'clothes-rail',
    [16, 47, 31, 52],
    [
      [17, 14],
      [30, 15],
      [29, 49],
      [17, 49],
    ],
  ),
  piece(
    'quarters',
    'book-cabinet',
    [59, 46, 75, 51],
    [
      [59, 23],
      [75, 24],
      [75, 49],
      [59, 49],
    ],
  ),
  piece(
    'quarters',
    'low-reading-desk',
    [77, 50, 100, 79],
    [
      [75, 48],
      [99, 47],
      [100, 59],
      [100, 78],
      [97, 79],
      [97, 64],
      [91, 63],
      [78, 61],
      [77, 61],
      [77, 56],
      [75, 54],
    ],
  ),
];
TEMPLE_ROOMS.craft.scene.furniture = [
  piece(
    'craft',
    'cloth-baskets-and-cabinet',
    [0, 48, 32, 67],
    [
      [0, 29],
      [14, 29],
      [14, 40],
      [21, 36],
      [32, 40],
      [32, 54],
      [19, 54],
      [19, 65],
      [0, 67],
    ],
  ),
  piece(
    'craft',
    'back-sideboard',
    [57, 47, 75, 51],
    [
      [57, 34],
      [75, 36],
      [75, 50],
      [59, 50],
      [57, 47],
    ],
  ),
  piece(
    'craft',
    'low-handcraft-table',
    [68, 55, 100, 86],
    [
      [67, 49],
      [93, 49],
      [100, 53],
      [100, 78],
      [98, 84],
      [81, 84],
      [78, 77],
      [78, 62],
      [70, 62],
      [69, 59],
      [68, 61],
      [68, 53],
      [67, 52],
    ],
  ),
];
TEMPLE_ROOMS.engawa.scene.furniture = [
  piece(
    'engawa',
    'fern-and-watering-can',
    [85, 61, 98, 71],
    [
      [86, 49],
      [94, 47],
      [97, 54],
      [98, 65],
      [95, 69],
      [86, 65],
    ],
  ),
];
const spot = (
  id: TempleRoomId,
  key: string,
  label: string,
  x: number,
  y: number,
  detail: string,
) => ({ id: key, label, point: p(id, x, y), detail });
TEMPLE_ROOMS.hall.scene.spots = [
  spot(
    'hall',
    'shoes',
    '看看玄关与便鞋',
    19,
    82,
    '便鞋整齐收在柜边，廊下只剩木板轻响。',
  ),
  spot(
    'hall',
    'broom',
    '看看门边的扫帚',
    87,
    84,
    '竹扫帚与伞靠在门旁，庭中的杉叶还带着晨露。',
  ),
];
TEMPLE_ROOMS.lounge.scene.spots = [
  spot(
    'lounge',
    'sit',
    '在低茶桌旁坐下',
    23,
    77,
    '坐在座布团上，听一会儿窗外的风。',
  ),
  spot(
    'lounge',
    'tea',
    '看看茶具与花枝',
    52,
    81,
    '温润的木茶桌上，杯盏与一枝小花安静相伴。',
  ),
  spot(
    'lounge',
    'books',
    '看看寺院的书架',
    19,
    64,
    '书脊与旧纸的颜色融在木梁的暖影里。',
  ),
];
TEMPLE_ROOMS.kitchen.scene.spots = [
  spot(
    'kitchen',
    'meal',
    '到低餐桌旁坐下',
    66,
    89,
    '座布团靠着矮餐桌，杯碗已经摆好。',
  ),
  spot(
    'kitchen',
    'kettle',
    '看看灶台与杯碗',
    39,
    74,
    '旧灶与竹蒸笼收拾得干净，水壶静静放着。',
  ),
];
TEMPLE_ROOMS.quarters.scene.spots = [
  spot(
    'quarters',
    'read',
    '在僧房书案旁读书',
    65,
    85,
    '低案留着几本教材，读一页再慢慢合上。',
  ),
  spot(
    'quarters',
    'futon',
    '看看被褥与外套',
    35,
    75,
    '被褥叠得平整，教师的外套挂在木衣架上。',
  ),
];
TEMPLE_ROOMS.craft.scene.spots = [
  spot(
    'craft',
    'read',
    '在手作静室读书',
    61,
    85,
    '布料和小木件让书页旁多了些轻巧的颜色。',
  ),
  spot(
    'craft',
    'cloth',
    '看看布料与小木件',
    38,
    77,
    '纸样、布卷和未上色的小摆件各自放好，等下一次闲暇。',
  ),
];
TEMPLE_ROOMS.engawa.scene.spots = [
  spot(
    'engawa',
    'sit',
    '在木廊座布团坐下',
    44,
    87,
    '坐在暖木地板上，看苔石间的光慢慢挪动。',
  ),
  spot(
    'engawa',
    'garden',
    '看看栏外的苔庭',
    74,
    80,
    '杉松、枫叶与石灯笼隔着木栏，风声从枝间经过。',
  ),
];
/** Foot anchors rest on the cushion; movement resumes from a separate clear approach. */
const seated = (
  id: TempleRoomId,
  key: string,
  pose: 'sit' | 'read',
  x: number,
  y: number,
  groundY: number,
  scale = 1.05,
): PreviewAction => {
  const contact = p(id, x, groundY);
  return {
    id: key,
    pose,
    contact,
    elevation:
      ((groundY - y) * 9) /
      interiorDepth(contact, TEMPLE_ROOMS[id].scene.floor),
    scale,
    mirror: false,
  };
};
TEMPLE_ROOMS.lounge.actions = [
  seated('lounge', 'sit', 'sit', 28.5, 59.5, 61, 1.05),
];
TEMPLE_ROOMS.kitchen.actions = [seated('kitchen', 'meal', 'sit', 70, 73, 74.5)];
TEMPLE_ROOMS.quarters.actions = [
  seated('quarters', 'read', 'read', 77, 69.8, 71.3),
];
TEMPLE_ROOMS.craft.actions = [seated('craft', 'read', 'read', 67, 73, 74.5)];
TEMPLE_ROOMS.engawa.actions = [
  seated('engawa', 'sit', 'sit', 32.8, 71.8, 73.3),
];

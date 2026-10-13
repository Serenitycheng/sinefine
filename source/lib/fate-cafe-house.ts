import { CITY_INTERIOR_SCENES, type CityInteriorScene } from './fate-city-interior-scenes';
import { paintedPoint, paintedFurniture, type PreviewRoom, type PreviewAction } from './fate-preview-house';

export const CAFE_ROOM_IDS = ['hall', 'window', 'prep'] as const;
export type CafeRoomId = (typeof CAFE_ROOM_IDS)[number];
export const CAFE_CAST = [
  { id: 'shirou', name: '卫宫士郎' },
  { id: 'rin', name: '远坂凛' },
  { id: 'sakura', name: '间桐樱' },
] as const;
export type CafeActorId = (typeof CAFE_CAST)[number]['id'];

const make = (id: Exclude<CafeRoomId, 'hall'>, room: string, description: string): CityInteriorScene => ({
  id: 'cafe', name: '街角咖啡店', room, basis: '项目原创公共店面', description,
  painting: `/fate/interior-art/cafe-${id}-soft-v1.png`,
  floor: { backLeft: 100, backRight: 1500, backY: 390, frontLeft: 10, frontRight: 1590, frontY: 890 },
  furniture: [], spots: [],
});
export const CAFE_ROOMS: Record<CafeRoomId, PreviewRoom> = {
  hall: {
    scene: {
      ...CITY_INTERIOR_SCENES.cafe,
      room: '大厅与吧台',
      description: '两张圆桌分列过道两侧，木吧台旁通向备餐间，前门连着街道。',
      // Only this preview includes the real rear-facing entrance in its floor.
      floor: { backLeft: 150, backRight: 1450, backY: 330, frontLeft: 10, frontRight: 1590, frontY: 890 },
      furniture: [], spots: [],
    }, doors: [], actions: [],
  },
  window: {
    scene: make('window', '窗边座席', '两把绿垫木椅靠着窗边小桌，中央开口通回大厅。'),
    doors: [], actions: [],
  },
  prep: {
    scene: make('prep', '备餐间', '水槽和备餐台在左侧，咖啡器具与杯碟收在右侧。'),
    doors: [], actions: [],
  },
};
const p = (id: CafeRoomId, x: number, y: number) => paintedPoint(CAFE_ROOMS[id].scene, x * 16, y * 9);
const thresholds = { window: p('hall', 61, 82), prep: p('hall', 54.5, 51) };
const returns = { window: p('window', 45.5, 53.5), prep: p('prep', 47.5, 63) };
const front = p('hall', 55.5, 41);
CAFE_ROOMS.hall.doors = [
  { id: 'street', label: '走出咖啡店', point: front, to: null, arrival: front },
  ...(['window', 'prep'] as const).map((id) => ({
    id, label: id === 'window' ? '窗边座席' : '备餐间', point: thresholds[id], to: id,
    arrival: { ...returns[id], y: returns[id].y + 65 },
  })),
];
for (const id of ['window', 'prep'] as const) CAFE_ROOMS[id].doors = [{
  id: 'hall', label: '回咖啡店大厅', point: returns[id], to: 'hall',
  arrival: { ...thresholds[id], y: thresholds[id].y + 65 },
}];

const piece = (room: CafeRoomId, id: string, rect: readonly number[], mask: readonly number[][] = []) =>
  paintedFurniture(CAFE_ROOMS[room].scene, id, rect, mask);
const boundary = (room: CafeRoomId, id: string, rect: readonly number[]) => ({
  id, footprint: piece(room, id, rect).footprint,
});
CAFE_ROOMS.hall.scene.furniture = [
  boundary('hall', 'entrance-boundary', [51, 35, 61, 38]),
  piece('hall', 'counter', [12, 38, 51, 49], [[12, 20], [49, 20], [51, 30], [51, 49], [12, 49]]),
  boundary('hall', 'left-seats', [3, 48, 33, 76]),
  boundary('hall', 'right-seats', [64.5, 49, 93, 79]),
  piece('hall', 'left-table', [9, 67, 28, 73], [[9, 48], [12, 45], [25, 45], [28, 48], [28, 52], [21, 54], [21, 69], [24, 72], [18, 74], [14, 72], [17, 69], [17, 54], [9, 52]]),
  piece('hall', 'right-table', [70, 69, 88, 76], [[70, 48], [72, 45], [85, 45], [88, 48], [88, 52], [80, 54], [80, 71], [84, 74], [79, 77], [73, 74], [77, 71], [77, 54], [70, 52]]),
  piece('hall', 'front-left-plant', [0, 84, 14, 99], [[0, 59], [9, 60], [14, 76], [14, 99], [0, 99]]),
  piece('hall', 'front-right-plant', [85, 84, 100, 99], [[86, 60], [100, 58], [100, 99], [85, 99]]),
];
CAFE_ROOMS.window.scene.furniture = [
  boundary('window', 'hall-boundary', [33, 42, 59, 49]),
  piece('window', 'bookcase', [10.5, 40, 27.5, 61.5], [[11, 6], [27.5, 6], [27.5, 61.5], [11, 62]]),
  piece('window', 'left-table', [1, 60, 23, 84], [[2, 50], [7, 45], [20, 45], [23, 49], [22, 54], [14, 56], [14, 74], [18, 77], [11, 80], [6, 78], [10, 74], [10, 56], [2, 53]]),
  piece('window', 'left-chair', [16, 63, 30, 87], [[27, 45], [30, 46], [29, 68], [30, 77], [28.5, 83], [27, 83], [27, 73], [18, 68], [17, 82], [16, 82], [16, 65], [18, 58], [25, 58], [27, 55]]),
  piece('window', 'right-chair', [70.5, 67, 84.5, 88], [[71, 48], [74, 49], [75, 64], [84, 67], [84.5, 86], [83, 86], [82, 74], [74, 73], [73, 87], [71, 87]]),
  piece('window', 'right-table', [85, 62, 100, 87], [[80, 50], [84, 47], [98, 47], [100, 50], [100, 55], [91, 57], [91, 80], [96, 83], [90, 87], [85, 84], [87, 80], [87, 57], [80, 54]]),
  piece('window', 'front-left-plant', [0, 84, 13, 99], [[0, 57], [11, 67], [13, 99], [0, 99]]),
  piece('window', 'back-right-plant', [62.5, 48, 71, 63], [[63, 28], [72, 39], [71, 63], [63, 63]]),
];
CAFE_ROOMS.prep.scene.furniture = [
  boundary('prep', 'hall-boundary', [34, 44, 59.5, 58]),
  piece('prep', 'left-counter', [0, 57, 28, 98], [[0, 39], [27, 37], [28, 97], [0, 99]]),
  piece('prep', 'right-counter', [76, 61, 100, 99], [[75, 37], [100, 46], [100, 99], [76, 99]]),
  piece('prep', 'side-cabinet', [68, 58, 76, 76], [[69, 38], [77, 43], [76, 76], [68, 76]]),
  piece('prep', 'plant', [63, 61, 69, 71], [[64, 44], [70, 53], [69, 71], [63, 71]]),
];

type Spot = {
  id: string; label: string; x: number; y: number; detail: string;
  pose?: PreviewAction['pose']; cx?: number; cy?: number; sx?: number; sy?: number; mirror?: boolean; scale?: number;
};
const spots: Record<CafeRoomId, Spot[]> = {
  hall: [
    { id: 'sit', label: '在圆桌旁坐下', x: 39, y: 85, detail: '在圆桌旁坐下。', pose: 'sit', cx: 29, cy: 79, sx: 29, sy: 57, mirror: true, scale: 1.2 },
    { id: 'read', label: '坐下翻看书页', x: 58, y: 91, detail: '翻开随身带来的书。', pose: 'read', cx: 70.5, cy: 82, sx: 70.5, sy: 60.5, scale: 1.2 },
    { id: 'coffee', label: '看看咖啡器具', x: 56, y: 59, detail: '咖啡机旁排着磨豆机、杯碟和玻璃壶。' },
    { id: 'pastries', label: '看看甜点柜', x: 54, y: 66, detail: '玻璃柜里摆着小蛋糕和酥皮点心。' },
    { id: 'flowers', label: '看看窗台绿植', x: 63, y: 89, detail: '树影落在窗台的盆栽上。' },
  ],
  window: [
    { id: 'sit', label: '在窗边坐下', x: 39, y: 92, detail: '在窗边木椅坐下。', pose: 'sit', cx: 23, cy: 89, sx: 23, sy: 62.6, mirror: true, scale: 1.45 },
    { id: 'read', label: '在窗边读书', x: 62, y: 94, detail: '翻开窗边小桌上的书。', pose: 'read', cx: 78, cy: 90, sx: 77.8, sy: 67.2, scale: 1.6 },
    { id: 'books', label: '看看书架', x: 37, y: 66, detail: '几本旧书和瓷杯放在木架上。' },
    { id: 'street', label: '看看窗外', x: 61, y: 76, detail: '窗外是蓝灰色遮棚和安静的街道。' },
  ],
  prep: [
    { id: 'tray', label: '看看备餐台', x: 33, y: 84, detail: '干净的盘子叠在盖着点心的托盘旁。' },
    { id: 'beans', label: '看看咖啡豆', x: 64, y: 87, detail: '咖啡豆收在玻璃罐里，旁边放着磨豆机。' },
    { id: 'cups', label: '看看杯碟', x: 60, y: 75, detail: '白瓷杯和碟子按大小收在柜上。' },
  ],
};
for (const id of CAFE_ROOM_IDS) {
  CAFE_ROOMS[id].scene.spots = spots[id].map((s) => ({ id: s.id, label: s.label, point: p(id, s.x, s.y), detail: s.detail }));
  CAFE_ROOMS[id].actions = spots[id].filter((s) => s.pose).map((s) => ({
    id: s.id, pose: s.pose!, contact: p(id, s.cx!, s.cy!), elevation: 0,
    seat: { x: s.sx! * 16, y: s.sy! * 9 }, mirror: s.mirror, scale: s.scale,
  }));
}

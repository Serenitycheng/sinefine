import { DISTRICT_LANDMARKS } from './fate-district';
import { WALK_AREAS } from './street';

export const BUILDING_ATLAS = '/fate/environment/fuyuki-building-atlas-v1.webp';
export const ATLAS_SIZE = 1254;
// Source crops include each building's garden and ground shadow.
export const BUILDING_FRAMES = {
  emiya: [0, 66, 323, 245], tohsaka: [327, 20, 320, 298],
  matou: [648, 23, 297, 291], einzbern: [950, 47, 302, 272],
  waver: [0, 369, 321, 257], temple: [319, 364, 323, 263],
  church: [650, 320, 305, 321], kayneth: [962, 317, 290, 325],
  fujimura: [0, 642, 395, 264], natalia: [400, 637, 218, 270],
  school: [624, 645, 363, 254], cafe: [995, 639, 257, 273],
  shops: [3, 936, 374, 276], park: [389, 907, 329, 346],
  shinto: [724, 915, 217, 313], miyama: [954, 953, 298, 266],
} as const;
export type BuildingFrame = keyof typeof BUILDING_FRAMES;
export const LANDMARK_WIDTH: Partial<Record<BuildingFrame, number>> = {
  school: 330, temple: 280, fujimura: 300, shops: 290, park: 230,
  tohsaka: 265, matou: 260, church: 250,
};

export function overlapsStreet(x: number, y: number, width = 0, height = 0) {
  return WALK_AREAS.some((road) => x + width / 2 + 12 > road.left &&
    x - width / 2 - 12 < road.right && y + 12 > road.top && y - height - 12 < road.bottom);
}

export const NEIGHBOURHOOD_BUILDINGS = Array.from({ length: 180 }, (_, i) => {
  const row = Math.floor(i / 18);
  return {
    x: 95 + (i % 18) * 168 + (row % 2) * 22,
    y: 170 + row * 155,
    width: 108 + (i * 17) % 32,
    height: 110 + (i * 23) % 28,
    frame: ((i % 18) > 9 ? (i % 3 === 0 ? 'shinto' : 'waver') :
      (i % 3 === 0 ? 'emiya' : 'miyama')) as BuildingFrame,
  };
}).filter((b) => !(b.x > 1495 && b.x < 1770) &&
  !overlapsStreet(b.x, b.y, b.width, b.height) &&
  !DISTRICT_LANDMARKS.some((p) => Math.abs(b.x - p.x) < 180 && b.y > p.y - 320 && b.y < p.y + 20));

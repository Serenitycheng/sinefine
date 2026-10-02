import { DISTRICT_LANDMARKS } from './fate-district';
import { WALK_AREAS } from './street';

export const BUILDING_ATLAS = '/fate/environment/fuyuki-building-atlas-v2.webp';
export const PROP_ATLAS = '/fate/environment/fuyuki-prop-atlas-v1.webp';
export const TERRAIN_ATLAS = '/fate/environment/fuyuki-terrain-atlas-v1.webp';
export const ATLAS_SIZE = 1254;
const CELL = ATLAS_SIZE / 4;
const frame = (column: number, row: number) =>
  [column * CELL, row * CELL, CELL, CELL] as const;
// The approved atlas uses one semi-overhead illustration per cell.
export const BUILDING_FRAMES = {
  emiya: frame(0, 0), tohsaka: frame(1, 0),
  matou: frame(2, 0), einzbern: frame(3, 0),
  waver: frame(0, 1), temple: frame(1, 1),
  church: frame(2, 1), kayneth: frame(3, 1),
  fujimura: frame(0, 2), natalia: frame(1, 2),
  school: frame(2, 2), cafe: frame(3, 2),
  shops: frame(0, 3), park: frame(1, 3),
  shinto: frame(2, 3), miyama: frame(3, 3),
} as const;
export type BuildingFrame = keyof typeof BUILDING_FRAMES;
export const PROP_FRAMES = {
  wall: frame(0, 0), gate: frame(1, 0), hedge: frame(2, 0), pole: frame(3, 0),
  postbox: frame(0, 1), bicycle: frame(1, 1), tree: frame(2, 1), maple: frame(3, 1),
  schoolGate: frame(0, 2), shopfront: frame(1, 2), bridgeRail: frame(2, 2), bench: frame(3, 2),
  riverSteps: frame(0, 3), lamp: frame(1, 3), vending: frame(2, 3), plants: frame(3, 3),
} as const;
export type PropFrame = keyof typeof PROP_FRAMES;
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
  const x = 95 + (i % 18) * 168 + (row % 2) * 22;
  const west = x < 1500;
  const frames: BuildingFrame[] = west
    ? ['miyama', 'emiya', 'fujimura', 'einzbern', 'matou', 'natalia']
    : ['shinto', 'waver', 'shops', 'cafe', 'natalia'];
  return {
    x,
    y: 170 + row * 155,
    width: 145 + (i * 17) % 32,
    height: 142 + (i * 23) % 22,
    frame: frames[(i * 7 + row) % frames.length],
  };
}).filter((b) => !(b.x > 1495 && b.x < 1770) &&
  !overlapsStreet(b.x, b.y, b.width, b.height) &&
  !DISTRICT_LANDMARKS.some((p) => Math.abs(b.x - p.x) < 180 && b.y > p.y - 320 && b.y < p.y + 20));

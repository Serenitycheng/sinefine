import { DISTRICT_LANDMARKS } from './fate-district';
import { CITY_ROADS, CITY_SIZE, cityRoadTouchesRect } from './fate-city-layout';

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
  return cityRoadTouchesRect(x - width / 2, x + width / 2, y - height, y);
}

type CityBuilding = {
  frame: BuildingFrame;
  width: number;
  height: number;
  x: number;
  y: number;
};
const buildingsOverlap = (a: CityBuilding, b: CityBuilding, gap = 18) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
  a.y > b.y - b.height - gap &&
  a.y - a.height < b.y + gap;
const withinLand = (b: CityBuilding) =>
  b.x > b.width / 2 + 12 &&
  b.x < CITY_SIZE.width - b.width / 2 - 12 &&
  b.y > b.height + 170 &&
  b.y < CITY_SIZE.height - 18 &&
  !(b.x + b.width / 2 > 1500 && b.x - b.width / 2 < 1775) &&
  !overlapsStreet(b.x, b.y, b.width, b.height);

// Fit illustrations into real plots. Never fall back to painting a house across
// a road; smaller plots use a smaller illustration with the same entrance ID.
export const LANDMARK_BUILDINGS = DISTRICT_LANDMARKS.reduce<
  Array<CityBuilding & { id: string }>
>((placed, p) => {
  const frame = p.id as BuildingFrame,
    preferred = LANDMARK_WIDTH[frame] ?? 235;
  for (const scale of [1, 0.88, 0.76, 0.66, 0.55, 0.5]) {
    const width = preferred * scale;
    const candidates = Array.from({ length: 37 }, (_, y) => -220 + y * 15)
      .flatMap((dy) =>
        Array.from({ length: 29 }, (_, x) => -210 + x * 15).map((dx) => ({
          id: p.id,
          frame,
          width,
          height: width * BUILDING_FRAMES[frame][3] / BUILDING_FRAMES[frame][2],
          x: p.x + dx,
          y: p.y + dy,
        })),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      );
    if (p.id === 'school')
      candidates.unshift({
        id: p.id,
        frame,
        width,
        height: width * BUILDING_FRAMES[frame][3] / BUILDING_FRAMES[frame][2],
        x: p.x - 45,
        y: p.y + 220,
      });
    const fit = candidates.find(
      (b) =>
        ((p.id !== 'tohsaka' && p.id !== 'matou') || b.y > p.y) &&
        withinLand(b) &&
        !placed.some((other) => buildingsOverlap(b, other)),
    );
    if (fit) {
      placed.push(fit);
      break;
    }
  }
  return placed;
}, []);

// Streets grow around terrain instead of a second, unrelated building grid.
export const NEIGHBOURHOOD_BUILDINGS = CITY_ROADS.filter(
  (r) => r.kind !== 'bridge',
)
  .flatMap((r, row) =>
    r.points.slice(1).flatMap((b, i) => {
      const a = r.points[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        length = Math.hypot(dx, dy);
      const width = 110 + ((row * 13 + i * 19) % 32),
        height = 115 + ((row * 17 + i * 11) % 22);
      const nx = -dy / length,
        ny = dx / length;
      const offset =
        r.width / 2 + (Math.abs(nx) * width + Math.abs(ny) * height) / 2 + 34;
      return [-1, 1].map((side) => ({
        x: (a.x + b.x) / 2 + side * nx * offset,
        y: (a.y + b.y) / 2 + side * ny * offset + height / 2,
        width,
        height,
        frame: ((a.x + b.x) / 2 < 1500 ? 'miyama' : 'shinto') as BuildingFrame,
      }));
    }),
  )
  .reduce<CityBuilding[]>((placed, b) => {
    if (
      withinLand(b) &&
      !LANDMARK_BUILDINGS.some((p) => buildingsOverlap(b, p)) &&
      !placed.some((p) => buildingsOverlap(b, p))
    )
      placed.push(b);
    return placed;
  }, []);

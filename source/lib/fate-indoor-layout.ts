import type { HomeId } from './fate-housing';
import type { Point } from './street';

export type RoomZone = 'lounge' | 'table' | 'study' | 'rest';
const ZONES: RoomZone[] = ['lounge', 'table', 'study', 'rest'];
const ORIGINS: Record<RoomZone, Point> = {
  lounge: { x: 44, y: 44 }, table: { x: 394, y: 44 },
  study: { x: 44, y: 258 }, rest: { x: 394, y: 258 },
};
// Physical slots clockwise by rows; their logical uses differ between homes.
export const HOME_ROOMS: Record<HomeId, readonly RoomZone[]> = {
  emiya: ['lounge', 'table', 'study', 'rest'],
  einzbern: ['lounge', 'study', 'table', 'rest'],
  tohsaka: ['study', 'lounge', 'table', 'rest'],
  matou: ['lounge', 'table', 'rest', 'study'],
  waver: ['study', 'table', 'lounge', 'rest'],
  temple: ['lounge', 'study', 'rest', 'table'],
  church: ['study', 'lounge', 'rest', 'table'],
  kayneth: ['lounge', 'rest', 'study', 'table'],
  fujimura: ['table', 'lounge', 'study', 'rest'],
  natalia: ['study', 'rest', 'lounge', 'table'],
};

export function roomOffset(home: HomeId, zone: RoomZone): Point {
  const destination = ORIGINS[ZONES[HOME_ROOMS[home].indexOf(zone)]];
  const source = ORIGINS[zone];
  return { x: destination.x - source.x, y: destination.y - source.y };
}

export function roomPoint(home: HomeId, zone: RoomZone, point: Point): Point {
  const offset = roomOffset(home, zone);
  return { x: point.x + offset.x, y: point.y + offset.y };
}

export function roomTranslation(home: HomeId, zone: RoomZone) {
  const offset = roomOffset(home, zone);
  return `translate(${offset.x} ${offset.y})`;
}

export function roomAt(point: Point, home: HomeId): RoomZone | 'hall' {
  if (point.y >= 202 && point.y <= 258) return 'hall';
  if (point.x >= 326 && point.x <= 394) return 'hall';
  return HOME_ROOMS[home][(point.y < 202 ? 0 : 2) + (point.x < 360 ? 0 : 1)];
}

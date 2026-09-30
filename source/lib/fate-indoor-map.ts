import { FATE_HOMES, type HomeId } from './fate-housing';
import type { ActorId, Point, Rect } from './street';

export const INDOOR_SIZE = { width: 720, height: 460 } as const;
export const INDOOR_ENTRY: Point = { x: 360, y: 422 };
export const INDOOR_SPEED = 104;
export type IndoorPosition = Point & { home: HomeId; actor: ActorId };
export type IndoorRoom = 'lounge' | 'table' | 'study' | 'rest' | 'hall';

export function nearHomeEntrance(point: Point, home: HomeId): boolean {
  const door = FATE_HOMES[home];
  return Math.hypot(point.x - door.x, point.y - door.y) <= 75;
}

const AREAS: Rect[] = [
  { left: 44, right: 326, top: 44, bottom: 202 },
  { left: 394, right: 676, top: 44, bottom: 202 },
  { left: 44, right: 326, top: 258, bottom: 414 },
  { left: 394, right: 676, top: 258, bottom: 414 },
  { left: 326, right: 394, top: 44, bottom: 430 },
  { left: 44, right: 676, top: 202, bottom: 258 },
];
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function isIndoorWalkable(point: Point): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    AREAS.some(
      (area) =>
        point.x >= area.left &&
        point.x <= area.right &&
        point.y >= area.top &&
        point.y <= area.bottom,
    )
  );
}

export function nearestIndoorPoint(point: Point): Point {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    return { ...INDOOR_ENTRY };
  return AREAS.map((area) => ({
    x: clamp(point.x, area.left, area.right),
    y: clamp(point.y, area.top, area.bottom),
  })).sort(
    (a, b) =>
      Math.hypot(a.x - point.x, a.y - point.y) -
      Math.hypot(b.x - point.x, b.y - point.y),
  )[0];
}

/** Axis sliding keeps the character on a floor when a wall blocks a diagonal. */
export function stepIndoor(point: Point, input: Point, dt: number): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length || !Number.isFinite(length) || !Number.isFinite(dt) || dt <= 0)
    return point;
  const speed = (INDOOR_SPEED * Math.min(dt, 0.05)) / Math.max(1, length);
  const x = point.x + input.x * speed;
  const y = point.y + input.y * speed;
  if (isIndoorWalkable({ x, y })) return { x, y };
  if (isIndoorWalkable({ x, y: point.y })) return { x, y: point.y };
  if (isIndoorWalkable({ x: point.x, y })) return { x: point.x, y };
  return point;
}

/** Every room opens onto the central hall, so one corridor joins all four. */
export function indoorRoute(from: Point, requested: Point): Point[] {
  if (!isIndoorWalkable(from)) return [];
  const to = nearestIndoorPoint(requested);
  const middle = 230;
  const route = [{ x: from.x, y: middle }, { x: to.x, y: middle }, to];
  return route.filter(
    (point, index) =>
      isIndoorWalkable(point) &&
      (index === route.length - 1 ||
        Math.hypot(point.x - from.x, point.y - from.y) > 2),
  );
}

export function indoorRoom(point: Point): IndoorRoom {
  if (point.y >= 202 && point.y <= 258) return 'hall';
  if (point.x >= 326 && point.x <= 394) return 'hall';
  if (point.y < 202) return point.x < 360 ? 'lounge' : 'table';
  return point.x < 360 ? 'study' : 'rest';
}

export function nearIndoorDoor(point: Point): boolean {
  return Math.hypot(point.x - INDOOR_ENTRY.x, point.y - INDOOR_ENTRY.y) <= 40;
}

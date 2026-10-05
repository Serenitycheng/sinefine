import { FATE_HOMES, type HomeId } from './fate-housing';
import type { ActorId, Point, Rect } from './street';
import { roomAt, roomPoint, type RoomZone } from './fate-indoor-layout';
import { HOME_ENTRANCES } from './fate-home-entrances';

export const INDOOR_SIZE = { width: 720, height: 460 } as const;
export const INDOOR_ENTRY: Point = { x: 360, y: 422 };
export const INDOOR_SPEED = 104;
export type IndoorPosition = Point & {
  home: HomeId;
  actor: ActorId;
  layout?: 2;
};
export type IndoorRoom = 'lounge' | 'table' | 'study' | 'rest' | 'hall';

export function nearHomeEntrance(point: Point, home: HomeId): boolean {
  const door = HOME_ENTRANCES[home].door;
  const legacy = FATE_HOMES[home];
  return (
    Math.hypot(point.x - door.x, point.y - door.y) <= 75 ||
    Math.hypot(point.x - legacy.x, point.y - legacy.y) <= 75
  );
}

export function nearbyHomeEntrance(point: Point): HomeId | null {
  let nearest: HomeId | null = null;
  let distance = 75;
  for (const entry of Object.values(HOME_ENTRANCES)) {
    const legacy = FATE_HOMES[entry.home];
    const gap = Math.min(
      Math.hypot(point.x - entry.door.x, point.y - entry.door.y),
      Math.hypot(point.x - legacy.x, point.y - legacy.y),
    );
    if (gap <= distance) {
      nearest = entry.home;
      distance = gap;
    }
  }
  return nearest;
}

const AREAS: Rect[] = [
  { left: 44, right: 326, top: 44, bottom: 202 },
  { left: 394, right: 676, top: 44, bottom: 202 },
  { left: 44, right: 326, top: 258, bottom: 414 },
  { left: 394, right: 676, top: 258, bottom: 414 },
  { left: 326, right: 394, top: 44, bottom: 430 },
  { left: 44, right: 676, top: 202, bottom: 258 },
];
// Major furniture in the shared four-room layout. Characters stand at their
// feet, so these bounds leave a narrow visual margin around each object.
const FURNITURE: Rect[] = [
  { left: 83, right: 244, top: 85, bottom: 138 },
  { left: 96, right: 211, top: 138, bottom: 171 },
  { left: 256, right: 290, top: 94, bottom: 171 },
  { left: 409, right: 630, top: 79, bottom: 120 },
  { left: 489, right: 594, top: 133, bottom: 180 },
  { left: 59, right: 278, top: 281, bottom: 325 },
  { left: 88, right: 209, top: 332, bottom: 371 },
  { left: 414, right: 458, top: 291, bottom: 378 },
  { left: 493, right: 612, top: 289, bottom: 367 },
  { left: 626, right: 663, top: 301, bottom: 346 },
];
const FURNITURE_ZONES: RoomZone[] = [
  'lounge',
  'lounge',
  'lounge',
  'table',
  'table',
  'study',
  'study',
  'rest',
  'rest',
  'rest',
];
function furnitureFor(home: HomeId): Rect[] {
  return FURNITURE.map((rect, index) => {
    const origin = roomPoint(home, FURNITURE_ZONES[index], {
      x: rect.left,
      y: rect.top,
    });
    return {
      left: origin.x,
      right: origin.x + rect.right - rect.left,
      top: origin.y,
      bottom: origin.y + rect.bottom - rect.top,
    };
  });
}
const FURNITURE_BY_HOME = Object.fromEntries(
  (Object.keys(FATE_HOMES) as HomeId[]).map((home) => [
    home,
    furnitureFor(home),
  ]),
) as Record<HomeId, Rect[]>;
const CELL = 10;
const COLUMNS = INDOOR_SIZE.width / CELL;
const ROWS = INDOOR_SIZE.height / CELL;
const GRID_LENGTH = COLUMNS * ROWS;
const contains = (area: Rect, point: Point) =>
  point.x >= area.left &&
  point.x <= area.right &&
  point.y >= area.top &&
  point.y <= area.bottom;
const cellPoint = (index: number): Point => ({
  x: (index % COLUMNS) * CELL + CELL / 2,
  y: Math.floor(index / COLUMNS) * CELL + CELL / 2,
});

function nearestCell(point: Point, home: HomeId): number {
  let best = -1;
  let distance = Infinity;
  for (let index = 0; index < GRID_LENGTH; index++) {
    const candidate = cellPoint(index);
    if (!isIndoorWalkable(candidate, home)) continue;
    const next = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (next < distance) {
      best = index;
      distance = next;
    }
  }
  return best;
}

export function isIndoorFloor(point: Point): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    AREAS.some((area) => contains(area, point))
  );
}

export function isIndoorWalkable(
  point: Point,
  home: HomeId = 'emiya',
): boolean {
  return (
    isIndoorFloor(point) &&
    !FURNITURE_BY_HOME[home].some((item) => contains(item, point))
  );
}

export function nearestIndoorPoint(
  point: Point,
  home: HomeId = 'emiya',
): Point {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    return { ...INDOOR_ENTRY };
  if (isIndoorWalkable(point, home)) return point;
  const index = nearestCell(point, home);
  return index < 0 ? { ...INDOOR_ENTRY } : cellPoint(index);
}

/** Axis sliding keeps the character on a floor when a wall blocks a diagonal. */
export function stepIndoor(
  point: Point,
  input: Point,
  dt: number,
  home: HomeId = 'emiya',
  motionRate = 1,
): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length || !Number.isFinite(length) || !Number.isFinite(dt) || dt <= 0)
    return point;
  const rate = Number.isFinite(motionRate)
    ? Math.max(0.4, Math.min(2, motionRate))
    : 1;
  const speed =
    (INDOOR_SPEED * rate * Math.min(dt, 0.05)) / Math.max(1, length);
  const dx = input.x * speed;
  const dy = input.y * speed;
  // Check short steps even at the fastest pace, including after a suspended
  // browser frame, so furniture cannot be skipped by a single long movement.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  let next = point;
  for (let step = 0; step < steps; step++) {
    const x = next.x + dx / steps;
    const y = next.y + dy / steps;
    if (isIndoorWalkable({ x, y }, home)) next = { x, y };
    else if (isIndoorWalkable({ x, y: next.y }, home)) next = { x, y: next.y };
    else if (isIndoorWalkable({ x: next.x, y }, home)) next = { x: next.x, y };
    else break;
  }
  return next;
}

/** Find an unobstructed path through the open thresholds and around furniture. */
export function indoorRoute(
  from: Point,
  requested: Point,
  home: HomeId = 'emiya',
): Point[] {
  if (!isIndoorWalkable(from, home)) return [];
  const to = nearestIndoorPoint(requested, home);
  const start = nearestCell(from, home);
  const goal = nearestCell(to, home);
  if (start < 0 || goal < 0) return [];
  const scores = new Float64Array(GRID_LENGTH).fill(Infinity);
  const previous = new Int32Array(GRID_LENGTH).fill(-1);
  const visited = new Uint8Array(GRID_LENGTH);
  const open = [start];
  scores[start] = 0;
  const heuristic = (index: number) =>
    Math.abs((index % COLUMNS) - (goal % COLUMNS)) +
    Math.abs(Math.floor(index / COLUMNS) - Math.floor(goal / COLUMNS));
  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (
        scores[open[i]] + heuristic(open[i]) <
        scores[open[best]] + heuristic(open[best])
      )
        best = i;
    const current = open.splice(best, 1)[0];
    if (current === goal) break;
    if (visited[current]) continue;
    visited[current] = 1;
    const x = current % COLUMNS;
    const y = Math.floor(current / COLUMNS);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLUMNS || ny >= ROWS) continue;
      const next = ny * COLUMNS + nx;
      if (visited[next] || !isIndoorWalkable(cellPoint(next), home)) continue;
      const cost = scores[current] + 1;
      if (cost < scores[next]) {
        scores[next] = cost;
        previous[next] = current;
        if (!open.includes(next)) open.push(next);
      }
    }
  }
  if (start !== goal && previous[goal] < 0) return [];
  const cells = [goal];
  while (cells[0] !== start) cells.unshift(previous[cells[0]]);
  const route: Point[] = [];
  for (let i = 0; i < cells.length; i++) {
    const before = cells[i] - (cells[i - 1] ?? cells[i]);
    const after = (cells[i + 1] ?? cells[i]) - cells[i];
    if (i === 0 || i === cells.length - 1 || before !== after)
      route.push(cellPoint(cells[i]));
  }
  if (Math.hypot(route[0].x - from.x, route[0].y - from.y) < 2) route.shift();
  if (
    Math.hypot(
      (route.at(-1)?.x ?? from.x) - to.x,
      (route.at(-1)?.y ?? from.y) - to.y,
    ) > 2
  )
    route.push(to);
  return route;
}

export function indoorRoom(point: Point, home: HomeId = 'emiya'): IndoorRoom {
  return roomAt(point, home);
}

export function nearIndoorDoor(point: Point): boolean {
  return Math.hypot(point.x - INDOOR_ENTRY.x, point.y - INDOOR_ENTRY.y) <= 40;
}

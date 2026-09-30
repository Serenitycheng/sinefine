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

function nearestCell(point: Point): number {
  let best = -1;
  let distance = Infinity;
  for (let index = 0; index < GRID_LENGTH; index++) {
    const candidate = cellPoint(index);
    if (!isIndoorWalkable(candidate)) continue;
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

export function isIndoorWalkable(point: Point): boolean {
  return (
    isIndoorFloor(point) && !FURNITURE.some((item) => contains(item, point))
  );
}

export function nearestIndoorPoint(point: Point): Point {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    return { ...INDOOR_ENTRY };
  if (isIndoorWalkable(point)) return point;
  const index = nearestCell(point);
  return index < 0 ? { ...INDOOR_ENTRY } : cellPoint(index);
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

/** Find an unobstructed path through the open thresholds and around furniture. */
export function indoorRoute(from: Point, requested: Point): Point[] {
  if (!isIndoorWalkable(from)) return [];
  const to = nearestIndoorPoint(requested);
  const start = nearestCell(from);
  const goal = nearestCell(to);
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
      if (visited[next] || !isIndoorWalkable(cellPoint(next))) continue;
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

export function indoorRoom(point: Point): IndoorRoom {
  if (point.y >= 202 && point.y <= 258) return 'hall';
  if (point.x >= 326 && point.x <= 394) return 'hall';
  if (point.y < 202) return point.x < 360 ? 'lounge' : 'table';
  return point.x < 360 ? 'study' : 'rest';
}

export function nearIndoorDoor(point: Point): boolean {
  return Math.hypot(point.x - INDOOR_ENTRY.x, point.y - INDOOR_ENTRY.y) <= 40;
}

import { STREET_PARTNERS } from './fate-cast';
import { cityPoint, districtAt, DISTRICT_LANDMARKS } from './fate-district';
export type Point = { x: number; y: number };
export type Rect = { left: number; right: number; top: number; bottom: number };
export const ACTOR_IDS = ['admin', ...STREET_PARTNERS] as const;
export type ActorId = (typeof ACTOR_IDS)[number];
export function isActorId(id: unknown): id is ActorId {
  return typeof id === 'string' && ACTOR_IDS.some((actor) => actor === id);
}
export type Actor = Point & {
  id: ActorId;
  facing: 1 | -1;
  frame: number;
  phase: number;
  path: Point[];
  rest: number;
  routeIndex: number;
};

export const STREET = { width: 3100, height: 1660 };
export const LEGACY_WALK_AREAS: Rect[] = [
  { left: 55, right: 1617, top: 802, bottom: 903 },
  { left: 830, right: 955, top: 670, bottom: 824 },
  { left: 244, right: 369, top: 731, bottom: 824 },
];
export const LEGACY_DISTRICT_WALK_AREAS: Rect[] = [
  ...LEGACY_WALK_AREAS,
  { left: 70, right: 1500, top: 270, bottom: 340 },
  { left: 70, right: 1500, top: 510, bottom: 600 },
  { left: 70, right: 135, top: 300, bottom: 850 },
  { left: 740, right: 810, top: 300, bottom: 850 },
  { left: 1420, right: 1500, top: 300, bottom: 850 },
  { left: 860, right: 925, top: 550, bottom: 850 },
];
export const WALK_AREAS: Rect[] = [
  // Three east-west roads on each bank, joined by two usable bridges.
  { left: 150, right: 1510, top: 440, bottom: 550 },
  { left: 150, right: 1510, top: 850, bottom: 965 },
  { left: 150, right: 1510, top: 1300, bottom: 1450 },
  { left: 1760, right: 2990, top: 440, bottom: 550 },
  { left: 1760, right: 2990, top: 850, bottom: 965 },
  { left: 1760, right: 2990, top: 1300, bottom: 1450 },
  { left: 1500, right: 1770, top: 860, bottom: 955 },
  { left: 1500, right: 1770, top: 1320, bottom: 1430 },
  // Local lanes link homes, school, shops, riverside and the bridges.
  { left: 470, right: 540, top: 490, bottom: 1410 },
  { left: 850, right: 930, top: 490, bottom: 1410 },
  { left: 1220, right: 1290, top: 490, bottom: 1410 },
  { left: 1800, right: 1920, top: 490, bottom: 1410 },
  { left: 2210, right: 2280, top: 490, bottom: 1410 },
  { left: 2640, right: 2730, top: 490, bottom: 1410 },
  // The approach to Ryudou Temple climbs into the Miyama hills.
  { left: 315, right: 385, top: 300, bottom: 500 },
];
export const ROUTE_STOPS: Point[] = [
  { x: 1250, y: 818 },
  { x: 940, y: 858 },
  { x: 390, y: 837 },
  { x: 670, y: 886 },
].map(cityPoint);
export const WALK_SPEED = 90;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
export function isWalkable(p: Point) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    WALK_AREAS.some(
      (r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
    )
  );
}
export function wasWalkableInDistrict(p: Point) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    LEGACY_DISTRICT_WALK_AREAS.some(
      (r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
    )
  );
}
export function nearestWalkable(p: Point): Point {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return cityPoint({ x: 750, y: 845 });
  return WALK_AREAS.map((r) => ({
    x: clamp(p.x, r.left, r.right),
    y: clamp(p.y, r.top, r.bottom),
  })).sort(
    (a, b) =>
      Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
  )[0];
}
export function moveWithinStreet(p: Point, dx: number, dy: number): Point {
  let result = { ...p };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 0; i < steps; i++) {
    const next = { x: result.x + dx / steps, y: result.y + dy / steps };
    if (isWalkable(next)) result = next;
    else {
      if (isWalkable({ x: next.x, y: result.y })) result.x = next.x;
      if (isWalkable({ x: result.x, y: next.y })) result.y = next.y;
    }
  }
  return result;
}
export function directionFromKeys(keys: Set<string>): Point {
  const x =
    Number(keys.has('d') || keys.has('arrowright')) -
    Number(keys.has('a') || keys.has('arrowleft'));
  const y =
    Number(keys.has('s') || keys.has('arrowdown')) -
    Number(keys.has('w') || keys.has('arrowup'));
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
function within(p: Point, r: Rect) {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}
function straightPath(a: Point, b: Point) {
  return WALK_AREAS.some((r) => within(a, r) && within(b, r));
}
// Every edge lies inside one convex pavement rectangle. Intersections connect
// those rectangles, so diagonal shortcuts can never cross a house or the river.
const junctions: Point[] = WALK_AREAS.map((r) => ({
  x: (r.left + r.right) / 2,
  y: (r.top + r.bottom) / 2,
}));
for (let i = 0; i < WALK_AREAS.length; i++) {
  for (let j = i + 1; j < WALK_AREAS.length; j++) {
    const a = WALK_AREAS[i],
      b = WALK_AREAS[j];
    const left = Math.max(a.left, b.left),
      right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top),
      bottom = Math.min(a.bottom, b.bottom);
    if (left <= right && top <= bottom)
      junctions.push({ x: (left + right) / 2, y: (top + bottom) / 2 });
  }
}
const roads = junctions.map((a) =>
  junctions.map((b) =>
    straightPath(a, b) ? Math.hypot(a.x - b.x, a.y - b.y) : Infinity,
  ),
);
export function pathTo(start: Point, requested: Point): Point[] {
  const target = nearestWalkable(requested);
  if (!isWalkable(start)) return [];
  if (straightPath(start, target)) return [target];
  const points = [...junctions, start, target],
    origin = points.length - 2,
    end = origin + 1;
  const distance = points.map(() => Infinity),
    previous = points.map(() => -1);
  const visited = new Set<number>();
  distance[origin] = 0;
  for (let step = 0; step < points.length; step++) {
    let current = -1;
    for (let i = 0; i < points.length; i++)
      if (!visited.has(i) && (current < 0 || distance[i] < distance[current]))
        current = i;
    if (current < 0 || !Number.isFinite(distance[current])) return [];
    if (current === end) break;
    visited.add(current);
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const a = points[current],
        b = points[i];
      const cost =
        current < origin && i < origin
          ? roads[current][i]
          : straightPath(a, b)
            ? Math.hypot(a.x - b.x, a.y - b.y)
            : Infinity;
      if (distance[current] + cost < distance[i]) {
        distance[i] = distance[current] + cost;
        previous[i] = current;
      }
    }
  }
  const route: Point[] = [];
  for (let i = end; i !== origin; i = previous[i]) {
    if (i < 0) return [];
    route.unshift(points[i]);
  }
  return route;
}
export function createStreetActors(): Actor[] {
  return [
    { id: 'admin', x: 690, y: 863 },
    { id: 'saber', x: 1450, y: 850 },
    { id: 'rin', x: 680, y: 300 },
    { id: 'shirou', x: 540, y: 300 },
    { id: 'sakura', x: 230, y: 550 },
    { id: 'kiritsugu', x: 230, y: 300 },
    { id: 'irisviel', x: 330, y: 300 },
    { id: 'illya', x: 440, y: 300 },
    { id: 'taiga', x: 680, y: 550 },
    { id: 'diarmuid', x: 480, y: 850 },
    { id: 'cu', x: 906, y: 550 },
    { id: 'waver', x: 1120, y: 550 },
    { id: 'iskandar', x: 1190, y: 550 },
    { id: 'medea', x: 140, y: 212 },
    { id: 'kuzuki', x: 150, y: 212 },
    { id: 'gilgamesh', x: 1230, y: 850 },
    { id: 'medusa', x: 1060, y: 850 },
    { id: 'tokiomi', x: 790, y: 300 },
    { id: 'kirei', x: 1430, y: 300 },
    { id: 'kariya', x: 350, y: 550 },
    { id: 'emiya', x: 900, y: 850 },
    { id: 'natalia', x: 230, y: 850 },
  ].map((p, i) => ({
    ...cityPoint(p),
    id: p.id as ActorId,
    facing: 1,
    frame: 0,
    phase: 0,
    path: [],
    rest: 3 + i * 2,
    routeIndex: i,
  }));
}
export function stepActor(
  actor: Actor,
  dt: number,
  manual?: Point,
  speed = WALK_SPEED,
) {
  const elapsed = clamp(dt, 0, 0.05);
  const previous = { x: actor.x, y: actor.y };
  let dir = manual;
  if (dir && (dir.x || dir.y)) actor.path = [];
  else if (actor.path.length) {
    const target = actor.path[0],
      distance = Math.hypot(target.x - actor.x, target.y - actor.y);
    if (distance <= speed * elapsed) {
      const next = moveWithinStreet(
        actor,
        target.x - actor.x,
        target.y - actor.y,
      );
      actor.x = next.x;
      actor.y = next.y;
      if (Math.hypot(next.x - target.x, next.y - target.y) < 1)
        actor.path.shift();
      dir = undefined;
    } else
      dir = {
        x: (target.x - actor.x) / distance,
        y: (target.y - actor.y) / distance,
      };
  }
  if (dir && (dir.x || dir.y)) {
    const next = moveWithinStreet(
      actor,
      dir.x * speed * elapsed,
      dir.y * speed * elapsed,
    );
    actor.x = next.x;
    actor.y = next.y;
  }
  const moved = Math.hypot(actor.x - previous.x, actor.y - previous.y) > 0.02;
  if (Math.abs(actor.x - previous.x) > 0.02)
    actor.facing = actor.x > previous.x ? 1 : -1;
  actor.phase = moved ? actor.phase + elapsed : 0;
  actor.frame = moved ? 1 + (Math.floor(actor.phase * 9) % 3) : 0;
  return moved;
}
export function cameraFor(
  p: Point,
  width: number,
  height: number,
  zoom: number,
  worldSize: Point = { x: STREET.width, y: STREET.height },
) {
  const scale =
    Math.max(width / STREET.width, height / STREET.height) *
    clamp(zoom, 1, 1.8);
  const visibleWidth = width / scale,
    visibleHeight = height / scale;
  return {
    scale,
    x: clamp(
      p.x - visibleWidth / 2,
      0,
      Math.max(0, worldSize.x - visibleWidth),
    ),
    y: clamp(
      p.y - visibleHeight * 0.55,
      0,
      Math.max(0, worldSize.y - visibleHeight),
    ),
  };
}
export function screenToWorld(
  x: number,
  y: number,
  camera: { x: number; y: number; scale: number },
): Point {
  return { x: x / camera.scale + camera.x, y: y / camera.scale + camera.y };
}
export function placeName(p: Point) {
  const nearby = DISTRICT_LANDMARKS.find(
    (place) => Math.hypot(p.x - place.x, p.y - place.y) < 70,
  );
  return nearby?.name ?? districtAt(p);
}

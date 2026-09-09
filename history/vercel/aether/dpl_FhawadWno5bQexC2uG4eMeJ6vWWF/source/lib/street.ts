import { STREET_PARTNERS } from './fate-cast';
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

export const STREET = { width: 1672, height: 941 };
export const WALK_AREAS: Rect[] = [
  { left: 55, right: 1617, top: 802, bottom: 903 },
  { left: 830, right: 955, top: 670, bottom: 824 },
  { left: 244, right: 369, top: 731, bottom: 824 },
];
export const ROUTE_STOPS: Point[] = [
  { x: 1250, y: 818 },
  { x: 940, y: 858 },
  { x: 390, y: 837 },
  { x: 670, y: 886 },
];
export const WALK_SPEED = 165;

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
export function nearestWalkable(p: Point): Point {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return { x: 750, y: 845 };
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
export function pathTo(start: Point, requested: Point): Point[] {
  const target = nearestWalkable(requested);
  const sameArea = WALK_AREAS.some((r) =>
    [start, target].every(
      (p) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
    ),
  );
  if (sameArea) return [target];
  return [{ x: start.x, y: 844 }, { x: target.x, y: 844 }, target].filter(
    (p, i, list) =>
      i === 0 || Math.hypot(p.x - list[i - 1].x, p.y - list[i - 1].y) > 1,
  );
}
export function createStreetActors(): Actor[] {
  return [
    { id: 'admin', x: 690, y: 863 },
    { id: 'saber', x: 1320, y: 819 },
    { id: 'rin', x: 1120, y: 832 },
    { id: 'shirou', x: 485, y: 852 },
    { id: 'sakura', x: 570, y: 873 },
    { id: 'kiritsugu', x: 350, y: 829 },
    { id: 'irisviel', x: 910, y: 875 },
  ].map((p, i) => ({
    ...p,
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
      Math.max(0, STREET.width - visibleWidth),
    ),
    y: clamp(
      p.y - visibleHeight * 0.8,
      0,
      Math.max(0, STREET.height - visibleHeight),
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
  if (p.y < 790 && p.x > 800 && p.x < 970) return '商店侧巷';
  if (p.x < 530) return '住宅门前';
  if (p.x > 1080) return '街角咖啡店';
  return '冬木 · 生活街道';
}

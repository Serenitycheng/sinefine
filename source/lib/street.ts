import { STREET_PARTNERS } from './fate-cast';
import {
  LOCAL_APPROACHES,
  localApproachWalkable,
  shareLocalApproach,
  closestLocalApproach,
} from './fate-local-entrances';
import {
  districtAt,
  DISTRICT_HOMES,
  DISTRICT_PLACES,
  DISTRICT_LANDMARKS,
  LEGACY_CITY_HOMES,
  LEGACY_CITY_PLACES,
} from './fate-district';
import {
  CITY_SIZE,
  cityWalkable,
  closestCityPavement,
  shareCityPavement,
  cityJunctions,
} from './fate-city-layout';
import {
  HOME_ENTRANCES,
  homeApproachWalkable,
  shareHomeApproach,
  closestHomeApproach,
} from './fate-home-entrances';
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

export const STREET = CITY_SIZE;
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
export const LEGACY_CITY_WALK_AREAS: Rect[] = [
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
  DISTRICT_PLACES.cafe,
  DISTRICT_PLACES.park,
  DISTRICT_PLACES.shops,
  { x: 1160, y: 840 },
];
export const WALK_SPEED = 70;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
export function isWalkable(p: Point) {
  return cityWalkable(p) || homeApproachWalkable(p) || localApproachWalkable(p);
}
export function samePavement(a: Point, b: Point) {
  return (
    shareCityPavement(a, b) ||
    shareHomeApproach(a, b) ||
    shareLocalApproach(a, b)
  );
}
export function wasWalkableInCity(p: Point) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    LEGACY_CITY_WALK_AREAS.some((r) => within(p, r))
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
  const city = closestCityPavement(p);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return city;
  return [city, closestHomeApproach(p), closestLocalApproach(p)].sort(
    (a, b) =>
      Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y),
  )[0];
}
export function migrateCityPoint(p: Point): Point {
  const oldPlaces = { ...LEGACY_CITY_HOMES, ...LEGACY_CITY_PLACES };
  const newPlaces = { ...DISTRICT_HOMES, ...DISTRICT_PLACES };
  const closest = Object.entries(oldPlaces).sort(
    ([, a], [, b]) =>
      Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
  )[0];
  if (Math.hypot(closest[1].x - p.x, closest[1].y - p.y) <= 120) {
    const to = newPlaces[closest[0] as keyof typeof newPlaces];
    return nearestWalkable({
      x: to.x + p.x - closest[1].x,
      y: to.y + p.y - closest[1].y,
    });
  }
  return nearestWalkable(p);
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
  return samePavement(a, b);
}
// Each capsule is convex; actual overlaps join curved road sections safely.
const junctions: Point[] = [
  ...cityJunctions(),
  ...Object.values(HOME_ENTRANCES).flatMap((entry) => entry.points),
  ...LOCAL_APPROACHES.flatMap((entry) => entry.points),
];
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

export function routePosition(point: Point, route: Point[]) {
  let traveled = 0;
  let length = 0;
  let closest = { distance: Infinity, traveled: 0 };
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1],
      to = route[i];
    const dx = to.x - from.x,
      dy = to.y - from.y;
    const segment = Math.hypot(dx, dy);
    if (!segment) continue;
    const fraction = clamp(
      ((point.x - from.x) * dx + (point.y - from.y) * dy) / (segment * segment),
      0,
      1,
    );
    const distance = Math.hypot(
      point.x - from.x - fraction * dx,
      point.y - from.y - fraction * dy,
    );
    if (distance < closest.distance)
      closest = { distance, traveled: traveled + fraction * segment };
    traveled += segment;
    length += segment;
  }
  return {
    distance: closest.distance,
    progress: length ? closest.traveled / length : 0,
  };
}

export function pointAlongRoute(route: Point[], progress: number): Point {
  if (!route.length) return { x: 0, y: 0 };
  const distances = route
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - route[index].x, point.y - route[index].y),
    );
  let remaining =
    distances.reduce((sum, distance) => sum + distance, 0) *
    clamp(progress, 0, 1);
  for (let index = 0; index < distances.length; index++) {
    const length = distances[index];
    if (remaining <= length) {
      const fraction = length ? remaining / length : 0;
      return {
        x: route[index].x + (route[index + 1].x - route[index].x) * fraction,
        y: route[index].y + (route[index + 1].y - route[index].y) * fraction,
      };
    }
    remaining -= length;
  }
  return route.at(-1)!;
}
export function createStreetActors(): Actor[] {
  const h = DISTRICT_HOMES,
    p = DISTRICT_PLACES;
  const starts: Record<ActorId, Point> = {
    admin: { x: 1160, y: 840 },
    saber: p.park,
    rin: h.tohsaka,
    shirou: { x: h.emiya.x + 35, y: h.emiya.y },
    sakura: h.matou,
    kiritsugu: h.einzbern,
    irisviel: { x: h.einzbern.x + 24, y: h.einzbern.y },
    illya: { x: h.einzbern.x - 24, y: h.einzbern.y },
    taiga: h.fujimura,
    diarmuid: h.kayneth,
    cu: p.shops,
    waver: h.waver,
    iskandar: { x: h.waver.x + 30, y: h.waver.y },
    medea: { x: h.temple.x - 18, y: h.temple.y },
    kuzuki: h.temple,
    gilgamesh: p.cafe,
    medusa: { x: h.matou.x + 32, y: h.matou.y },
    tokiomi: { x: h.tohsaka.x + 25, y: h.tohsaka.y },
    kirei: h.church,
    kariya: { x: h.matou.x - 24, y: h.matou.y },
    emiya: { x: p.park.x + 35, y: p.park.y },
    natalia: h.natalia,
  };
  return ACTOR_IDS.map((id, i) => ({
    ...nearestWalkable(starts[id]),
    id,
    facing: 1,
    frame: 0,
    phase: 0,
    path: [],
    rest: 0,
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
  const cadence = Number.isFinite(speed)
    ? clamp(speed / WALK_SPEED, 0.4, 2)
    : 1;
  actor.phase = moved ? actor.phase + elapsed * cadence : 0;
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

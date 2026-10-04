import { DISTRICT_HOMES } from './fate-district';
import {
  CITY_SIZE,
  cityWalkable,
  closestCityPavement,
  projectOnSegment,
  type CityPoint,
} from './fate-city-layout';
import {
  LANDMARK_BUILDINGS,
  NEIGHBOURHOOD_BUILDINGS,
} from './fate-environment';

type HomeId = keyof typeof DISTRICT_HOMES;
type Bounds = { left: number; right: number; top: number; bottom: number };
export type HomeEntrance = {
  home: HomeId;
  door: CityPoint;
  points: CityPoint[];
  width: number;
};
const WIDTH = 22;
const RADIUS = WIDTH / 2;
// The complete painted building rectangle is solid. Keep the whole walkway,
// including its round ends, three units beyond it instead of clearing collision.
const CLEARANCE = RADIUS + 3;
const obstacles: Bounds[] = [
  ...LANDMARK_BUILDINGS,
  ...NEIGHBOURHOOD_BUILDINGS,
].map((b) => ({
  left: b.x - b.width / 2 - CLEARANCE,
  right: b.x + b.width / 2 + CLEARANCE,
  top: b.y - b.height - CLEARANCE,
  bottom: b.y + CLEARANCE,
}));
const corners = obstacles.flatMap((r) => [
  { x: r.left, y: r.top },
  { x: r.right, y: r.top },
  { x: r.right, y: r.bottom },
  { x: r.left, y: r.bottom },
]);

function inside(p: CityPoint, r: Bounds) {
  return p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
}

/** Test the open interior so a route can turn at the expanded outside corners. */
function crosses(a: CityPoint, b: CityPoint, rect: Bounds) {
  const r = {
    left: rect.left + 1e-6,
    right: rect.right - 1e-6,
    top: rect.top + 1e-6,
    bottom: rect.bottom - 1e-6,
  };
  let low = 0;
  let high = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, r.left, r.right],
    [a.y, b.y - a.y, r.top, r.bottom],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
    } else {
      const first = (min - start) / delta;
      const last = (max - start) / delta;
      low = Math.max(low, Math.min(first, last));
      high = Math.min(high, Math.max(first, last));
      if (low > high) return false;
    }
  }
  return low <= high;
}

function makeEntrance(home: HomeId): HomeEntrance {
  const building = LANDMARK_BUILDINGS.find((b) => b.id === home);
  if (!building) throw new Error(`住宅缺少建筑：${home}`);
  const door = { x: building.x, y: building.y + 18 };
  const west = door.x < 1500;
  const onLand = (p: CityPoint) =>
    p.x >= RADIUS &&
    p.x <= CITY_SIZE.width - RADIUS &&
    p.y >= 170 + RADIUS &&
    p.y <= CITY_SIZE.height - RADIUS &&
    (west ? p.x <= 1500 - RADIUS : p.x >= 1775 + RADIUS);
  const clear = (p: CityPoint) =>
    onLand(p) && !obstacles.some((r) => inside(p, r));
  const turns = corners.filter(clear);
  // A connection starts on existing pavement. Project from outside corners too:
  // the nearest road to the door itself may be behind its own building.
  const roads = [door, ...turns].map(closestCityPavement).filter(clear);
  const points = [door, ...turns, ...roads].filter(
    (p, i, all) =>
      !all.slice(0, i).some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.1),
  );
  const distance = points.map(() => Infinity);
  const previous = points.map(() => -1);
  const visited = new Set<number>();
  distance[0] = 0;
  for (let count = 0; count < points.length; count++) {
    let current = -1;
    for (let i = 0; i < points.length; i++)
      if (!visited.has(i) && (current < 0 || distance[i] < distance[current]))
        current = i;
    if (current < 0 || !Number.isFinite(distance[current])) break;
    if (cityWalkable(points[current])) {
      const route: CityPoint[] = [];
      for (let i = current; i >= 0; i = previous[i]) route.push(points[i]);
      return { home, door, points: route, width: WIDTH };
    }
    visited.add(current);
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const cost = Math.hypot(
        points[current].x - points[i].x,
        points[current].y - points[i].y,
      );
      if (distance[current] + cost >= distance[i]) continue;
      if (obstacles.some((r) => crosses(points[current], points[i], r)))
        continue;
      distance[i] = distance[current] + cost;
      previous[i] = current;
    }
  }
  throw new Error(`住宅门前没有安全步道：${home}`);
}

export const HOME_ENTRANCES = Object.fromEntries(
  (Object.keys(DISTRICT_HOMES) as HomeId[]).map((home) => [
    home,
    makeEntrance(home),
  ]),
) as Record<HomeId, HomeEntrance>;

export const HOME_APPROACH_SEGMENTS = Object.values(HOME_ENTRANCES).flatMap(
  (entry) =>
    entry.points.slice(1).map((b, index) => ({
      a: entry.points[index],
      b,
      radius: entry.width / 2,
    })),
);
type ApproachSegment = (typeof HOME_APPROACH_SEGMENTS)[number];
function onSegment(p: CityPoint, s: ApproachSegment) {
  const nearest = projectOnSegment(p, s.a, s.b);
  return Math.hypot(p.x - nearest.x, p.y - nearest.y) <= s.radius + 1e-7;
}
export function homeApproachWalkable(p: CityPoint) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    HOME_APPROACH_SEGMENTS.some((s) => onSegment(p, s))
  );
}
export function shareHomeApproach(a: CityPoint, b: CityPoint) {
  return HOME_APPROACH_SEGMENTS.some((s) => onSegment(a, s) && onSegment(b, s));
}
export function closestHomeApproach(p: CityPoint): CityPoint {
  let nearest = HOME_APPROACH_SEGMENTS[0].a;
  let distance = Infinity;
  for (const s of HOME_APPROACH_SEGMENTS) {
    const q = projectOnSegment(p, s.a, s.b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    const gap = Math.max(0, d - s.radius);
    if (gap < distance) {
      const scale = d ? Math.min(1, s.radius / d) : 1;
      nearest = { x: q.x + (p.x - q.x) * scale, y: q.y + (p.y - q.y) * scale };
      distance = gap;
    }
  }
  return nearest;
}

/** Same center-x / bottom-y convention as overlapsStreet, for scenery props. */
export function overlapsHomeApproach(
  x: number,
  y: number,
  width = 0,
  height = 0,
) {
  return HOME_APPROACH_SEGMENTS.some((s) =>
    crosses(s.a, s.b, {
      left: x - width / 2 - s.radius,
      right: x + width / 2 + s.radius,
      top: y - height - s.radius,
      bottom: y + s.radius,
    }),
  );
}

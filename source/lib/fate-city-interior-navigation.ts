import type { CityPoint } from './fate-city-layout';
import {
  INTERIOR_WORLD,
  INTERIOR_PLAYER_RADIUS,
  type CityInteriorScene,
} from './fate-city-interior-scenes';

const STEP = 20;
const COLS = INTERIOR_WORLD.width / STEP + 1;
const ROWS = INTERIOR_WORLD.height / STEP + 1;
const distance = (a: CityPoint, b: CityPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function interiorWalkable(
  point: CityPoint,
  scene: CityInteriorScene,
  radius = INTERIOR_PLAYER_RADIUS,
) {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < radius ||
    point.y < radius ||
    point.x > INTERIOR_WORLD.width - radius ||
    point.y > INTERIOR_WORLD.height - radius
  )
    return false;
  return !scene.furniture.some(
    ({ footprint: r }) =>
      point.x > r.x - radius &&
      point.x < r.x + r.width + radius &&
      point.y > r.y - radius &&
      point.y < r.y + r.height + radius,
  );
}

export function interiorClearSegment(
  from: CityPoint,
  to: CityPoint,
  scene: CityInteriorScene,
  occupied: readonly CityPoint[] = [],
) {
  if (!interiorWalkable(from, scene) || !interiorWalkable(to, scene))
    return false;
  // Intersect the entire segment with each open, radius-expanded footprint.
  // Fixed-distance samples can miss a tiny diagonal corner, producing a route
  // that the per-frame movement correctly refuses to follow.
  const furnitureBlocked = scene.furniture.some(({ footprint: r }) => {
    let entry = 0,
      leave = 1;
    for (const [start, delta, minimum, maximum] of [
      [
        from.x,
        to.x - from.x,
        r.x - INTERIOR_PLAYER_RADIUS,
        r.x + r.width + INTERIOR_PLAYER_RADIUS,
      ],
      [
        from.y,
        to.y - from.y,
        r.y - INTERIOR_PLAYER_RADIUS,
        r.y + r.height + INTERIOR_PLAYER_RADIUS,
      ],
    ]) {
      if (Math.abs(delta) < 1e-12) {
        if (start <= minimum || start >= maximum) return false;
        continue;
      }
      const a = (minimum - start) / delta,
        b = (maximum - start) / delta;
      entry = Math.max(entry, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      if (entry >= leave - 1e-12) return false;
    }
    return entry < leave - 1e-12;
  });
  if (furnitureBlocked) return false;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = dx * dx + dy * dy;
  return occupied.every((person) => {
    const t = length
      ? Math.max(
          0,
          Math.min(
            1,
            ((person.x - from.x) * dx + (person.y - from.y) * dy) / length,
          ),
        )
      : 0;
    return distance(person, { x: from.x + dx * t, y: from.y + dy * t }) >= 30;
  });
}

/** Small local A* grid with visible-segment shortcuts. Endpoints remain exact,
 * and shortcuts are collision checked rather than skipping through tables. */
export function interiorRoute(
  from: CityPoint,
  to: CityPoint,
  scene: CityInteriorScene,
  occupied: readonly CityPoint[] = [],
): CityPoint[] | null {
  const walkable = (point: CityPoint) =>
    interiorWalkable(point, scene) &&
    occupied.every((person) => distance(point, person) >= 30);
  if (!walkable(from) || !walkable(to)) return null;
  if (distance(from, to) < 0.01) return [];
  if (interiorClearSegment(from, to, scene, occupied)) return [{ ...to }];
  const points = new Map<number, CityPoint>();
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++) {
      const p = { x: x * STEP, y: y * STEP };
      if (walkable(p)) points.set(y * COLS + x, p);
    }
  const nearest = (p: CityPoint) =>
    [...points]
      .sort((a, b) => distance(a[1], p) - distance(b[1], p))
      .find(([, q]) => interiorClearSegment(p, q, scene, occupied))?.[0];
  const start = nearest(from),
    end = nearest(to);
  if (start === undefined || end === undefined) return null;
  const open = new Set([start]);
  const cost = new Map([[start, 0]]),
    parent = new Map<number, number>();
  const neighbors = [
    -COLS - 1,
    -COLS,
    -COLS + 1,
    -1,
    1,
    COLS - 1,
    COLS,
    COLS + 1,
  ];
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const score = cost.get(id)! + distance(points.get(id)!, points.get(end)!);
      if (score < best) {
        best = score;
        current = id;
      }
    }
    if (current === end) {
      const path = [{ ...to }];
      let node = end;
      path.unshift(points.get(node)!);
      while (parent.has(node)) {
        node = parent.get(node)!;
        path.unshift(points.get(node)!);
      }
      const compact: CityPoint[] = [];
      let anchor = from;
      for (let i = 0; i < path.length;) {
        let farthest = i;
        while (
          farthest + 1 < path.length &&
          interiorClearSegment(anchor, path[farthest + 1], scene, occupied)
        )
          farthest++;
        compact.push(path[farthest]);
        anchor = path[farthest];
        i = farthest + 1;
      }
      return compact;
    }
    open.delete(current);
    for (const offset of neighbors) {
      const id = current + offset,
        next = points.get(id);
      if (
        !next ||
        Math.abs((id % COLS) - (current % COLS)) > 1 ||
        !interiorClearSegment(points.get(current)!, next, scene, occupied)
      )
        continue;
      const nextCost =
        cost.get(current)! + distance(points.get(current)!, next);
      if (nextCost >= (cost.get(id) ?? Infinity)) continue;
      cost.set(id, nextCost);
      parent.set(id, current);
      open.add(id);
    }
  }
  return null;
}

/** Substep keyboard movement to prevent tunnelling at low frame rates. */
export function interiorMove(
  from: CityPoint,
  delta: CityPoint,
  scene: CityInteriorScene,
): CityPoint {
  let p = { ...from };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 5));
  const dx = delta.x / steps,
    dy = delta.y / steps;
  for (let i = 0; i < steps; i++) {
    const next = { x: p.x + dx, y: p.y + dy };
    if (interiorClearSegment(p, next, scene)) p = next;
    else if (interiorClearSegment(p, { x: p.x + dx, y: p.y }, scene)) p.x += dx;
    else if (interiorClearSegment(p, { x: p.x, y: p.y + dy }, scene)) p.y += dy;
  }
  return p;
}

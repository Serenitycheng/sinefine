import type { CityPoint } from './fate-city-layout';
import {
  interiorProject,
  INTERIOR_PLAYER_RADIUS,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import {
  interiorClearSegment,
  interiorRoute,
  interiorWalkable,
} from './fate-city-interior-navigation';

import { furnitureSolids, insideInteriorShape } from './fate-interior-geometry';
import { interiorStandingOcclusion } from './fate-interior-occlusion';

export type InteriorSpot = CityInteriorScene['spots'][number];
const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
export { furnitureSolids, insideInteriorShape } from './fate-interior-geometry';

const segmentFoot = (p: CityPoint, a: CityPoint, b: CityPoint) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return { x: a.x + t * dx, y: a.y + t * dy };
};
const shapeGap = (p: CityPoint, poly: readonly CityPoint[]) =>
  insideInteriorShape(p, poly)
    ? 0
    : Math.min(
        ...poly.map((a, i) =>
          gap(p, segmentFoot(p, a, poly[(i + 1) % poly.length])),
        ),
      );

/** Bind a painted object to its own ground, then sample usable sides once. */
export function registerInteriorAccess(
  spot: InteriorSpot,
  scene: CityInteriorScene,
): InteriorSpot {
  if (!spot.target) return spot;
  const explicit = spot.approaches;
  const clearExplicit = explicit?.filter(
    (p) => interiorStandingOcclusion(p, scene) <= 0.05,
  );
  if (clearExplicit?.length)
    return { ...spot, walkingApproaches: clearExplicit };
  if (explicit?.length) {
    const nearby: { point: CityPoint; distance: number }[] = [];
    for (const from of explicit)
      for (const dx of [-80, -40, 0, 40, 80])
        for (const dy of [-80, -40, 0, 40, 80]) {
          const point = { x: from.x + dx, y: from.y + dy },
            distance = Math.hypot(dx, dy);
          if (
            distance > 96 ||
            !interiorWalkable(point, scene) ||
            !interiorClearSegment(from, point, scene) ||
            interiorStandingOcclusion(point, scene) > 0.05
          )
            continue;
          nearby.push({ point, distance });
        }
    const closest = Math.min(...nearby.map((p) => p.distance));
    if (nearby.length)
      return {
        ...spot,
        walkingApproaches: nearby
          .filter((p) => p.distance <= closest + 12)
          .map((p) => p.point),
      };
  }
  const owner = spot.object
    ? scene.furniture.find((f) => f.id === spot.object)
    : scene.furniture
        .map((f) => ({
          f,
          distance: Math.min(
            ...(f.silhouettes ?? (f.silhouette ? [f.silhouette] : [])).map(
              (poly) => shapeGap(spot.target!, poly),
            ),
          ),
        }))
        .filter((v) => v.distance <= 32)
        .sort((a, b) => a.distance - b.distance)[0]?.f;
  if (!owner) {
    const anchor = {
      x: spot.target.x,
      y: Math.min(
        scene.floor.frontY - 24,
        Math.max(scene.floor.backY + 48, spot.target.y + 40),
      ),
    };
    const candidates: { point: CityPoint; distance: number }[] = [];
    for (let y = 20; y <= 640; y += 20)
      for (let x = 20; x <= 980; x += 20) {
        const point = { x, y },
          distance = gap(interiorProject(point, scene.floor), anchor);
        if (distance <= 300 && interiorWalkable(point, scene))
          candidates.push({ point, distance });
      }
    const clear = candidates.filter(
      (c) => interiorStandingOcclusion(c.point, scene) <= 0.05,
    );
    const sorted = (clear.length ? clear : candidates).sort(
      (a, b) => a.distance - b.distance,
    );
    const reachable = sorted.findIndex(
      (c) =>
        interiorClearSegment(spot.point, c.point, scene) ||
        interiorRoute(spot.point, c.point, scene),
    );
    const approaches: CityPoint[] = [];
    for (const c of reachable < 0 ? [] : sorted.slice(reachable)) {
      if (approaches.every((p) => gap(p, c.point) >= 30))
        approaches.push(c.point);
      if (approaches.length === 6) break;
    }
    const window =
      /窗|庭院/.test(spot.label) && !spot.hitbox
        ? {
            hitbox: {
              x: spot.target.x - 80,
              y: spot.target.y - 110,
              width: 160,
              height: 220,
            },
          }
        : {};
    return approaches.length
      ? {
          ...spot,
          ...window,
          approaches: [...(explicit ?? []), ...approaches],
          walkingApproaches: approaches,
        }
      : spot;
  }
  const solids = furnitureSolids(owner);
  const selected = [...solids].sort(
    (a, b) =>
      shapeGap(
        spot.target!,
        a.map((p) => interiorProject(p, scene.floor)),
      ) -
      shapeGap(
        spot.target!,
        b.map((p) => interiorProject(p, scene.floor)),
      ),
  )[0];
  const without: CityInteriorScene = {
    ...scene,
    furniture: scene.furniture.flatMap((f) =>
      f !== owner
        ? furnitureSolids(f).every((poly) =>
            poly.every((p) => shapeGap(p, selected) < 1e-5),
          )
          ? []
          : [f]
        : solids
            .filter((p) => p !== selected)
            .map((p, i) => ({
              ...owner,
              id: `${owner.id}:other:${i}`,
              collision: p,
              collisions: undefined,
            })),
    ),
  };
  const area = selected.reduce(
    (n, p, i) =>
      n +
      p.x * selected[(i + 1) % selected.length].y -
      selected[(i + 1) % selected.length].x * p.y,
    0,
  );
  const approaches: CityPoint[] = [];
  const physicalApproaches: CityPoint[] = [];
  for (let i = 0; i < selected.length; i++) {
    const a = selected[i],
      b = selected[(i + 1) % selected.length],
      length = gap(a, b);
    if (length < 1e-6) continue;
    const sign = area >= 0 ? 1 : -1,
      nx = (sign * (b.y - a.y)) / length,
      ny = (sign * (a.x - b.x)) / length;
    const count = Math.max(1, Math.ceil(length / 24));
    for (let j = 0; j <= count; j++) {
      const edge = {
        x: a.x + ((b.x - a.x) * j) / count,
        y: a.y + ((b.y - a.y) * j) / count,
      };
      for (const offset of [INTERIOR_PLAYER_RADIUS + 10, 54, 84]) {
        const p = { x: edge.x + nx * offset, y: edge.y + ny * offset };
        if (
          interiorWalkable(p, scene) &&
          interiorClearSegment(p, edge, without) &&
          !approaches.some((q) => gap(p, q) < 5)
        ) {
          approaches.push(p);
          if (offset === INTERIOR_PLAYER_RADIUS + 10)
            physicalApproaches.push(p);
        }
      }
    }
  }
  const anchor = {
    x: spot.target.x,
    y: Math.max(scene.floor.backY + 35, spot.target.y + 120),
  };
  const clear = approaches.filter(
    (p) => interiorStandingOcclusion(p, scene) <= 0.05,
  );
  const destinations = clear.length ? clear : approaches;
  const accessible = [...destinations]
    .sort(
      (a, b) =>
        gap(interiorProject(a, scene.floor), anchor) -
        gap(interiorProject(b, scene.floor), anchor),
    )
    .find(
      (p) =>
        interiorClearSegment(spot.point, p, scene) ||
        interiorRoute(spot.point, p, scene),
    );
  const closestColumn = accessible
    ? gap(interiorProject(accessible, scene.floor), anchor)
    : -Infinity;
  const local = destinations.filter(
    (p) => gap(interiorProject(p, scene.floor), anchor) <= closestColumn + 80,
  );
  const physicalDistance = Math.min(
    ...physicalApproaches.map((p) =>
      gap(interiorProject(p, scene.floor), anchor),
    ),
  );
  const physical = physicalApproaches.filter(
    (p) =>
      gap(interiorProject(p, scene.floor), anchor) <= physicalDistance + 80,
  );
  return local.length
    ? {
        ...spot,
        object: owner.id,
        approaches: explicit ?? physical,
        walkingApproaches: local,
      }
    : spot;
}

export function interiorSpotDistance(
  point: CityPoint,
  spot: InteriorSpot,
  scene: CityInteriorScene,
) {
  let best = Infinity;
  for (const p of [
    ...(spot.approaches ?? [spot.point]),
    ...(spot.walkingApproaches ?? []),
  ]) {
    const d = gap(point, p);
    if (d < best && d <= 64 && interiorClearSegment(point, p, scene)) best = d;
  }
  return best;
}

export function interiorPhysicalSpotDistance(
  point: CityPoint,
  spot: InteriorSpot,
  scene: CityInteriorScene,
) {
  return interiorSpotDistance(
    point,
    { ...spot, walkingApproaches: undefined },
    scene,
  );
}

/** A distant click goes to the shortest reachable side, rather than a fixed seat approach. */
export function interiorSpotRoute(
  from: CityPoint,
  spot: InteriorSpot,
  scene: CityInteriorScene,
  occupied: readonly CityPoint[] = [],
): CityPoint[] | null {
  let best: CityPoint[] | null = null,
    cost = Infinity;
  const candidates = [
    ...(spot.walkingApproaches ?? spot.approaches ?? [spot.point]),
  ].sort((a, b) => gap(from, a) - gap(from, b));
  for (const p of candidates) {
    if (gap(from, p) >= cost) break;
    const path = interiorRoute(from, p, scene, occupied);
    if (!path) continue;
    let length = 0,
      previous = from;
    for (const q of path) {
      length += gap(previous, q);
      previous = q;
    }
    if (length < cost) {
      best = path;
      cost = length;
    }
  }
  return best;
}

/** Visible furniture and authored wall objects are clickable, including above the floor. */
export function interiorHitSpot(paint: CityPoint, scene: CityInteriorScene) {
  return (
    [...scene.spots]
      .filter((s) => {
        if (
          s.hitbox &&
          paint.x >= s.hitbox.x &&
          paint.x <= s.hitbox.x + s.hitbox.width &&
          paint.y >= s.hitbox.y &&
          paint.y <= s.hitbox.y + s.hitbox.height
        )
          return true;
        if (s.target && gap(paint, s.target) <= 45) return true;
        const f = s.object && scene.furniture.find((f) => f.id === s.object);
        return (
          f &&
          (f.silhouettes ?? (f.silhouette ? [f.silhouette] : [])).some((poly) =>
            insideInteriorShape(paint, poly),
          )
        );
      })
      .sort(
        (a, b) =>
          gap(paint, a.target ?? interiorProject(a.point, scene.floor)) -
          gap(paint, b.target ?? interiorProject(b.point, scene.floor)),
      )[0] ?? null
  );
}

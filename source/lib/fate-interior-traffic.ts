import type { CityPoint } from './fate-city-layout';
import type { CityInteriorScene } from './fate-city-interior-scenes';
import {
  interiorClearSegment,
  interiorRoute,
  interiorWalkable,
} from './fate-city-interior-navigation';

const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Walk sideways out of a passage. Never teleport, enter furniture, or cross a person. */
export function interiorYieldRoute(
  body: CityPoint,
  from: CityPoint,
  toward: CityPoint,
  scene: CityInteriorScene,
  occupied: readonly CityPoint[],
) {
  const length = gap(from, toward);
  if (length < 0.001) return null;
  const dx = (toward.x - from.x) / length,
    dy = (toward.y - from.y) / length;
  const options: { path: CityPoint[]; cost: number }[] = [];
  for (const distance of [48, 72, 96])
    for (const side of [-1, 1]) {
      const point = {
        x: body.x - dy * distance * side,
        y: body.y + dx * distance * side,
      };
      if (
        !interiorWalkable(point, scene) ||
        occupied.some((p) => gap(p, point) < 36)
      )
        continue;
      const path = interiorRoute(body, point, scene, occupied);
      if (!path) continue;
      let cost = 0,
        start = body;
      for (const p of path) {
        cost += gap(start, p);
        start = p;
      }
      if (cost <= 140) options.push({ path, cost });
    }
  return options.sort((a, b) => a.cost - b.cost)[0]?.path ?? null;
}

/** The same swept check is used for movement and yielding, including long frames. */
export function advanceInteriorYield(
  from: CityPoint,
  path: readonly CityPoint[],
  distance: number,
  scene: CityInteriorScene,
  occupied: readonly CityPoint[],
) {
  let point = { ...from },
    remaining = Math.max(0, distance),
    travelled = 0;
  const route = [...path];
  while (remaining > 0 && route.length) {
    const next = route[0],
      length = gap(point, next);
    const amount = Math.min(length, remaining);
    const end =
      length < 0.001
        ? next
        : {
            x: point.x + ((next.x - point.x) * amount) / length,
            y: point.y + ((next.y - point.y) * amount) / length,
          };
    if (!interiorClearSegment(point, end, scene, occupied)) break;
    point = { ...end };
    travelled += amount;
    remaining -= amount;
    if (amount >= length) route.shift();
    else break;
  }
  return { point, path: route, travelled };
}

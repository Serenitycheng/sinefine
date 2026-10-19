import {
  LEGACY_DISTRICT_WALK_AREAS,
  wasWalkableInDistrict,
  type Point,
} from '../lib/street';
import {
  DISTRICT_HOMES,
  DISTRICT_PLACES,
  LEGACY_CITY_HOMES,
  LEGACY_CITY_PLACES,
} from '../lib/fate-district';

function previousCityPoint(point: Point): Point {
  const current = { ...DISTRICT_HOMES, ...DISTRICT_PLACES };
  const old = { ...LEGACY_CITY_HOMES, ...LEGACY_CITY_PLACES };
  const closest = Object.entries(current).sort(
    ([, a], [, b]) =>
      Math.hypot(a.x - point.x, a.y - point.y) -
      Math.hypot(b.x - point.x, b.y - point.y),
  )[0];
  if (Math.hypot(closest[1].x - point.x, closest[1].y - point.y) > 120)
    return point;
  const was = old[closest[0] as keyof typeof old];
  return {
    x: was.x + point.x - closest[1].x,
    y: was.y + point.y - closest[1].y,
  };
}

export function legacyDistrictPoint(point: Point): Point {
  point = previousCityPoint(point);
  const converted = {
    x: point.x < 1600 ? (point.x - 100) / 1.7 : (point.x - 340) / 1.7,
    y: point.y / 1.65,
  };
  if (wasWalkableInDistrict(converted)) return converted;
  return LEGACY_DISTRICT_WALK_AREAS.map((area) => ({
    x: Math.max(area.left, Math.min(area.right, converted.x)),
    y: Math.max(area.top, Math.min(area.bottom, converted.y)),
  })).sort(
    (a, b) =>
      Math.hypot(a.x - converted.x, a.y - converted.y) -
      Math.hypot(b.x - converted.x, b.y - converted.y),
  )[0];
}

export function legacyDistrictPositions<T extends object>(positions: T): T {
  return Object.fromEntries(
    Object.entries(positions).map(([id, point]) => [
      id,
      // Historical fixtures still contain the visitor, although new worlds do not spawn it.
      legacyDistrictPoint(
        (id === 'admin' && point === undefined
          ? { x: 1160, y: 840 }
          : point) as Point,
      ),
    ]),
  ) as T;
}

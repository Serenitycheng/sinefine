import {
  CITY_ART_SCENES,
  CITY_ART_SCENE_IDS,
  type CityArtScene,
} from './fate-city-art-scenes';
import { projectOnSegment, type CityPoint } from './fate-city-layout';

export type CityArtPortal = {
  id: string;
  a: CityArtScene;
  b: CityArtScene;
  point: CityPoint;
};
const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const onRoad = (p: CityPoint, scene: CityArtScene) => {
  const points = CITY_ART_SCENES[scene].points;
  return points
    .slice(1)
    .some((b, i) => gap(p, projectOnSegment(p, points[i], b)) < 1e-5);
};
/** Only real shared centerlines connect. Nearby houses, opposite riverbanks
 * and schematic label positions never create artificial shortcuts. */
export const CITY_ART_PORTALS: CityArtPortal[] = CITY_ART_SCENE_IDS.flatMap(
  (a, i) =>
    CITY_ART_SCENE_IDS.slice(i + 1).flatMap((b) => {
      const candidates = [
        ...CITY_ART_SCENES[a].points,
        ...CITY_ART_SCENES[b].points,
      ].filter((p) => onRoad(p, a) && onRoad(p, b));
      return candidates
        .filter((p, n) => !candidates.slice(0, n).some((q) => gap(p, q) < 1e-5))
        .map((point, n) => ({ id: `${a}:${b}:${n}`, a, b, point }));
    }),
);
export function cityArtExits(scene: CityArtScene) {
  return CITY_ART_PORTALS.filter((p) => p.a === scene || p.b === scene).map(
    (p) => ({ ...p, scene: p.a === scene ? p.b : p.a }),
  );
}
function roadDirections(scene: CityArtScene, point: CityPoint) {
  const points = CITY_ART_SCENES[scene].points;
  return points.slice(1).flatMap((b, i) => {
    const a = points[i];
    if (gap(projectOnSegment(point, a, b), point) > 1e-5) return [];
    return [a, b].flatMap((next) => {
      const x = next.x - point.x,
        y = next.y - point.y,
        n = Math.hypot(x, y);
      return n < 1e-5 ? [] : [{ x: x / n, y: y / n }];
    });
  });
}

/** Use the intended direction before the current painting clips movement.
 * An endpoint exit can join a perpendicular street; its inward tangent must
 * not trap someone walking back out of a private driveway. The caller checks
 * both registered floors at the unchanged position before switching views. */
export function cityArtCrossing(
  scene: CityArtScene,
  from: CityPoint,
  to: CityPoint,
  excluded: CityArtScene | null = null,
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;
  const current = CITY_ART_SCENES[scene];
  const alignment = (v: CityPoint) => (dx * v.x + dy * v.y) / length;
  let best: ReturnType<typeof cityArtExits>[number] | null = null,
    score = 0;
  for (const exit of cityArtExits(scene)) {
    const reach = Math.max(
      12,
      current.width / 2,
      CITY_ART_SCENES[exit.scene].width / 2,
    );
    if (exit.scene === excluded || gap(exit.point, from) > reach) continue;
    const inward = roadDirections(scene, exit.point);
    const ownAlignment = Math.max(...inward.map(alignment));
    const atEnd =
      gap(exit.point, current.points[0]) < 1e-5 ||
      gap(exit.point, current.points.at(-1)!) < 1e-5;
    const leavingEnd = atEnd && ownAlignment < -0.65;
    const nextAlignment = Math.max(
      ...roadDirections(exit.scene, exit.point).map(alignment),
    );
    // Passing a junction on the current road must not unexpectedly turn into
    // a neighboring painting just because its centerline happens to be close.
    if (
      !leavingEnd &&
      (nextAlignment < 0.82 || nextAlignment <= ownAlignment + 0.04)
    )
      continue;
    const priority =
      (leavingEnd ? Math.max(0.9, nextAlignment) : nextAlignment) -
      gap(exit.point, from) / (reach * 100);
    if (priority > score) {
      best = exit;
      score = priority;
    }
  }
  return best;
}

/** A perspective floor can compress two world tangents into one keyboard
 * sector. Compare the visible branches as a fallback, accepting the adjacent
 * diagonal sector while still preferring travel along the current street.
 * The selected tangent lets held input continue down the incoming real road. */
export function cityArtScreenCrossing(
  scene: CityArtScene,
  from: CityPoint,
  input: CityPoint,
  project: (point: CityPoint) => CityPoint,
  excluded: CityArtScene | null = null,
) {
  const length = Math.hypot(input.x, input.y);
  if (!Number.isFinite(length) || length < 1e-8) return null;
  const paint = project(from);
  const alignment = (vector: CityPoint) => {
    const next = project({
      x: from.x + vector.x * 0.25,
      y: from.y + vector.y * 0.25,
    });
    const dx = next.x - paint.x,
      dy = next.y - paint.y;
    const span = Math.hypot(dx, dy);
    return span > 1e-8 ? (input.x * dx + input.y * dy) / (length * span) : -1;
  };
  const current = CITY_ART_SCENES[scene];
  let best:
    | (ReturnType<typeof cityArtExits>[number] & { direction: CityPoint })
    | null = null;
  let score = 0;
  for (const exit of cityArtExits(scene)) {
    const reach = Math.max(
      12,
      current.width / 2,
      CITY_ART_SCENES[exit.scene].width / 2,
    );
    if (exit.scene === excluded || gap(exit.point, from) > reach) continue;
    const ownAlignment = Math.max(
      ...roadDirections(scene, exit.point).map(alignment),
    );
    const atEnd =
      gap(exit.point, current.points[0]) < 1e-5 ||
      gap(exit.point, current.points.at(-1)!) < 1e-5;
    const leavingEnd = atEnd && ownAlignment < -0.65;
    const next = roadDirections(exit.scene, exit.point).sort(
      (a, b) => alignment(b) - alignment(a),
    )[0];
    if (!next) continue;
    const nextAlignment = alignment(next);
    if (
      !leavingEnd &&
      (nextAlignment < 0.65 || nextAlignment <= ownAlignment + 0.002)
    )
      continue;
    const priority =
      (leavingEnd ? Math.max(0.9, nextAlignment) : nextAlignment) -
      gap(exit.point, from) / (reach * 100);
    if (priority > score) {
      best = { ...exit, direction: next };
      score = priority;
    }
  }
  return best;
}

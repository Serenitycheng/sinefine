import { OLD_BOOKSHOP_APPROACH } from './fate-city-art-scenes';
import { projectOnSegment, type CityPoint } from './fate-city-layout';

/** The already-painted bookshop alley, shared by the formal map and art preview. */
export const LOCAL_APPROACHES = [
  { id: 'old-bookshop', points: OLD_BOOKSHOP_APPROACH, width: 22 },
];
const segments = LOCAL_APPROACHES.flatMap((entry) =>
  entry.points
    .slice(1)
    .map((b, i) => ({ a: entry.points[i], b, radius: entry.width / 2 })),
);
const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const on = (p: CityPoint, s: (typeof segments)[number]) =>
  gap(p, projectOnSegment(p, s.a, s.b)) <= s.radius + 1e-7;
export function localApproachWalkable(p: CityPoint) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    segments.some((s) => on(p, s))
  );
}
export function shareLocalApproach(a: CityPoint, b: CityPoint) {
  return segments.some((s) => on(a, s) && on(b, s));
}
export function closestLocalApproach(p: CityPoint): CityPoint {
  return segments
    .map((s) => {
      const q = projectOnSegment(p, s.a, s.b),
        d = gap(p, q),
        t = d ? Math.min(1, s.radius / d) : 1;
      return { x: q.x + (p.x - q.x) * t, y: q.y + (p.y - q.y) * t };
    })
    .sort((a, b) => gap(p, a) - gap(p, b))[0];
}

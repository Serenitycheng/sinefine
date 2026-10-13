import { occupiedHome, lifeIndoors, type DailyLife } from './fate-life';
import {
  FORMAL_PUBLIC_SITES,
  formalEntrance,
  type FormalPublicSiteId,
} from './fate-formal-buildings';
import type { PartnerId } from './fate-cast';
import type { Point } from './street';

const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** A visit is grounded in the existing world, never inferred from an art cast. */
export function insidePublicBuilding(
  life: DailyLife,
  id: PartnerId,
  site: FormalPublicSiteId,
) {
  const activity = life.people[id].activity,
    point = life.positions[id];
  if (occupiedHome(life, id) || activity?.phase === 'going') return false;
  if (activity?.school)
    return (
      site === 'school' &&
      activity.phase === 'doing' &&
      gap(point, formalEntrance(site)) <= 75
    );
  if (lifeIndoors(life.people[id])) return false;
  const nearest = [...FORMAL_PUBLIC_SITES].sort(
    (a, b) => gap(point, formalEntrance(a)) - gap(point, formalEntrance(b)),
  )[0];
  return (
    nearest === site && gap(point, formalEntrance(site)) <= (activity ? 75 : 45)
  );
}
export function publicResidentRoom(
  life: DailyLife,
  id: PartnerId,
  site: FormalPublicSiteId,
) {
  const activity = life.people[id].activity;
  if (site === 'school') {
    if (activity?.routine?.includes('archery')) return 'archery';
    if (activity?.school)
      return id === 'taiga' || id === 'kuzuki' ? 'staffroom' : 'classroom';
    if (activity?.kind === 'read' || activity?.kind === 'study')
      return 'library';
  }
  if (site === 'cafe' && activity?.kind === 'read') return 'window';
  if (site === 'old-repair' && activity?.kind === 'repair') return 'annex';
  return 'hall';
}

import {
  isWalkable,
  nearestWalkable,
  pathTo,
  type Actor,
  type ActorId,
  type Point,
} from './street';
import { isPartner } from './fate-cast';
import type { DailyLife } from './fate-life';

export type StreetJourney = {
  actor: ActorId;
  destination: Point;
  label: string;
};
export type WalkPlan =
  | { status: 'walking'; path: Point[]; destination: Point }
  | { status: 'arrived' | 'unreachable' | 'off-road'; message: string };

/** Resolve the visible doorstep or public-place point before changing any state. */
export function resolveStreetTeleport(destination: Point): Point | null {
  if (![destination.x, destination.y].every(Number.isFinite)) return null;
  const point = nearestWalkable(destination);
  return isWalkable(point) ? { x: point.x, y: point.y } : null;
}

/** Relocate only the controlled actor; ongoing commitments keep their own rules. */
export function teleportStreetActor(
  life: DailyLife,
  actors: Actor[],
  controlled: ActorId | null,
  destination: Point,
) {
  const actor = actors.find((entry) => entry.id === controlled);
  if (
    !controlled ||
    !actor ||
    (life.indoor && life.indoor.actor !== controlled)
  )
    return { ok: false, message: '请先进入要传送的角色。' };
  const point = resolveStreetTeleport(destination);
  if (!point) return { ok: false, message: '这里暂时没有可到达的位置。' };
  Object.assign(actor, point, { path: [], phase: 0, frame: 0 });
  life.positions[controlled] = { ...point };
  if (isPartner(controlled)) life.people[controlled].activity = null;
  if (life.indoor?.actor === controlled) delete life.indoor;
  // Outings remain resumable and stop progressing when away from their place.
  // Teleporting does not settle an activity, skip time, or move a companion.
  return { ok: true, message: '已传送到目的地。' };
}

/** Ground clicks may snap to a nearby pavement edge, never to a distant street. */
export function planStreetWalk(
  from: Point,
  requested: Point,
  groundClick = false,
): WalkPlan {
  if (![from.x, from.y, requested.x, requested.y].every(Number.isFinite))
    return {
      status: 'unreachable',
      message: '这条路线暂时走不通，请重新选择路面。',
    };
  const destination = nearestWalkable(requested);
  if (
    groundClick &&
    Math.hypot(requested.x - destination.x, requested.y - destination.y) > 48
  )
    return {
      status: 'off-road',
      message: '这里不是可走的路面；进入住宅请选门前入口。',
    };
  if (Math.hypot(from.x - destination.x, from.y - destination.y) <= 2)
    return { status: 'arrived', message: '已经在这里了。' };
  const path = pathTo(from, destination);
  return path.length
    ? { status: 'walking', path, destination }
    : { status: 'unreachable', message: '当前位置没有通往这里的道路。' };
}

/** A cleared/replaced route must not report a successful arrival. */
export function streetJourneyStatus(
  journey: StreetJourney,
  actor: Actor,
  manual: Point,
) {
  if (journey.actor !== actor.id) return 'cancelled';
  if (manual.x || manual.y) return 'manual';
  const remaining = actor.path.at(-1);
  if (remaining)
    return Math.hypot(
      remaining.x - journey.destination.x,
      remaining.y - journey.destination.y,
    ) < 1
      ? 'walking'
      : 'cancelled';
  return Math.hypot(
    actor.x - journey.destination.x,
    actor.y - journey.destination.y,
  ) <= 2
    ? 'arrived'
    : 'cancelled';
}

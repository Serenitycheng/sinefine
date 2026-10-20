import type { DailyLife, LifeEvent } from './fate-life';
import type { PartnerId } from './fate-cast';
import type { Point } from './street';

/** Consume new events once, regardless of which scene currently owns the clock. */
export class LifeAutonomyEvents {
  private nextId = 0;
  reset(life: DailyLife) {
    this.nextId = life.nextId;
  }
  take(life: DailyLife) {
    const since = this.nextId;
    this.reset(life);
    const fresh = life.events.filter(
      (e) => e.id >= since && e.id < life.nextId,
    );
    const encounters = fresh.filter((e) => e.dialogue);
    const decisions = fresh.filter((e) => e.decision);
    const candidate: LifeEvent | undefined =
      encounters.find((e) => e.dialogue?.source === 'preset') ??
      decisions.filter((e) => e.decision?.source === 'rules')[
        life.encounters % (decisions.length || 1)
      ];
    return { encounters, candidate };
  }
}

/** Street coordinates cannot establish whether residents share a painted room. */
export function indoorEncounterAllowed(
  first: PartnerId,
  second: PartnerId,
  inside: (id: PartnerId) => boolean,
  bodies: readonly {
    id: PartnerId;
    room: string;
    point: Point;
    walking?: boolean;
    phase?: string;
  }[],
) {
  const aInside = inside(first),
    bInside = inside(second);
  if (!aInside && !bInside) return true;
  if (!aInside || !bInside) return false;
  const a = bodies.find((b) => b.id === first),
    b = bodies.find((b) => b.id === second);
  return Boolean(
    a &&
    b &&
    a.room === b.room &&
    !a.walking &&
    !b.walking &&
    (!a.phase || a.phase === 'doing') &&
    (!b.phase || b.phase === 'doing') &&
    Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) <= 105,
  );
}

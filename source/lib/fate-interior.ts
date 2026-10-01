import { STREET_PARTNERS, type PartnerId } from './fate-cast';
import { homeOf, type HomeId } from './fate-housing';
import {
  occupiedHome,
  lifeStatus,
  type DailyLife,
  type LifePerson,
} from './fate-life';
import type { ActorId, Point } from './street';
import { roomPoint } from './fate-indoor-layout';

export type InteriorZone = 'lounge' | 'table' | 'study' | 'rest';
export type InteriorResident = {
  id: PartnerId;
  presence: 'inside' | 'arriving' | 'away' | 'controlled';
  visitor: boolean;
  zone: InteriorZone;
  status: string;
};

/** Shared footpoints keep the drawn residents and proximity checks in agreement. */
export function interiorResidentPoint(
  life: DailyLife,
  home: HomeId,
  id: PartnerId,
  controlled: ActorId | null = null,
): Point | null {
  const residents = interiorResidents(life, home, controlled).filter(
    (person) => person.presence === 'inside',
  );
  const index = residents.findIndex((person) => person.id === id);
  if (index < 0) return null;
  const anchors = {
    lounge: { x: 238, y: 186 },
    table: { x: 620, y: 190 },
    study: { x: 240, y: 390 },
    rest: { x: 565, y: 395 },
  };
  const base = anchors[residents[index].zone];
  return roomPoint(home, residents[index].zone,
    { x: base.x + (index % 3) * 26 - 26, y: base.y });
}

export function interiorZone(activity: LifePerson['activity']): InteriorZone {
  if (activity?.kind === 'sleep' || activity?.kind === 'rest') return 'rest';
  if (activity?.kind === 'cook' || activity?.kind === 'eat') return 'table';
  if (activity?.kind === 'read' || activity?.kind === 'study') return 'study';
  return 'lounge';
}

/** A view of the existing simulation; belonging to a home never implies presence. */
export function interiorResidents(
  life: DailyLife,
  home: HomeId,
  controlled: ActorId | null = null,
): InteriorResident[] {
  return STREET_PARTNERS.flatMap((id) => {
    const person = life.people[id];
    const assigned = homeOf(id, life.housing) === home;
    const playerInside = life.indoor?.actor === id && life.indoor.home === home;
    const inside = id !== controlled && occupiedHome(life, id) === home;
    const arriving =
      id !== controlled &&
      person.activity?.phase === 'going' &&
      !person.activity.school &&
      person.activity.home === home;
    if (!assigned && !playerInside && !inside && !arriving) return [];
    return [
      {
        id,
        presence:
          id === controlled
            ? ('controlled' as const)
            : inside
              ? ('inside' as const)
              : arriving
                ? ('arriving' as const)
                : ('away' as const),
        visitor: !assigned,
        zone: interiorZone(person.activity),
        status:
          id === controlled
            ? life.indoor?.actor === id && life.indoor.home === home
              ? '由你控制 · 室内行走'
              : '由你接管 · 留在街道'
            : lifeStatus(person),
      },
    ];
  });
}

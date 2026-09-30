import { STREET_PARTNERS, type PartnerId } from './fate-cast';
import { homeOf, type HomeId } from './fate-housing';
import {
  occupiedHome,
  lifeStatus,
  type DailyLife,
  type LifePerson,
} from './fate-life';
import type { ActorId } from './street';

export type InteriorZone = 'lounge' | 'table' | 'study' | 'rest';
export type InteriorResident = {
  id: PartnerId;
  presence: 'inside' | 'arriving' | 'away' | 'controlled';
  visitor: boolean;
  zone: InteriorZone;
  status: string;
};

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

import { DISTRICT_PLACES } from './fate-district';
import { fatePerson, isPartner, type PartnerId } from './fate-cast';
import {
  finishInterest,
  shoppingChoice,
  type ItemEvent,
} from './fate-belongings';
import { canAfford } from './fate-economy';
import { lifeIndoors, type DailyLife, type LifeEvent } from './fate-life';
import { startPublicOuting } from './fate-public-outings';
import type { Actor, ActorId } from './street';

export type PublicPlaceId = keyof typeof DISTRICT_PLACES;
export type PublicVisitAction = NonNullable<LifeEvent['publicVisit']>['action'];
export const PUBLIC_VISIT_RADIUS = 75;
const WAIT_MINUTES = 10;
const ACTION_PLACE: Record<PublicVisitAction, PublicPlaceId> = {
  study: 'school',
  eat: 'cafe',
  shop: 'shops',
  walk: 'park',
  together: 'park',
};

export type PublicVisitResult = { ok: boolean; message: string };
const denied = (message: string): PublicVisitResult => ({ ok: false, message });
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const cap = (value: number) => Math.min(100, Math.max(0, value));

/** Check the live actors again on click; the map card's arrived label is advisory. */
export function visitPublicPlace(
  life: DailyLife,
  actors: Actor[],
  actorId: ActorId,
  placeId: PublicPlaceId,
  action: PublicVisitAction,
  target?: PartnerId,
): PublicVisitResult {
  if (!isPartner(actorId)) return denied('请先控制一位居民。');
  if (
    !Object.hasOwn(DISTRICT_PLACES, placeId) ||
    ACTION_PLACE[action] !== placeId
  )
    return denied('这里没有这项活动。');
  const actor = actors.find((candidate) => candidate.id === actorId);
  if (!actor || distance(actor, DISTRICT_PLACES[placeId]) > PUBLIC_VISIT_RADIUS)
    return denied('请先沿街走到地点附近。');
  if (lifeIndoors(life.people[actorId]))
    return denied('人物目前在室内，先回到街道。');
  // Old callers now open the same staged activity as the current location UI.
  // Arrival alone never awards a meal or creates a completed shared walk.
  if (action === 'eat') {
    if (target !== undefined) return denied('自己的点餐不需要选择同行的人。');
    return startPublicOuting(life, actors, actorId, 'cafe', {
      order: 'set-meal',
    });
  }
  if (action === 'walk') {
    if (target !== undefined) return denied('独自观察不需要选择同行的人。');
    return startPublicOuting(life, actors, actorId, 'river');
  }
  if (action === 'together') {
    if (!isPartner(target) || target === actorId)
      return denied('请选择身边的一位居民。');
    return startPublicOuting(life, actors, actorId, 'river', {
      companion: target,
    });
  }
  const last = life.events.findLast(
    (event) =>
      event.publicVisit?.person === actorId &&
      event.publicVisit.place === placeId &&
      event.publicVisit.action === action,
  );
  if (last && life.minutes - last.minute < WAIT_MINUTES)
    return denied('刚在这里活动过，过一会儿再来。');
  if (target !== undefined) return denied('这项活动不需要选择同行的人。');
  if (action === 'shop') {
    const item = shoppingChoice(life, actorId);
    if (!item) return denied('随身用品已经足够，暂时不用购买。');
    if (!canAfford(life.economy, actorId, item))
      return denied('生活点不够，暂时无法购买。');
  }

  const name = fatePerson(actorId, life.waverStage)!.name;
  let event: LifeEvent | undefined;
  const record = (text: string, item?: ItemEvent) => {
    event = {
      id: life.nextId++,
      waverStage: life.waverStage,
      minute: life.minutes,
      text,
      publicVisit: {
        person: actorId,
        place: placeId,
        action,
        ...(target === undefined ? {} : { target }),
      },
      ...(item ? { item } : {}),
    };
    life.events = [...life.events, event].slice(-80);
  };
  const person = life.people[actorId];
  if (action === 'study') {
    const supplies = life.belongings[actorId];
    if (supplies.paper > 0) {
      supplies.paper--;
      supplies.notes = Math.min(999999, supplies.notes + 1);
      record(`${name}在穗群原学园自习，用纸笔整理了一页笔记。`, {
        person: actorId,
        kind: 'noted',
        item: 'paper',
      });
    } else record(`${name}在穗群原学园自习，梳理了手头的思路。`);
    person.energy = cap(person.energy - 5);
    person.hunger = cap(person.hunger + 4);
  } else if (action === 'shop') {
    person.choices = Math.max(
      person.choices + 1,
      (life.economy.accounts[actorId].lastShopChoice ?? -1) + 1,
    );
    finishInterest(life, actorId, 'shop', record);
  }
  actor.path = [];
  return { ok: true, message: event!.text };
}

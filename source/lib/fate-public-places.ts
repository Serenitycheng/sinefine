import { DISTRICT_PLACES } from './fate-district';
import { fatePerson, isPartner, type PartnerId } from './fate-cast';
import {
  finishInterest,
  shoppingChoice,
  type ItemEvent,
} from './fate-belongings';
import { canAfford } from './fate-economy';
import { lifeIndoors, type DailyLife, type LifeEvent } from './fate-life';
import { rememberSharedWalk } from './fate-social';
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
  const last = life.events.findLast(
    (event) =>
      event.publicVisit?.person === actorId &&
      event.publicVisit.place === placeId &&
      event.publicVisit.action === action,
  );
  if (last && life.minutes - last.minute < WAIT_MINUTES)
    return denied('刚在这里活动过，过一会儿再来。');
  if (action !== 'together' && target !== undefined)
    return denied('这项活动不需要选择同行的人。');
  if (action === 'together') {
    if (!isPartner(target) || target === actorId)
      return denied('请选择身边的一位居民。');
    const companion = actors.find((candidate) => candidate.id === target);
    if (
      !companion ||
      distance(companion, actor) > PUBLIC_VISIT_RADIUS ||
      distance(companion, DISTRICT_PLACES.park) > PUBLIC_VISIT_RADIUS ||
      lifeIndoors(life.people[target]) ||
      life.people[target].activity?.kind === 'sleep'
    )
      return denied('对方目前不在公园附近。');
  }
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
  } else if (action === 'eat') {
    person.hunger = cap(person.hunger - 30);
    person.energy = cap(person.energy + 7);
    record(`${name}在街角咖啡店吃了一份简餐，稍作休息。`);
  } else if (action === 'shop') {
    person.choices = Math.max(
      person.choices + 1,
      (life.economy.accounts[actorId].lastShopChoice ?? -1) + 1,
    );
    finishInterest(life, actorId, 'shop', record);
  } else if (action === 'walk') {
    person.social = cap(person.social + 3);
    person.energy = cap(person.energy - 2);
    record(`${name}沿着河岸公园的林荫路走了一段，放慢脚步看了看未远川。`);
  } else {
    const companion = target!;
    const otherName = fatePerson(companion, life.waverStage)!.name;
    person.social = cap(person.social + 5);
    life.people[companion].social = cap(life.people[companion].social + 5);
    record(`${name}与${otherName}在河岸公园一起散步，留下了一段共同经历。`);
    rememberSharedWalk(life, actorId, companion, event!);
  }
  actor.path = [];
  return { ok: true, message: event!.text };
}

import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
  type WaverStage,
} from './fate-cast';
import { DISTRICT_PLACES } from './fate-district';
import { lifeIndoors, type DailyLife, type LifeEvent } from './fate-life';
import { knownPreferences } from './fate-memory-behavior';
import { dueDuty } from './fate-schedule';
import { currentPastime, livePastime } from './fate-pastimes';
import {
  currentAppointment,
  liveAppointment,
  rememberSharedWalk,
} from './fate-social';
import {
  nearestWalkable,
  pathTo,
  stepActor,
  type Actor,
  type Point,
} from './street';

export type PublicOutingKind = 'cafe' | 'river' | 'birds';
export type CafeOrder = 'set-meal' | 'vegetables' | 'tea';
export type OutingChoice = 'slow' | 'quick' | 'wait' | 'approach';
export type PublicOuting = {
  id: number;
  actor: PartnerId;
  companion?: PartnerId;
  stage: WaverStage | null;
  kind: PublicOutingKind;
  order?: CafeOrder;
  phase: 'ongoing' | 'choice' | 'ready';
  step: 0 | 1;
  progress: number;
  total: number;
  choice?: OutingChoice;
  createdAt: number;
  updatedAt: number;
};
export type PublicOutingResult = {
  id: number;
  actor: PartnerId;
  companion?: PartnerId;
  stage: WaverStage | null;
  place: 'cafe' | 'park';
  kind: PublicOutingKind;
  order?: CafeOrder;
  choices: OutingChoice[];
  createdAt: number;
  completedAt: number;
  eventId: number;
  summary: string;
};
export type PublicOutingsState = {
  active: PublicOuting[];
  completed: PublicOutingResult[];
  cooldowns: Partial<
    Record<PartnerId, { cafeUntil?: number; parkRewardDay?: number }>
  >;
};
export type PublicOutingActionResult = { ok: boolean; message: string };
export const PUBLIC_OUTING_RADIUS = 75;
export const PUBLIC_OBSERVATION_RADIUS = 32;
const MAX_HISTORY = STREET_PARTNERS.length * 4;
const ORDERS: Record<CafeOrder, string> = {
  'set-meal': '饭团定食',
  vegetables: '时蔬配餐',
  tea: '热茶歇脚',
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const cap = (n: number) => Math.min(100, Math.max(0, n));
const no = (message: string): PublicOutingActionResult => ({
  ok: false,
  message,
});
const yes = (message: string): PublicOutingActionResult => ({
  ok: true,
  message,
});
const currentStage = (life: DailyLife, outing: { stage: WaverStage | null }) =>
  outing.stage === null || outing.stage === life.waverStage;
const personName = (life: DailyLife, id: PartnerId) =>
  fatePerson(id, life.waverStage)!.name;

export function createPublicOutings(): PublicOutingsState {
  return { active: [], completed: [], cooldowns: {} };
}
export function currentPublicOuting(life: DailyLife, actor: string | null) {
  return life.publicOutings.active.find(
    (o) => o.actor === actor && currentStage(life, o),
  );
}
export function publicOutingTitle(
  outing: Pick<PublicOuting, 'kind' | 'order'>,
) {
  return outing.kind === 'cafe'
    ? ORDERS[outing.order ?? 'set-meal']
    : outing.kind === 'river'
      ? '沿河听风'
      : '寻找河岸的小鸟';
}
/** Both routes stay on the existing continuous, collision-checked riverside pavement. */
export function publicOutingPoint(
  outing: Pick<PublicOuting, 'kind' | 'step'>,
): Point {
  if (outing.kind === 'cafe') return nearestWalkable(DISTRICT_PLACES.cafe);
  const points =
    outing.kind === 'river'
      ? [
          { x: 1868, y: 1005 },
          { x: 1875, y: 1125 },
        ]
      : [
          { x: 1865, y: 807 },
          { x: 1845, y: 685 },
        ];
  return nearestWalkable(points[outing.step]);
}
export function publicOutingChoices(
  outing: PublicOuting,
): { id: OutingChoice; label: string }[] {
  if (outing.phase !== 'choice') return [];
  return outing.kind === 'cafe'
    ? [
        { id: 'slow', label: '安静地慢慢吃喝' },
        { id: 'quick', label: '用完这份，继续赶路' },
      ]
    : outing.kind === 'birds'
      ? [
          { id: 'wait', label: '沿树荫轻走，留一点距离' },
          { id: 'approach', label: '靠近看看刚才的动静' },
        ]
      : [
          { id: 'wait', label: '沿安静的步道，留心声音' },
          { id: 'approach', label: '走近护栏，看看水面的光' },
        ];
}
export function publicOutingInstructions(
  life: DailyLife,
  outing: PublicOuting,
): string {
  if (outing.kind === 'cafe') {
    if (outing.phase === 'choice')
      return '点的东西已经送来。接下来想慢慢歇一会儿，还是用完后继续赶路？';
    if (outing.phase === 'ready')
      return '这份已经用完。留在咖啡店，收起餐具，记下这次小歇。';
    const preferences = knownPreferences(life, outing.actor)
      .filter((p) => /饭|餐|蔬菜|时蔬|茶/.test(p.subject))
      .slice(0, 2);
    const note = preferences.length
      ? ` 你曾明确说过${preferences.map((p) => `${p.preference === 'like' ? '喜欢' : '不喜欢'}${p.subject}`).join('、')}。`
      : '';
    return `留在咖啡店，开启日常：已度过 ${Math.floor(outing.progress)} / ${outing.total} 分钟。${outing.order === 'tea' ? '热茶能歇脚，不能代替一顿饭。' : ''}${note}`;
  }
  if (outing.phase === 'choice')
    return outing.kind === 'birds'
      ? '树荫里传来短促的鸟鸣，灌木下的叶片动了一下。选一条接近方式，再去第二处观察点。'
      : '风掠过护栏，河水声时近时远。选一个想留意的方向，再走到第二处观察点。';
  if (outing.phase === 'ready')
    return outing.step === 0
      ? '在第一处停下观察了一会儿。看看现场的线索，再决定往哪边留意。'
      : '已经走到第二处，也停下看清了眼前的景象。可以记下这次发现。';
  return `沿标记走到第 ${outing.step + 1} / 2 处观察点，开启日常停留一分钟${outing.companion ? `；等${personName(life, outing.companion)}一起到场` : ''}。${outing.step === 0 ? '靠近后观察现场线索。' : '这次的选择会影响你留意到的景象。'}`;
}

function record(life: DailyLife, text: string): LifeEvent {
  const event: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    waverStage: life.waverStage,
    text,
  };
  life.events = [...life.events, event].slice(-80);
  return event;
}
function outdoor(life: DailyLife, id: PartnerId) {
  return life.indoor?.actor !== id && !lifeIndoors(life.people[id]);
}
function otherCommitment(life: DailyLife, id: PartnerId) {
  return (
    (life.pastimes ?? []).some(
      (p) =>
        currentPastime(life, p) &&
        livePastime(p) &&
        [p.host, p.target].includes(id),
    ) ||
    life.appointments.some(
      (a) =>
        currentAppointment(life, a) &&
        liveAppointment(a) &&
        [a.a, a.b].includes(id) &&
        a.start - life.minutes <= 30,
    )
  );
}
function companionUnavailable(life: DailyLife, id: PartnerId) {
  const person = life.people[id];
  return (
    !outdoor(life, id) ||
    dueDuty(life, id) !== undefined ||
    person.hunger >= 85 ||
    person.energy <= 15 ||
    otherCommitment(life, id) ||
    !!(
      person.activity &&
      (person.activity.routine ||
        person.activity.meeting !== undefined ||
        person.activity.meal ||
        !['walk', 'rest'].includes(person.activity.kind))
    )
  );
}
function participant(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
) {
  if (!isPartner(controlled)) return undefined;
  if (!outdoor(life, controlled)) return undefined;
  return actors.find((a) => a.id === controlled);
}
function atPoint(life: DailyLife, actors: Actor[], outing: PublicOuting) {
  const actor = actors.find((a) => a.id === outing.actor);
  const point = publicOutingPoint(outing);
  const radius =
    outing.kind === 'cafe' ? PUBLIC_OUTING_RADIUS : PUBLIC_OBSERVATION_RADIUS;
  if (!actor || !outdoor(life, outing.actor) || distance(actor, point) > radius)
    return false;
  if (!outing.companion) return true;
  const companion = actors.find((a) => a.id === outing.companion);
  return (
    !!companion &&
    !companionUnavailable(life, outing.companion) &&
    distance(companion, point) <= PUBLIC_OBSERVATION_RADIUS + 18
  );
}
function releaseCompanion(
  life: DailyLife,
  actors: Actor[] | undefined,
  outing: PublicOuting,
) {
  if (!outing.companion) return;
  // If an interrupted companion has resumed a real duty, it no longer belongs
  // to this outing. Never cancel that newer activity or its route.
  if (life.people[outing.companion].activity) return;
  const actor = actors?.find((a) => a.id === outing.companion);
  if (actor) {
    actor.path = [];
    actor.frame = 0;
  }
}
function stop(
  life: DailyLife,
  outing: PublicOuting,
  message: string,
  actors?: Actor[],
) {
  life.publicOutings.active = life.publicOutings.active.filter(
    (o) => o.id !== outing.id,
  );
  releaseCompanion(life, actors, outing);
  record(
    life,
    `${personName(life, outing.actor)}的「${publicOutingTitle(outing)}」暂时收起：${message}。没有记成完成的经历。`,
  );
  return yes(message);
}
export function startPublicOuting(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  kind: PublicOutingKind,
  options: { order?: CafeOrder; companion?: PartnerId } = {},
): PublicOutingActionResult {
  if (!isPartner(controlled)) return no('先进入一位居民，再选择想做的活动。');
  if (!['cafe', 'river', 'birds'].includes(kind)) return no('没有这项活动。');
  const actor = participant(life, actors, controlled);
  if (!actor) return no('请先回到街道，人物实际到场后再开始。');
  const place = kind === 'cafe' ? DISTRICT_PLACES.cafe : DISTRICT_PLACES.park;
  if (distance(actor, place) > PUBLIC_OUTING_RADIUS)
    return no('先沿街走到地点附近，再开始。');
  if (
    life.publicOutings.active.some((o) =>
      [o.actor, o.companion].includes(controlled),
    ) ||
    otherCommitment(life, controlled)
  )
    return no('先完成或收起眼前的活动与约定，再安排这一件事。');
  const cooldown = life.publicOutings.cooldowns[controlled];
  if (kind === 'cafe' && (cooldown?.cafeUntil ?? 0) > life.minutes)
    return no('刚用完这一份，过一会儿再点餐；可以先沿街看看。');
  if (
    kind !== 'cafe' &&
    cooldown?.parkRewardDay === Math.floor(life.minutes / 1440)
  )
    return no('今天的河岸发现已经记下了，明天再来看看变化；现在仍可自由散步。');
  const order = kind === 'cafe' ? (options.order ?? 'set-meal') : undefined;
  if (order !== undefined && !Object.hasOwn(ORDERS, order))
    return no('请选择菜单上的餐食。');
  if (kind !== 'cafe' && options.order !== undefined)
    return no('这条路线不需要点餐。');
  const companion = options.companion;
  if (companion !== undefined) {
    if (kind === 'cafe')
      return no('这里先点自己的一份；一起吃饭可从日常手账发出邀约。');
    if (!isPartner(companion) || companion === controlled)
      return no('请选择另一位在场的居民。');
    const other = actors.find((a) => a.id === companion);
    if (
      !other ||
      distance(other, place) > PUBLIC_OUTING_RADIUS ||
      distance(actor, other) > PUBLIC_OUTING_RADIUS ||
      companionUnavailable(life, companion)
    )
      return no('对方现在没空，或还没在公园附近。等他空闲并实际到场后再邀请。');
    if (
      life.publicOutings.active.some((o) =>
        [o.actor, o.companion].includes(companion),
      )
    )
      return no('对方已经有一段同行安排。');
    if (
      life.publicOutings.cooldowns[companion]?.parkRewardDay ===
      Math.floor(life.minutes / 1440)
    )
      return no('对方今天已经看过这段河岸，明天再一起找新的发现吧。');
  }
  if (order === 'vegetables' && life.belongings[controlled].groceries < 1)
    return no('还没有时蔬；可以改选免费定食或先去商店。');
  if (
    kind !== 'cafe' &&
    (life.people[controlled].energy <= 10 ||
      life.people[controlled].hunger >= 95)
  )
    return no('先吃点东西或休息，照顾好身体再沿河观察。');
  const event = record(
    life,
    `${personName(life, controlled)}${companion ? `邀请${personName(life, companion)}一起` : ''}开始「${kind === 'cafe' ? ORDERS[order!] : kind === 'river' ? '沿河听风' : '寻找河岸的小鸟'}」，还没有完成。`,
  );
  const outing: PublicOuting = {
    id: event.id,
    actor: controlled,
    ...(companion ? { companion } : {}),
    stage: [controlled, companion].includes('waver') ? life.waverStage : null,
    kind,
    ...(order ? { order } : {}),
    phase: 'ongoing',
    step: 0,
    progress: 0,
    total: kind === 'cafe' ? 8 : 1,
    createdAt: life.minutes,
    updatedAt: life.minutes,
  };
  if (order === 'vegetables') life.belongings[controlled].groceries--;
  actor.path = [];
  if (companion) {
    life.people[companion].activity = null;
    actors.find((a) => a.id === companion)!.path = pathTo(
      actors.find((a) => a.id === companion)!,
      publicOutingPoint(outing),
    );
  }
  life.publicOutings.active.push(outing);
  return yes(publicOutingInstructions(life, outing));
}
export function choosePublicOuting(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  choice: OutingChoice,
) {
  const outing = currentPublicOuting(life, controlled);
  if (!outing || outing.phase !== 'choice')
    return no('先完成眼前这一步，再作选择。');
  if (!participant(life, actors, controlled) || !atPoint(life, actors, outing))
    return no('先回到当前观察点，同行的人也要实际在场。');
  if (!publicOutingChoices(outing).some((item) => item.id === choice))
    return no('这一步没有这个选项。');
  outing.choice = choice;
  outing.phase = 'ongoing';
  outing.updatedAt = life.minutes;
  if (outing.kind === 'cafe')
    outing.total = choice === 'slow' ? (outing.order === 'tea' ? 8 : 10) : 6;
  else {
    outing.step = 1;
    outing.progress = 0;
    if (outing.companion) {
      const other = actors.find((a) => a.id === outing.companion)!;
      other.path = pathTo(other, publicOutingPoint(outing));
    }
  }
  return yes(publicOutingInstructions(life, outing));
}
function resultText(life: DailyLife, outing: PublicOuting) {
  const name = personName(life, outing.actor);
  if (outing.kind === 'cafe') {
    const pacing =
      outing.choice === 'slow'
        ? '慢慢用完，收起餐具时呼吸也放缓了'
        : '用完后收好餐具，准备继续今天的安排';
    return `${name}在街角咖啡店${outing.order === 'tea' ? '喝完热茶，歇了歇脚；这不算一顿饭' : `吃完${ORDERS[outing.order!]}`}，${pacing}。`;
  }
  const pair = outing.companion
    ? `${name}与${personName(life, outing.companion)}`
    : name;
  const variant =
    (Math.floor(outing.createdAt / 1440) +
      STREET_PARTNERS.indexOf(outing.actor)) %
    3;
  const discovery =
    outing.kind === 'river'
      ? outing.choice === 'wait'
        ? [
            '在第二处听清了水声与树叶摩擦的轻响',
            '分辨出护栏边的风声和桥下的回声',
            '听见河水贴着岸边缓慢拍打',
          ][variant]
        : [
            '沿护栏看到日光在水面织成细碎的纹路',
            '看清一道桥影在水波里慢慢拉长',
            '留意到落叶顺着缓流拐过了岸边',
          ][variant]
      : outing.choice === 'wait'
        ? [
            '隔着树荫看见一只小鸟停在枝头梳理羽毛',
            '安静等到两只小鸟从灌木里跳到低枝',
            '留出距离，看见小鸟叼起一根细草',
          ][variant]
        : [
            '靠近时小鸟已经飞起，只看见穿过枝叶的掠影',
            '走近后鸟鸣停了，留意到枝头仍在轻晃',
            '只来得及看到一只小鸟越过护栏飞远',
          ][variant];
  return `${pair}走过两处河岸观察点，${discovery}。${outing.companion ? '两人共同看见的这段经历已记下。' : '这段小发现记进了自己的手账。'}`;
}
export function interactPublicOuting(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
) {
  const outing = currentPublicOuting(life, controlled);
  if (!outing) return no('目前没有正在进行的到场活动。');
  if (outing.phase !== 'ready')
    return no(publicOutingInstructions(life, outing));
  if (!participant(life, actors, controlled) || !atPoint(life, actors, outing))
    return no('回到观察点，等同行的人也到场后再记下发现。');
  if (outing.kind !== 'cafe' && outing.step === 0) {
    outing.phase = 'choice';
    outing.updatedAt = life.minutes;
    return yes(publicOutingInstructions(life, outing));
  }
  if (!outing.choice) return no('还有一项现场选择没有完成。');
  const summary = resultText(life, outing);
  const event = record(life, summary);
  event.publicVisit = {
    person: outing.actor,
    place: outing.kind === 'cafe' ? 'cafe' : 'park',
    action:
      outing.kind === 'cafe' ? 'eat' : outing.companion ? 'together' : 'walk',
    ...(outing.companion ? { target: outing.companion } : {}),
  };
  const result: PublicOutingResult = {
    id: outing.id,
    actor: outing.actor,
    ...(outing.companion ? { companion: outing.companion } : {}),
    stage: outing.stage,
    place: outing.kind === 'cafe' ? 'cafe' : 'park',
    kind: outing.kind,
    ...(outing.order ? { order: outing.order } : {}),
    choices: [outing.choice],
    createdAt: outing.createdAt,
    completedAt: life.minutes,
    eventId: event.id,
    summary,
  };
  life.publicOutings.active = life.publicOutings.active.filter(
    (o) => o.id !== outing.id,
  );
  life.publicOutings.completed = [
    ...life.publicOutings.completed,
    result,
  ].slice(-MAX_HISTORY);
  const person = life.people[outing.actor];
  const cooldown = (life.publicOutings.cooldowns[outing.actor] ??= {});
  if (outing.kind === 'cafe') {
    person.hunger = cap(
      person.hunger -
        (outing.order === 'tea' ? 0 : outing.order === 'vegetables' ? 34 : 30),
    );
    person.energy = cap(
      person.energy +
        (outing.order === 'tea' ? 10 : 5) +
        (outing.choice === 'slow' ? 4 : 0),
    );
    cooldown.cafeUntil = life.minutes + 45;
  } else {
    person.energy = cap(person.energy - 2);
    cooldown.parkRewardDay = Math.floor(life.minutes / 1440);
    if (outing.companion) {
      (life.publicOutings.cooldowns[outing.companion] ??= {}).parkRewardDay =
        cooldown.parkRewardDay;
      rememberSharedWalk(life, outing.actor, outing.companion, event);
    }
  }
  releaseCompanion(life, actors, outing);
  return yes(summary);
}
export function cancelPublicOuting(
  life: DailyLife,
  controlled: string | null,
  actors?: Actor[],
) {
  const outing = currentPublicOuting(life, controlled);
  if (!outing) return no('目前没有要收起的活动。');
  return stop(
    life,
    outing,
    outing.order === 'vegetables'
      ? '这次先放下，已用于配餐的时蔬不退回'
      : '这次先放下，之后再安排',
    actors,
  );
}
/** Called only while local game time actually advances; no background completion. */
export function advancePublicOutings(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  deltaGameMinutes: number,
  motionSeconds = deltaGameMinutes / 2,
) {
  if (
    !Number.isFinite(deltaGameMinutes) ||
    deltaGameMinutes <= 0 ||
    deltaGameMinutes > 30
  )
    return;
  for (const outing of life.publicOutings.active) {
    if (!currentStage(life, outing)) {
      stop(life, outing, '人物时期已切换', actors);
      continue;
    }
    if (
      life.minutes - outing.updatedAt > 60 ||
      life.minutes - outing.createdAt > 180
    ) {
      stop(life, outing, '离开或停留太久，这次先收起', actors);
      continue;
    }
    if (outing.companion && companionUnavailable(life, outing.companion)) {
      stop(life, outing, '同行的人需要处理作息或身体状态', actors);
      continue;
    }
    const actor = participant(life, actors, controlled);
    if (!actor || controlled !== outing.actor) continue;
    if (outing.kind !== 'cafe') {
      if (distance(actor, DISTRICT_PLACES.park) > 330) continue;
      if (
        life.people[outing.actor].hunger >= 95 ||
        life.people[outing.actor].energy <= 10
      ) {
        stop(life, outing, '先照顾身体，再来观察河岸', actors);
        continue;
      }
      if (outing.companion) {
        const other = actors.find((a) => a.id === outing.companion);
        if (!other || distance(actor, other) > 190) continue;
        const target = publicOutingPoint(outing);
        if (outing.phase === 'ongoing' && distance(other, target) > 18) {
          if (!other.path.length) other.path = pathTo(other, target);
          let seconds = Number.isFinite(motionSeconds)
            ? Math.min(15, Math.max(0, motionSeconds))
            : 0;
          while (seconds > 0) {
            const dt = Math.min(0.05, seconds);
            stepActor(other, dt, undefined, 55);
            seconds -= dt;
          }
        } else other.frame = 0;
      }
    }
    if (!atPoint(life, actors, outing)) continue;
    outing.updatedAt = life.minutes;
    if (outing.phase !== 'ongoing') continue;
    const threshold =
      outing.kind === 'cafe' && !outing.choice ? 3 : outing.total;
    outing.progress = Math.min(threshold, outing.progress + deltaGameMinutes);
    if (outing.progress >= threshold)
      outing.phase =
        outing.kind === 'cafe' && !outing.choice ? 'choice' : 'ready';
  }
}
export function publicOutingHolds(
  life: DailyLife,
  id: PartnerId,
  controlled: string | null,
  actors: Actor[],
) {
  return life.publicOutings.active.some((o) => {
    if (
      o.companion !== id ||
      o.actor !== controlled ||
      !currentStage(life, o) ||
      companionUnavailable(life, id)
    )
      return false;
    const actor = participant(life, actors, controlled),
      other = actors.find((a) => a.id === id);
    return (
      !!actor &&
      !!other &&
      distance(actor, DISTRICT_PLACES.park) <= 330 &&
      distance(actor, other) <= 190
    );
  });
}

function invalid(): never {
  throw new Error('到场活动存档无效');
}
const finite = (value: unknown, max: number) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= max;
function validPeople(
  value: { actor: PartnerId; companion?: PartnerId; stage: WaverStage | null },
  life: DailyLife,
) {
  if (
    !isPartner(value.actor) ||
    (value.companion !== undefined &&
      (!isPartner(value.companion) || value.companion === value.actor)) ||
    (value.stage !== null &&
      value.stage !== 'young' &&
      value.stage !== 'adult') ||
    ([value.actor, value.companion].includes('waver')
      ? value.stage === null
      : value.stage !== null)
  )
    invalid();
  if (!life.people[value.actor]) invalid();
}
function validKind(value: {
  kind: PublicOutingKind;
  order?: CafeOrder;
  companion?: PartnerId;
}) {
  if (
    !['cafe', 'river', 'birds'].includes(value.kind) ||
    (value.kind === 'cafe'
      ? !value.order ||
        !Object.hasOwn(ORDERS, value.order) ||
        value.companion !== undefined
      : value.order !== undefined)
  )
    invalid();
}
const validChoice = (kind: PublicOutingKind, value: unknown) =>
  (kind === 'cafe' ? ['slow', 'quick'] : ['wait', 'approach']).includes(
    value as string,
  );
export function parsePublicOutings(
  value: unknown,
  life: DailyLife,
): PublicOutingsState {
  if (value === undefined) return createPublicOutings();
  if (!value || typeof value !== 'object') invalid();
  const state = value as PublicOutingsState;
  if (
    !Array.isArray(state.active) ||
    state.active.length > STREET_PARTNERS.length ||
    !Array.isArray(state.completed) ||
    state.completed.length > MAX_HISTORY ||
    !state.cooldowns ||
    typeof state.cooldowns !== 'object' ||
    Array.isArray(state.cooldowns)
  )
    invalid();
  const ids = new Set<number>(),
    busy = new Set<PartnerId>();
  const id = (n: number) => {
    if (!Number.isSafeInteger(n) || n < 1 || n >= life.nextId || ids.has(n))
      invalid();
    ids.add(n);
  };
  const active = state.active.map((o): PublicOuting => {
    if (!o || typeof o !== 'object') invalid();
    id(o.id);
    validPeople(o, life);
    validKind(o);
    if (
      ![0, 1].includes(o.step) ||
      !['ongoing', 'choice', 'ready'].includes(o.phase) ||
      !finite(o.createdAt, life.minutes) ||
      !finite(o.updatedAt, life.minutes) ||
      o.updatedAt < o.createdAt ||
      !finite(o.progress, o.total) ||
      (o.choice !== undefined && !validChoice(o.kind, o.choice))
    )
      invalid();
    if (o.kind === 'cafe') {
      const total =
        o.choice === undefined
          ? 8
          : o.choice === 'quick'
            ? 6
            : o.order === 'tea'
              ? 8
              : 10;
      if (
        o.step !== 0 ||
        o.total !== total ||
        (o.choice === undefined
          ? o.progress > 3 ||
            o.phase === 'ready' ||
            (o.phase === 'choice' && o.progress !== 3)
          : o.phase === 'choice' || o.progress < 3) ||
        (o.phase === 'ready' && o.progress !== o.total)
      )
        invalid();
    } else if (
      o.total !== 1 ||
      (o.step === 0
        ? o.choice !== undefined
        : o.choice === undefined || o.phase === 'choice') ||
      ((o.phase === 'ready' || o.phase === 'choice') && o.progress !== 1)
    )
      invalid();
    for (const person of [o.actor, ...(o.companion ? [o.companion] : [])]) {
      if (busy.has(person)) invalid();
      busy.add(person);
    }
    return {
      id: o.id,
      actor: o.actor,
      ...(o.companion ? { companion: o.companion } : {}),
      stage: o.stage,
      kind: o.kind,
      ...(o.order ? { order: o.order } : {}),
      phase: o.phase,
      step: o.step,
      progress: o.progress,
      total: o.total,
      ...(o.choice ? { choice: o.choice } : {}),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });
  const events = new Set<number>();
  const completed = state.completed.map((o): PublicOutingResult => {
    if (!o || typeof o !== 'object') invalid();
    id(o.id);
    validPeople(o, life);
    validKind(o);
    if (
      o.place !== (o.kind === 'cafe' ? 'cafe' : 'park') ||
      !finite(o.createdAt, life.minutes) ||
      !finite(o.completedAt, life.minutes) ||
      o.completedAt + 1e-6 < o.createdAt + (o.kind === 'cafe' ? 6 : 2) ||
      !Number.isSafeInteger(o.eventId) ||
      o.eventId <= o.id ||
      o.eventId >= life.nextId ||
      events.has(o.eventId) ||
      !Array.isArray(o.choices) ||
      o.choices.length !== 1 ||
      !validChoice(o.kind, o.choices[0]) ||
      typeof o.summary !== 'string' ||
      !o.summary ||
      o.summary.length > 600
    )
      invalid();
    events.add(o.eventId);
    return {
      id: o.id,
      actor: o.actor,
      ...(o.companion ? { companion: o.companion } : {}),
      stage: o.stage,
      place: o.place,
      kind: o.kind,
      ...(o.order ? { order: o.order } : {}),
      choices: [...o.choices],
      createdAt: o.createdAt,
      completedAt: o.completedAt,
      eventId: o.eventId,
      summary: o.summary,
    };
  });
  const cooldowns: PublicOutingsState['cooldowns'] = {};
  for (const [person, stamp] of Object.entries(state.cooldowns)) {
    if (
      !isPartner(person) ||
      !stamp ||
      typeof stamp !== 'object' ||
      Array.isArray(stamp) ||
      (stamp.cafeUntil !== undefined &&
        !finite(stamp.cafeUntil, life.minutes + 45)) ||
      (stamp.parkRewardDay !== undefined &&
        (!Number.isSafeInteger(stamp.parkRewardDay) ||
          !finite(stamp.parkRewardDay, Math.floor(life.minutes / 1440))))
    )
      invalid();
    cooldowns[person] = {
      ...(stamp.cafeUntil === undefined ? {} : { cafeUntil: stamp.cafeUntil }),
      ...(stamp.parkRewardDay === undefined
        ? {}
        : { parkRewardDay: stamp.parkRewardDay }),
    };
  }
  for (const o of completed) {
    for (const person of [o.actor, ...(o.companion ? [o.companion] : [])]) {
      if (
        o.kind === 'cafe'
          ? (cooldowns[person]?.cafeUntil ?? -1) < o.completedAt + 45
          : (cooldowns[person]?.parkRewardDay ?? -1) <
            Math.floor(o.completedAt / 1440)
      )
        invalid();
    }
  }
  return { active, completed, cooldowns };
}

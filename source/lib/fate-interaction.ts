import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
} from './fate-cast';
import { FATE_HOMES } from './fate-housing';
import { indoorRoom } from './fate-indoor-map';
import { interiorResidentPoint, interiorZone } from './fate-interior';
import {
  lifeIndoors,
  occupiedHome,
  type DailyLife,
  type LifeEvent,
} from './fate-life';
import { nearestDistrictLandmark } from './fate-district';
import type { Exchange } from './fate-state';
import { WALK_AREAS, type ActorId, type Point } from './street';

type Positions = readonly (Point & { id: ActorId })[];
export type InteractionStatus = {
  ok: boolean;
  message: string;
  place?: string;
};

export function liveEncounter(life: DailyLife): LifeEvent | null {
  const event = life.events.findLast((item) => item.dialogue);
  if (
    !event?.dialogue ||
    life.minutes < event.minute ||
    life.minutes >= life.holdUntil ||
    ([event.dialogue.speaker, event.dialogue.target].includes('waver') &&
      (event.dialogue.waverStage ?? 'young') !== life.waverStage)
  )
    return null;
  const { speaker, target } = event.dialogue;
  const aHome = occupiedHome(life, speaker),
    bHome = occupiedHome(life, target);
  if (aHome || bHome) return aHome && aHome === bHome ? event : null;
  if (lifeIndoors(life.people[speaker]) || lifeIndoors(life.people[target]))
    return null;
  const a = life.positions[speaker],
    b = life.positions[target];
  return Math.hypot(a.x - b.x, a.y - b.y) <= 160 ? event : null;
}

/** One visible turn at a time keeps neighbouring speakers' bubbles from overlapping. */
export function liveSpeech(life: DailyLife) {
  const event = liveEncounter(life);
  if (!event?.dialogue) return null;
  const d = event.dialogue;
  const turns = d.turns ?? [
    { speaker: d.speaker, text: d.message },
    { speaker: d.target, text: d.reply },
  ];
  const progress =
    (life.minutes - event.minute) / Math.max(1, life.holdUntil - event.minute);
  const turn =
    turns[Math.min(turns.length - 1, Math.floor(progress * turns.length))];
  return turn ? { ...turn, source: d.source } : null;
}

function proximity(
  life: DailyLife,
  actors: Positions,
  speaker: ActorId,
  target: PartnerId,
): InteractionStatus {
  const indoors = life.indoor;
  const home = occupiedHome(life, target);
  if (indoors) {
    if (indoors.actor !== speaker)
      return { ok: false, message: '请先进入角色。' };
    if (home !== indoors.home)
      return { ok: false, message: '此人已离开这处住宅。' };
    const point = interiorResidentPoint(life, indoors.home, target, speaker);
    if (!point) return { ok: false, message: '此人目前不在屋内。' };
    if (indoorRoom(indoors) !== interiorZone(life.people[target].activity))
      return { ok: false, message: '先走进人物所在的房间，再靠近交谈。' };
    if (Math.hypot(point.x - indoors.x, point.y - indoors.y) > 85)
      return { ok: false, message: '再走近一些，才能面对面交谈。' };
    return {
      ok: true,
      message: '可以面对面交谈。',
      place: FATE_HOMES[indoors.home].name,
    };
  }
  if (home || lifeIndoors(life.people[target]))
    return {
      ok: false,
      message: home
        ? `此人在${FATE_HOMES[home].name}内，请从门前进入。`
        : '此人正在室内，暂时无法在街道交谈。',
    };
  const a = actors.find((actor) => actor.id === speaker),
    b = actors.find((actor) => actor.id === target);
  if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 135)
    return { ok: false, message: '先靠近人物，再按 E 或点击交谈。' };
  if (
    !WALK_AREAS.some((r) =>
      [a, b].every(
        (p) =>
          p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
      ),
    )
  )
    return {
      ok: false,
      message: '请走到同一条道路上，不能隔着河岸或建筑交谈。',
    };
  return {
    ok: true,
    message: '可以面对面交谈。',
    place: nearestDistrictLandmark(b).name,
  };
}

export function interactionStatus(
  life: DailyLife,
  actors: Positions,
  speaker: ActorId | null,
  target: PartnerId,
): InteractionStatus {
  if (!speaker)
    return {
      ok: false,
      message: '观察模式可查看近况；请先进入角色，再走近交谈。',
    };
  if (speaker === target) return { ok: false, message: '你正在控制这名人物。' };
  const near = proximity(life, actors, speaker, target);
  if (!near.ok) return near;
  const activity = life.people[target].activity;
  if (activity?.phase === 'doing') {
    if (activity.kind === 'sleep')
      return { ok: false, message: '正在睡眠，暂不打扰；醒来后再聊。' };
    if (activity.kind === 'cook')
      return { ok: false, message: '正在做饭，等忙完再聊。' };
    if (activity.school || (activity.routine && activity.kind === 'study'))
      return { ok: false, message: '正在上课或专心工作，等忙完再聊。' };
  }
  const event = liveEncounter(life);
  if (
    event?.dialogue &&
    [event.dialogue.speaker, event.dialogue.target].includes(target)
  )
    return { ok: false, message: '正在与别人交谈，可以先旁听，稍后再聊。' };
  return near;
}

/** Find the closest visible resident, including busy residents so the UI can explain why. */
export function nearbyResident(
  life: DailyLife,
  actors: Positions,
  speaker: ActorId,
): PartnerId | null {
  let best: PartnerId | null = null,
    distance = Infinity;
  for (const id of STREET_PARTNERS) {
    if (id === speaker || !proximity(life, actors, speaker, id).ok) continue;
    const a = life.indoor ?? actors.find((actor) => actor.id === speaker)!;
    const b = life.indoor
      ? interiorResidentPoint(life, life.indoor.home, id, speaker)!
      : actors.find((actor) => actor.id === id)!;
    const value = Math.hypot(a.x - b.x, a.y - b.y);
    if (value < distance) {
      best = id;
      distance = value;
    }
  }
  return best;
}

/** Mutates only after all checks; callers can stage this on a clone for an atomic save. */
export function recordOnsiteConversation(
  life: DailyLife,
  actors: Positions,
  controlled: ActorId | null,
  entry: Exchange,
): InteractionStatus {
  if (!isPartner(entry.target) || entry.speaker !== controlled)
    return { ok: false, message: '人物已切换，请重新靠近后交谈。' };
  if (
    typeof entry.id !== 'string' ||
    !entry.id.trim() ||
    entry.id.length > 120 ||
    typeof entry.message !== 'string' ||
    !entry.message.trim() ||
    entry.message.length > 1200 ||
    typeof entry.reply !== 'string' ||
    !entry.reply.trim() ||
    entry.reply.length > 2400 ||
    !['preset', 'deepseek'].includes(entry.source) ||
    ([entry.speaker, entry.target].includes('waver') &&
      (entry.waverStage ?? 'young') !== life.waverStage)
  )
    return { ok: false, message: '这次对话无效，请重新发起。' };
  const status = interactionStatus(life, actors, controlled, entry.target);
  if (!status.ok) return status;
  if (
    life.events.some(
      (event) =>
        event.interaction?.exchangeId === entry.id ||
        (entry.source === 'preset' &&
          event.interaction?.source === 'preset' &&
          event.interaction.speaker === entry.speaker &&
          event.interaction.target === entry.target &&
          event.interaction.message === entry.message &&
          life.minutes - event.minute < 2 &&
          (![entry.speaker, entry.target].includes('waver') ||
            (event.waverStage ?? 'young') === life.waverStage)),
    )
  )
    return {
      ok: false,
      message: '刚刚已经聊过这个话题了；可以换个话题，或继续日常后再聊。',
    };
  const speakerName =
    entry.speaker === 'admin'
      ? '管理员'
      : fatePerson(entry.speaker, life.waverStage)!.name;
  const targetName = fatePerson(entry.target, life.waverStage)!.name;
  const event: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: `${speakerName}与${targetName}在${status.place}交谈。`,
    ...([entry.speaker, entry.target].includes('waver')
      ? { waverStage: life.waverStage }
      : {}),
    interaction: {
      exchangeId: entry.id,
      speaker: entry.speaker,
      target: entry.target,
      message: entry.message,
      reply: entry.reply,
      source: entry.source,
    },
  };
  life.events = [...life.events, event].slice(-80);
  return { ...status, message: '交谈已记入日常。' };
}

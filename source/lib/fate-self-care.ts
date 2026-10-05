import { fatePerson, isPartner, type PartnerId } from './fate-cast';
import { FATE_HOMES, homeOf, isHomeId, type HomeId } from './fate-housing';
import { indoorRoom } from './fate-indoor-map';
import { currentAppointment, liveAppointment } from './fate-social';
import { currentPastime, livePastime } from './fate-pastimes';
import { currentPublicOuting } from './fate-public-outings';
import { spendPlayerTime } from './fate-player-time';
import type { DailyLife } from './fate-life';
import type { Actor } from './street';

export const HOME_CARE = {
  meal: { label: '热一份家常饭', room: 'table', minutes: 20, care: 'eat' },
  rest: { label: '坐下歇一会', room: 'lounge', minutes: 20, care: 'rest' },
  nap: { label: '小睡一小时', room: 'rest', minutes: 60, care: 'sleep' },
  sleep: { label: '睡到早上七点', room: 'rest', minutes: 0, care: 'sleep' },
} as const;
export type HomeCareAction = keyof typeof HOME_CARE;
export type HomeCareEvent = {
  person: PartnerId;
  home: HomeId;
  action: HomeCareAction;
  startedAt: number;
  duration: number;
};

export function homeCarePlan(
  life: DailyLife,
  controlled: string | null,
  action: HomeCareAction,
) {
  if (!isPartner(controlled))
    return {
      ok: false,
      message: '先进入一位居民，才能安排自己的日常。',
      minutes: 0,
    };
  if (!Object.hasOwn(HOME_CARE, action))
    return { ok: false, message: '没有这项居家活动。', minutes: 0 };
  const home = homeOf(controlled, life.housing);
  const position = life.indoor;
  if (position?.actor !== controlled || position.home !== home)
    return {
      ok: false,
      message: `回到${FATE_HOMES[home].name}，进屋后就能吃饭和休息。`,
      minutes: 0,
    };
  const rooms = { table: '餐桌旁', lounge: '起居间', rest: '休息间' };
  if (indoorRoom(position, home) !== HOME_CARE[action].room)
    return {
      ok: false,
      message: `先走到${rooms[HOME_CARE[action].room]}。`,
      minutes: 0,
    };
  if (
    currentPublicOuting(life, controlled) ||
    life.pastimes?.some(
      (p) => p.host === controlled && currentPastime(life, p) && livePastime(p),
    )
  )
    return {
      ok: false,
      message: '还有未结束的小活动，先完成或收起，再安排居家时间。',
      minutes: 0,
    };
  const minute = life.minutes % 1440;
  if (action === 'sleep' && minute >= 420 && minute < 1200)
    return {
      ok: false,
      message: '现在还是白天，可以歇一会或小睡；晚上八点后可睡到次日七点。',
      minutes: 0,
    };
  const minutes =
    action === 'sleep' ? (1860 - minute) % 1440 : HOME_CARE[action].minutes;
  const appointment = life.appointments.find(
    (a) =>
      currentAppointment(life, a) &&
      liveAppointment(a) &&
      [a.a, a.b].includes(controlled) &&
      a.start < life.minutes + minutes,
  );
  return {
    ok: true,
    minutes,
    message: `经过 ${Math.ceil(minutes)} 分钟，居民的日常也会继续。`,
    warning: appointment
      ? '这段时间会经过已有约定，请先考虑赴约或改安排。'
      : undefined,
  };
}

export function takeHomeCare(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  action: HomeCareAction,
) {
  const plan = homeCarePlan(life, controlled, action);
  if (!plan.ok || !isPartner(controlled)) return { ...plan, encounters: [] };
  const actor = actors.find((a) => a.id === controlled);
  if (!actor) return { ok: false, message: '请等待人物载入。', encounters: [] };
  actor.path = [];
  actor.frame = 0;
  const startedAt = life.minutes;
  const before = {
    hunger: life.people[controlled].hunger,
    energy: life.people[controlled].energy,
  };
  const { encounters } = spendPlayerTime(
    life,
    actors,
    controlled,
    plan.minutes,
    HOME_CARE[action].care,
  );
  const person = life.people[controlled];
  const change = `饥饿 ${Math.round(before.hunger)} → ${Math.round(person.hunger)}，精力 ${Math.round(before.energy)} → ${Math.round(person.energy)}`;
  const home = homeOf(controlled, life.housing);
  const message = `${fatePerson(controlled, life.waverStage)!.name}${HOME_CARE[action].label}，度过 ${Math.ceil(plan.minutes)} 分钟。${change}。`;
  life.events = [
    ...life.events,
    {
      id: life.nextId++,
      minute: life.minutes,
      waverStage: life.waverStage,
      text: message,
      care: {
        person: controlled,
        home,
        action,
        startedAt,
        duration: plan.minutes,
      },
    },
  ].slice(-80);
  return { ok: true, message, encounters };
}

export function parseHomeCareEvent(
  value: unknown,
  minute: number,
): HomeCareEvent {
  const e = value as HomeCareEvent;
  if (
    !e ||
    !isPartner(e.person) ||
    !isHomeId(e.home) ||
    !Object.hasOwn(HOME_CARE, e.action) ||
    !Number.isFinite(e.startedAt) ||
    e.startedAt < 0 ||
    !Number.isFinite(e.duration) ||
    e.duration <= 0 ||
    e.duration > 720 ||
    Math.abs(e.startedAt + e.duration - minute) > 1e-5 ||
    (e.action !== 'sleep' && e.duration !== HOME_CARE[e.action].minutes)
  )
    throw new Error('居家活动记录无效');
  return {
    person: e.person,
    home: e.home,
    action: e.action,
    startedAt: e.startedAt,
    duration: e.duration,
  };
}

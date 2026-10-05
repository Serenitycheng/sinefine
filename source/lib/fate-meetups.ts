import { isPartner, fatePerson, type PartnerId } from './fate-cast';
import { pathTo, stepActor, type Actor } from './street';
import type { DailyLife, LifeEvent } from './fate-life';
import { dueDuty } from './fate-schedule';
import {
  MEETUPS,
  liveAppointment,
  currentAppointment,
  appointmentSummary,
  rememberAppointment,
  bondKey,
  type Appointment,
} from './fate-social';
import { rememberCommitment } from './fate-memory';
export function dueAppointment(
  life: DailyLife,
  id: PartnerId,
  position = life.positions[id],
) {
  return life.appointments.find(
    (a) =>
      liveAppointment(a) &&
      currentAppointment(life, a) &&
      [a.a, a.b].includes(id) &&
      life.minutes >=
        a.start - travelLead(a, id, position, meetupDestination(a, id)) &&
      life.minutes < a.until,
  );
}
const travelCache = new WeakMap<
  Appointment,
  Map<PartnerId, { from: { x: number; y: number }; lead: number }>
>();
function travelLead(
  a: Appointment,
  id: PartnerId,
  from: { x: number; y: number } | undefined,
  to: { x: number; y: number },
) {
  if (!from) return 30;
  const entries =
    travelCache.get(a) ??
    new Map<PartnerId, { from: { x: number; y: number }; lead: number }>();
  const previousEstimate = entries.get(id);
  if (
    previousEstimate &&
    Math.hypot(
      from.x - previousEstimate.from.x,
      from.y - previousEstimate.from.y,
    ) < 120
  )
    return previousEstimate.lead;
  let previous = from,
    distance = 0;
  for (const point of pathTo(from, to)) {
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  const lead = Math.max(30, Math.ceil((distance / 55) * 2) + 15);
  entries.set(id, { from: { ...from }, lead });
  travelCache.set(a, entries);
  return lead;
}
export function meetupDestination(a: Appointment, id: PartnerId) {
  const p = MEETUPS[a.activity];
  return { x: p.x + (id === a.a ? -18 : 18), y: p.y };
}
export function meetupPair(life: DailyLife, a: PartnerId, b: PartnerId) {
  return life.appointments.find(
    (p) =>
      p.status === 'meeting' &&
      !p.talked &&
      [p.a, p.b].includes(a) &&
      [p.a, p.b].includes(b) &&
      currentAppointment(life, p),
  );
}
export function reconcileAppointments(
  life: DailyLife,
  actors: Actor[],
  elapsed: number,
  controlled: string | null,
  log: (text: string) => LifeEvent,
) {
  for (const a of life.appointments) {
    if (!liveAppointment(a) || !currentAppointment(life, a)) continue;
    const previous = a.status;
    const unavailable = [a.a, a.b].find(
      (id) =>
        id !== controlled &&
        life.minutes >= a.start &&
        (life.people[id].hunger >= 90 ||
          life.people[id].energy < 15 ||
          dueDuty(life, id)),
    );
    if (unavailable) {
      const p = life.people[unavailable];
      a.notice = `${fatePerson(unavailable, life.waverStage)!.name}${p.hunger >= 90 ? '太饿了，需要先吃东西' : p.energy < 15 ? '太累了，需要休息' : '有固定作息冲突'}；这次取消，稍后可以重新邀请。`;
      finishAppointment(life, actors, a, 'cancelled', log);
      continue;
    }
    const both = [a.a, a.b].every((id) => {
      const action = life.people[id].activity,
        actor = actors.find((p) => p.id === id)!;
      return (
        !!actor &&
        (controlled === id
          ? a.attending === id && life.indoor?.actor !== id
          : action?.meeting === a.id && action.phase === 'doing') &&
        Math.hypot(
          actor.x - meetupDestination(a, id).x,
          actor.y - meetupDestination(a, id).y,
        ) < (controlled === id ? 42 : 2) &&
        life.people[id].hunger < 90 &&
        life.people[id].energy >= 15
      );
    });
    if (both && life.minutes >= a.start) {
      a.status = 'meeting';
      a.shared = Math.min(10, a.shared + elapsed);
      // Explicit time advances may leave a tiny floating-point remainder.
      // A full shared meal should not require a second click to finish.
      if (10 - a.shared < 1e-6) a.shared = 10;
    } else {
      a.status = 'pending';
    }
    if (a.shared >= 10 || life.minutes >= a.until) {
      finishAppointment(
        life,
        actors,
        a,
        a.shared >= 10 ? 'fulfilled' : 'missed',
        log,
      );
    } else if (a.status !== previous) {
      const bond = life.bonds[bondKey(a.a, a.b, a.stage ?? life.waverStage)];
      if (bond) rememberCommitment(bond, a, life.minutes);
    }
  }
}
export function advanceAppointment(
  life: DailyLife,
  actor: Actor,
  elapsed: number,
  seconds: number,
  speed: number,
) {
  if (!isPartner(actor.id)) return false;
  const id = actor.id,
    person = life.people[id],
    a = dueAppointment(life, id, actor);
  if (!a) return false;
  if (
    person.activity?.meeting === a.id &&
    (person.hunger >= 78 || person.energy < 20)
  ) {
    person.activity = null;
    actor.path = [];
    return false;
  }
  if (
    (!person.activity ||
      (!person.activity.meal &&
        !person.activity.routine &&
        !['eat', 'cook', 'sleep', 'rest'].includes(person.activity.kind))) &&
    person.hunger < 55 &&
    person.energy >= 35 &&
    !dueDuty(life, id)
  ) {
    person.activity = {
      kind: a.activity,
      meeting: a.id,
      phase: 'going',
      remaining: 10,
      reason: `记得和${fatePerson(a.a === id ? a.b : a.a, life.waverStage)!.name}约好一起${MEETUPS[a.activity].label}，先往约定的地方走。`,
      source: 'rules',
    };
    actor.path = pathTo(actor, meetupDestination(a, id));
  }
  const action = person.activity;
  if (action?.meeting !== a.id) return false;
  const point = meetupDestination(a, id);
  if (Math.hypot(actor.x - point.x, actor.y - point.y) >= 2) {
    action.phase = 'going';
    if (!actor.path.length) actor.path = pathTo(actor, point);
    stepActor(actor, seconds, undefined, 55 * speed);
  } else {
    action.phase = 'doing';
    actor.path = [];
    actor.frame = 0;
    if (a.status === 'meeting' && a.activity === 'eat')
      person.hunger = Math.max(0, person.hunger - elapsed * 2.3);
  }
  return true;
}

function finishAppointment(
  life: DailyLife,
  actors: Actor[],
  a: Appointment,
  status: 'fulfilled' | 'missed' | 'cancelled',
  log: (text: string) => LifeEvent,
) {
  a.status = status;
  if (status !== 'fulfilled')
    for (const p of life.pastimes ?? [])
      if (p.appointment === a.id && p.phase === 'invited') {
        p.phase = 'cancelled';
        p.updatedAt = life.minutes;
        p.reply = a.notice ?? '没有实际一起吃饭，这次准备已收起。';
      }
  delete a.attending;
  for (const id of [a.a, a.b])
    if (life.people[id].activity?.meeting === a.id) {
      life.people[id].activity = null;
      const actor = actors.find((p) => p.id === id);
      if (actor) actor.path = [];
    }
  rememberAppointment(life, a, log(appointmentSummary(a, life.waverStage)));
}
export function playerAppointment(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  appointmentId: number,
  action: 'attend' | 'cancel',
) {
  const a = life.appointments.find((p) => p.id === appointmentId);
  if (
    !isPartner(controlled) ||
    !a ||
    ![a.a, a.b].includes(controlled) ||
    !currentAppointment(life, a) ||
    !liveAppointment(a) ||
    life.minutes >= a.until
  )
    return {
      ok: false,
      message: '请控制约定中的人物；这项安排也需要仍然有效。',
    };
  const actor = actors.find((p) => p.id === controlled);
  if (!actor) return { ok: false, message: '人物还未进入街区。' };
  if (action === 'cancel') {
    a.notice = `${fatePerson(controlled, life.waverStage)!.name}说明这次不便前往；之后可重新商量时间。`;
    finishAppointment(life, actors, a, 'cancelled', (text) => {
      const e = {
        id: life.nextId++,
        minute: life.minutes,
        text,
        waverStage: life.waverStage,
      };
      life.events = [...life.events, e].slice(-80);
      return e;
    });
    actor.path = [];
    return { ok: true, message: '已告知对方取消；没有把取消算作共同经历。' };
  }
  if (life.indoor?.actor === controlled)
    return { ok: false, message: '请先走出房间再赴约。' };
  if (
    life.people[controlled].hunger >= 90 ||
    life.people[controlled].energy < 15
  )
    return { ok: false, message: '先吃点东西或休息，再参加约定。' };
  a.attending = controlled;
  actor.path = pathTo(actor, meetupDestination(a, controlled));
  return {
    ok: true,
    message:
      '正在前往约定地点。开启日常后，双方到场并相处十分钟才算完成；你随时可以自行离开。',
  };
}

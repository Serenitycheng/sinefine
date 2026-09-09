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
  type Appointment,
} from './fate-social';
export function dueAppointment(life: DailyLife, id: PartnerId) {
  return life.appointments.find(
    (a) =>
      liveAppointment(a) &&
      currentAppointment(life, a) &&
      [a.a, a.b].includes(id) &&
      life.minutes >= a.start - 30 &&
      life.minutes < a.until,
  );
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
    const both = [a.a, a.b].every((id) => {
      const action = life.people[id].activity,
        actor = actors.find((p) => p.id === id)!;
      return (
        controlled !== id &&
        action?.meeting === a.id &&
        action.phase === 'doing' &&
        Math.hypot(
          actor.x - meetupDestination(a, id).x,
          actor.y - meetupDestination(a, id).y,
        ) < 2 &&
        life.people[id].hunger < 90 &&
        life.people[id].energy >= 15
      );
    });
    if (both && life.minutes >= a.start) {
      a.status = 'meeting';
      a.shared = Math.min(10, a.shared + elapsed);
    } else {
      a.status = 'pending';
    }
    if (a.shared >= 10 || life.minutes >= a.until) {
      a.status = a.shared >= 10 ? 'fulfilled' : 'missed';
      for (const id of [a.a, a.b])
        if (life.people[id].activity?.meeting === a.id) {
          life.people[id].activity = null;
          actors.find((p) => p.id === id)!.path = [];
        }
      const event = log(appointmentSummary(a, life.waverStage));
      rememberAppointment(life, a, event);
    }
  }
}
export function advanceAppointment(
  life: DailyLife,
  actor: Actor,
  elapsed: number,
  seconds: number,
  speed: 1 | 4,
) {
  if (!isPartner(actor.id)) return false;
  const id = actor.id,
    person = life.people[id],
    a = dueAppointment(life, id);
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
    !person.activity &&
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

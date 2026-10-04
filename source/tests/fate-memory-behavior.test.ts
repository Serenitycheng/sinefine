import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  type LifeEvent,
} from '../lib/fate-life';
import {
  rememberEncounter,
  currentBond,
  socialCooldown,
} from '../lib/fate-social';
import { createStreetActors } from '../lib/street';
import {
  meetupDestination,
  playerAppointment,
  reconcileAppointments,
} from '../lib/fate-meetups';
import {
  activityPreference,
  knownPreferences,
} from '../lib/fate-memory-behavior';
function setup() {
  const life = createDailyLife(),
    actors = createStreetActors();
  const e: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: '两人在场约好散步',
    dialogue: {
      speaker: 'rin',
      target: 'shirou',
      message: '一小时后一起在林荫路边散步，好吗？',
      reply: '好，约好了。',
      source: 'preset',
    },
  };
  life.events.push(e);
  rememberEncounter(life, e);
  const a = life.appointments[0];
  assert.ok(a);
  life.minutes = a.start + 1;
  for (const id of [a.a, a.b]) {
    Object.assign(
      actors.find((x) => x.id === id)!,
      meetupDestination(a, id),
    );
    life.people[id].hunger = 10;
    life.people[id].energy = 90;
    life.people[id].activity = {
      kind: 'walk',
      meeting: a.id,
      phase: 'doing',
      remaining: 10,
      reason: '赴约',
      source: 'rules',
    };
  }
  const log = (text: string) => {
    const e: LifeEvent = { id: life.nextId++, minute: life.minutes, text };
    life.events.push(e);
    return e;
  };
  return { life, actors, a, log };
}
void test('controlled participant opts in, leaves and returns; only real shared time fulfills the promise', () => {
  const { life, actors, a, log } = setup();
  reconcileAppointments(life, actors, 5, 'rin', log);
  assert.equal(a.shared, 0);
  assert.equal(playerAppointment(life, actors, 'rin', a.id, 'attend').ok, true);
  life.people.rin.activity = null;
  reconcileAppointments(life, actors, 5, 'rin', log);
  assert.equal(a.shared, 5);
  const actor = actors.find((p) => p.id === 'rin')!;
  actor.x += 100;
  reconcileAppointments(life, actors, 5, 'rin', log);
  assert.equal(a.shared, 5);
  Object.assign(actor, meetupDestination(a, 'rin'));
  const saved = parseDailyLife(JSON.parse(JSON.stringify(life)));
  assert.equal(saved.appointments[0].attending, 'rin');
  reconcileAppointments(life, actors, 5, 'rin', log);
  assert.equal(a.status, 'fulfilled');
  assert.ok(
    currentBond(life, 'rin', 'shirou')!.archive!.some(
      (m) => m.kind === 'experience' && m.activity === 'walk',
    ),
  );
  const n = life.events.length;
  reconcileAppointments(life, actors, 20, 'rin', log);
  assert.equal(life.events.length, n);
});
void test('cancel and exhaustion record explanations without fabricating a completed meeting', () => {
  const { life, actors, a, log } = setup();
  life.people.shirou.energy = 5;
  reconcileAppointments(life, actors, 1, 'rin', log);
  assert.equal(a.status, 'cancelled');
  assert.match(a.notice!, /休息/);
  assert.equal(a.shared, 0);
  assert.ok(parseDailyLife(JSON.parse(JSON.stringify(life))));
  const next = setup();
  assert.equal(
    playerAppointment(next.life, next.actors, 'sakura', next.a.id, 'cancel').ok,
    false,
  );
  assert.equal(
    playerAppointment(next.life, next.actors, 'rin', next.a.id, 'cancel').ok,
    true,
  );
  assert.match(next.a.notice!, /重新商量/);
});
void test('explicit preferences guide own choices but never leak to another observer', () => {
  const { life, log } = setup();
  const e = log('交谈');
  e.dialogue = {
    speaker: 'rin',
    target: 'shirou',
    message: '喜欢什么？',
    reply: '我不喜欢阅读。',
    source: 'preset',
  };
  rememberEncounter(life, e, {
    impressions: [],
    preferences: [
      {
        person: 'shirou',
        kind: 'dislike',
        subject: '阅读',
        turn: 1,
        quote: '我不喜欢阅读。',
      },
    ],
  });
  assert.equal(
    activityPreference(life, 'shirou', 'read')?.preference,
    'dislike',
  );
  assert.equal(knownPreferences(life, 'sakura', 'shirou').length, 0);
  assert.equal(knownPreferences(life, 'rin', 'shirou').length, 1);
});
void test('recent friction reduces contact temporarily rather than permanently forbidding friendship', () => {
  const { life, log } = setup();
  const before = socialCooldown(life, 'rin', 'shirou');
  const e = log('摩擦');
  e.dialogue = {
    speaker: 'rin',
    target: 'shirou',
    message: '真让人不高兴。',
    reply: '这话让我有点难过。',
    source: 'preset',
  };
  rememberEncounter(life, e, {
    impressions: [
      {
        person: 'shirou',
        kind: 'friction',
        turn: 0,
        quote: e.dialogue.message,
      },
    ],
  });
  const recent = socialCooldown(life, 'rin', 'shirou');
  assert.ok(recent > before);
  life.minutes += 361;
  assert.ok(socialCooldown(life, 'rin', 'shirou') < recent);
});

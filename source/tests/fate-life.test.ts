import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type PartnerId } from '../lib/fate-cast';
import { type DialogueTurn } from '../lib/fate-dialogue';
import {
  advanceDailyLife,
  changeWaverStage,
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  type DailyLife,
  type LifeEvent,
} from '../lib/fate-life';
import { meetupDestination, reconcileAppointments } from '../lib/fate-meetups';
import {
  parseSocialEffects,
  rememberEncounter,
  type SocialEffects,
} from '../lib/fate-social';
import {
  conversationHistory,
  emptyFateSave,
  pairConversationHistory,
  type Exchange,
} from '../lib/fate-state';
import { createStreetActors, isWalkable, stepActor } from '../lib/street';

function offer(life: DailyLife, a: PartnerId = 'rin', b: PartnerId = 'shirou') {
  const turns: DialogueTurn[] = [
    { speaker: a, text: '一小时后在林荫路边一起散步吧。' },
    { speaker: b, text: '好，约好了。' },
  ];
  const effects: SocialEffects = {
    impressions: [],
    promise: {
      activity: 'walk',
      delay: 60,
      proposal: 0,
      acceptance: 1,
      proposalQuote: turns[0].text,
      acceptanceQuote: turns[1].text,
    },
  };
  const event: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: '约好稍后一起散步',
    waverStage: life.waverStage,
    dialogue: {
      speaker: a,
      target: b,
      message: turns[0].text,
      reply: turns[1].text,
      source: 'preset',
    },
  };
  life.events.push(event);
  life.lastEncounters[[a, b].sort().join('|')] = event.minute;
  life.encounters++;
  rememberEncounter(life, event, parseSocialEffects(effects, turns));
  return { turns, effects };
}

void test('Waver stage changes isolate both conversation directions and cancel previous-era appointments', () => {
  const life = createDailyLife();
  offer(life, 'waver', 'iskandar');
  life.people.waver.activity = {
    meeting: life.appointments[0].id,
    kind: 'walk',
    phase: 'going',
    remaining: 10,
    reason: '前往约定地点',
    source: 'rules',
  };
  const exchange = (
    id: string,
    speaker: Exchange['speaker'],
    target: Exchange['target'],
    stage?: Exchange['waverStage'],
  ): Exchange => ({
    id,
    speaker,
    target,
    ...(stage ? { waverStage: stage } : {}),
    message: '一起走走？',
    reply: '好。',
    source: 'preset',
    createdAt: '2026-09-26T08:00:00Z',
  });
  const history = [
    exchange('legacy-young', 'iskandar', 'waver'),
    exchange('adult-direct', 'iskandar', 'waver', 'adult'),
    exchange('adult-reverse', 'waver', 'iskandar', 'adult'),
    exchange('unrelated', 'shirou', 'rin'),
  ];
  const save = { ...emptyFateSave(), history, life };
  assert.deepEqual(
    conversationHistory(save, 'waver', 'iskandar').map((e) => e.id),
    ['legacy-young'],
  );
  const adult = changeWaverStage(life, 'adult');
  save.life = adult;
  assert.deepEqual(
    conversationHistory(save, 'waver', 'iskandar').map((e) => e.id),
    ['adult-direct'],
  );
  assert.deepEqual(
    pairConversationHistory(save, 'waver', 'iskandar').map((e) => e.id),
    ['adult-direct', 'adult-reverse'],
  );
  assert.deepEqual(
    conversationHistory(save, 'rin', 'shirou').map((e) => e.id),
    ['unrelated'],
  );
  assert.equal(adult.appointments[0].status, 'cancelled');
  assert.equal(adult.people.waver.activity, null);
  assert.equal(life.appointments[0].status, 'pending');
  assert.equal(life.waverStage, 'young');
  assert.deepEqual(parseDailyLife(adult), adult);
});

void test('daily life pauses fully, ignores invalid time and caps elapsed time after a background tab resumes', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const before = structuredClone(life);
  const options = {
    running: true,
    speed: 4 as const,
    controlled: 'admin' as const,
  };
  advanceDailyLife(life, actors, 30, { ...options, running: false });
  for (const dt of [Number.NaN, Infinity, -10, 0])
    advanceDailyLife(life, actors, dt, options);
  assert.deepEqual(life, before);
  const controlledBefore = structuredClone(life.people.rin);
  advanceDailyLife(life, actors, 60, { ...options, controlled: 'rin' });
  assert.ok(Math.abs(life.minutes - (before.minutes + 0.4)) < 1e-8);
  assert.ok(
    Math.abs(life.people.rin.hunger - controlledBefore.hunger - 0.4 * 0.09) <
      1e-8,
  );
  assert.ok(
    Math.abs(life.people.rin.energy - controlledBefore.energy + 0.4 * 0.035) <
      1e-8,
  );
  assert.equal(life.people.rin.activity, null);
  assert.equal(life.people.rin.choices, controlledBefore.choices);
});

void test('one controlled character walks alone while residents keep independent routes', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const initial = Object.fromEntries(
    actors.map(({ id, x, y }) => [id, { x, y }]),
  );
  for (let frame = 0; frame < 120; frame++)
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 1,
      controlled: 'illya',
    });
  const illya = actors.find((actor) => actor.id === 'illya')!;
  assert.deepEqual({ x: illya.x, y: illya.y }, initial.illya);
  const moving = actors.filter(
    (actor) =>
      actor.id !== 'illya' &&
      actor.id !== 'admin' &&
      Math.hypot(actor.x - initial[actor.id].x, actor.y - initial[actor.id].y) >
        1,
  );
  assert.ok(
    moving.length >= 3,
    'several residents should leave for their own activities',
  );
  const beforeManual = Object.fromEntries(
    actors.map(({ id, x, y }) => [id, { x, y }]),
  );
  stepActor(illya, 0.05, { x: 1, y: 0 });
  assert.ok(illya.x > beforeManual.illya.x);
  for (const actor of actors.filter((person) => person.id !== 'illya'))
    assert.deepEqual({ x: actor.x, y: actor.y }, beforeManual[actor.id]);
});

void test('an overnight autonomous simulation keeps residents in bounds and remains reloadable', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const started = life.minutes;
  for (let frame = 0; frame < 2400; frame++) {
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 4,
      controlled: 'admin',
    });
  }
  assert.ok(life.minutes > 1440);
  assert.ok(Math.abs(life.minutes - started - 960) < 1e-6);
  assert.ok(life.events.length > 0 && life.events.length <= 80);
  assert.ok(Object.values(life.people).some((p) => p.choices > 0));
  for (const person of Object.values(life.people)) {
    for (const need of [person.hunger, person.energy, person.social])
      assert.ok(need >= 0 && need <= 100);
  }
  for (const actor of actors) assert.ok(isWalkable(actor), actor.id);
  const saved = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
});

void test('an explicit appointment is fulfilled only after both people spend time together, exactly once', () => {
  const life = createDailyLife();
  offer(life);
  assert.equal(life.appointments.length, 1);
  const appointment = life.appointments[0];
  const actors = createStreetActors();
  life.minutes = appointment.start;
  const logged: LifeEvent[] = [];
  const log = (text: string): LifeEvent => {
    const event = { id: life.nextId++, minute: life.minutes, text };
    logged.push(event);
    life.events.push(event);
    return event;
  };
  reconcileAppointments(life, actors, 10, null, log);
  assert.equal(appointment.shared, 0);
  assert.equal(appointment.status, 'pending');
  for (const id of [appointment.a, appointment.b]) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      meetupDestination(appointment, id),
    );
    life.people[id].hunger = 20;
    life.people[id].energy = 80;
    life.people[id].activity = {
      meeting: appointment.id,
      kind: 'walk',
      phase: 'doing',
      remaining: 10,
      reason: '一起散步',
      source: 'rules',
    };
  }
  reconcileAppointments(life, actors, 5, null, log);
  assert.equal(appointment.status, 'meeting');
  assert.equal(appointment.shared, 5);
  reconcileAppointments(life, actors, 5, null, log);
  reconcileAppointments(life, actors, 5, null, log);
  assert.equal(appointment.status, 'fulfilled');
  assert.equal(logged.length, 1);
  assert.equal(life.people.rin.activity, null);
  assert.equal(life.people.shirou.activity, null);
  assert.equal(
    Object.values(life.bonds)[0].memories.filter((m) => m.kind === 'fulfilled')
      .length,
    1,
  );
  assert.deepEqual(parseDailyLife(life), life);
});

void test('appointment evidence rejects ambiguous acceptance, fabricated quotes and changed times', () => {
  const { turns, effects } = offer(createDailyLife());
  for (const reply of [
    '好，但是到时候再看。',
    '好，明天吧。',
    '好，两小时后见。',
    '如果有空就去。',
  ]) {
    const changed = [turns[0], { ...turns[1], text: reply }];
    assert.throws(() =>
      parseSocialEffects(
        {
          ...effects,
          promise: { ...effects.promise!, acceptanceQuote: reply },
        },
        changed,
      ),
    );
  }
  assert.throws(() =>
    parseSocialEffects(
      {
        ...effects,
        promise: { ...effects.promise!, proposalQuote: '从未说过的话' },
      },
      turns,
    ),
  );
});

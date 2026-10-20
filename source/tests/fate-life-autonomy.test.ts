import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LifeAutonomyEvents,
  indoorEncounterAllowed,
} from '../lib/fate-life-autonomy';
import { createDailyLife, LIFE_IDS, type LifeEvent } from '../lib/fate-life';
import { HouseGameSession } from '../lib/fate-house-game';
import { EmiyaGameSession } from '../lib/fate-emiya-game';
import { formalEntrance } from '../lib/fate-formal-buildings';
import { type PartnerId } from '../lib/fate-cast';

void test('new events from either clock are consumed once, with encounters ahead of plans and no history replay after restore', () => {
  const life = createDailyLife(),
    inbox = new LifeAutonomyEvents();
  const event = (dialogue: boolean): LifeEvent => ({
    id: life.nextId++,
    minute: life.minutes,
    text: '测试事件',
    ...(dialogue
      ? {
          dialogue: {
            speaker: 'rin' as const,
            target: 'tokiomi' as const,
            message: '你好',
            reply: '你好',
            source: 'preset' as const,
          },
        }
      : {
          decision: {
            person: 'rin' as const,
            action: 'read' as const,
            reason: '读书',
            source: 'rules' as const,
          },
        }),
  });
  life.events.push(event(true));
  inbox.reset(life);
  assert.equal(inbox.take(life).candidate, undefined);
  const plan = event(false),
    encounter = event(true);
  life.events.push(plan, encounter);
  const batch = inbox.take(life);
  assert.equal(batch.candidate, encounter);
  assert.deepEqual(batch.encounters, [encounter]);
  encounter.dialogue!.source = 'deepseek';
  assert.equal(inbox.take(life).candidate, undefined);
  const restored = structuredClone(life);
  inbox.reset(restored);
  assert.deepEqual(inbox.take(restored).encounters, []);
  restored.events.push({ ...plan, id: restored.nextId++ });
  assert.equal(inbox.take(restored).candidate?.decision?.action, 'read');
});

void test('painted-room encounters require nearby settled bodies, while unrelated street residents remain eligible', () => {
  const bodies = [
    {
      id: 'rin' as const,
      room: 'lounge',
      point: { x: 200, y: 200 },
      walking: false,
    },
    {
      id: 'tokiomi' as const,
      room: 'lounge',
      point: { x: 240, y: 200 },
      walking: false,
    },
  ];
  const inside = (id: PartnerId) => ['rin', 'tokiomi'].includes(id);
  assert.equal(indoorEncounterAllowed('rin', 'tokiomi', inside, bodies), true);
  bodies[1].room = 'study';
  assert.equal(indoorEncounterAllowed('rin', 'tokiomi', inside, bodies), false);
  bodies[1].room = 'lounge';
  bodies[1].point.x = 600;
  assert.equal(indoorEncounterAllowed('rin', 'tokiomi', inside, bodies), false);
  bodies[1].point.x = 240;
  bodies[1].walking = true;
  assert.equal(indoorEncounterAllowed('rin', 'tokiomi', inside, bodies), false);
  assert.equal(indoorEncounterAllowed('rin', 'shirou', inside, bodies), false);
  assert.equal(indoorEncounterAllowed('shirou', 'saber', inside, bodies), true);
});

function world() {
  const life = createDailyLife();
  life.minutes = 1000;
  life.nextEncounter = 0;
  life.holdUntil = 0;
  for (const id of LIFE_IDS)
    life.people[id].activity = {
      kind: 'sleep',
      phase: 'doing',
      remaining: 500,
      reason: '测试休息',
      source: 'rules',
    };
  return life;
}
const street = (actor: 'rin' | 'shirou', home: 'tohsaka' | 'emiya') => ({
  actor,
  point: formalEntrance(home),
  scene: 'street' as const,
  zoom: { street: 1, map: 1 },
  camera: { x: 0, y: 0, scale: 1 },
  manual: null,
});

void test('formal shared interiors create real same-room events and freeze only their own clock while AI is pending', () => {
  const life = world(),
    back = street('rin', 'tohsaka');
  life.positions.rin = { ...back.point };
  for (const id of ['tokiomi', 'gilgamesh'] as const) {
    life.people[id].activity = {
      kind: 'visit',
      home: 'tohsaka',
      phase: 'doing',
      remaining: 100,
      reason: '待在客厅',
      source: 'rules',
    };
    life.positions[id] = { ...back.point };
  }
  const session = new HouseGameSession(life, { ...back, actor: 'rin' });
  session.running = true;
  const pair = session.bodies.filter((b) => ['tokiomi', 'gilgamesh'].includes(b.id));
  assert.equal(pair.length, 2);
  for (const [i, b] of pair.entries()) {
    b.room = 'study';
    b.point = { x: 500 + i * 40, y: 500 };
    b.walking = false;
  }
  const inbox = new LifeAutonomyEvents();
  inbox.reset(session.life);
  const result = session.tick(0.05);
  assert.ok(
    result?.dialogue,
    'same-room residents should produce a real encounter',
  );
  assert.equal(inbox.take(session.life).candidate?.id, result.id);
  const minute = session.life.minutes;
  session.autonomyPaused = true;
  session.tick(0.05);
  assert.equal(session.life.minutes, minute);
  assert.equal(inbox.take(session.life).candidate, undefined);
  session.autonomyPaused = false;
  session.tick(0.05);
  assert.ok(session.life.minutes > minute);
});

void test('native Emiya engine restricts encounters to actual rooms and exposes its fresh events without another world tick', () => {
  const life = world(),
    back = { ...street('shirou', 'emiya'), actor: 'shirou' as const };
  life.positions.shirou = { ...back.point };
  for (const id of ['saber', 'sakura'] as const) {
    life.people[id].activity = {
      kind: 'read',
      home: 'emiya',
      phase: 'doing',
      remaining: 100,
      reason: '在家读书',
      source: 'rules',
    };
    life.positions[id] = { ...back.point };
  }
  const session = new EmiyaGameSession(life, back);
  session.running = true;
  const pair = session.house
    .all()
    .filter((b) => ['saber', 'sakura'].includes(b.id));
  assert.equal(pair.length, 2);
  for (const [i, body] of pair.entries()) {
    body.room = 'study';
    body.point = { x: 500 + i * 40, y: 500 };
    body.phase = 'doing';
    body.legs = [];
  }
  assert.equal(session.canEncounter('saber', 'sakura'), true);
  pair[1].room = 'hall';
  assert.equal(session.canEncounter('saber', 'sakura'), false);
  session.tick(0.05, session.location, false);
  assert.equal(
    session.life.events.some((e) => e.dialogue),
    false,
  );
  pair[1].room = 'study';
  pair[0].phase = pair[1].phase = 'doing';
  session.tick(0.05, session.location, false);
  assert.ok(session.life.events.some((e) => e.dialogue));
  const minute = session.life.minutes;
  session.autonomyPaused = true;
  session.tick(0.05, session.location, false);
  assert.equal(session.life.minutes, minute);
  session.autonomyPaused = false;
  session.tick(0.05, session.location, false);
  assert.ok(session.life.minutes > minute);
});

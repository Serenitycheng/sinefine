import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  passingGreeting,
  GREETING_COOLDOWN,
  GREETING_DURATION,
} from '../lib/fate-greetings';
import {
  advanceDailyLife,
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  recentLifeEvents,
} from '../lib/fate-life';
import { liveSpeech } from '../lib/fate-interaction';
import { createStreetActors } from '../lib/street';

function passing(relative: 'natalia' | 'illya') {
  const life = createDailyLife(),
    actors = createStreetActors();
  for (const person of Object.values(life.people))
    person.activity = {
      kind: 'rest',
      phase: 'doing',
      home: 'tohsaka',
      remaining: 25,
      reason: '在屋内休息',
      source: 'rules',
    };
  const parent = actors.find((a) => a.id === 'kiritsugu')!,
    kin = actors.find((a) => a.id === relative)!;
  Object.assign(parent, {
    x: 1590,
    y: 907,
    path: [{ x: 1670, y: 907 }],
    frame: 1,
  });
  Object.assign(kin, { x: 1630, y: 907, path: [{ x: 1700, y: 907 }] });
  life.people[relative].activity = {
    kind: 'walk',
    phase: 'going',
    remaining: 30,
    reason: '出门散步',
    source: 'rules',
  };
  life.people.kiritsugu.activity = null;
  life.nextEncounter = life.minutes + 1000;
  return { life, actors, parent, kin };
}

for (const relative of ['natalia', 'illya'] as const) {
  void test(`controlled Kiritsugu receives ${relative}'s passing greeting without a fabricated player reply or route interruption`, () => {
    const { life, actors, parent, kin } = passing(relative);
    const path = structuredClone(parent.path),
      hold = life.holdUntil,
      nextEncounter = life.nextEncounter;
    const event = advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 1,
      controlled: 'kiritsugu',
    });
    assert.equal(event?.greeting?.speaker, relative);
    assert.equal(event?.greeting?.target, 'kiritsugu');
    assert.equal(event?.greeting?.turns.length, 1);
    assert.match(event!.greeting!.turns[0].text, /切嗣/);
    assert.equal(event?.dialogue, undefined);
    assert.equal(event?.decision, undefined);
    assert.equal(life.holdUntil, hold);
    assert.equal(life.nextEncounter, nextEncounter);
    assert.deepEqual(parent.path, path);
    assert.equal(life.people[relative].activity?.phase, 'going');
    assert.ok(kin.path.length);
    assert.equal(life.encounters, 0);
    assert.deepEqual(life.bonds, {});
    const saved = parseDailyLife(snapshotLife(life, actors));
    assert.deepEqual(liveSpeech(saved), {
      ...event!.greeting!.turns[0],
      source: 'preset',
      passing: true,
    });
    assert.ok(recentLifeEvents(saved, relative).some((e) => e.greeting));
    assert.equal(
      passingGreeting(
        saved,
        actors,
        'kiritsugu',
        new Set(['kiritsugu']),
        () => true,
      ),
      null,
    );
    saved.minutes += GREETING_COOLDOWN;
    assert.ok(
      passingGreeting(
        saved,
        actors,
        'kiritsugu',
        new Set(['kiritsugu']),
        () => true,
      ),
    );
    assert.equal(liveSpeech(saved), null);
  });
}

void test('NPC family can exchange both lines while passing; a player-controlled daughter only hears her father', () => {
  const { life, actors } = passing('illya');
  const moving = new Set(['kiritsugu'] as const);
  const npc = passingGreeting(life, actors, null, moving, () => true)!;
  assert.deepEqual(
    npc.turns.map((t) => t.speaker),
    ['kiritsugu', 'illya'],
  );
  const player = passingGreeting(life, actors, 'illya', moving, () => true)!;
  assert.equal(player.turns.length, 1);
  assert.match(player.turns[0].text, /伊莉雅/);
  life.events.push({
    id: life.nextId++,
    minute: life.minutes,
    text: '路过招呼',
    greeting: npc,
  });
  life.positions.kiritsugu = { x: 1590, y: 907 };
  life.positions.illya = { x: 1630, y: 907 };
  assert.equal(liveSpeech(life)?.speaker, 'kiritsugu');
  life.minutes += GREETING_DURATION / 2;
  assert.equal(liveSpeech(life)?.speaker, 'illya');
});

void test('passing greetings respect distance, shared pavement, work, indoors, ongoing conversations and paused simulation', () => {
  const { life, actors, kin } = passing('natalia');
  const moving = new Set(['kiritsugu'] as const);
  assert.equal(
    passingGreeting(life, actors, 'kiritsugu', new Set(), () => true),
    null,
  );
  assert.equal(
    passingGreeting(life, actors, 'kiritsugu', moving, () => false),
    null,
  );
  kin.x += 400;
  assert.equal(
    passingGreeting(life, actors, 'kiritsugu', moving, () => true),
    null,
  );
  kin.x -= 400;
  life.people.natalia.activity!.phase = 'doing';
  life.people.natalia.activity!.kind = 'cook';
  assert.equal(
    passingGreeting(life, actors, 'kiritsugu', moving, () => true),
    null,
  );
  life.people.natalia.activity = null;
  life.holdUntil = life.minutes + 1;
  assert.equal(
    passingGreeting(life, actors, 'kiritsugu', moving, () => true),
    null,
  );
  life.holdUntil = 0;
  advanceDailyLife(life, actors, 0.05, {
    running: false,
    speed: 1,
    controlled: 'kiritsugu',
  });
  assert.equal(life.events.filter((e) => e.greeting).length, 0);
});

void test('older saves need no greeting records; corrupt greetings and cooldowns cannot be restored', () => {
  const old = createDailyLife();
  delete old.lastGreetings;
  assert.deepEqual(parseDailyLife(old).lastGreetings, {});
  old.lastGreetings = { 'illya|kiritsugu': old.minutes + 10 };
  assert.throws(() => parseDailyLife(old), /招呼时间/);
  old.lastGreetings = {};
  old.events.push({
    id: old.nextId++,
    minute: old.minutes,
    text: '招呼',
    greeting: {
      speaker: 'illya',
      target: 'kiritsugu',
      turns: [{ speaker: 'kiritsugu', text: '错配台词' }],
    },
  });
  assert.throws(() => parseDailyLife(old), /招呼记录/);
});

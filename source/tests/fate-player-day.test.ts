import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceDailyLife,
  createDailyLife,
  parseDailyLife,
  snapshotLife,
} from '../lib/fate-life';
import { homeCarePlan, takeHomeCare } from '../lib/fate-self-care';
import { spendPlayerTime } from '../lib/fate-player-time';
import { createStreetActors, nearestWalkable, stepActor } from '../lib/street';
import { FATE_HOMES } from '../lib/fate-housing';
import { roomPoint } from '../lib/fate-indoor-layout';
import { DISTRICT_PLACES } from '../lib/fate-district';
import { actOnPastime, advancePastimes } from '../lib/fate-pastimes';
import { lifeTopic } from '../lib/fate-conversation-presets';
import { currentBond } from '../lib/fate-social';
import { playerAppointment } from '../lib/fate-meetups';
import { recordOnsiteConversation } from '../lib/fate-interaction';

function household() {
  const life = createDailyLife(),
    actors = createStreetActors();
  life.nextEncounter = 1e9;
  const player = actors.find((a) => a.id === 'illya')!;
  Object.assign(player, nearestWalkable(FATE_HOMES.einzbern), { path: [] });
  life.indoor = {
    actor: 'illya',
    home: 'einzbern',
    layout: 2,
    ...roomPoint('einzbern', 'table', { x: 620, y: 190 }),
  };
  return { life, actors, player };
}
function repairScene() {
  const { life, actors, player } = household();
  delete life.indoor;
  for (const id of ['illya', 'kiritsugu'] as const) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      DISTRICT_PLACES.cafe,
      { path: [] },
    );
    Object.assign(life.people[id], { hunger: 10, energy: 90, activity: null });
  }
  return { life, actors, player };
}

void test('controlled needs progress only with running life; no movement or NPC plan takes over the player', () => {
  const { life, actors, player } = household();
  const before = structuredClone(life.people.illya);
  advanceDailyLife(life, actors, 0.05, {
    running: false,
    speed: 4,
    controlled: 'illya',
  });
  assert.deepEqual(life.people.illya, before);
  const point = { x: player.x, y: player.y };
  spendPlayerTime(life, actors, 'illya', 60);
  assert.ok(life.people.illya.hunger > before.hunger);
  assert.ok(life.people.illya.energy < before.energy);
  assert.deepEqual({ x: player.x, y: player.y }, point);
  assert.equal(life.people.illya.activity, null);
  assert.deepEqual(player.path, []);
});

void test('home food, rest and overnight sleep form a real day while other residents continue living', () => {
  const { life, actors, player } = household();
  life.people.illya.hunger = 80;
  life.people.illya.energy = 20;
  const start = life.minutes;
  const positions = actors.map(({ x, y }) => ({ x, y }));
  assert.equal(takeHomeCare(life, actors, 'illya', 'meal').ok, true);
  assert.ok(Math.abs(life.minutes - start - 20) < 1e-5);
  assert.ok(life.people.illya.hunger < 30);
  life.indoor = {
    ...life.indoor!,
    ...roomPoint('einzbern', 'lounge', { x: 238, y: 186 }),
  };
  assert.equal(takeHomeCare(life, actors, 'illya', 'rest').ok, true);
  assert.ok(life.people.illya.energy > 45);
  assert.ok(
    actors.some(
      (a, i) =>
        a.id !== 'illya' &&
        Math.hypot(a.x - positions[i].x, a.y - positions[i].y) > 1,
    ),
  );
  life.minutes = 1320;
  life.indoor = {
    ...life.indoor!,
    ...roomPoint('einzbern', 'rest', { x: 610, y: 395 }),
  };
  const point = { x: player.x, y: player.y };
  assert.equal(takeHomeCare(life, actors, 'illya', 'sleep').ok, true);
  assert.ok(Math.abs(life.minutes - 1860) < 1e-5);
  assert.equal(life.people.illya.energy, 100);
  assert.deepEqual({ x: player.x, y: player.y }, point);
  assert.equal(life.indoor.actor, 'illya');
  const restored = parseDailyLife(
    JSON.parse(JSON.stringify(snapshotLife(life, actors))),
  );
  assert.deepEqual(
    restored.events.filter((e) => e.care),
    life.events.filter((e) => e.care),
  );
  assert.deepEqual(restored.people.illya, life.people.illya);
});

void test('wrong room, another home, daytime overnight sleep and malformed time cannot grant recovery', () => {
  const { life, actors } = household();
  const before = JSON.stringify(snapshotLife(life, actors));
  assert.equal(takeHomeCare(life, actors, 'illya', 'sleep').ok, false);
  assert.equal(takeHomeCare(life, actors, 'kiritsugu', 'meal').ok, false);
  assert.equal(takeHomeCare(life, actors, 'admin', 'meal').ok, false);
  for (const invalid of [NaN, Infinity, -1, 721])
    assert.equal(spendPlayerTime(life, actors, 'illya', invalid).elapsed, 0);
  assert.equal(JSON.stringify(snapshotLife(life, actors)), before);
  life.indoor = {
    ...life.indoor!,
    ...roomPoint('einzbern', 'rest', { x: 610, y: 395 }),
  };
  assert.match(homeCarePlan(life, 'illya', 'sleep').message, /白天/);
  life.indoor.home = 'emiya';
  assert.equal(homeCarePlan(life, 'illya', 'nap').ok, false);
});

void test('refresh retains genuine care records but rejects forged duration and future rewards', () => {
  const { life, actors } = household();
  takeHomeCare(life, actors, 'illya', 'meal');
  const saved = snapshotLife(life, actors);
  for (const change of [
    { duration: 0 },
    { duration: 720 },
    { startedAt: life.minutes + 1 },
    { action: 'repair' },
  ]) {
    const bad = structuredClone(saved);
    Object.assign(bad.events.find((e) => e.care)!.care!, change);
    assert.throws(() => parseDailyLife(bad));
  }
  const old = createDailyLife();
  assert.ok(parseDailyLife(old));
});

void test('sleep warns about an existing promise and never counts absence as attendance', () => {
  const { life, actors, player } = repairScene();
  life.minutes = 1215;
  const topic = lifeTopic(life, 'illya', 'kiritsugu', 'read');
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      {
        id: 'pre-sleep-promise',
        createdAt: '2026-10-05T00:00:00.000Z',
        speaker: 'illya',
        target: 'kiritsugu',
        message: topic.message,
        reply: topic.reply,
        source: 'preset',
      },
      topic.effects,
    ).ok,
    true,
  );
  assert.equal(life.appointments.length, 1);
  Object.assign(player, nearestWalkable(FATE_HOMES.einzbern), { path: [] });
  life.indoor = {
    actor: 'illya',
    home: 'einzbern',
    layout: 2,
    ...roomPoint('einzbern', 'rest', { x: 610, y: 395 }),
  };
  assert.match(homeCarePlan(life, 'illya', 'sleep').warning ?? '', /约定/);
  assert.equal(takeHomeCare(life, actors, 'illya', 'sleep').ok, true);
  assert.ok(['missed', 'cancelled'].includes(life.appointments[0].status));
  assert.equal(life.appointments[0].shared, 0);
  assert.doesNotMatch(
    lifeTopic(life, 'illya', 'kiritsugu', 'recall').reply,
    /那次确实一起/,
  );
  assert.ok(parseDailyLife(snapshotLife(life, actors)));
});

void test('role-specific recollection uses the visible experience, not another completed journal entry', () => {
  const { life, actors } = repairScene();
  actOnPastime(life, actors, 'illya', 'repair-inspect', 'kiritsugu');
  for (const command of [
    'repair-listen',
    'repair-adjust',
    'repair-test',
  ] as const)
    actOnPastime(life, actors, 'illya', command, 'kiritsugu');
  const done = life.pastimes![0];
  life.minutes += 5;
  life.pastimes!.push({
    ...done,
    id: life.nextId++,
    host: 'kiritsugu',
    target: 'illya',
    updatedAt: done.updatedAt + 5,
  });
  assert.match(
    lifeTopic(life, 'illya', 'kiritsugu', 'recall').reply,
    /你修过.*收音机/,
  );
  const bond = currentBond(life, 'illya', 'kiritsugu')!;
  bond.cutoff = life.nextId;
  assert.doesNotMatch(
    lifeTopic(life, 'illya', 'kiritsugu', 'recall').reply,
    /收音机|我帮你检修/,
  );
});

void test('repair choices survive refresh; no timer, repeated step or skipped test can finish the work', () => {
  const { life, actors, player } = repairScene();
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-inspect', 'kiritsugu').ok,
    true,
  );
  advancePastimes(life, actors, 20, 'illya');
  assert.equal(life.pastimes![0].progress, 0);
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-test', 'kiritsugu').ok,
    false,
  );
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-listen', 'kiritsugu').ok,
    true,
  );
  assert.match(life.pastimes![0].reply, /颠簸/);
  const minute = life.minutes;
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-listen', 'kiritsugu').ok,
    false,
  );
  assert.equal(life.minutes, minute);
  const restored = parseDailyLife(snapshotLife(life, actors));
  player.x += 200;
  assert.equal(
    actOnPastime(restored, actors, 'illya', 'repair-adjust', 'kiritsugu').ok,
    false,
  );
  Object.assign(player, DISTRICT_PLACES.cafe);
  assert.equal(
    actOnPastime(restored, actors, 'illya', 'repair-adjust', 'kiritsugu').ok,
    true,
  );
  assert.equal(restored.belongings.kiritsugu.condition, 60);
  assert.equal(
    actOnPastime(restored, actors, 'illya', 'repair-test', 'kiritsugu').ok,
    true,
  );
  assert.equal(restored.belongings.kiritsugu.condition, 78);
  assert.match(
    lifeTopic(restored, 'illya', 'kiritsugu', 'recall').reply,
    /你修过.*收音机/,
  );
  assert.match(
    lifeTopic(restored, 'kiritsugu', 'illya', 'recall').reply,
    /我帮你检修/,
  );
  assert.doesNotMatch(
    lifeTopic(restored, 'rin', 'kiritsugu', 'recall').reply,
    /收音机/,
  );
  assert.ok(
    currentBond(restored, 'illya', 'kiritsugu')!.archive!.some(
      (m) => m.kind === 'experience' && m.activity === 'repair',
    ),
  );
  assert.ok(parseDailyLife(snapshotLife(restored, actors)));
});

void test('listening and looking have distinct results; legacy timed repair keeps its previous reward', () => {
  for (const [approach, benefit] of [
    ['repair-listen', 18],
    ['repair-look', 12],
  ] as const) {
    const { life, actors } = repairScene();
    actOnPastime(life, actors, 'illya', 'repair-inspect', 'kiritsugu');
    for (const command of [approach, 'repair-adjust', 'repair-test'] as const)
      assert.equal(
        actOnPastime(life, actors, 'illya', command, 'kiritsugu').ok,
        true,
      );
    assert.equal(life.belongings.kiritsugu.condition, 60 + benefit);
    const before = JSON.stringify(life);
    assert.equal(
      actOnPastime(life, actors, 'illya', 'repair-test', 'kiritsugu').ok,
      false,
    );
    assert.equal(JSON.stringify(life), before);
  }
  const { life, actors } = repairScene();
  actOnPastime(life, actors, 'illya', 'repair-inspect', 'kiritsugu');
  delete life.pastimes![0].work;
  advancePastimes(life, actors, 12, 'illya');
  assert.equal(life.belongings.kiritsugu.condition, 72);
  assert.equal(
    parseDailyLife(snapshotLife(life, actors)).pastimes![0].phase,
    'done',
  );
});

void test('a body or schedule interruption during work grants no result and leaves a valid cancelled save', () => {
  const { life, actors } = repairScene();
  actOnPastime(life, actors, 'illya', 'repair-inspect', 'kiritsugu');
  life.people.kiritsugu.hunger = 84.99;
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-listen', 'kiritsugu').ok,
    false,
  );
  assert.equal(life.pastimes![0].phase, 'cancelled');
  assert.ok(life.belongings.kiritsugu.condition <= 60);
  assert.equal(life.belongings.kiritsugu.repairs, 0);
  assert.ok(parseDailyLife(snapshotLife(life, actors)));
});

void test('meal time can be passed only after real player arrival and still requires the NPC to attend', () => {
  const { life, actors, player } = repairScene();
  actOnPastime(life, actors, 'illya', 'prepare-simple', 'kiritsugu');
  actOnPastime(life, actors, 'illya', 'invite', 'kiritsugu');
  const a = life.appointments[0];
  assert.ok(a);
  assert.equal(
    actOnPastime(life, actors, 'illya', 'wait-meal', 'kiritsugu').ok,
    false,
  );
  playerAppointment(life, actors, 'illya', a.id, 'attend');
  for (let i = 0; i < 300 && player.path.length; i++)
    stepActor(player, 0.05, undefined, 55);
  assert.deepEqual(player.path, []);
  for (let i = 0; i < 8 && life.pastimes![0].phase === 'invited'; i++)
    assert.equal(
      actOnPastime(life, actors, 'illya', 'wait-meal', 'kiritsugu').ok,
      true,
    );
  assert.equal(life.pastimes![0].phase, 'done');
  assert.equal(a.status, 'fulfilled');
  assert.match(life.pastimes![0].reply, /别凉了/);
  assert.match(
    lifeTopic(life, 'illya', 'kiritsugu', 'recall').reply,
    /坐下来吃/,
  );
  assert.ok(parseDailyLife(snapshotLife(life, actors)));
});

void test('finishing a seated meal at a fractional game minute needs only one click', () => {
  const { life, actors, player } = repairScene();
  life.minutes = 2 * 1440 + 13 * 60 + 47.123;
  actOnPastime(life, actors, 'illya', 'prepare-simple', 'kiritsugu');
  assert.equal(
    actOnPastime(life, actors, 'illya', 'invite', 'kiritsugu').ok,
    true,
  );
  const a = life.appointments[0];
  playerAppointment(life, actors, 'illya', a.id, 'attend');
  for (let i = 0; i < 300 && player.path.length; i++)
    stepActor(player, 0.05, undefined, 55);
  for (let i = 0; i < 3 && a.status === 'pending'; i++)
    actOnPastime(life, actors, 'illya', 'wait-meal', 'kiritsugu');
  assert.equal(a.status, 'meeting');
  assert.ok(a.shared > 0 && a.shared < 10);
  const result = actOnPastime(life, actors, 'illya', 'wait-meal', 'kiritsugu');
  assert.equal(result.ok, true);
  assert.equal(a.status, 'fulfilled');
  assert.equal(a.shared, 10);
  assert.equal(life.pastimes![0].phase, 'done');
  const completed = JSON.stringify(life);
  assert.equal(
    actOnPastime(life, actors, 'illya', 'wait-meal', 'kiritsugu').ok,
    false,
  );
  assert.equal(JSON.stringify(life), completed);
});

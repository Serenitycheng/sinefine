import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  type DailyLife,
} from '../lib/fate-life';
import { DISTRICT_PLACES } from '../lib/fate-district';
import {
  createStreetActors,
  isWalkable,
  pathTo,
  stepActor,
  type Actor,
} from '../lib/street';
import {
  advancePublicOutings,
  cancelPublicOuting,
  choosePublicOuting,
  createPublicOutings,
  currentPublicOuting,
  interactPublicOuting,
  parsePublicOutings,
  publicOutingHolds,
  publicOutingPoint,
  startPublicOuting,
  type CafeOrder,
  type PublicOutingKind,
} from '../lib/fate-public-outings';
import { currentBond } from '../lib/fate-social';
import {
  createFateBackup,
  readFateBackupText,
  serializeFateBackup,
} from '../lib/fate-backup';
import { emptyFateSave } from '../lib/fate-state';

function setup(place: 'cafe' | 'park' = 'cafe') {
  const life = createDailyLife(),
    actors = createStreetActors();
  life.minutes = 1440 * 5 + 1080;
  life.publicOutings = createPublicOutings();
  for (const id of ['rin', 'shirou', 'waver'] as const) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      DISTRICT_PLACES[place],
    );
    life.people[id].activity = null;
    life.people[id].hunger = 60;
    life.people[id].energy = 40;
  }
  return { life, actors };
}
function advance(
  life: DailyLife,
  actors: Actor[],
  minutes: number,
  controlled: string | null = 'rin',
) {
  life.minutes += minutes;
  advancePublicOutings(life, actors, controlled, minutes);
}
function finishCafe(
  order: CafeOrder = 'set-meal',
  choice: 'slow' | 'quick' = 'quick',
) {
  const { life, actors } = setup();
  life.belongings.rin.groceries = 1;
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'cafe', { order }).ok,
    true,
  );
  advance(life, actors, 3);
  assert.equal(choosePublicOuting(life, actors, 'rin', choice).ok, true);
  advance(life, actors, currentPublicOuting(life, 'rin')!.total - 3);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
  return { life, actors };
}
function movePlayerToPoint(life: DailyLife, actors: Actor[]) {
  const actor = actors.find((a) => a.id === 'rin')!;
  const point = publicOutingPoint(currentPublicOuting(life, 'rin')!);
  actor.path = pathTo(actor, point);
  for (let step = 0; step < 3000 && actor.path.length; step++) {
    stepActor(actor, 0.05);
    advance(life, actors, 0.1);
  }
  assert.ok(Math.hypot(actor.x - point.x, actor.y - point.y) < 2);
  for (
    let step = 0;
    step < 600 && currentPublicOuting(life, 'rin')!.phase !== 'ready';
    step++
  )
    advance(life, actors, 0.1);
  assert.equal(currentPublicOuting(life, 'rin')!.phase, 'ready');
}

void test('cafe requires actual local time, a pacing choice and on-site finish before settling exactly once', () => {
  const { life, actors } = setup();
  const before = life.people.rin.hunger;
  assert.equal(startPublicOuting(life, actors, 'rin', 'cafe').ok, true);
  assert.equal(life.people.rin.hunger, before);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
  advance(life, actors, 10);
  const outing = currentPublicOuting(life, 'rin')!;
  assert.equal(outing.phase, 'choice');
  assert.equal(outing.progress, 3);
  assert.equal(life.publicOutings.completed.length, 0);
  assert.equal(choosePublicOuting(life, actors, 'rin', 'wait').ok, false);
  assert.equal(choosePublicOuting(life, actors, 'rin', 'slow').ok, true);
  assert.equal(outing.total, 10);
  advance(life, actors, 7);
  assert.equal(outing.phase, 'ready');
  assert.equal(life.people.rin.hunger, before);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
  assert.equal(life.people.rin.hunger, before - 30);
  assert.equal(life.publicOutings.completed.length, 1);
  const finished = structuredClone(life);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
  assert.deepEqual(life, finished);
  life.events = [];
  assert.equal(startPublicOuting(life, actors, 'rin', 'cafe').ok, false);
  assert.equal(life.publicOutings.completed.length, 1);
});

void test('cafe food and tea have different needs results, ingredients are spent once, cancellation is not completion', () => {
  const meal = finishCafe('set-meal', 'quick');
  const vegetables = finishCafe('vegetables', 'slow');
  const tea = finishCafe('tea', 'slow');
  assert.equal(meal.life.people.rin.hunger, 30);
  assert.equal(vegetables.life.people.rin.hunger, 26);
  assert.equal(tea.life.people.rin.hunger, 60);
  assert.ok(tea.life.people.rin.energy > meal.life.people.rin.energy);
  assert.match(tea.life.publicOutings.completed[0].summary, /不算一顿饭/);
  assert.equal(vegetables.life.belongings.rin.groceries, 0);
  const { life, actors } = setup();
  life.belongings.rin.groceries = 0;
  const before = structuredClone(life);
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'cafe', { order: 'vegetables' }).ok,
    false,
  );
  assert.deepEqual(life, before);
  life.belongings.rin.groceries = 1;
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'cafe', { order: 'vegetables' }).ok,
    true,
  );
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'cafe', { order: 'vegetables' }).ok,
    false,
  );
  assert.equal(life.belongings.rin.groceries, 0);
  assert.equal(cancelPublicOuting(life, 'rin', actors).ok, true);
  assert.equal(life.publicOutings.completed.length, 0);
  assert.equal(Object.keys(life.bonds).length, 0);
  assert.equal(life.belongings.rin.groceries, 0);
  assert.match(life.events.at(-1)!.text, /没有记成完成/);
});

void test('leaving, changing controlled character, pausing or entering a home cannot complete a cafe visit remotely', () => {
  const { life, actors } = setup();
  assert.equal(startPublicOuting(life, actors, 'rin', 'cafe').ok, true);
  const actor = actors.find((a) => a.id === 'rin')!;
  const outing = currentPublicOuting(life, 'rin')!;
  advance(life, actors, 2);
  advancePublicOutings(life, actors, 'rin', 0);
  advancePublicOutings(life, actors, 'rin', Number.NaN);
  assert.equal(outing.progress, 2);
  advance(life, actors, 5, 'shirou');
  assert.equal(outing.progress, 2);
  Object.assign(actor, DISTRICT_PLACES.park);
  advance(life, actors, 5);
  assert.equal(outing.progress, 2);
  Object.assign(actor, DISTRICT_PLACES.cafe);
  life.people.rin.activity = {
    kind: 'rest',
    phase: 'doing',
    home: 'tohsaka',
    remaining: 20,
    source: 'rules',
    reason: '室内',
  };
  advance(life, actors, 5);
  assert.equal(outing.progress, 2);
  assert.equal(choosePublicOuting(life, actors, 'rin', 'quick').ok, false);
  life.people.rin.activity = null;
  for (let i = 0; i < 4; i++) advance(life, actors, 20, null);
  assert.equal(life.publicOutings.active.length, 0);
  assert.equal(life.publicOutings.completed.length, 0);
  assert.equal(life.people.rin.hunger, 60);
});

void test('park discovery requires two different safe reachable observation points and a real branch choice', () => {
  for (const kind of ['river', 'birds'] as PublicOutingKind[]) {
    const { life, actors } = setup('park');
    assert.equal(startPublicOuting(life, actors, 'rin', kind).ok, true);
    const outing = currentPublicOuting(life, 'rin')!;
    const firstPoint = publicOutingPoint(outing);
    assert.ok(isWalkable(firstPoint));
    advance(life, actors, 2);
    assert.equal(outing.progress, 0);
    assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
    movePlayerToPoint(life, actors);
    assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
    assert.equal(outing.phase, 'choice');
    assert.equal(life.publicOutings.completed.length, 0);
    assert.equal(choosePublicOuting(life, actors, 'rin', 'wait').ok, true);
    const secondPoint = publicOutingPoint(outing);
    assert.ok(isWalkable(secondPoint));
    assert.ok(
      Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y) >
        75,
    );
    assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
    movePlayerToPoint(life, actors);
    assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
    assert.equal(life.publicOutings.completed.length, 1);
    assert.match(life.publicOutings.completed[0].summary, /走过两处河岸观察点/);
    assert.equal(Object.keys(life.bonds).length, 0);
    life.events = [];
    Object.assign(
      actors.find((a) => a.id === 'rin')!,
      DISTRICT_PLACES.park,
    );
    assert.equal(
      startPublicOuting(
        life,
        actors,
        'rin',
        kind === 'river' ? 'birds' : 'river',
      ).ok,
      false,
    );
  }
});

void test('approaching and waiting produce distinct discoveries rather than a currency reward', () => {
  const results: string[] = [];
  for (const choice of ['wait', 'approach'] as const) {
    const { life, actors } = setup('park');
    const economy = structuredClone(life.economy);
    startPublicOuting(life, actors, 'rin', 'birds');
    movePlayerToPoint(life, actors);
    interactPublicOuting(life, actors, 'rin');
    choosePublicOuting(life, actors, 'rin', choice);
    movePlayerToPoint(life, actors);
    interactPublicOuting(life, actors, 'rin');
    results.push(life.publicOutings.completed[0].summary);
    assert.deepEqual(life.economy, economy);
  }
  assert.notEqual(results[0], results[1]);
  assert.match(results[0], /看见|看见|等到/);
  assert.match(results[1], /飞|鸟鸣停/);
});

void test('a companion must be available and physically walk through both points before shared memory is written', () => {
  const { life, actors } = setup('park');
  const other = actors.find((a) => a.id === 'shirou')!;
  life.people.shirou.hunger = 90;
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'river', { companion: 'shirou' }).ok,
    false,
  );
  life.people.shirou.hunger = 30;
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'river', { companion: 'shirou' }).ok,
    true,
  );
  assert.equal(publicOutingHolds(life, 'shirou', 'rin', actors), true);
  assert.equal(publicOutingHolds(life, 'shirou', null, actors), false);
  const start = { x: other.x, y: other.y };
  advance(life, actors, 0.1);
  assert.ok(Math.hypot(other.x - start.x, other.y - start.y) > 0);
  assert.ok(Math.hypot(other.x - start.x, other.y - start.y) < 4);
  movePlayerToPoint(life, actors);
  interactPublicOuting(life, actors, 'rin');
  choosePublicOuting(life, actors, 'rin', 'wait');
  assert.equal(currentBond(life, 'rin', 'shirou'), undefined);
  movePlayerToPoint(life, actors);
  const actual = { x: other.x, y: other.y };
  Object.assign(other, DISTRICT_PLACES.cafe);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
  assert.equal(currentBond(life, 'rin', 'shirou'), undefined);
  Object.assign(other, actual);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
  assert.ok(
    currentBond(life, 'rin', 'shirou')?.archive?.some(
      (m) => m.kind === 'experience' && m.activity === 'walk',
    ),
  );
  assert.equal(life.publicOutings.completed[0].companion, 'shirou');
  assert.equal(other.path.length, 0);
  assert.equal(publicOutingHolds(life, 'shirou', 'rin', actors), false);
});

void test('companion movement uses motion seconds independently from the simulation clock rate', () => {
  const slow = setup('park'),
    fast = setup('park');
  for (const fixture of [slow, fast])
    startPublicOuting(fixture.life, fixture.actors, 'rin', 'river', {
      companion: 'shirou',
    });
  slow.life.minutes += 0.01;
  fast.life.minutes += 0.1;
  advancePublicOutings(slow.life, slow.actors, 'rin', 0.01, 0.05);
  advancePublicOutings(fast.life, fast.actors, 'rin', 0.1, 0.05);
  const a = slow.actors.find((p) => p.id === 'shirou')!,
    b = fast.actors.find((p) => p.id === 'shirou')!;
  assert.equal(a.x, b.x);
  assert.equal(a.y, b.y);
});

void test('urgent companion needs, era switch and cancellation release a route without forging completion', () => {
  for (const reason of ['hunger', 'era', 'cancel']) {
    const { life, actors } = setup('park');
    startPublicOuting(life, actors, 'rin', 'river', { companion: 'waver' });
    if (reason === 'hunger') life.people.waver.hunger = 90;
    else if (reason === 'era') life.waverStage = 'adult';
    else cancelPublicOuting(life, 'rin', actors);
    advance(life, actors, 0.1);
    assert.equal(life.publicOutings.active.length, 0);
    assert.equal(life.publicOutings.completed.length, 0);
    assert.equal(actors.find((a) => a.id === 'waver')!.path.length, 0);
    assert.equal(currentBond(life, 'rin', 'waver'), undefined);
  }
});

void test('active choices and completed personal outings survive current saves, backups and old missing fields', () => {
  const { life, actors } = finishCafe('vegetables', 'slow');
  const save = emptyFateSave();
  save.life = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(save.life).publicOutings, life.publicOutings);
  const backup = createFateBackup(save, '到场玩法验收');
  const restored = readFateBackupText(serializeFateBackup(backup));
  assert.deepEqual(restored.save.life!.publicOutings, life.publicOutings);
  const old = JSON.parse(JSON.stringify(save.life)) as Record<string, unknown>;
  delete old.publicOutings;
  assert.deepEqual(parseDailyLife(old).publicOutings, createPublicOutings());
  const pending = setup();
  startPublicOuting(pending.life, pending.actors, 'rin', 'cafe');
  advance(pending.life, pending.actors, 3);
  assert.deepEqual(
    parseDailyLife(snapshotLife(pending.life, pending.actors)).publicOutings,
    pending.life.publicOutings,
  );
});

void test('refreshing at choice and ready never repeats ingredients or a completed reward', () => {
  const fixture = setup();
  let life = fixture.life;
  const actors = fixture.actors;
  life.belongings.rin.groceries = 1;
  startPublicOuting(life, actors, 'rin', 'cafe', { order: 'vegetables' });
  advance(life, actors, 3);
  life = parseDailyLife(snapshotLife(life, actors));
  assert.equal(currentPublicOuting(life, 'rin')!.phase, 'choice');
  assert.equal(life.belongings.rin.groceries, 0);
  choosePublicOuting(life, actors, 'rin', 'quick');
  for (let i = 0; i < 31; i++) advance(life, actors, 0.1);
  life = parseDailyLife(snapshotLife(life, actors));
  assert.equal(currentPublicOuting(life, 'rin')!.phase, 'ready');
  assert.equal(life.people.rin.hunger, 60);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
  life = parseDailyLife(snapshotLife(life, actors));
  assert.equal(life.people.rin.hunger, 26);
  assert.equal(life.belongings.rin.groceries, 0);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, false);
  assert.equal(startPublicOuting(life, actors, 'rin', 'cafe').ok, false);
  advance(life, actors, 10);
  assert.equal(life.people.rin.hunger, 26);
  assert.equal(life.publicOutings.completed.length, 1);
});

void test('closing an abandoned outing preserves a companion who has resumed a different real activity', () => {
  const { life, actors } = setup('park');
  startPublicOuting(life, actors, 'rin', 'river', { companion: 'shirou' });
  const person = life.people.shirou;
  person.activity = {
    kind: 'eat',
    phase: 'going',
    remaining: 30,
    source: 'rules',
    reason: '先吃饭',
  };
  const actor = actors.find((a) => a.id === 'shirou')!;
  actor.path = pathTo(actor, DISTRICT_PLACES.cafe);
  const route = structuredClone(actor.path);
  advance(life, actors, 0.1);
  assert.equal(life.publicOutings.active.length, 0);
  assert.equal(person.activity.kind, 'eat');
  assert.deepEqual(actor.path, route);
  assert.equal(life.publicOutings.completed.length, 0);
});

void test('strict outing parsing rejects duplicate occupancy, impossible progress, forged completion and lost reward stamps', () => {
  const pending = setup();
  startPublicOuting(pending.life, pending.actors, 'rin', 'cafe');
  const active = pending.life.publicOutings;
  const duplicate = structuredClone(active);
  duplicate.active.push({ ...duplicate.active[0], id: pending.life.nextId++ });
  assert.throws(() => parsePublicOutings(duplicate, pending.life));
  const impossible = structuredClone(active);
  impossible.active[0].phase = 'ready';
  assert.throws(() => parsePublicOutings(impossible, pending.life));
  const completed = finishCafe();
  const wrong = structuredClone(completed.life.publicOutings);
  wrong.cooldowns = {};
  assert.throws(() => parsePublicOutings(wrong, completed.life));
  const tooSoon = structuredClone(completed.life.publicOutings);
  tooSoon.completed[0].completedAt = tooSoon.completed[0].createdAt;
  assert.throws(() => parsePublicOutings(tooSoon, completed.life));
  const stranger = structuredClone(completed.life.publicOutings);
  stranger.completed[0].companion = 'shirou';
  assert.throws(() => parsePublicOutings(stranger, completed.life));
});

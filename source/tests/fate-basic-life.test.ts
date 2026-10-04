import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceDailyLife,
  applyLifePlan,
  createDailyLife,
  LIFE_IDS,
  LIFE_PLACES,
  lifeDestination,
  parseDailyLife,
  snapshotLife,
} from '../lib/fate-life';
import { FATE_HOMES, homeOf } from '../lib/fate-housing';
import {
  createStreetActors,
  isWalkable,
  pathTo,
  samePavement,
  type Point,
} from '../lib/street';

void test('shared public destinations give every resident a separate reachable pavement spot', () => {
  for (const [kind, place] of [
    ['shop', 'shops'],
    ['read', 'cafe'],
    ['walk', 'street'],
  ] as const) {
    const positions = LIFE_IDS.map((id) => lifeDestination(id, kind));
    positions.forEach((point, i) => {
      assert.ok(
        isWalkable(point),
        `${kind}: ${LIFE_IDS[i]} must stay on pavement`,
      );
      assert.ok(
        Math.hypot(
          point.x - LIFE_PLACES[place].x,
          point.y - LIFE_PLACES[place].y,
        ) < 360,
        `${kind}: ${LIFE_IDS[i]} remains near the place`,
      );
      for (let j = 0; j < i; j++)
        assert.ok(
          Math.hypot(point.x - positions[j].x, point.y - positions[j].y) >= 60,
          `${kind}: ${LIFE_IDS[i]} and ${LIFE_IDS[j]} overlap`,
        );
      let previous: Point = LIFE_PLACES[place];
      const path = pathTo(previous, point);
      assert.ok(path.length);
      for (const next of path) {
        assert.ok(samePavement(previous, next));
        previous = next;
      }
    });
  }
});

void test('an old shop crowd disperses by walking without moving the player or granting unfinished work', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const crowd = [
    'cu',
    'diarmuid',
    'emiya',
    'kirei',
    'medusa',
    'gilgamesh',
    'iskandar',
    'kariya',
  ] as const;
  life.minutes = 1000;
  life.nextEncounter = 1e9;
  for (const id of crowd) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      LIFE_PLACES.shops,
    );
    Object.assign(life.people[id], {
      hunger: 10,
      energy: 90,
      activity: {
        kind: 'repair',
        phase: 'doing',
        remaining: 100,
        reason: '正在检修。',
        source: 'rules',
      },
    });
  }
  const controlled = actors.find((a) => a.id === 'cu')!;
  const before = { x: controlled.x, y: controlled.y };
  for (let frame = 0; frame < 240; frame++) {
    const previous = actors.map((a) => ({ id: a.id, x: a.x, y: a.y }));
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 1,
      controlled: 'cu',
    });
    for (const actor of actors) {
      const last = previous.find((p) => p.id === actor.id)!;
      assert.ok(isWalkable(actor));
      assert.ok(
        Math.hypot(actor.x - last.x, actor.y - last.y) <= 2.76,
        'separation must walk, never teleport',
      );
    }
  }
  assert.deepEqual({ x: controlled.x, y: controlled.y }, before);
  for (const id of crowd.slice(1)) {
    const actor = actors.find((a) => a.id === id)!;
    assert.ok(
      Math.hypot(actor.x - before.x, actor.y - before.y) >= 50,
      `${id} leaves the old pile`,
    );
    assert.equal(life.belongings[id].repairs, 0);
  }
  const saved = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
});

const running = { running: true, speed: 4 as const, controlled: null };

void test('urgent hunger takes priority over going to bed, using the actual nearer home', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 1321;
  life.people.cu.hunger = 92;
  const actor = actors.find((a) => a.id === 'cu')!;
  Object.assign(
    actor,
    lifeDestination('cu', 'eat', homeOf('cu', life.housing)),
  );
  advanceDailyLife(life, actors, 0.05, running);
  assert.equal(life.people.cu.activity?.kind, 'eat');
  assert.equal(life.people.cu.activity.home, homeOf('cu', life.housing));
  assert.equal(life.people.cu.activity.phase, 'doing');
  assert.ok(
    life.people.cu.hunger > 90,
    'arrival must not instantly claim a completed meal',
  );
  const saved = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
  const invalid = structuredClone(saved);
  invalid.people.cu.activity!.home =
    saved.people.cu.activity!.home === 'church' ? 'emiya' : 'church';
  assert.throws(() => parseDailyLife(invalid), /行动住址无效/);
});

void test('a hungry resident stops an unfinished errand without receiving its reward', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 780;
  life.people.cu.hunger = 84.99;
  life.people.cu.activity = {
    kind: 'repair',
    phase: 'going',
    remaining: 35,
    reason: '先去检修器具。',
    source: 'rules',
  };
  const actor = actors.find((a) => a.id === 'cu')!;
  Object.assign(
    actor,
    lifeDestination('cu', 'eat', homeOf('cu', life.housing)),
  );
  const repairs = life.belongings.cu.repairs;
  advanceDailyLife(life, actors, 0.05, running);
  assert.equal(life.people.cu.activity?.kind, 'eat');
  assert.equal(life.belongings.cu.repairs, repairs);
  assert.ok(life.events.some((e) => e.text.includes('先停下检修日常器具')));
});

void test('a resident already at the cafe eats there rather than making an unnecessary trip home', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 780;
  life.people.cu.hunger = 60;
  Object.assign(
    actors.find((a) => a.id === 'cu')!,
    lifeDestination('cu', 'eat'),
  );
  advanceDailyLife(life, actors, 0.05, running);
  assert.equal(life.people.cu.activity?.kind, 'eat');
  assert.equal(life.people.cu.activity.home, undefined);
  assert.equal(life.people.cu.activity.phase, 'doing');
});

void test('optional AI plans obey the same urgent need and nearby food rules', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 780;
  life.people.cu.hunger = 86;
  const actor = actors.find((a) => a.id === 'cu')!;
  const home = homeOf('cu', life.housing);
  const destination = lifeDestination('cu', 'eat', home);
  Object.assign(actor, destination, { x: destination.x + 30 });
  advanceDailyLife(life, actors, 0.05, running);
  const event = life.events.findLast((e) => e.decision?.person === 'cu')!;
  assert.equal(life.people.cu.activity?.phase, 'going');
  assert.equal(
    applyLifePlan(life, actors, event.id, {
      action: 'read',
      reason: '先看书。',
    }),
    false,
  );
  assert.equal(
    applyLifePlan(life, actors, event.id, {
      action: 'eat',
      reason: '先就近吃饭。',
    }),
    true,
  );
  assert.equal(life.people.cu.activity!.home, home);
  assert.ok(event.text.includes(FATE_HOMES[home].name));
});

void test('sleep increases hunger more slowly while restoring energy and pause freezes both', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 1440;
  life.people.cu.hunger = 60;
  life.people.cu.energy = 30;
  life.people.cu.activity = {
    kind: 'sleep',
    phase: 'doing',
    home: homeOf('cu', life.housing),
    remaining: 360,
    reason: '睡到早晨。',
    source: 'rules',
  };
  Object.assign(
    actors.find((a) => a.id === 'cu')!,
    lifeDestination('cu', 'sleep', homeOf('cu', life.housing)),
  );
  for (let frame = 0; frame < 100; frame++)
    advanceDailyLife(life, actors, 0.05, running);
  assert.ok(life.people.cu.hunger > 60 && life.people.cu.hunger < 62);
  assert.ok(life.people.cu.energy > 40);
  const saved = snapshotLife(life, actors);
  advanceDailyLife(life, actors, 0.05, { ...running, running: false });
  assert.deepEqual(snapshotLife(life, actors), saved);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
});

void test('three days of independent living include food and sleep without sustained starvation, including reload', () => {
  let life = createDailyLife();
  let actors = createStreetActors();
  const ate = new Set<string>();
  const slept = new Set<string>();
  const critical = Object.fromEntries(LIFE_IDS.map((id) => [id, 0]));
  const longest = { ...critical };
  for (let frame = 0; frame < 10800; frame++) {
    advanceDailyLife(life, actors, 0.05, running);
    for (const id of LIFE_IDS) {
      const person = life.people[id];
      if (person.activity?.phase === 'doing') {
        if (person.activity.kind === 'eat') ate.add(id);
        if (person.activity.kind === 'sleep') slept.add(id);
      }
      critical[id] = person.hunger >= 90 ? critical[id] + 0.4 : 0;
      longest[id] = Math.max(longest[id], critical[id]);
      assert.ok(
        person.hunger < 100,
        `${id} must not remain hungry until the need caps out`,
      );
      assert.ok(
        person.energy > 10,
        `${id} should have a workable rest routine`,
      );
    }
    if (frame === 3599) {
      const saved = snapshotLife(life, actors);
      life = parseDailyLife(JSON.parse(JSON.stringify(saved)));
      assert.deepEqual(life, saved);
      actors = createStreetActors();
      for (const actor of actors)
        Object.assign(actor, life.positions[actor.id]);
    }
  }
  for (const id of LIFE_IDS) {
    assert.ok(ate.has(id), `${id} must actually start eating`);
    assert.ok(slept.has(id), `${id} must actually start sleeping`);
    assert.ok(
      longest[id] < 60,
      `${id} spent ${longest[id]} consecutive minutes critically hungry`,
    );
  }
  for (const actor of actors) assert.ok(isWalkable(actor), actor.id);
  const saved = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
});

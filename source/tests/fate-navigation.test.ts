import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { DISTRICT_LANDMARKS, DISTRICT_PLACES } from '../lib/fate-district';
import { FATE_HOMES, isHomeId } from '../lib/fate-housing';
import {
  INDOOR_ENTRY,
  nearbyHomeEntrance,
  nearHomeEntrance,
} from '../lib/fate-indoor-map';
import { createDailyLife, type LifeEvent } from '../lib/fate-life';
import {
  planStreetWalk,
  resolveStreetTeleport,
  streetJourneyStatus,
  teleportStreetActor,
  type StreetJourney,
} from '../lib/fate-navigation';
import {
  advancePublicOutings,
  currentPublicOuting,
  startPublicOuting,
} from '../lib/fate-public-outings';
import { rememberEncounter } from '../lib/fate-social';
import {
  createStreetActors,
  isWalkable,
  stepActor,
  type Point,
} from '../lib/street';

const noInput = { x: 0, y: 0 };

void test('ground clicks reject the middle of the river but allow a small correction beside the school pavement', () => {
  const from = { x: 890.5, y: 760 };
  assert.equal(
    planStreetWalk(from, { x: 1635, y: 650 }, true).status,
    'off-road',
    'clicking water must not silently send the player to a distant bank',
  );
  assert.equal(
    planStreetWalk(from, { x: -300, y: -300 }, true).status,
    'off-road',
  );

  const besidePavement = { x: 942.5, y: 650 };
  assert.equal(isWalkable(besidePavement), false);
  const plan = planStreetWalk(from, besidePavement, true);
  assert.equal(plan.status, 'walking');
  if (plan.status !== 'walking') return;
  assert.ok(isWalkable(plan.destination));
  assert.ok(
    Math.hypot(
      plan.destination.x - besidePavement.x,
      plan.destination.y - besidePavement.y,
    ) < 20,
    'a near-edge click should stay on this pavement, not change streets',
  );
});

void test('invalid coordinates and a stranded starting position cannot create a route', () => {
  const street = { x: 1880, y: 907 };
  for (const bad of [
    { x: NaN, y: 907 },
    { x: 1880, y: Infinity },
    { x: -Infinity, y: 907 },
  ]) {
    assert.equal(planStreetWalk(street, bad).status, 'unreachable');
    assert.equal(planStreetWalk(bad, street).status, 'unreachable');
  }
  const water = { x: 1635, y: 650 };
  assert.equal(isWalkable(water), false);
  assert.equal(planStreetWalk(water, street).status, 'unreachable');
});

void test('clicking the current doorstep reports arrival without starting a new walk', () => {
  const door = HOME_ENTRANCES.kayneth.door;
  assert.equal(planStreetWalk(door, door, true).status, 'arrived');
  assert.equal(
    planStreetWalk({ x: door.x, y: door.y + 1 }, door).status,
    'arrived',
    'a sub-step remainder should not require another journey',
  );
});

void test('a cross-river journey stays walking through intermediate waypoints and arrives only after the bridge crossing', () => {
  const actor = createStreetActors().find((entry) => entry.id === 'shirou')!;
  Object.assign(actor, { x: 620, y: 1160 });
  const target = { x: 1880, y: 907 };
  const plan = planStreetWalk(actor, target);
  assert.equal(plan.status, 'walking');
  if (plan.status !== 'walking') return;
  assert.ok(plan.path.length > 1, 'the river requires a real road detour');
  actor.path = plan.path;
  const journey: StreetJourney = {
    actor: actor.id,
    destination: plan.destination,
    label: '新都河岸步道',
  };
  let crossedRiver = false;
  let frame = 0;
  while (actor.path.length && frame++ < 4000) {
    assert.equal(streetJourneyStatus(journey, actor, noInput), 'walking');
    stepActor(actor, 0.05);
    assert.ok(isWalkable(actor), `left the pavement at frame ${frame}`);
    if (actor.x > 1510 && actor.x < 1760) {
      crossedRiver = true;
      assert.ok(
        Math.abs(actor.y - 907) <= 47.5 || Math.abs(actor.y - 1375) <= 50,
        'the only crossing must be on one of the two bridges',
      );
    }
  }
  assert.ok(crossedRiver);
  assert.equal(
    actor.path.length,
    0,
    'the route must finish instead of sticking',
  );
  assert.ok(Math.hypot(actor.x - target.x, actor.y - target.y) < 1);
  assert.equal(streetJourneyStatus(journey, actor, noInput), 'arrived');
});

void test('stopping or replacing a route never reports arrival at the abandoned destination', () => {
  const actor = createStreetActors()[0];
  Object.assign(actor, { x: 890.5, y: 650 });
  const plan = planStreetWalk(actor, { x: 1880, y: 907 });
  assert.equal(plan.status, 'walking');
  if (plan.status !== 'walking') return;
  const journey: StreetJourney = {
    actor: actor.id,
    destination: plan.destination,
    label: '河岸',
  };
  actor.path = plan.path;
  stepActor(actor, 0.05);
  actor.path = [];
  assert.equal(streetJourneyStatus(journey, actor, noInput), 'cancelled');

  const replacement = planStreetWalk(actor, HOME_ENTRANCES.emiya.door);
  assert.equal(replacement.status, 'walking');
  if (replacement.status !== 'walking') return;
  actor.path = replacement.path;
  assert.equal(streetJourneyStatus(journey, actor, noInput), 'cancelled');
});

void test('manual movement cancels navigation and switching characters cannot inherit an arrival notification', () => {
  const [actor, other] = createStreetActors();
  Object.assign(actor, { x: 890.5, y: 650 });
  const plan = planStreetWalk(actor, { x: 1880, y: 907 });
  assert.equal(plan.status, 'walking');
  if (plan.status !== 'walking') return;
  const journey: StreetJourney = {
    actor: actor.id,
    destination: plan.destination,
    label: '河岸',
  };
  actor.path = plan.path;
  const manual = { x: 0, y: 1 };
  stepActor(actor, 0.05, manual);
  assert.equal(actor.path.length, 0);
  assert.equal(streetJourneyStatus(journey, actor, manual), 'manual');
  assert.equal(streetJourneyStatus(journey, actor, noInput), 'cancelled');

  Object.assign(other, plan.destination, { path: [] });
  assert.equal(streetJourneyStatus(journey, other, noInput), 'cancelled');
});

void test('the interaction shortcut selects the correct house at every visible door and legacy entrance', () => {
  for (const entrance of Object.values(HOME_ENTRANCES)) {
    for (const point of [entrance.door, FATE_HOMES[entrance.home]]) {
      assert.equal(nearbyHomeEntrance(point), entrance.home);
      assert.equal(nearHomeEntrance(point, entrance.home), true);
    }
  }
});

void test('nearby entrance selection agrees with entry permission around its boundary and returns no house in the river', () => {
  const homes = Object.values(HOME_ENTRANCES);
  for (const entrance of homes) {
    for (const anchor of [entrance.door, FATE_HOMES[entrance.home]]) {
      const points: Point[] = [
        { x: anchor.x + 75, y: anchor.y },
        { x: anchor.x - 75, y: anchor.y },
        { x: anchor.x, y: anchor.y + 75 },
        { x: anchor.x, y: anchor.y - 75 },
        { x: anchor.x + 76, y: anchor.y },
      ];
      for (const point of points) {
        const selected = nearbyHomeEntrance(point);
        const canEnterAny = homes.some((home) =>
          nearHomeEntrance(point, home.home),
        );
        assert.equal(selected !== null, canEnterAny);
        if (selected) assert.ok(nearHomeEntrance(point, selected));
      }
    }
  }
  assert.equal(nearbyHomeEntrance({ x: 1635, y: 650 }), null);
  assert.equal(nearbyHomeEntrance({ x: NaN, y: Infinity }), null);
});

void test('walking from the old residential anchor to the visible door ends with that same house ready for interaction', () => {
  const actor = createStreetActors()[0];
  Object.assign(actor, {
    x: FATE_HOMES.kayneth.x,
    y: FATE_HOMES.kayneth.y,
  });
  const plan = planStreetWalk(actor, HOME_ENTRANCES.kayneth.door);
  assert.equal(plan.status, 'walking');
  if (plan.status !== 'walking') return;
  actor.path = plan.path;
  let frame = 0;
  while (actor.path.length && frame++ < 1500) {
    stepActor(actor, 0.05);
    assert.ok(isWalkable(actor));
  }
  assert.equal(actor.path.length, 0);
  assert.equal(nearbyHomeEntrance(actor), 'kayneth');
  assert.ok(nearHomeEntrance(actor, 'kayneth'));
  assert.ok(
    Math.hypot(
      actor.x - HOME_ENTRANCES.kayneth.door.x,
      actor.y - HOME_ENTRANCES.kayneth.door.y,
    ) < 1,
  );
});

void test('teleport destinations reject nonfinite input and safely recover off-road finite points', () => {
  for (const invalid of [
    { x: NaN, y: 907 },
    { x: 1880, y: Infinity },
    { x: -Infinity, y: 907 },
  ]) {
    assert.equal(resolveStreetTeleport(invalid), null);
  }
  for (const point of [
    { x: 1635, y: 650 },
    { x: -300, y: -300 },
    { x: 1880, y: 907 },
  ]) {
    const destination = resolveStreetTeleport(point);
    assert.ok(destination);
    assert.ok(isWalkable(destination));
  }
});

void test('all fourteen landmark teleports land within interaction range and can continue walking along a real road', () => {
  assert.equal(DISTRICT_LANDMARKS.length, 14);
  for (const place of DISTRICT_LANDMARKS) {
    const life = createDailyLife();
    const actors = createStreetActors();
    const actor = actors.find((entry) => entry.id === 'shirou')!;
    const destination = isHomeId(place.id)
      ? HOME_ENTRANCES[place.id].door
      : place;
    assert.equal(
      teleportStreetActor(life, actors, actor.id, destination).ok,
      true,
    );
    assert.ok(isWalkable(actor), `${place.id}: landed outside the road`);
    assert.deepEqual(life.positions[actor.id], { x: actor.x, y: actor.y });
    if (isHomeId(place.id)) {
      assert.ok(nearHomeEntrance(actor, place.id), place.id);
      assert.equal(nearbyHomeEntrance(actor), place.id);
    } else {
      assert.ok(Math.hypot(actor.x - place.x, actor.y - place.y) <= 75);
    }

    const start = { x: actor.x, y: actor.y };
    const onward = planStreetWalk(actor, { x: 1160, y: 840 });
    assert.equal(onward.status, 'walking', place.id);
    if (onward.status !== 'walking') continue;
    actor.path = onward.path;
    for (let frame = 0; frame < 30 && actor.path.length; frame++) {
      stepActor(actor, 0.05);
      assert.ok(
        isWalkable(actor),
        `${place.id}: onward movement left the road`,
      );
    }
    assert.ok(
      Math.hypot(actor.x - start.x, actor.y - start.y) > 5,
      `${place.id}: teleport must not trap the character against a building`,
    );
  }
});

void test('teleporting one resident preserves other NPCs, pending promises, memories and unfinished public activity progress', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const actor = actors.find((entry) => entry.id === 'rin')!;
  Object.assign(actor, DISTRICT_PLACES.cafe);
  life.people.rin.activity = null;
  assert.equal(
    startPublicOuting(life, actors, 'rin', 'cafe', { order: 'tea' }).ok,
    true,
  );
  life.minutes += 1;
  advancePublicOutings(life, actors, 'rin', 1);
  assert.equal(currentPublicOuting(life, 'rin')?.progress, 1);

  const invitation: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: '两人在场约好稍后散步',
    dialogue: {
      speaker: 'rin',
      target: 'shirou',
      message: '一小时后一起在林荫路边散步，好吗？',
      reply: '好，约好了。',
      source: 'preset',
    },
  };
  life.events.push(invitation);
  rememberEncounter(life, invitation);
  assert.ok(
    life.appointments.some((appointment) => appointment.start > life.minutes),
  );
  assert.ok(Object.keys(life.bonds).length > 0);
  life.people.rin.activity = {
    kind: 'walk',
    phase: 'going',
    remaining: 20,
    source: 'rules',
    reason: '之前的路线',
  };
  actor.path = [{ ...DISTRICT_PLACES.park }];
  actor.frame = 2;
  actor.phase = 0.6;
  life.indoor = { actor: actor.id, home: 'emiya', layout: 2, ...INDOOR_ENTRY };

  const expectedLife = structuredClone(life);
  const expectedActors = structuredClone(actors);
  const target = HOME_ENTRANCES.kayneth.door;
  expectedLife.positions.rin = { ...target };
  expectedLife.people.rin.activity = null;
  delete expectedLife.indoor;
  Object.assign(
    expectedActors.find((entry) => entry.id === 'rin')!,
    target,
    {
      path: [],
      frame: 0,
      phase: 0,
    },
  );

  assert.equal(teleportStreetActor(life, actors, 'rin', target).ok, true);
  assert.deepEqual(actors, expectedActors);
  assert.deepEqual(life, expectedLife);
  assert.equal(currentPublicOuting(life, 'rin')?.progress, 1);
  assert.equal(life.publicOutings.completed.length, 0);
});

void test('failed teleports leave both the entire save and every actor untouched', () => {
  const attempts = [
    {
      control: null,
      destination: DISTRICT_PLACES.park,
      missingActor: false,
      foreignInterior: false,
    },
    {
      control: 'rin' as const,
      destination: DISTRICT_PLACES.park,
      missingActor: true,
      foreignInterior: false,
    },
    {
      control: 'rin' as const,
      destination: { x: NaN, y: 907 },
      missingActor: false,
      foreignInterior: false,
    },
    {
      control: 'rin' as const,
      destination: { x: 1880, y: Infinity },
      missingActor: false,
      foreignInterior: false,
    },
    {
      control: 'rin' as const,
      destination: DISTRICT_PLACES.park,
      missingActor: false,
      foreignInterior: true,
    },
  ];
  for (const attempt of attempts) {
    const life = createDailyLife();
    const actors = createStreetActors().filter(
      (actor) => !attempt.missingActor || actor.id !== 'rin',
    );
    life.people.rin.activity = {
      kind: 'read',
      phase: 'doing',
      remaining: 15,
      source: 'rules',
      reason: '正在阅读',
    };
    if (attempt.foreignInterior) {
      life.indoor = {
        actor: 'shirou',
        home: 'emiya',
        layout: 2,
        ...INDOOR_ENTRY,
      };
    }
    const beforeLife = structuredClone(life);
    const beforeActors = structuredClone(actors);
    assert.equal(
      teleportStreetActor(life, actors, attempt.control, attempt.destination)
        .ok,
      false,
    );
    assert.deepEqual(life, beforeLife);
    assert.deepEqual(actors, beforeActors);
  }
});

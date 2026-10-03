import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DISTRICT_LANDMARKS,
  DISTRICT_HOMES,
  LEGACY_CITY_HOMES,
  LEGACY_CITY_PLACES,
  DISTRICT_PLACES,
  STREET_CLOSEUP_LINKS,
  cityPoint,
  districtSceneImage,
  nearestDistrictLandmark,
  streetLinksFrom,
  streetRoute,
  streetScenePoint,
} from '../lib/fate-district';
import { FATE_HOMES, homeOf } from '../lib/fate-housing';
import { legacyDistrictPositions } from './legacy-district';
import {
  createDailyLife,
  lifeDestination,
  parseDailyLife,
  LIFE_ACTIONS,
  LIFE_IDS,
  type LifeAction,
  lifeScene,
} from '../lib/fate-life';
import {
  createStreetActors,
  isWalkable,
  pathTo,
  pointAlongRoute,
  routePosition,
  stepActor,
  STREET,
  migrateCityPoint,
} from '../lib/street';
import { CITY_SEGMENTS } from '../lib/fate-city-layout';
import { LANDMARK_BUILDINGS, overlapsStreet } from '../lib/fate-environment';

void test('every district destination has its own street-level artwork and shares its map position', () => {
  const images = new Set<string>();
  for (const place of DISTRICT_LANDMARKS) {
    const image = districtSceneImage(place);
    assert.ok(!images.has(image), `${place.id} reuses another scene`);
    images.add(image);
    assert.ok(
      existsSync(join(process.cwd(), 'public', image.slice(1))),
      `${place.id} street image is missing`,
    );
    assert.equal(nearestDistrictLandmark(place).id, place.id);
    assert.deepEqual(streetScenePoint(place), {
      x: place.x * 2,
      y: place.y * 2,
    });
  }
});

void test('all 14 close-up destinations are connected by streets actors can walk in either direction', () => {
  for (const link of STREET_CLOSEUP_LINKS) {
    const from = DISTRICT_LANDMARKS.find((place) => place.id === link.from)!;
    const to = DISTRICT_LANDMARKS.find((place) => place.id === link.to)!;
    assert.ok(from && to, `${link.from} -> ${link.to} has a missing place`);
    assert.ok(
      existsSync(join(process.cwd(), 'public', link.image.slice(1))),
      link.image,
    );
    assert.ok(streetLinksFrom(from.id).some(({ place }) => place.id === to.id));
    assert.ok(streetLinksFrom(to.id).some(({ place }) => place.id === from.id));
    for (const [start, end] of [
      [from, to],
      [to, from],
    ]) {
      const actor = createStreetActors()[0];
      Object.assign(actor, {
        x: start.x,
        y: start.y,
        path: pathTo(start, end),
      });
      assert.ok(actor.path.length, `${start.id} -> ${end.id} has no road`);
      for (let frame = 0; frame < 1500 && actor.path.length; frame++)
        stepActor(actor, 0.05);
      assert.equal(actor.path.length, 0, `${start.id} -> ${end.id} gets stuck`);
      assert.ok(
        Math.hypot(actor.x - end.x, actor.y - end.y) < 1,
        `${start.id} -> ${end.id} arrives elsewhere`,
      );
    }
  }
  const visited = new Set(['temple']);
  const queue = ['temple'];
  while (queue.length) {
    for (const { place } of streetLinksFrom(queue.shift()!)) {
      if (visited.has(place.id)) continue;
      visited.add(place.id);
      queue.push(place.id);
    }
  }
  for (const { id } of DISTRICT_LANDMARKS)
    assert.ok(
      visited.has(id),
      `${id} is disconnected from the close-up street route`,
    );
  const west = DISTRICT_LANDMARKS.find((place) => place.id === 'fujimura')!;
  const east = DISTRICT_LANDMARKS.find((place) => place.id === 'park')!;
  const crossing = createStreetActors()[0];
  Object.assign(crossing, { x: west.x, y: west.y, path: pathTo(west, east) });
  let steppedOntoBridge = false;
  for (let frame = 0; frame < 1200 && crossing.path.length; frame++) {
    stepActor(crossing, 0.05);
    if (crossing.x >= 1500 && crossing.x <= 1770) {
      assert.ok(
        crossing.y >= 860 && crossing.y <= 955,
        'crossing must stay on Fuyuki Bridge',
      );
      steppedOntoBridge = true;
    }
  }
  assert.ok(steppedOntoBridge);
  assert.equal(crossing.path.length, 0);
});

void test('multi-stop street routes and camera projection follow connected roads', () => {
  for (const from of DISTRICT_LANDMARKS)
    for (const to of DISTRICT_LANDMARKS) {
      const route = streetRoute(from.id, to.id);
      assert.equal(route[0].id, from.id);
      assert.equal(route.at(-1)!.id, to.id);
      for (let index = 1; index < route.length; index++)
        assert.ok(
          streetLinksFrom(route[index - 1].id).some(
            ({ place }) => place.id === route[index].id,
          ),
        );
    }
  const from = DISTRICT_LANDMARKS.find((place) => place.id === 'emiya')!;
  const to = DISTRICT_LANDMARKS.find((place) => place.id === 'tohsaka')!;
  const path = [from, ...pathTo(from, to)];
  assert.equal(routePosition(from, path).progress, 0);
  assert.equal(routePosition(to, path).progress, 1);
  const midpoint = pointAlongRoute(path, 0.5);
  assert.ok(Math.abs(routePosition(midpoint, path).progress - 0.5) < 0.01);
  assert.equal(routePosition(midpoint, path).distance, 0);
  assert.ok(routePosition({ x: 0, y: 0 }, path).distance > 90);
  assert.deepEqual(pointAlongRoute(path, 0), { x: from.x, y: from.y });
  assert.deepEqual(pointAlongRoute(path, 1), { x: to.x, y: to.y });
  assert.deepEqual(pointAlongRoute(path, 0.5), midpoint);
});

void test('a walk across the river moves through the same continuous street world', () => {
  const from = DISTRICT_LANDMARKS.find((place) => place.id === 'emiya')!;
  const to = DISTRICT_LANDMARKS.find((place) => place.id === 'church')!;
  const actor = createStreetActors()[0];
  Object.assign(actor, { x: from.x, y: from.y });
  actor.path = pathTo(actor, to);
  let scene = nearestDistrictLandmark(actor);
  const seen = new Set([scene.id]);
  for (let frame = 0; frame < 1200 && actor.path.length; frame++) {
    const before = { x: actor.x, y: actor.y };
    stepActor(actor, 0.05);
    assert.ok(Math.hypot(actor.x - before.x, actor.y - before.y) <= 8.26);
    assert.ok(
      Math.hypot(
        streetScenePoint(actor).x - streetScenePoint(before).x,
        streetScenePoint(actor).y - streetScenePoint(before).y,
      ) <= 16.52,
    );
    scene = nearestDistrictLandmark(actor, scene);
    seen.add(scene.id);
  }
  assert.equal(actor.path.length, 0);
  assert.equal(scene.id, to.id);
  assert.ok(seen.size >= 3, `only saw ${[...seen].join(', ')}`);
});

void test('Fuyuki story landmarks stay on their original city banks', () => {
  for (const id of [
    'emiya',
    'tohsaka',
    'matou',
    'temple',
    'school',
    'waver',
    'shops',
  ] as const)
    assert.ok(
      DISTRICT_LANDMARKS.find((place) => place.id === id)!.x < 1500,
      `${id} must be in Miyama`,
    );
  assert.ok(FATE_HOMES.church.x > 1800, 'the church must be in Shinto');
  assert.ok(
    DISTRICT_PLACES.park.x > 1800 && DISTRICT_PLACES.park.x < 2050,
    'the park stays on the east riverbank',
  );
  assert.ok(
    isWalkable(FATE_HOMES.temple),
    'the temple approach must be walkable',
  );
  assert.ok(
    Math.hypot(
      FATE_HOMES.tohsaka.x - FATE_HOMES.matou.x,
      FATE_HOMES.tohsaka.y - FATE_HOMES.matou.y,
    ) < 360,
    'the hillside estates are neighbors',
  );
  assert.ok(
    FATE_HOMES.temple.y > FATE_HOMES.tohsaka.y,
    'the mountain approach leaves the residential area',
  );
});

void test('every district landmark connects to every other landmark without crossing a building or river', () => {
  for (const from of DISTRICT_LANDMARKS)
    for (const to of DISTRICT_LANDMARKS) {
      const actor = createStreetActors()[0];
      Object.assign(actor, { x: from.x, y: from.y });
      actor.path = pathTo(actor, to);
      assert.ok(actor.path.length, `${from.id} -> ${to.id}`);
      for (let frame = 0; frame < 1800 && actor.path.length; frame++) {
        stepActor(actor, 0.05);
        assert.ok(isWalkable(actor), `${from.id} -> ${to.id} leaves pavement`);
      }
      assert.equal(actor.path.length, 0, `${from.id} -> ${to.id} gets stuck`);
      assert.ok(Math.hypot(actor.x - to.x, actor.y - to.y) < 1);
    }
});

void test('all resident offsets and city streets remain reachable', () => {
  for (const { a, b } of CITY_SEGMENTS)
    for (const t of [0, 0.5, 1])
      assert.ok(
        isWalkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
      );
  for (const actor of createStreetActors()) {
    assert.ok(isWalkable(actor), `${actor.id} starts on pavement`);
    for (const place of DISTRICT_LANDMARKS)
      assert.ok(
        pathTo(actor, place).length,
        `${actor.id} can reach ${place.id}`,
      );
  }
  for (const id of LIFE_IDS)
    for (const kind of Object.keys(LIFE_ACTIONS) as LifeAction[]) {
      const target = lifeDestination(
        id,
        kind,
        LIFE_ACTIONS[kind].place === 'home' ? homeOf(id) : undefined,
      );
      assert.ok(isWalkable(target), `${id}:${kind}`);
      assert.ok(pathTo(FATE_HOMES.einzbern, target).length);
    }
  assert.equal(
    isWalkable({ x: 230, y: 210 }),
    false,
    'house walls are not walkable',
  );
  assert.equal(isWalkable({ x: 1600, y: 495 }), false, 'river is not walkable');
  assert.equal(
    isWalkable({ x: 1600, y: 907 }),
    true,
    'north bridge crosses the river',
  );
  assert.equal(
    isWalkable({ x: 1600, y: 1410 }),
    true,
    'south bridge crosses the river',
  );
  assert.ok(STREET.width > 3000, 'the map includes both riverbanks');
});

void test('v13 relocates ongoing activities once and preserves history, needs, money and remaining time', () => {
  const old = { ...createDailyLife(), version: 13 };
  old.positions = legacyDistrictPositions(old.positions);
  old.people.illya.activity = {
    kind: 'sleep',
    home: 'einzbern',
    phase: 'doing',
    remaining: 420,
    reason: '睡觉',
    source: 'rules',
  };
  old.people.cu.activity = {
    kind: 'walk',
    phase: 'doing',
    remaining: 12,
    reason: '散步',
    source: 'rules',
  };
  old.people.rin.activity = {
    kind: 'shop',
    phase: 'going',
    remaining: 25,
    reason: '买东西',
    source: 'rules',
  };
  const before = structuredClone(old);
  const migrated = parseDailyLife(old);
  assert.equal(migrated.version, 16);
  assert.deepEqual(
    migrated.positions.illya,
    lifeDestination('illya', 'sleep', 'einzbern'),
  );
  assert.deepEqual(migrated.positions.cu, lifeDestination('cu', 'walk'));
  assert.deepEqual(
    migrated.positions.rin,
    migrateCityPoint(cityPoint(old.positions.rin)),
    'journeys continue from saved pavement',
  );
  assert.deepEqual(migrated.people, old.people);
  assert.deepEqual(migrated.economy, old.economy);
  assert.deepEqual(migrated.events, old.events);
  assert.deepEqual(old, before, 'preview does not mutate the old save');
  assert.deepEqual(
    parseDailyLife(migrated),
    migrated,
    'migration never runs twice',
  );
  const broken = structuredClone(migrated);
  broken.positions.illya = { x: 230, y: 210 };
  assert.throws(() => parseDailyLife(broken), /人物位置无效/);
});

void test('v14 district saves move to the city once without changing life progress', () => {
  const current = createDailyLife();
  const old = {
    ...current,
    version: 14,
    positions: legacyDistrictPositions(current.positions),
  };
  const migrated = parseDailyLife(old);
  assert.equal(migrated.version, 16);
  for (const [id, point] of Object.entries(current.positions)) {
    const moved = migrated.positions[id as keyof typeof current.positions];
    if (id !== 'medea' && id !== 'kuzuki' && id !== 'admin')
      assert.ok(Math.hypot(moved.x - point.x, moved.y - point.y) < 1e-9, id);
    if (id === 'admin')
      assert.deepEqual(moved, migrateCityPoint(cityPoint(old.positions.admin)));
    assert.ok(isWalkable(moved), id);
  }
  assert.deepEqual(migrated.people, old.people);
  assert.deepEqual(migrated.economy, old.economy);
  assert.deepEqual(migrated.events, old.events);
  assert.deepEqual(parseDailyLife(migrated), migrated);
});

void test('scene context distinguishes the river park from the cafe at the same east end', () => {
  const life = createDailyLife();
  life.positions.cu = { ...DISTRICT_PLACES.park };
  assert.equal(lifeScene(life, 'cu').place, 'street');
  life.positions.cu = { ...DISTRICT_PLACES.cafe };
  assert.equal(lifeScene(life, 'cu').place, 'cafe');
});

void test('the displayed landmark buildings stay outside playable roads', () => {
  assert.equal(LANDMARK_BUILDINGS.length, DISTRICT_LANDMARKS.length);
  for (const b of LANDMARK_BUILDINGS)
    assert.equal(overlapsStreet(b.x, b.y, b.width, b.height), false, b.id);
});

void test('v15 city saves relocate homes, shops and ongoing journeys while retaining indoor state and life progress', () => {
  const old = { ...createDailyLife(), version: 15 };
  for (const id of LIFE_IDS)
    old.positions[id] = { ...LEGACY_CITY_HOMES[homeOf(id)] };
  old.positions.admin = { x: 890.5, y: 907.5 };
  old.positions.rin = { ...LEGACY_CITY_HOMES.tohsaka };
  old.people.rin.activity = {
    kind: 'shop',
    phase: 'going',
    remaining: 25,
    reason: '买东西',
    source: 'rules',
  };
  old.positions.waver = { ...LEGACY_CITY_HOMES.waver };
  old.positions.cu = { ...LEGACY_CITY_PLACES.shops };
  old.indoor = { actor: 'illya', home: 'einzbern', x: 250, y: 370, layout: 2 };
  const before = structuredClone(old);
  const restored = parseDailyLife(old);
  assert.equal(restored.version, 16);
  assert.deepEqual(restored.positions.waver, {
    x: DISTRICT_HOMES.waver.x,
    y: DISTRICT_HOMES.waver.y,
  });
  assert.deepEqual(restored.positions.cu, {
    x: DISTRICT_PLACES.shops.x,
    y: DISTRICT_PLACES.shops.y,
  });
  assert.deepEqual(restored.positions.rin, {
    x: DISTRICT_HOMES.tohsaka.x,
    y: DISTRICT_HOMES.tohsaka.y,
  });
  assert.deepEqual(restored.indoor, old.indoor);
  assert.deepEqual(restored.people, old.people);
  assert.deepEqual(restored.economy, old.economy);
  assert.deepEqual(restored.events, old.events);
  assert.deepEqual(old, before);
  assert.deepEqual(parseDailyLife(restored), restored);
  const broken = structuredClone(old);
  broken.indoor!.actor = 'invalid' as 'illya';
  assert.throws(() => parseDailyLife(broken), /室内位置无效/);
});

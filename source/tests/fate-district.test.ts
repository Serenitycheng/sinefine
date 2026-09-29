import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DISTRICT_LANDMARKS,
  DISTRICT_PLACES,
  cityPoint,
  districtSceneImage,
  nearestDistrictLandmark,
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
  stepActor,
  STREET,
  WALK_AREAS,
} from '../lib/street';

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
    assert.deepEqual(streetScenePoint(place), { x: place.x * 2, y: place.y * 2 });
  }
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
    assert.ok(Math.hypot(
      streetScenePoint(actor).x - streetScenePoint(before).x,
      streetScenePoint(actor).y - streetScenePoint(before).y,
    ) <= 16.52);
    scene = nearestDistrictLandmark(actor, scene);
    seen.add(scene.id);
  }
  assert.equal(actor.path.length, 0);
  assert.equal(scene.id, to.id);
  assert.ok(seen.size >= 3, `only saw ${[...seen].join(', ')}`);
});

void test('Fuyuki story landmarks stay on their original city banks', () => {
  for (const id of ['emiya', 'tohsaka', 'matou', 'temple', 'school'] as const)
    assert.ok(DISTRICT_LANDMARKS.find((place) => place.id === id)!.x < 1500, `${id} must be in Miyama`);
  assert.ok(FATE_HOMES.church.x > 1800, 'the church must be in Shinto');
  assert.ok(DISTRICT_PLACES.park.x > 1800 && DISTRICT_PLACES.park.x < 2050, 'the park stays on the east riverbank');
  assert.ok(isWalkable(FATE_HOMES.temple), 'the temple approach must be walkable');
});

void test('every district landmark connects to every other landmark without crossing a building or river', () => {
  for (const from of DISTRICT_LANDMARKS)
    for (const to of DISTRICT_LANDMARKS) {
      const actor = createStreetActors()[0];
      Object.assign(actor, { x: from.x, y: from.y });
      actor.path = pathTo(actor, to);
      assert.ok(actor.path.length, `${from.id} -> ${to.id}`);
      for (let frame = 0; frame < 1200 && actor.path.length; frame++) {
        stepActor(actor, 0.05);
        assert.ok(isWalkable(actor), `${from.id} -> ${to.id} leaves pavement`);
      }
      assert.equal(actor.path.length, 0, `${from.id} -> ${to.id} gets stuck`);
      assert.ok(Math.hypot(actor.x - to.x, actor.y - to.y) < 1);
    }
});

void test('all resident offsets and city streets remain reachable', () => {
  for (const r of WALK_AREAS)
    for (const x of [r.left, r.right])
      for (const y of [r.top, r.bottom]) assert.ok(isWalkable({ x, y }));
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
  assert.equal(isWalkable({ x: 1600, y: 907 }), true, 'north bridge crosses the river');
  assert.equal(isWalkable({ x: 1600, y: 1410 }), true, 'south bridge crosses the river');
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
  assert.equal(migrated.version, 15);
  assert.deepEqual(
    migrated.positions.illya,
    lifeDestination('illya', 'sleep', 'einzbern'),
  );
  assert.deepEqual(migrated.positions.cu, lifeDestination('cu', 'walk'));
  assert.deepEqual(
    migrated.positions.rin,
    cityPoint(old.positions.rin),
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
  assert.equal(migrated.version, 15);
  for (const [id, point] of Object.entries(current.positions)) {
    const moved = migrated.positions[id as keyof typeof current.positions];
    if (id !== 'medea' && id !== 'kuzuki')
      assert.ok(Math.hypot(moved.x - point.x, moved.y - point.y) < 1e-9, id);
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

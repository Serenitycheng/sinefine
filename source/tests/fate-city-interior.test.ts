import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_ART_SCENE_IDS } from '../lib/fate-city-art-scenes';
import { cityArtScenePlaces } from '../lib/fate-city-art-map';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  INTERIOR_ART_ENTRY,
  cityInteriorScene,
  interiorProject,
  interiorUnproject,
  interiorDepth,
} from '../lib/fate-city-interior-scenes';
import {
  interiorClearSegment,
  interiorMove,
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';

void test('every actual building threshold has one interior, while the park stays outdoors', () => {
  const places = CITY_ART_SCENE_IDS.flatMap(cityArtScenePlaces);
  assert.equal(CITY_INTERIOR_IDS.length, 18);
  assert.deepEqual(
    places
      .filter((p) => p.id !== 'park')
      .map((p) => p.id)
      .sort(),
    [...CITY_INTERIOR_IDS].sort(),
  );
  assert.equal(cityInteriorScene('park'), null);
  assert.equal(cityInteriorScene('__proto__'), null);
  for (const id of CITY_INTERIOR_IDS)
    assert.equal(cityInteriorScene(id)?.id, id);
});

void test('floor perspective round trips across all authored views without changing world points', () => {
  for (const scene of Object.values(CITY_INTERIOR_SCENES)) {
    for (const point of [
      { x: 20, y: 20 },
      { x: 500, y: 320 },
      { x: 975, y: 640 },
      INTERIOR_ART_ENTRY,
    ]) {
      const restored = interiorUnproject(
        interiorProject(point, scene.floor),
        scene.floor,
      )!;
      assert.ok(
        Math.hypot(point.x - restored.x, point.y - restored.y) < 1e-8,
        scene.id,
      );
    }
    assert.ok(
      interiorDepth({ x: 500, y: 10 }, scene.floor) <
        interiorDepth(INTERIOR_ART_ENTRY, scene.floor),
    );
    assert.equal(interiorUnproject({ x: 800, y: 20 }, scene.floor), null);
    assert.equal(
      interiorUnproject({ x: 0, y: scene.floor.backY }, scene.floor),
      null,
    );
  }
});

void test('all 18 entries reach all main-room inspection spots and return without crossing furniture', () => {
  for (const scene of Object.values(CITY_INTERIOR_SCENES)) {
    assert.ok(interiorWalkable(INTERIOR_ART_ENTRY, scene), scene.id);
    for (const spot of scene.spots)
      for (const [from, to] of [
        [INTERIOR_ART_ENTRY, spot.point],
        [spot.point, INTERIOR_ART_ENTRY],
      ]) {
        const path = interiorRoute(from, to, scene);
        assert.ok(path, `${scene.id}:${spot.id}`);
        let previous = from;
        for (const p of path) {
          assert.ok(interiorClearSegment(previous, p, scene));
          previous = p;
        }
        assert.ok(Math.hypot(previous.x - to.x, previous.y - to.y) < 1e-8);
      }
  }
});

void test('a route goes around an obstructing table, never through its painted footprint', () => {
  const scene = CITY_INTERIOR_SCENES.emiya;
  const from = { x: 500, y: 590 },
    to = { x: 500, y: 80 };
  assert.equal(interiorClearSegment(from, to, scene), false);
  const path = interiorRoute(from, to, scene)!;
  assert.ok(path.length > 1);
  const table = scene.furniture[0].footprint;
  assert.ok(
    path.some((p) => p.x <= table.x - 13 || p.x >= table.x + table.width + 13),
  );
  assert.equal(interiorRoute(from, { x: 400, y: 300 }, scene), null);
  assert.deepEqual(interiorRoute(from, from, scene), []);
});

void test('large keyboard steps cannot tunnel through tables, and walls retain the player', () => {
  const scene = CITY_INTERIOR_SCENES.emiya;
  const next = interiorMove({ x: 500, y: 600 }, { x: 0, y: -550 }, scene);
  const table = scene.furniture[0].footprint;
  assert.ok(next.y >= table.y + table.height + 13);
  assert.ok(interiorWalkable(next, scene));
  const edge = interiorMove({ x: 900, y: 600 }, { x: 500, y: 500 }, scene);
  assert.ok(edge.x <= 987 && edge.y <= 647);
  assert.ok(interiorWalkable(edge, scene));
});

void test('church, classroom and convenience store retain an unobstructed central aisle', () => {
  for (const id of ['church', 'school', 'shinto-convenience'] as const) {
    const scene = CITY_INTERIOR_SCENES[id];
    assert.ok(
      interiorClearSegment(INTERIOR_ART_ENTRY, { x: 500, y: 40 }, scene),
      id,
    );
    assert.equal(interiorWalkable({ x: 200, y: 300 }, scene), false);
  }
});

void test('invalid pointer coordinates are rejected and entry/asset metadata remain independent of formal saves', () => {
  const scene = CITY_INTERIOR_SCENES.emiya;
  assert.equal(interiorWalkable({ x: NaN, y: 500 }, scene), false);
  assert.equal(
    interiorRoute(INTERIOR_ART_ENTRY, { x: Infinity, y: 20 }, scene),
    null,
  );
  for (const id of CITY_INTERIOR_IDS) {
    assert.equal(
      CITY_INTERIOR_SCENES[id].painting,
      `/fate/interior-art/${id}-main-soft-v1.png`,
    );
    assert.ok(CITY_INTERIOR_SCENES[id].basis.length > 5);
  }
});

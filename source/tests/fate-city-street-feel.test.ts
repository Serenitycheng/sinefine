import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cityCameraZoomAnchor,
  cityCameraFollow,
  cityWalkFacing,
} from '../lib/fate-city-art-controls';
import { CITY_ART_MODES } from '../lib/fate-city-art-camera';
import { MIYAMA_PILOT, cityPilotPaint } from '../lib/fate-city-art';
import { CITY_ART_SCENES } from '../lib/fate-city-art-scenes';
import type { CityPoint } from '../lib/fate-city-layout';
import { CITY_ART_PORTALS } from '../lib/fate-city-art-portals';
import { cityArtGuidePositions } from '../lib/fate-city-art-map';
import {
  cityPilotClickRoute,
  cityPilotLine,
  cityPilotRoute,
  cityPilotWalkable,
  cityPilotJunctionChoices,
} from '../lib/fate-city-art-navigation';

const gap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

void test('door and exit labels leave the complete actor visible on desktop and portrait viewports', () => {
  for (const size of [
    { width: 1280, height: 663 },
    { width: 390, height: 525 },
  ]) {
    const actor = {
      x: size.width * 0.45,
      y: size.height * 0.5,
      width: 55,
      height: 100,
    };
    const guides = cityArtGuidePositions(
      Array.from({ length: 5 }, () => ({ x: actor.x + 25, y: actor.y + 45 })),
      size,
      actor,
    );
    for (const guide of guides)
      assert.ok(
        guide.x + 75 <= actor.x ||
          guide.x - 75 >= actor.x + actor.width ||
          guide.y + 17 <= actor.y ||
          guide.y - 17 >= actor.y + actor.height,
      );
  }
});

void test('all three compressed junctions have an explicit choice at their center and no off-junction shortcuts', () => {
  for (const [scene, destination] of [
    ['old-south', 'temple-path'],
    ['west-residential', 'estate-lane'],
    ['school-junction', 'bridge-approach'],
  ] as const) {
    const portal = CITY_ART_PORTALS.find(
      (p) =>
        (p.a === scene && p.b === destination) ||
        (p.b === scene && p.a === destination),
    );
    assert.ok(portal);
    const choices = cityPilotJunctionChoices(portal.point, scene);
    assert.ok(
      choices.some((choice) => choice.scene === destination),
      `${scene} must expose ${destination}`,
    );
    assert.ok(
      choices.length <= 4 &&
        new Set(choices.map((c) => c.scene)).size === choices.length,
    );
    for (const choice of choices)
      assert.ok(cityPilotWalkable(portal.point, 1, choice.scene));
  }
  assert.deepEqual(
    cityPilotJunctionChoices({ x: 1500, y: 1000 }, 'residential'),
    [],
  );
});

void test('successive zoom gestures preserve the exact pointer ground anchor, including a moving pinch midpoint', () => {
  let origin = { x: -170, y: -70 },
    scale = 0.9;
  const anchor = { x: 650, y: 340 };
  const ground = {
    x: (anchor.x - origin.x) / scale,
    y: (anchor.y - origin.y) / scale,
  };
  for (const nextScale of [1.2, 2.1, 3.8, 1.1, 0.7]) {
    origin = cityCameraZoomAnchor(origin, scale, nextScale, anchor);
    scale = nextScale;
    assert.ok(
      gap(
        { x: origin.x + ground.x * scale, y: origin.y + ground.y * scale },
        anchor,
      ) < 1e-9,
    );
  }
  const moved = { x: anchor.x + 42, y: anchor.y - 24 };
  const next = cityCameraZoomAnchor(origin, scale, 1.7, anchor, moved);
  assert.ok(
    gap({ x: next.x + ground.x * 1.7, y: next.y + ground.y * 1.7 }, moved) <
      1e-9,
  );
  assert.deepEqual(cityCameraZoomAnchor(origin, 0, 1, anchor), origin);
});

void test('automatic following has a stationary walking window and converges consistently at 20, 60 and 120 fps', () => {
  const size = { width: 1000, height: 600 },
    start = { x: 0, y: 0 };
  assert.deepEqual(
    cityCameraFollow(start, { x: 500, y: 360 }, 1, size, 0.05),
    start,
  );
  const results = [];
  for (const fps of [20, 60, 120]) {
    let origin = { ...start };
    for (let frame = 0; frame < fps; frame++)
      origin = cityCameraFollow(origin, { x: 850, y: 520 }, 1, size, 1 / fps);
    assert.ok(
      origin.x < 0 && origin.y < 0 && origin.x > -190 && origin.y > -76,
    );
    results.push(origin);
  }
  assert.ok(gap(results[0], results[1]) < 1e-8);
  assert.ok(gap(results[1], results[2]) < 1e-8);
  assert.deepEqual(
    cityCameraFollow(start, { x: 850, y: 520 }, 1, size, 0),
    start,
  );
});

void test('projected diagonal noise does not alternate sprite directions, while deliberate turns and reversals respond immediately', () => {
  let facing: 'right' | 'left' | 'up' | 'down' = 'right';
  for (const y of [1.02, 0.98, 1.07, 0.95, 1.1]) {
    facing = cityWalkFacing({ x: 1, y }, facing);
    assert.equal(facing, 'right');
  }
  assert.equal(cityWalkFacing({ x: 1, y: 1.5 }, facing), 'down');
  assert.equal(cityWalkFacing({ x: -1, y: 0 }, facing), 'left');
  assert.equal(cityWalkFacing({ x: 0, y: -1 }, 'down'), 'up');
  assert.equal(cityWalkFacing({ x: 0, y: 0 }, 'left'), 'left');
});

void test('floor-click routes keep visible straight segments when possible and all accepted routes stay on actual pavement', () => {
  let visibleLines = 0,
    splitLines = 0;
  const points = CITY_ART_SCENES.residential.points.filter((point) =>
    cityPilotWalkable(point),
  );
  for (const mode of CITY_ART_MODES)
    for (const to of points) {
      const route = cityPilotClickRoute(
        MIYAMA_PILOT.start,
        to,
        mode,
        'residential',
      );
      assert.ok(route);
      const a = cityPilotPaint(MIYAMA_PILOT.start, mode),
        b = cityPilotPaint(to, mode);
      let from: CityPoint = MIYAMA_PILOT.start;
      for (const point of route) {
        assert.ok(cityPilotLine(from, point));
        from = point;
      }
      assert.ok(gap(from, to) < 1e-6);
      if (
        route.every((point) => {
          const p = cityPilotPaint(point, mode);
          return (
            Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) <
            1e-5
          );
        })
      ) {
        visibleLines++;
        if (route.length > 1) splitLines++;
      }
    }
  assert.ok(
    visibleLines > 0 && splitLines > 0,
    'must exercise a straight click across real projection edges',
  );
});

void test('blocked straight clicks still use a valid detour and reject the river or an invalid starting point', () => {
  const from = MIYAMA_PILOT.start,
    to = { x: 1055.5, y: 428 };
  for (const mode of CITY_ART_MODES) {
    const route = cityPilotClickRoute(from, to, mode, 'residential');
    assert.ok(route);
    let point: CityPoint = from;
    for (const next of route) {
      assert.ok(cityPilotLine(point, next));
      point = next;
    }
    assert.ok(gap(point, to) < 1e-6);
    assert.ok(cityPilotRoute(from, to));
    assert.equal(
      cityPilotClickRoute(from, { x: 1500, y: 1000 }, mode, 'residential'),
      null,
    );
    assert.equal(
      cityPilotClickRoute({ x: NaN, y: 0 }, to, mode, 'residential'),
      null,
    );
  }
});

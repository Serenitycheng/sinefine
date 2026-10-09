import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CITY_ROADS } from '../lib/fate-city-layout';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import {
  CITY_ART_SCENES,
  CITY_ART_JUNCTION,
  OLD_STREET_CENTERS,
  OLD_BOOKSHOP_DOOR,
  citySceneCrossing,
} from '../lib/fate-city-art-scenes';
import {
  CITY_ART_MODES,
  cityArtCamera,
  cityCameraResizePan,
} from '../lib/fate-city-art-camera';
import {
  cityPilotPaint,
  cityPilotWorld,
  CITY_ART_ROADS,
} from '../lib/fate-city-art';
import {
  OLD_STREET_REGISTRATIONS,
  cityArtRegistered,
  onCityArtPaving,
  cityArtDepth,
} from '../lib/fate-city-art-registration';
import {
  cityPilotWalkable,
  cityPilotLine,
  cityPilotRoute,
  advanceCityPilotInput,
  advanceCityPilotRoute,
  cityPilotFrameTravel,
} from '../lib/fate-city-art-navigation';

const scene = 'old-street' as const;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

void test('old street north retains its original floor and Waver doorstep during the full-city expansion', () => {
  assert.deepEqual(
    CITY_ART_SCENES[scene].points,
    CITY_ROADS.find((road) => road.id === 'old-lanes')!.points.slice(0, 4),
  );
  assert.deepEqual(CITY_ART_SCENES[scene].points[0], CITY_ART_JUNCTION);
  assert.deepEqual(HOME_ENTRANCES.waver.door, { x: 215, y: 643 });
  assert.equal(
    CITY_ART_ROADS.find((entry) => entry.road.id === 'old-lanes')!.scene,
    scene,
  );
  assert.equal(
    CITY_ART_ROADS.find((entry) => entry.road.id === 'west-residential')!.stage,
    'pilot',
  );
  assert.equal(
    cityPilotRoute(CITY_ART_JUNCTION, HOME_ENTRANCES.natalia.door, scene),
    null,
  );
});

void test('all old-street floor triangles retain one orientation and dense shared-floor positions round-trip in each native camera', () => {
  const cross = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (const mode of CITY_ART_MODES) {
    const { pairs, faces } = OLD_STREET_REGISTRATIONS[mode];
    const signs = faces.map(([i, j, k]) =>
      Math.sign(
        cross(pairs[i].world, pairs[j].world, pairs[k].world) *
          cross(pairs[i].paint, pairs[j].paint, pairs[k].paint),
      ),
    );
    assert.ok(
      signs.every((sign) => sign !== 0 && sign === signs[0]),
      `${mode}: no folded face`,
    );
  }
  let count = 0;
  for (let x = 195; x < 535; x += 2)
    for (let y = 365; y < 825; y += 2) {
      const point = { x, y };
      if (!cityPilotWalkable(point, 1, scene)) continue;
      for (const mode of CITY_ART_MODES) {
        const paint = cityPilotPaint(point, mode, scene),
          back = cityPilotWorld(paint, mode, scene),
          camera = cityArtCamera(mode, scene);
        assert.ok(cityArtRegistered(paint, true, mode, scene));
        assert.ok(
          onCityArtPaving(paint, mode, scene),
          `${mode}: feet on real paving`,
        );
        assert.ok(
          distance(point, back) < 1e-6,
          `${mode}: ${x},${y} inverse agrees`,
        );
        assert.ok(
          paint.x >= 0 &&
            paint.x < camera.width &&
            paint.y >= 0 &&
            paint.y < camera.height,
        );
      }
      count++;
    }
  assert.ok(count > 11000, 'checks usable floor, not only door centers');
});

void test('Waver doorstep, bookshop apron, far bend and original junction are reachable in both directions', () => {
  const goals = [
    CITY_ART_JUNCTION,
    HOME_ENTRANCES.waver.door,
    OLD_BOOKSHOP_DOOR,
    OLD_STREET_CENTERS.at(-1)!,
  ];
  for (const from of goals)
    for (const to of goals) {
      assert.ok(cityPilotWalkable(from, 1, scene));
      const route = cityPilotRoute(from, to, scene);
      assert.ok(route, 'route has real connected paving');
      let point = from;
      for (const next of route) {
        assert.ok(
          cityPilotLine(point, next, scene),
          'no courtyard wall shortcut',
        );
        point = next;
      }
      assert.deepEqual(point, to);
    }
  for (const mode of CITY_ART_MODES)
    for (const goal of goals.slice(1)) {
      let point = { ...CITY_ART_JUNCTION },
        frames = 0;
      const route = cityPilotRoute(point, goal, scene)!;
      while (route.length && frames++ < 60 * 60) {
        const step = advanceCityPilotRoute(
          point,
          route,
          cityPilotFrameTravel(1 / 60),
          mode,
          scene,
        );
        assert.equal(step.blocked, false, `${mode}: no stall at the doorstep`);
        assert.ok(cityPilotWalkable(step.point, 1, scene));
        point = step.point;
        route.splice(0, step.used);
      }
      assert.equal(route.length, 0);
      assert.deepEqual(point, goal);
    }
});

void test('new street keeps the accepted body-relative walking pace across camera direction and display frequency', () => {
  for (const mode of CITY_ART_MODES)
    for (const point of [
      OLD_STREET_CENTERS[1],
      OLD_STREET_CENTERS[3],
      OLD_STREET_CENTERS[4],
    ])
      for (const input of [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
      ])
        for (const fps of [20, 60, 120]) {
          const travel = cityPilotFrameTravel(1 / fps),
            step = advanceCityPilotInput(point, input, travel, mode, scene);
          const visible =
            distance(
              cityPilotPaint(point, mode, scene),
              cityPilotPaint(step.point, mode, scene),
            ) /
            ((cityArtDepth(point, mode, scene) +
              cityArtDepth(step.point, mode, scene)) /
              2);
          assert.ok(
            Math.abs(visible - travel) < travel * 0.002 + 1e-5,
            `${mode}/${fps}: ${visible} vs ${travel}`,
          );
          assert.ok(cityPilotWalkable(step.point, 1, scene));
        }
});

void test('a route leaving Waver midway avoids the sub-sample gap before the bookshop instead of stopping late', () => {
  const from = { x: 242.613, y: 679.324 };
  // This diagonal nearly joins the two rounded strips but leaves a real gap
  // shorter than the former 1.5-unit sampling spacing.
  assert.equal(
    cityPilotLine({ x: 410, y: 650 }, OLD_BOOKSHOP_DOOR, scene),
    false,
  );
  for (const mode of CITY_ART_MODES)
    for (const fps of [20, 60, 120]) {
      let point = from,
        frames = 0;
      const route = cityPilotRoute(from, OLD_BOOKSHOP_DOOR, scene);
      assert.ok(route);
      while (route.length && frames++ < fps * 60) {
        const step = advanceCityPilotRoute(
          point,
          route,
          cityPilotFrameTravel(1 / fps),
          mode,
          scene,
        );
        assert.equal(step.blocked, false, `${mode}/${fps}: no late gap stall`);
        point = step.point;
        route.splice(0, step.used);
      }
      assert.equal(route.length, 0);
      assert.deepEqual(point, OLD_BOOKSHOP_DOOR);
    }
});

void test('junction crossing requires movement into the adjoining road, and both views accept the unchanged shared point', () => {
  assert.equal(
    citySceneCrossing('residential', { x: 471, y: 388 }, CITY_ART_JUNCTION),
    scene,
  );
  assert.equal(
    citySceneCrossing(scene, { x: 469, y: 392 }, CITY_ART_JUNCTION),
    'residential',
  );
  assert.equal(
    citySceneCrossing('residential', { x: 468, y: 387 }, CITY_ART_JUNCTION),
    null,
    'passing along residential street does not switch',
  );
  assert.equal(
    citySceneCrossing(scene, CITY_ART_JUNCTION, CITY_ART_JUNCTION),
    null,
    'standing still does not bounce views',
  );
  assert.equal(
    citySceneCrossing('residential', { x: 435, y: 454 }, { x: 434, y: 456 }),
    null,
    'no distant trigger',
  );
  for (const s of ['residential', scene] as const) {
    assert.ok(cityPilotWalkable(CITY_ART_JUNCTION, 1, s));
    for (const mode of CITY_ART_MODES)
      assert.ok(
        distance(
          cityPilotWorld(cityPilotPaint(CITY_ART_JUNCTION, mode, s), mode, s),
          CITY_ART_JUNCTION,
        ) < 1e-6,
      );
  }
});

void test('portrait resize keeps the full street visible at fit scale and constrains close browsing without changing world or zoom', () => {
  const previous = { width: 1280, height: 558 },
    next = { width: 390, height: 626 };
  const camera = cityArtCamera('eye', scene),
    foot = cityPilotPaint(CITY_ART_JUNCTION, 'eye', scene);
  for (const following of [false, true])
    for (const zoom of [1, 2.8, 8]) {
      const pan = cityCameraResizePan(
        { x: -1400, y: 1000 },
        previous,
        next,
        camera,
        zoom,
        following,
        foot,
      );
      const scale =
        Math.min(next.width / camera.width, next.height / camera.height) * zoom;
      const origin = following
        ? {
            x: next.width * 0.52 - foot.x * scale + pan.x,
            y: next.height * 0.66 - foot.y * scale + pan.y,
          }
        : {
            x: (next.width - camera.width * scale) / 2 + pan.x,
            y: (next.height - camera.height * scale) / 2 + pan.y,
          };
      for (const [offset, size, extent] of [
        [origin.x, next.width, camera.width * scale],
        [origin.y, next.height, camera.height * scale],
      ]) {
        if (extent <= size)
          assert.ok(Math.abs(offset - (size - extent) / 2) < 1e-6);
        else assert.ok(offset <= 1e-6 && offset + extent >= size - 1e-6);
      }
    }
});

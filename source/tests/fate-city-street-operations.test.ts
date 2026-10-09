import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CITY_ART_PLACES,
  CITY_LOCAL_PLACES,
  cityPilotPaint,
} from '../lib/fate-city-art';
import {
  CITY_ART_SCENES,
  CITY_ART_SCENE_IDS,
} from '../lib/fate-city-art-scenes';
import { CITY_ART_PORTALS, cityArtExits } from '../lib/fate-city-art-portals';
import {
  cityArtMapBounds,
  cityArtScenePlaces,
  cityArtGuidePosition,
  cityArtGuidePositions,
} from '../lib/fate-city-art-map';
import {
  CITY_ART_MODES,
  cityArtCamera,
  cityCameraActorScale,
  cityCameraOrigin,
  cityCameraPan,
} from '../lib/fate-city-art-camera';
import { cityArtDepth } from '../lib/fate-city-art-registration';
import {
  cityArtJourney,
  cityPilotRoute,
  advanceCityPilotRoute,
} from '../lib/fate-city-art-navigation';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import type { CityPoint } from '../lib/fate-city-layout';

const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);

void test('all 23 street starts can be walked from the residential block and back across explicit shared exits', () => {
  for (const scene of CITY_ART_SCENE_IDS) {
    for (const [from, to] of [
      ['residential', scene],
      [scene, 'residential'],
    ] as const) {
      const legs = cityArtJourney(from, CITY_ART_SCENES[from].start, to);
      assert.ok(legs, `${from} → ${to}`);
      assert.equal(legs[0].scene, from);
      assert.equal(legs.at(-1)!.scene, to);
      for (let i = 0; i < legs.length - 1; i++) {
        const end = legs[i].path.at(-1)!;
        assert.ok(
          cityArtExits(legs[i].scene).some(
            (exit) =>
              exit.scene === legs[i + 1].scene && gap(exit.point, end) < 1e-6,
          ),
        );
      }
    }
  }
});

void test('every home, public building and local shop has one reachable real threshold and can walk back in all views', () => {
  const registered = new Set<string>();
  for (const scene of CITY_ART_SCENE_IDS) {
    for (const place of cityArtScenePlaces(scene)) {
      assert.ok(!registered.has(place.id), `${place.id}: ambiguous street`);
      registered.add(place.id);
      for (const mode of CITY_ART_MODES) {
        const start = CITY_ART_SCENES[scene].start;
        for (const [from, to] of [
          [start, place.point],
          [place.point, start],
        ]) {
          let point = { ...from };
          let path = cityPilotRoute(point, to, scene);
          assert.ok(path, `${scene}/${mode}/${place.id}: route`);
          for (let frame = 0; path.length && frame < 1200; frame++) {
            const step = advanceCityPilotRoute(point, path, 66, mode, scene);
            assert.equal(
              step.blocked,
              false,
              `${scene}/${mode}/${place.id}: blocked`,
            );
            assert.ok(
              step.used || gap(point, step.point) > 1e-7,
              `${place.id}: stalled`,
            );
            point = step.point;
            path = path.slice(step.used);
          }
          assert.equal(path.length, 0, `${place.id}: walk completed`);
          assert.ok(gap(point, to) < 1e-6, `${place.id}: real arrival`);
        }
      }
    }
  }
  assert.deepEqual(
    [...registered].sort(),
    [...CITY_ART_PLACES, ...CITY_LOCAL_PLACES].map((p) => p.id).sort(),
  );
});

void test('the local map contains every exit, approach and doorway at its original atlas coordinates', () => {
  for (const scene of CITY_ART_SCENE_IDS) {
    const point = CITY_ART_SCENES[scene].start;
    const box = cityArtMapBounds(scene, point);
    for (const p of [
      point,
      ...CITY_ART_SCENES[scene].points,
      ...cityArtExits(scene).map((exit) => exit.point),
      ...cityArtScenePlaces(scene).map((place) => place.point),
    ]) {
      assert.ok(p.x >= box.x && p.x <= box.x + box.width);
      assert.ok(p.y >= box.y && p.y <= box.y + box.height);
    }
    for (const home of CITY_ART_SCENES[scene].homes)
      assert.deepEqual(
        cityArtScenePlaces(scene).find((p) => p.id === home)!.point,
        HOME_ENTRANCES[home].door,
      );
  }
});

void test('high zoom frames keep the entire actor visible and cover the viewport whenever the painted edges permit it', () => {
  for (const scene of CITY_ART_SCENE_IDS)
    for (const mode of CITY_ART_MODES)
      for (const size of [
        { width: 1280, height: 550 },
        { width: 390, height: 600 },
        { width: 390, height: 270 },
      ])
        for (const zoom of [0.5, 1, 3, 8])
          for (const point of [
            ...CITY_ART_SCENES[scene].points,
            ...cityArtScenePlaces(scene).map((p) => p.point),
          ]) {
            const camera = cityArtCamera(mode, scene);
            const foot = cityPilotPaint(point, mode, scene);
            const scale =
              Math.min(size.width / camera.width, size.height / camera.height) *
              zoom;
            const actor = cityCameraActorScale(
              cityArtDepth(point, mode, scene),
              scale,
              size,
            );
            const body = actor * 1.05 * scale;
            const before = { ...point };
            const origin = cityCameraOrigin(
              { x: -6500, y: 4000 },
              foot,
              scale,
              size,
              camera,
              actor,
            );
            for (const [offset, at, viewport, extent, leading, trailing] of [
              [
                origin.x,
                foot.x * scale,
                size.width,
                camera.width * scale,
                157 * body,
                155 * body,
              ],
              [
                origin.y,
                foot.y * scale,
                size.height,
                camera.height * scale,
                254 * body,
                22 * body,
              ],
            ]) {
              assert.ok(
                offset + at - leading >= 12 - 1e-6,
                `${scene}/${mode}/${zoom}: body leading edge`,
              );
              assert.ok(
                offset + at + trailing <= viewport - 12 + 1e-6,
                `${scene}/${mode}/${zoom}: body trailing edge`,
              );
              if (
                extent >= viewport &&
                12 + leading - at <= 0 &&
                viewport - 12 - trailing - at >= viewport - extent
              ) {
                assert.ok(
                  offset <= 1e-6 && offset + extent >= viewport - 1e-6,
                  `${scene}/${mode}/${zoom}: blank frame`,
                );
              }
            }
            assert.deepEqual(point, before);
          }
});

void test('both directions of every high-zoom crossing preserve a feasible foot anchor and constrain excessive offsets', () => {
  const size = { width: 1280, height: 550 };
  for (const portal of CITY_ART_PORTALS)
    for (const scene of [portal.a, portal.b]) {
      const mode = 'eye',
        zoom = 8;
      const camera = cityArtCamera(mode, scene);
      const scale =
        Math.min(size.width / camera.width, size.height / camera.height) * zoom;
      const foot = cityPilotPaint(portal.point, mode, scene);
      const actor = cityCameraActorScale(
        cityArtDepth(portal.point, mode, scene),
        scale,
        size,
      );
      const safe = cityCameraOrigin(
        { x: -foot.x * scale + 640, y: -foot.y * scale + 380 },
        foot,
        scale,
        size,
        camera,
        actor,
      );
      const screen = { x: safe.x + foot.x * scale, y: safe.y + foot.y * scale };
      const pan = cityCameraPan(screen, foot, scale, size, camera, false);
      const after = cityCameraOrigin(
        {
          x: (size.width - camera.width * scale) / 2 + pan.x,
          y: (size.height - camera.height * scale) / 2 + pan.y,
        },
        foot,
        scale,
        size,
        camera,
        actor,
      );
      assert.ok(
        gap(safe, after) < 1e-6,
        `${portal.id}/${scene}: valid anchor moved`,
      );
    }
});

void test('offscreen doorway and exit guides stay inside short and portrait viewports', () => {
  for (const size of [
    { width: 1280, height: 550 },
    { width: 390, height: 270 },
  ])
    for (const screen of [
      { x: -10000, y: 6000 },
      { x: 10000, y: -5000 },
    ]) {
      const mark = cityArtGuidePosition(screen, size);
      assert.equal(mark.pinned, true);
      assert.ok(mark.x >= 70 && mark.x <= size.width - 70);
      assert.ok(mark.y >= 0 && mark.y <= size.height - 100);
    }
});

void test('dense exit and entrance guides avoid the local map and one another on desktop and phone', () => {
  for (const size of [
    { width: 1280, height: 550 },
    { width: 390, height: 510 },
  ]) {
    const guides = cityArtGuidePositions(
      Array.from({ length: 7 }, () => ({ x: -4000, y: -5000 })),
      size,
    );
    for (let i = 0; i < guides.length; i++) {
      assert.ok(guides[i].y >= (size.width <= 520 ? 135 : 190));
      for (const other of guides.slice(0, i))
        assert.ok(
          Math.abs(guides[i].x - other.x) >= 150 ||
            Math.abs(guides[i].y - other.y) >= 34,
        );
    }
  }
});

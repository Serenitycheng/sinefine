import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CITY_ROADS } from '../lib/fate-city-layout';
import { DISTRICT_LANDMARKS } from '../lib/fate-district';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { STREET_CAST } from '../lib/fate-street-cast';
import { FATE_HOMES } from '../lib/fate-housing';
import { HOME_ROOMS } from '../lib/fate-indoor-layout';
import {
  CITY_ART_QUARTERS,
  CITY_ART_PLACES,
  CITY_ART_ROADS,
  CITY_LOCAL_PLACES,
  MIYAMA_PILOT,
  cityPilotPaint,
  cityPilotWorld,
} from '../lib/fate-city-art';
import {
  CITY_PILOT_REGISTRATION,
  CITY_PILOT_REGISTRATIONS,
  cityArtRegistered,
  cityArtDepth,
  onCityArtPaving,
} from '../lib/fate-city-art-registration';
import {
  CITY_ART_MODES,
  CITY_ART_CAMERAS,
  cityCameraPan,
} from '../lib/fate-city-art-camera';
import {
  cityPilotWalkable,
  cityPilotRoute,
  cityPilotLine,
  moveCityPilot,
  advanceCityPilotInput,
  advanceCityPilotRoute,
  cityPilotFrameTravel,
  CITY_PILOT_WALK_SPEED,
} from '../lib/fate-city-art-navigation';
import { CHARACTER_ART } from '../lib/fate-character-art';
import { existsSync } from 'node:fs';
import { INTERIOR_ART } from '../lib/fate-interior-art';

void test('all art districts use existing city roads once, and all original place IDs are retained', () => {
  const ids = CITY_ART_QUARTERS.flatMap((quarter) => [...quarter.roads]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), CITY_ROADS.map((road) => road.id).sort());
  assert.deepEqual(
    CITY_ART_PLACES.map((place) => place.id).sort(),
    DISTRICT_LANDMARKS.map((place) => place.id).sort(),
  );
  for (const entry of CITY_ART_ROADS)
    assert.equal(
      entry.road,
      CITY_ROADS.find((road) => road.id === entry.road.id),
    );
  assert.deepEqual(
    MIYAMA_PILOT.points,
    CITY_ROADS.find((road) => road.id === 'residential-slope')!.points.slice(
      0,
      6,
    ),
  );
  assert.ok(
    CITY_ART_PLACES.find((place) => place.id === 'cafe')!.x > 1770,
    'the game cafe stays on the Shinto side',
  );
});

void test('registered floor triangles do not fold or change positions during projection', () => {
  const cross = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const { pairs, faces } = CITY_PILOT_REGISTRATION;
  for (const [i, j, k] of faces)
    assert.ok(
      cross(pairs[i].world, pairs[j].world, pairs[k].world) *
        cross(pairs[i].paint, pairs[j].paint, pairs[k].paint) >
        0,
      'inverse geometry must retain orientation',
    );
  let checked = 0;
  for (let x = 420; x < 1090; x += 5)
    for (let y = 280; y < 630; y += 5) {
      const point = { x, y };
      if (!cityPilotWalkable(point)) continue;
      const paint = cityPilotPaint(point),
        back = cityPilotWorld(paint);
      assert.ok(
        Math.hypot(back.x - x, back.y - y) < 1e-6,
        'screen click and actor feet reference the same world point',
      );
      assert.ok(onCityArtPaving(paint));
      checked++;
    }
  assert.ok(
    checked > 2000,
    'check the usable street surface, not only landmark centers',
  );
});

void test('both actual home thresholds, the florist and the real junctions are reachable in both directions', () => {
  const points = [
    MIYAMA_PILOT.start,
    ...MIYAMA_PILOT.homes.map((home) => HOME_ENTRANCES[home].door),
    CITY_LOCAL_PLACES[0].point,
    ...MIYAMA_PILOT.exits.map((exit) => exit.point),
  ];
  for (const from of points)
    for (const to of points) {
      assert.ok(cityPilotWalkable(from));
      assert.ok(cityPilotWalkable(to));
      const route = cityPilotRoute(from, to);
      assert.ok(route, 'door and junction must have a real route');
      let current = from;
      for (const next of route) {
        assert.ok(
          cityPilotLine(current, next),
          'a route cannot shortcut through a wall',
        );
        current = next;
      }
      assert.deepEqual(current, to);
    }
});

void test('pressed movement stops at a boundary without a forced sideways slide; reversing can leave it', () => {
  let point: { x: number; y: number } = { ...MIYAMA_PILOT.start };
  for (let i = 0; i < 600; i++)
    point = moveCityPilot(point, { x: 0, y: -1 }, 1);
  const before = cityPilotPaint(point),
    after = cityPilotPaint(moveCityPilot(point, { x: 0, y: -1 }, 12));
  assert.ok(
    Math.hypot(after.x - before.x, after.y - before.y) < 1.5,
    'blocked movement is stopped, not redirected',
  );
  const back = moveCityPilot(point, { x: 0, y: 1 }, 8);
  assert.ok(cityPilotWalkable(back));
  assert.ok(
    Math.hypot(
      cityPilotPaint(back).x - before.x,
      cityPilotPaint(back).y - before.y,
    ) > 1,
    'the character can leave the contact point',
  );
  assert.equal(
    cityPilotRoute(MIYAMA_PILOT.start, { x: 2000, y: 300 }),
    null,
    'unpainted districts are not traversed through a fake art loop',
  );
});

void test('character and indoor production covers all identities while retaining current housing and logical rooms', () => {
  assert.deepEqual(
    CHARACTER_ART.map((actor) => actor.id),
    STREET_CAST.map((actor) => actor.id),
  );
  const ready = CHARACTER_ART.filter((actor) => actor.stage === 'study-ready');
  assert.deepEqual(ready.map((actor) => actor.id).sort(), [
    'emiya',
    'gilgamesh',
    'illya',
    'irisviel',
    'iskandar',
    'kariya',
    'kiritsugu',
    'medusa',
    'rin',
    'saber',
    'sakura',
    'shirou',
    'taiga',
    'tokiomi',
    'waver',
  ]);
  for (const actor of CHARACTER_ART) {
    if (actor.stage === 'study-ready') {
      assert.ok(actor.model && existsSync(`public${actor.model}`));
      assert.notEqual(actor.frames, 'legacy');
      assert.notEqual(actor.scope, 'legacy');
    } else {
      assert.equal(actor.model, null);
      assert.equal(actor.scope, 'legacy');
    }
  }
  assert.deepEqual(
    INTERIOR_ART.map((home) => home.id).sort(),
    Object.keys(FATE_HOMES).sort(),
  );
  for (const home of INTERIOR_ART) {
    assert.deepEqual(
      home.rooms.map((room) => room.zone),
      HOME_ROOMS[home.id],
    );
    assert.deepEqual(home.entrance, HOME_ENTRANCES[home.id].door);
  }
  assert.notEqual(
    INTERIOR_ART.find((home) => home.id === 'emiya')!.signature,
    INTERIOR_ART.find((home) => home.id === 'tohsaka')!.signature,
  );
});

void test('three camera paintings share a non-folding floor and all walkable city positions round-trip in every view', () => {
  const cross = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let checked = 0;
  for (const mode of CITY_ART_MODES) {
    const { pairs, faces } = CITY_PILOT_REGISTRATIONS[mode];
    for (const [i, j, k] of faces)
      assert.ok(
        cross(pairs[i].world, pairs[j].world, pairs[k].world) *
          cross(pairs[i].paint, pairs[j].paint, pairs[k].paint) >
          0,
        `${mode}: floor must not fold`,
      );
    // A one-unit grid also covers thin curb and doorstep seams. A five-unit
    // sample missed a small eye-level apron gap during the browser audit.
    for (let x = 420; x < 1090; x += 1)
      for (let y = 280; y < 630; y += 1) {
        const point = { x, y };
        if (!cityPilotWalkable(point)) continue;
        const paint = cityPilotPaint(point, mode),
          back = cityPilotWorld(paint, mode);
        assert.ok(
          cityArtRegistered(paint, true, mode),
          `${mode}: current position is registered`,
        );
        assert.ok(
          Math.hypot(back.x - x, back.y - y) < 1e-6,
          `${mode}: clicked and rendered point agree`,
        );
        assert.ok(
          onCityArtPaving(paint, mode),
          `${mode}: ${x},${y} projects to pavement, at ${paint.x},${paint.y}`,
        );
        assert.ok(
          paint.x >= 0 &&
            paint.x < CITY_ART_CAMERAS[mode].width &&
            paint.y >= 0 &&
            paint.y < CITY_ART_CAMERAS[mode].height,
          `${mode}: character never falls outside the painted floor`,
        );
        checked++;
      }
  }
  assert.ok(checked > 6000);
});

void test('switching camera anchors the same actor feet for manual browsing and following, including zoomed and phone sizes', () => {
  for (const size of [
    { width: 1280, height: 550 },
    { width: 390, height: 600 },
  ])
    for (const following of [false, true])
      for (const zoom of [0.5, 1, 2.5, 8]) {
        for (const point of [
          MIYAMA_PILOT.start,
          ...MIYAMA_PILOT.homes.map((h) => HOME_ENTRANCES[h].door),
          CITY_LOCAL_PLACES[0].point,
        ]) {
          const foot = { x: size.width * 0.47, y: size.height * 0.73 };
          const before = { ...point };
          for (const mode of CITY_ART_MODES) {
            const camera = CITY_ART_CAMERAS[mode],
              paint = cityPilotPaint(point, mode),
              scale =
                Math.min(
                  size.width / camera.width,
                  size.height / camera.height,
                ) * zoom;
            const pan = cityCameraPan(
              foot,
              paint,
              scale,
              size,
              camera,
              following,
            );
            const origin = following
              ? {
                  x: size.width * 0.52 - paint.x * scale + pan.x,
                  y: size.height * 0.66 - paint.y * scale + pan.y,
                }
              : {
                  x: (size.width - camera.width * scale) / 2 + pan.x,
                  y: (size.height - camera.height * scale) / 2 + pan.y,
                };
            assert.ok(
              Math.hypot(
                origin.x + paint.x * scale - foot.x,
                origin.y + paint.y * scale - foot.y,
              ) < 1e-6,
            );
            assert.deepEqual(
              point,
              before,
              'a camera switch never mutates city coordinates',
            );
          }
        }
      }
});

void test('movement stays on the common floor in every camera; a blocked direction stops and its reverse can leave', () => {
  for (const mode of CITY_ART_MODES) {
    let point: { x: number; y: number } = { ...MIYAMA_PILOT.start };
    for (let n = 0; n < 600; n++)
      point = moveCityPilot(point, { x: 0, y: -1 }, 1, mode);
    const after = moveCityPilot(point, { x: 0, y: -1 }, 10, mode);
    assert.ok(
      Math.hypot(after.x - point.x, after.y - point.y) < 1.5,
      `${mode}: does not slide sideways`,
    );
    assert.ok(cityPilotWalkable(after));
    const back = moveCityPilot(point, { x: 0, y: 1 }, 8, mode);
    assert.ok(cityPilotWalkable(back));
    assert.ok(
      Math.hypot(
        cityPilotPaint(back, mode).x - cityPilotPaint(point, mode).x,
        cityPilotPaint(back, mode).y - cityPilotPaint(point, mode).y,
      ) /
        ((cityArtDepth(back, mode) + cityArtDepth(point, mode)) / 2) >
        1,
      `${mode}: can reverse away from an obstruction`,
    );
  }
});

void test('perspective child size changes continuously along a route without changing feet or animation contact', () => {
  for (const mode of CITY_ART_MODES) {
    const route = cityPilotRoute(
      HOME_ENTRANCES.einzbern.door,
      HOME_ENTRANCES.emiya.door,
    )!;
    let from: { x: number; y: number } = HOME_ENTRANCES.einzbern.door;
    let last = cityArtDepth(from, mode);
    for (const to of route) {
      const samples = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.5);
      for (let n = 1; n <= samples; n++) {
        const point = {
          x: from.x + ((to.x - from.x) * n) / samples,
          y: from.y + ((to.y - from.y) * n) / samples,
        };
        const depth = cityArtDepth(point, mode);
        assert.ok(
          Math.abs(depth - last) < 0.025,
          `${mode}: continuous size, no model pop`,
        );
        assert.deepEqual(
          cityPilotWorld(cityPilotPaint(point, mode), mode).x.toFixed(5),
          point.x.toFixed(5),
        );
        last = depth;
      }
      from = to;
    }
    if (mode !== 'overview')
      assert.ok(
        cityArtDepth(HOME_ENTRANCES.einzbern.door, mode) >
          cityArtDepth(HOME_ENTRANCES.emiya.door, mode),
        'near actors are larger than far actors',
      );
  }
});

void test('walk time remains consistent at 20, 30, 60 and 120 Hz without a resumed-frame leap', () => {
  for (const fps of [20, 30, 60, 120]) {
    let travel = 0;
    for (let frame = 0; frame < fps; frame++)
      travel += cityPilotFrameTravel(1 / fps);
    assert.ok(Math.abs(travel - CITY_PILOT_WALK_SPEED) < 1e-6);
  }
  for (const elapsed of [0, -1, NaN, Infinity])
    assert.equal(cityPilotFrameTravel(elapsed), 0);
  assert.equal(cityPilotFrameTravel(20), CITY_PILOT_WALK_SPEED * 0.1);
});

void test('manual forward, sideways and diagonal walking use the same body-relative pace at every camera depth', () => {
  const points = [
    { x: 470, y: 390 },
    MIYAMA_PILOT.start,
    { x: 835, y: 492 },
    { x: 991.46, y: 548.607 },
  ];
  for (const mode of CITY_ART_MODES)
    for (const point of points)
      for (const input of [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
      ])
        for (const fps of [20, 60, 120]) {
          const travel = cityPilotFrameTravel(1 / fps);
          const next = advanceCityPilotInput(point, input, travel, mode).point;
          const a = cityPilotPaint(point, mode),
            b = cityPilotPaint(next, mode);
          const visible =
            Math.hypot(b.x - a.x, b.y - a.y) /
            ((cityArtDepth(point, mode) + cityArtDepth(next, mode)) / 2);
          assert.ok(
            Math.abs(visible - travel) < travel * 0.002 + 1e-5,
            `${mode}/${fps}: ${visible} must stay near ${travel}`,
          );
          assert.ok(
            Math.abs((b.x - a.x) * input.y - (b.y - a.y) * input.x) < 1e-5,
            'a pressed direction stays straight across a floor triangle edge',
          );
          assert.ok(cityPilotWalkable(next));
          assert.deepEqual(
            advanceCityPilotInput(point, input, 0, mode).point,
            point,
          );
        }
});

void test('click routes keep bounded visible steps, reach both thresholds and the florist, and take the same time at different frame rates', () => {
  const goals = [
    HOME_ENTRANCES.einzbern.door,
    HOME_ENTRANCES.emiya.door,
    CITY_LOCAL_PLACES[0].point,
  ];
  for (const mode of CITY_ART_MODES)
    for (const goal of goals) {
      const times: number[] = [];
      for (const fps of [20, 60, 120]) {
        let point: { x: number; y: number } = { ...MIYAMA_PILOT.start },
          frames = 0;
        const route = cityPilotRoute(point, goal)!;
        while (route.length && frames < fps * 30) {
          const travel = cityPilotFrameTravel(1 / fps);
          const step = advanceCityPilotRoute(point, route, travel, mode);
          assert.equal(
            step.blocked,
            false,
            `${mode}: an open route cannot stall`,
          );
          const a = cityPilotPaint(point, mode),
            b = cityPilotPaint(step.point, mode);
          const visible =
            Math.hypot(b.x - a.x, b.y - a.y) /
            ((cityArtDepth(point, mode) + cityArtDepth(step.point, mode)) / 2);
          assert.ok(
            visible <= travel * 1.005 + 1e-5,
            `${mode}/${fps}: projection seams cannot create a speed burst`,
          );
          if (!step.used && route.length)
            assert.ok(
              Math.abs(step.spent - travel) < 1e-4,
              'an unobstructed route consumes the full walking time',
            );
          assert.ok(cityPilotLine(point, step.point), 'no doorway shortcut');
          point = step.point;
          route.splice(0, step.used);
          frames++;
        }
        assert.equal(route.length, 0, `${mode}: reaches the destination`);
        assert.deepEqual(point, goal);
        times.push(frames / fps);
      }
      assert.ok(
        Math.max(...times) - Math.min(...times) < 0.075,
        `${mode}: walking time must not vary with display frequency`,
      );
    }
});

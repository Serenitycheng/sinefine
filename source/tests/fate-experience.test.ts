import assert from 'node:assert/strict';
import test from 'node:test';
import { houseResidentSprite } from '../lib/fate-house-sprites';
import { streetSpriteCell } from '../lib/fate-street-sprite-cell';

import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
} from '../lib/fate-city-interior-scenes';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import {
  houseWalkingArt,
  houseRoomWarmArt,
} from '../lib/fate-interior-loading';
import { houseGaitFrame, houseWalkDistance } from '../lib/fate-house-walk';
import { nearbyInteriorSpots } from '../lib/fate-interior-interaction';
import {
  interiorClearSegment,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import {
  interiorYieldRoute,
  advanceInteriorYield,
} from '../lib/fate-interior-traffic';
import {
  roomArrivalCamera,
  roomFollowCamera,
  roomResizeCamera,
} from '../lib/fate-room-camera';
import { createDailyLife } from '../lib/fate-life';
import { HouseGameSession } from '../lib/fate-house-game';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { createEmiyaLifeSave } from '../lib/fate-emiya-life';
import {
  emiyaRoomRequiredArt,
  SHIROU_LIFE_SPRITES,
} from '../lib/fate-emiya-actions';
import { EmiyaResidents } from '../lib/fate-emiya-residents';
import { EMIYA_ROOMS } from '../lib/fate-emiya-house';

void test('a stride measures actual projected travel consistently in both axes, with no steps at a wall', () => {
  const scene = CITY_INTERIOR_SCENES.cafe;
  const start = { x: 500, y: 350 },
    end = { x: 580, y: 350 };
  const distance = houseWalkDistance(start, end, scene.floor);
  let sum = 0;
  for (let x = 500; x < 580; x += 2)
    sum += houseWalkDistance({ x, y: 350 }, { x: x + 2, y: 350 }, scene.floor);
  assert.ok(Math.abs(sum - distance) < 0.01);
  assert.equal(houseWalkDistance(start, start, scene.floor), 0);
  for (const actor of [
    'illya',
    'kiritsugu',
    'rin',
    'sakura',
    'shirou',
  ] as const) {
    assert.equal(houseGaitFrame(actor, distance, false), 0);
    const frames = new Set(
      Array.from({ length: 500 }, (_, n) =>
        Math.floor(houseGaitFrame(actor, n, true)),
      ),
    );
    assert.deepEqual(
      [...frames].sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6],
    );
  }
  assert.equal(houseGaitFrame('rin', Number.NaN, true), 0);
});

void test('nearby hints keep their E target across a boundary and explicit selection still wins', () => {
  const scene = {
    ...CITY_INTERIOR_SCENES.cafe,
    furniture: [],
    spots: [
      { id: 'a', point: { x: 480, y: 400 }, detail: '', label: '杯子' },
      { id: 'b', point: { x: 520, y: 400 }, detail: '', label: '咖啡豆' },
    ],
  };
  assert.equal(
    nearbyInteriorSpots({ x: 501, y: 400 }, scene, null, 'a')[0].id,
    'a',
  );
  assert.equal(
    nearbyInteriorSpots({ x: 520, y: 400 }, scene, null, 'a')[0].id,
    'b',
  );
  assert.equal(
    nearbyInteriorSpots({ x: 501, y: 400 }, scene, 'b', 'a')[0].id,
    'b',
  );
  assert.deepEqual(
    nearbyInteriorSpots({ x: 900, y: 600 }, scene, null, 'a'),
    [],
  );
});

void test('a resident yields by a bounded collision-safe path, never through the player', () => {
  const scene = { ...CITY_INTERIOR_SCENES.cafe, furniture: [] };
  const player = { x: 500, y: 400 },
    start = { x: 500, y: 350 };
  const path = interiorYieldRoute(start, player, { x: 500, y: 300 }, scene, [
    player,
  ]);
  assert.ok(path?.length);
  let point = start,
    pending = path;
  for (let tick = 0; tick < 60 && pending.length; tick++) {
    const result = advanceInteriorYield(point, pending, 6, scene, [player]);
    assert.ok(interiorClearSegment(point, result.point, scene, [player]));
    assert.ok(
      Math.hypot(result.point.x - point.x, result.point.y - point.y) <= 6.001,
    );
    point = result.point;
    pending = result.path;
  }
  assert.equal(pending.length, 0);
  assert.ok(Math.abs(point.x - player.x) >= 47);
  const narrow = {
    ...scene,
    furniture: [
      { id: 'left', footprint: { x: 300, y: 100, width: 180, height: 550 } },
      { id: 'right', footprint: { x: 520, y: 100, width: 180, height: 550 } },
    ],
  };
  assert.equal(
    interiorYieldRoute(start, player, { x: 500, y: 300 }, narrow, [player]),
    null,
  );
});

void test('a blocked formal doorway clears while the daily clock stays paused, then the original door succeeds', () => {
  const life = createDailyLife();
  life.people.tokiomi.activity = {
    kind: 'visit',
    home: 'tohsaka',
    phase: 'doing',
    remaining: 80,
    source: 'rules',
    reason: '测试',
  };
  const session = new HouseGameSession(life, {
    actor: 'rin',
    point: { ...HOME_ENTRANCES.tohsaka.door },
    scene: 'map',
    zoom: { street: 1, map: 1 },
    camera: { x: 0, y: 0, scale: 1 },
    manual: { x: 0, y: 0 },
  });
  const plan = cityPreviewVisit(CITY_INTERIOR_SCENES.tohsaka, 'rin').plan;
  const door = plan.rooms.hall.doors.find((d) => d.to === 'study')!;
  const body = session.bodies.find((b) => b.id === 'tokiomi')!;
  body.room = 'study';
  body.point = { ...door.arrival };
  session.move(door.point, 'up', null);
  const minute = session.life.minutes,
    activity = structuredClone(session.life.people.tokiomi.activity);
  assert.equal(session.door(door), false);
  for (let i = 0; i < 45; i++) session.tick(0.05);
  assert.equal(session.life.minutes, minute);
  assert.deepEqual(session.life.people.tokiomi.activity, activity);
  assert.ok(
    Math.hypot(body.point.x - door.arrival.x, body.point.y - door.arrival.y) >=
      30,
  );
  assert.ok(interiorWalkable(body.point, plan.rooms.study.scene));
  assert.equal(session.door(door), true);
  assert.equal(session.controlled, 'rin');
});

void test('native Emiya residents also physically yield with the daily clock paused', () => {
  const save = createEmiyaLifeSave();
  save.life.people.saber.activity = {
    kind: 'visit',
    home: 'emiya',
    phase: 'doing',
    remaining: 80,
    source: 'rules',
    reason: '测试',
  };
  const player = { room: 'hall' as const, point: { x: 500, y: 500 } };
  const house = new EmiyaResidents(save.life, player);
  const body = house.all().find((b) => b.id === 'saber')!;
  body.room = 'hall';
  body.point = { x: 500, y: 450 };
  const minute = save.life.minutes;
  house.requestPassage(player, { room: 'hall', point: { x: 500, y: 400 } });
  for (let i = 0; i < 30; i++) house.step(save.life, player, 0.05, false);
  assert.ok(Math.abs(body.point.x - 500) >= 35);
  assert.ok(interiorWalkable(body.point, EMIYA_ROOMS.hall.scene));
  assert.equal(save.life.minutes, minute);
});

void test('opposing formal residents reserve one yielding side without both stepping into each other', () => {
  const life = createDailyLife();
  for (const id of ['tokiomi', 'kirei'] as const)
    life.people[id].activity = {
      kind: 'visit',
      home: 'tohsaka',
      phase: 'doing',
      remaining: 80,
      source: 'rules',
      reason: '测试',
    };
  const session = new HouseGameSession(life, {
    actor: 'rin',
    point: { ...HOME_ENTRANCES.tohsaka.door },
    scene: 'map',
    zoom: { street: 1, map: 1 },
    camera: { x: 0, y: 0, scale: 1 },
    manual: { x: 0, y: 0 },
  });
  session.move({ x: 800, y: 550 }, 'up', null);
  const a = session.bodies.find((b) => b.id === 'kirei')!,
    b = session.bodies.find((b) => b.id === 'tokiomi')!;
  a.room = b.room = 'hall';
  a.point = { x: 500, y: 500 };
  b.point = { x: 500, y: 450 };
  session.requestPassage(a.point, b.point, 'hall', a.id);
  session.requestPassage(b.point, a.point, 'hall', b.id);
  for (let i = 0; i < 30; i++) {
    const beforeA = { ...a.point },
      beforeB = { ...b.point };
    session.tick(0.05);
    assert.ok(Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) >= 30);
    assert.ok(
      Math.hypot(beforeA.x - a.point.x, beforeA.y - a.point.y) <= 6.001,
    );
    assert.ok(
      Math.hypot(beforeB.x - b.point.x, beforeB.y - b.point.y) <= 6.001,
    );
  }
  assert.deepEqual(a.point, { x: 500, y: 500 });
  assert.ok(Math.abs(b.point.x - 500) >= 35);
});

void test('room camera follows at the same rate across frame rates and preserves zoom anchors', () => {
  const size = { width: 1280, height: 650 },
    foot = { x: 1100, y: 700 },
    body = { x: 1000, y: 420, width: 160, height: 280 },
    scale = 1;
  const origin = roomArrivalCamera(
    { x: 0.68, y: 0.7 },
    foot,
    scale,
    size,
    body,
    { x: 0, y: 0 },
  );
  let a = origin,
    b = origin;
  for (let i = 0; i < 60; i++)
    a = roomFollowCamera(a, foot, scale, size, body, 1 / 60);
  for (let i = 0; i < 30; i++)
    b = roomFollowCamera(b, foot, scale, size, body, 1 / 30);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.001);
  const next = roomResizeCamera(a, foot, { size, scale }, 1.1, size, body);
  assert.ok(Math.abs(next.x + foot.x * 1.1 - (a.x + foot.x)) < 0.001);
  assert.ok(next.x <= 0 && next.x >= size.width - 1600 * 1.1);
});

void test('every building enters with all four walking directions and warms at most two connected rooms', () => {
  for (const site of CITY_INTERIOR_IDS) {
    const { plan, actor, room } = cityPreviewVisit(
      CITY_INTERIOR_SCENES[site],
      'illya',
    );
    const foreground = houseWalkingArt(plan, actor);
    for (const d of ['up', 'down', 'left', 'right'] as const) {
      assert.ok(foreground.includes(plan.sprite(actor, d, 0).file));
      assert.ok(foreground.includes(plan.sprite(actor, d, 1).file));
    }
    const warm = houseRoomWarmArt(plan, room, actor);
    const backgrounds = warm.filter((f) =>
      Object.values(plan.rooms).some((r) => r.scene.painting === f),
    );
    assert.ok(backgrounds.length <= 2);
    assert.equal(new Set(foreground).size, foreground.length);
  }
  const walking = emiyaRoomRequiredArt('hall', true, false, [], false);
  assert.ok(!walking.includes(SHIROU_LIFE_SPRITES.path));
  assert.ok(
    emiyaRoomRequiredArt('hall', true, false, [], true).includes(
      SHIROU_LIFE_SPRITES.path,
    ),
  );
});

void test('Archer crops exclude neighbouring boots and Natalia retains her actual three columns', () => {
  for (const direction of ['left', 'right', 'up', 'down'] as const)
    for (let phase = 0; phase <= 6; phase++) {
      for (const id of ['emiya', 'natalia'] as const) {
        const s = houseResidentSprite(id, direction, phase)!;
        assert.ok(s.clip && s.clip.length >= 4);
        assert.ok(s.bounds.x >= 0 && s.bounds.y >= 0);
        assert.ok(s.bounds.x + s.bounds.width <= s.cellWidth + 0.001);
        assert.ok(s.bounds.y + s.bounds.height <= s.cellHeight + 0.001);
        if (id === 'natalia') {
          assert.equal(s.imageWidth / s.cellWidth, 3);
          assert.ok(s.cropX <= 200);
          const fallback = streetSpriteCell(id, phase);
          assert.equal(fallback.columns, 3);
          assert.equal(fallback.frame * 100, s.cropX);
          assert.ok(fallback.clipPath);
        }
      }
    }
  assert.ok(
    houseResidentSprite('emiya', 'left', 1)!.bounds.y > 15,
    'boots from the preceding row are outside the character crop',
  );
});

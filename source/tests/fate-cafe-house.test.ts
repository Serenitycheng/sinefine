import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CAFE_ROOMS, CAFE_ROOM_IDS, CAFE_CAST } from '../lib/fate-cafe-house';
import { CITY_INTERIOR_SCENES } from '../lib/fate-city-interior-scenes';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import { schoolSprite } from '../lib/fate-school-sprites';
import { interiorWalkable, interiorRoute, interiorClearSegment, interiorMove } from '../lib/fate-city-interior-navigation';
import { mirrorPreviewSprite, nearestPreviewDoor } from '../lib/fate-preview-house';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import { defaultHousing, homeOf } from '../lib/fate-housing';

void test('Cafe adds three distinct areas and keeps the approved main painting and original single-room registration', () => {
  assert.equal(HOUSE_PREVIEWS.cafe.rooms, CAFE_ROOMS);
  assert.equal(CAFE_ROOM_IDS.length, 3);
  assert.equal(new Set(CAFE_ROOM_IDS.map((id) => CAFE_ROOMS[id].scene.painting)).size, 3);
  assert.equal(CAFE_ROOMS.hall.scene.painting, CITY_INTERIOR_SCENES.cafe.painting);
  assert.equal(createHash('sha256').update(readFileSync('public' + CAFE_ROOMS.hall.scene.painting)).digest('hex'),
    '4c60a1e6d24f512adc7cdd2aa5448cd20fedac6e2f9b39f38a2b7175eedb5b7c');
  assert.deepEqual(CITY_INTERIOR_SCENES.cafe.floor, { backLeft: 212.5, backRight: 1425, backY: 427.5, frontLeft: 45, frontRight: 1555, frontY: 880 });
  for (const id of CAFE_ROOM_IDS) {
    assert.equal(CAFE_ROOMS[id].scene.id, 'cafe');
    assert.ok(existsSync('public' + CAFE_ROOMS[id].scene.painting));
  }
});

void test('Cafe keeps four directional links, one real street exit and safe return approaches', () => {
  let links = 0, exits = 0;
  assert.ok(interiorWalkable({ x: 500, y: 560 }, CAFE_ROOMS.hall.scene));
  for (const id of CAFE_ROOM_IDS) for (const door of CAFE_ROOMS[id].doors) {
    const room = CAFE_ROOMS[id];
    assert.ok(interiorWalkable(door.point, room.scene), `${id}:${door.id}:threshold`);
    assert.equal(nearestPreviewDoor(door.point, room)?.id, door.id);
    if (!door.to) { assert.equal(id, 'hall'); exits++; continue; }
    links++;
    const other = CAFE_ROOMS[door.to as keyof typeof CAFE_ROOMS];
    const back = other.doors.find((candidate) => candidate.to === id)!;
    assert.ok(back, `${id}:${door.id}:backlink`);
    assert.ok(interiorWalkable(door.arrival, other.scene), `${id}:${door.id}:arrival`);
    assert.ok(interiorRoute(door.arrival, back.point, other.scene), `${id}:${door.id}:return-walk`);
  }
  assert.equal(links, 4); assert.equal(exits, 1);
});

void test('Every cafe interaction can be reached without walking through its tables or counters', () => {
  let count = 0;
  for (const id of CAFE_ROOM_IDS) {
    const room = CAFE_ROOMS[id];
    const points = [...room.doors.map((door) => door.point), ...room.scene.spots.map((spot) => spot.point)];
    count += room.scene.spots.length;
    for (const point of points) assert.ok(interiorWalkable(point, room.scene), `${id}:${JSON.stringify(point)}`);
    for (const from of points) for (const to of points) {
      const route = interiorRoute(from, to, room.scene);
      assert.ok(route, `${id}:route ${JSON.stringify({ from, to })}`);
      let previous = from;
      for (const point of route) {
        assert.ok(interiorClearSegment(previous, point, room.scene), `${id}:route hits furniture`);
        previous = point;
      }
    }
  }
  assert.equal(count, 12);
});

void test('Cafe painted furniture and room thresholds block direct floor movement', () => {
  for (const id of CAFE_ROOM_IDS) {
    const room = CAFE_ROOMS[id];
    for (const furniture of room.scene.furniture) {
      const r = furniture.footprint;
      assert.ok(!interiorWalkable({ x: r.x + r.width / 2, y: r.y + r.height / 2 }, room.scene), `${id}:${furniture.id}`);
    }
  }
  const room = CAFE_ROOMS.prep;
  const start = room.scene.spots.find((spot) => spot.id === 'tray')!.point;
  let point = start;
  for (let i = 0; i < 100; i++) point = interiorMove(point, { x: -20, y: 0 }, room.scene);
  assert.ok(interiorWalkable(point, room.scene));
  assert.ok(point.x < start.x && point.x > 0);
});

void test('Cafe visitors reuse approved native student frames and keep their home identities', () => {
  const housing = defaultHousing();
  assert.deepEqual(CAFE_CAST.map((actor) => actor.id), ['shirou', 'rin', 'sakura']);
  assert.equal(homeOf('shirou', housing), 'emiya');
  assert.equal(homeOf('rin', housing), 'tohsaka');
  assert.equal(homeOf('sakura', housing), 'matou');
  for (const actor of CAFE_CAST) {
    for (const direction of ['down', 'up', 'left', 'right'] as const) for (let phase = 0; phase <= 6; phase++)
      assert.deepEqual(HOUSE_PREVIEWS.cafe.sprite(actor.id, direction, phase), schoolSprite(actor.id, direction, phase));
    for (const pose of ['sit', 'read'] as const)
      assert.deepEqual(HOUSE_PREVIEWS.cafe.sprite(actor.id, 'down', 0, pose), schoolSprite(actor.id, 'down', 0, pose));
  }
});

void test('Four cafe seats retain hip contact and full bodies through narrow views and maximum zoom', () => {
  let count = 0;
  for (const id of CAFE_ROOM_IDS) for (const action of CAFE_ROOMS[id].actions) {
    count++;
    const room = CAFE_ROOMS[id];
    const approach = room.scene.spots.find((spot) => spot.id === action.id)!.point;
    assert.ok(interiorWalkable(approach, room.scene), `${id}:${action.id}:approach`);
    assert.notDeepEqual(approach, action.contact);
    for (const actor of CAFE_CAST) {
      let sprite = HOUSE_PREVIEWS.cafe.sprite(actor.id, 'down', 0, action.pose);
      if (action.mirror) sprite = mirrorPreviewSprite(sprite);
      const { foot, body, spriteScale } = previewPresentation(room.scene, approach, sprite, action);
      assert.ok(sprite.seat && action.seat);
      assert.ok(Math.abs(foot.x + (sprite.seat.x - sprite.anchorX) * spriteScale - action.seat.x) < 1e-8);
      assert.ok(Math.abs(foot.y + (sprite.seat.y - sprite.anchorY) * spriteScale - action.seat.y) < 1e-8);
      assert.ok(body.height > 200 && body.height < 560, `${id}:${actor.id}:height ${body.height}`);
      for (const size of [{ width: 1100, height: 560 }, { width: 390, height: 430 }, { width: 320, height: 180 }]) {
        const zoom = houseZoom(2.5, size, body.height);
        const scale = Math.min(size.width / 1600, size.height / 900) * zoom;
        const origin = houseCamera({ x: size.width / 2 - foot.x * scale, y: size.height * .7 - foot.y * scale }, scale, size, body);
        assert.ok(origin.x + body.x * scale >= -.1 && origin.y + body.y * scale >= -.1, `${id}:${actor.id}:top`);
        assert.ok(origin.x + (body.x + body.width) * scale <= size.width + .1, `${id}:${actor.id}:right`);
        assert.ok(origin.y + (body.y + body.height) * scale <= size.height + .1, `${id}:${actor.id}:bottom`);
      }
    }
  }
  assert.equal(count, 4);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  TOHSAKA_ROOMS,
  TOHSAKA_ROOM_IDS,
  TOHSAKA_CAST,
  nearestHouseDoor,
  houseCamera,
  houseZoom,
} from '../lib/fate-tohsaka-house';
import {
  interiorWalkable,
  interiorRoute,
  interiorClearSegment,
  interiorMove,
} from '../lib/fate-city-interior-navigation';
import {
  interiorProject,
  interiorDepth,
} from '../lib/fate-city-interior-scenes';
import { tohsakaSprite } from '../lib/fate-tohsaka-sprites';
import { homeOf, defaultHousing, SERVANT_MASTERS } from '../lib/fate-housing';

void test('Tohsaka art has five distinct native rooms, reusing the approved study', () => {
  assert.equal(TOHSAKA_ROOM_IDS.length, 5);
  assert.equal(
    new Set(TOHSAKA_ROOM_IDS.map((id) => TOHSAKA_ROOMS[id].scene.painting))
      .size,
    5,
  );
  for (const id of TOHSAKA_ROOM_IDS)
    assert.ok(existsSync('public' + TOHSAKA_ROOMS[id].scene.painting));
  assert.equal(
    TOHSAKA_ROOMS.study.scene.painting,
    '/fate/interior-art/tohsaka-main-soft-v1.png',
  );
});
void test('Every interior doorway is bidirectional with safe arrival, and only hall exits to street', () => {
  let links = 0;
  for (const id of TOHSAKA_ROOM_IDS)
    for (const door of TOHSAKA_ROOMS[id].doors) {
      assert.ok(
        interiorWalkable(door.point, TOHSAKA_ROOMS[id].scene),
        id + ':' + door.id,
      );
      assert.equal(
        nearestHouseDoor(door.point, TOHSAKA_ROOMS[id])?.id,
        door.id,
      );
      if (!door.to) {
        assert.equal(id, 'hall');
        continue;
      }
      links++;
      assert.ok(TOHSAKA_ROOMS[door.to].doors.some((back) => back.to === id));
      assert.ok(
        interiorWalkable(door.arrival, TOHSAKA_ROOMS[door.to].scene),
        id + '->' + door.to,
      );
    }
  assert.equal(links, 8);
});
void test('All doorway pairs and essential interactions have clear collision-tested routes', () => {
  for (const id of TOHSAKA_ROOM_IDS) {
    const room = TOHSAKA_ROOMS[id],
      start = { x: 500, y: 560 };
    for (const target of [...room.doors, ...room.scene.spots]) {
      const route = interiorRoute(start, target.point, room.scene);
      assert.ok(route, id + ':' + target.id);
      let previous = start;
      for (const next of route) {
        assert.ok(interiorClearSegment(previous, next, room.scene));
        previous = next;
      }
      assert.deepEqual(previous, target.point);
    }
    for (const a of room.doors)
      for (const b of room.doors)
        assert.ok(interiorRoute(a.point, b.point, room.scene));
  }
});
void test('Painted furniture blocks movement without tunnelling', () => {
  for (const id of ['study', 'dining', 'bedroom', 'workshop'] as const) {
    const scene = TOHSAKA_ROOMS[id].scene,
      rect = scene.furniture[0].footprint;
    const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height + 30 };
    const end = interiorMove(start, { x: 0, y: -200 }, scene);
    assert.ok(end.y >= rect.y + rect.height + 13 - 0.01, id);
  }
});
void test('Four distinct preview identities retain project home and master mappings', () => {
  assert.deepEqual(
    TOHSAKA_CAST.map((a) => a.id),
    ['rin', 'emiya', 'tokiomi', 'gilgamesh'],
  );
  assert.equal(SERVANT_MASTERS.emiya, 'rin');
  assert.equal(SERVANT_MASTERS.gilgamesh, 'tokiomi');
  for (const actor of TOHSAKA_CAST)
    assert.equal(homeOf(actor.id, defaultHousing()), 'tohsaka');
});
void test('Native side gait uses six phases with one scale and explicit front/back three-frame reuse', () => {
  for (const { id } of TOHSAKA_CAST) {
    const idle = tohsakaSprite(id, 'down', 0);
    assert.ok(existsSync('public' + idle.file));
    assert.equal(
      new Set(
        Array.from(
          { length: 6 },
          (_, i) => tohsakaSprite(id, 'left', i + 1).index,
        ),
      ).size,
      6,
    );
    assert.equal(
      new Set(
        Array.from(
          { length: 6 },
          (_, i) => tohsakaSprite(id, 'up', i + 1).index,
        ),
      ).size,
      3,
    );
    for (let i = 1; i <= 6; i++) {
      const left = tohsakaSprite(id, 'left', i),
        right = tohsakaSprite(id, 'right', i);
      assert.equal(left.scale, idle.scale);
      assert.equal(right.scale, idle.scale);
      assert.equal(right.anchorX, left.cellWidth - left.anchorX);
      assert.equal(right.mirror, true);
    }
  }
});
void test('Zoom clamp keeps whole actors inside painting and viewport at every doorway', () => {
  for (const size of [
    { width: 1100, height: 560 },
    { width: 390, height: 430 },
    { width: 320, height: 180 },
  ]) {
    const zoom = houseZoom(2.5, size),
      scale = Math.min(size.width / 1600, size.height / 900) * zoom;
    for (const { id: actor } of TOHSAKA_CAST)
      for (const id of TOHSAKA_ROOM_IDS)
        for (const door of TOHSAKA_ROOMS[id].doors) {
          const scene = TOHSAKA_ROOMS[id].scene,
            foot = interiorProject(door.point, scene.floor),
            sprite = tohsakaSprite(actor, 'down', 0),
            s = interiorDepth(door.point, scene.floor) * sprite.scale;
          const body = {
            x: foot.x + (sprite.bounds.x - sprite.anchorX) * s,
            y: foot.y + (sprite.bounds.y - sprite.anchorY) * s,
            width: sprite.bounds.width * s,
            height: sprite.bounds.height * s,
          };
          const origin = houseCamera(
            {
              x: size.width / 2 - foot.x * scale,
              y: size.height * 0.7 - foot.y * scale,
            },
            scale,
            size,
            body,
          );
          assert.ok(origin.x + body.x * scale >= -0.1);
          assert.ok(origin.y + body.y * scale >= -0.1);
          assert.ok(
            origin.x + (body.x + body.width) * scale <= size.width + 0.1,
          );
          assert.ok(
            origin.y + (body.y + body.height) * scale <= size.height + 0.1,
          );
          if (1600 * scale > size.width) {
            assert.ok(origin.x <= 0);
            assert.ok(origin.x >= size.width - 1600 * scale - 0.1);
          }
        }
  }
});

void test('Seated and reading poses use the native chair atlas, safe approaches and complete body framing', () => {
  for (const id of TOHSAKA_ROOM_IDS)
    for (const action of TOHSAKA_ROOMS[id].actions) {
      const room = TOHSAKA_ROOMS[id],
        spot = room.scene.spots.find((s) => s.id === action.id)!;
      assert.ok(spot && interiorWalkable(spot.point, room.scene));
      assert.notDeepEqual(spot.point, action.contact);
      for (const { id: actor } of TOHSAKA_CAST) {
        const sprite = tohsakaSprite(actor, 'down', 0, action.pose);
        assert.equal(
          sprite.file,
          '/fate/character-art/tohsaka-seated-soft-v1.png',
        );
        assert.ok(existsSync('public' + sprite.file));
        assert.equal(sprite.columns, 4);
        assert.equal(sprite.rows, 2);
        assert.ok(
          sprite.bounds.height * sprite.scale >= 190 &&
            sprite.bounds.height * sprite.scale <= 245,
        );
        for (const size of [
          { width: 1100, height: 560 },
          { width: 390, height: 430 },
          { width: 320, height: 180 },
        ]) {
          const scale =
              Math.min(size.width / 1600, size.height / 900) *
              houseZoom(2.5, size),
            foot = interiorProject(action.contact, room.scene.floor),
            depth =
              interiorDepth(action.contact, room.scene.floor) * sprite.scale;
          const body = {
            x: foot.x + (sprite.bounds.x - sprite.anchorX) * depth,
            y: foot.y + (sprite.bounds.y - sprite.anchorY) * depth,
            width: sprite.bounds.width * depth,
            height: sprite.bounds.height * depth,
          };
          const origin = houseCamera(
            {
              x: size.width / 2 - foot.x * scale,
              y: size.height * 0.7 - foot.y * scale,
            },
            scale,
            size,
            body,
          );
          assert.ok(
            origin.x + body.x * scale >= 0 && origin.y + body.y * scale >= 0,
          );
          assert.ok(
            origin.x + (body.x + body.width) * scale <= size.width &&
              origin.y + (body.y + body.height) * scale <= size.height,
          );
        }
      }
    }
});

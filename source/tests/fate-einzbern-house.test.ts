import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  EINZBERN_ROOMS,
  EINZBERN_ROOM_IDS,
  EINZBERN_CAST,
} from '../lib/fate-einzbern-house';
import { einzbernSprite } from '../lib/fate-einzbern-sprites';
import {
  nearestPreviewDoor,
  mirrorPreviewSprite,
  type PreviewSprite,
} from '../lib/fate-preview-house';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import { ART_SPRITE_FRAMES } from '../lib/fate-art-sprite';
import originalIllya from '../lib/fate-emiya-sprite-data.json';
import {
  interiorProject,
  interiorDepth,
} from '../lib/fate-city-interior-scenes';
import {
  interiorRoute,
  interiorWalkable,
  interiorClearSegment,
  interiorMove,
} from '../lib/fate-city-interior-navigation';
import { homeOf, defaultHousing } from '../lib/fate-housing';

const directions = ['down', 'up', 'left', 'right'] as const;
void test('Fuyuki family home has six distinct areas and reuses its approved lounge', () => {
  assert.equal(EINZBERN_ROOM_IDS.length, 6);
  assert.equal(
    new Set(EINZBERN_ROOM_IDS.map((id) => EINZBERN_ROOMS[id].scene.painting))
      .size,
    6,
  );
  for (const id of EINZBERN_ROOM_IDS) {
    const scene = EINZBERN_ROOMS[id].scene;
    assert.equal(scene.id, 'einzbern');
    assert.match(scene.basis, /项目改编/);
    assert.ok(existsSync('public' + scene.painting));
  }
  assert.equal(
    EINZBERN_ROOMS.lounge.scene.painting,
    '/fate/interior-art/einzbern-main-soft-v1.png',
  );
});
void test('All five family room connections are bidirectional and have separate safe hall thresholds', () => {
  let links = 0,
    exits = 0;
  for (const id of EINZBERN_ROOM_IDS)
    for (const door of EINZBERN_ROOMS[id].doors) {
      assert.ok(
        interiorWalkable(door.point, EINZBERN_ROOMS[id].scene),
        id + ':' + door.id,
      );
      assert.equal(
        nearestPreviewDoor(door.point, EINZBERN_ROOMS[id])?.id,
        door.id,
      );
      if (!door.to) {
        assert.equal(id, 'hall');
        exits++;
        continue;
      }
      const next = EINZBERN_ROOMS[door.to as typeof id];
      links++;
      assert.ok(next.doors.some((back) => back.to === id));
      assert.ok(interiorWalkable(door.arrival, next.scene));
      assert.ok(interiorRoute(door.arrival, next.doors[0].point, next.scene));
    }
  assert.equal(links, 10);
  assert.equal(exits, 1);
});
void test('Every door and thirteen family interactions have complete collision-safe routes', () => {
  let interactions = 0;
  for (const id of EINZBERN_ROOM_IDS) {
    const room = EINZBERN_ROOMS[id];
    interactions += room.scene.spots.length;
    for (const start of [{ x: 500, y: 560 }, ...room.doors.map((d) => d.point)])
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
  }
  assert.equal(interactions, 13);
});
void test('Family furniture bounds stay finite and full keyboard steps cannot tunnel through beds, tables or cabinets', () => {
  for (const id of EINZBERN_ROOM_IDS)
    for (const solid of EINZBERN_ROOMS[id].scene.furniture) {
      const r = solid.footprint,
        scene = EINZBERN_ROOMS[id].scene;
      assert.ok(Object.values(r).every(Number.isFinite));
      assert.ok(r.width > 0 && r.height > 0);
      const start = { x: r.x + r.width / 2, y: r.y + r.height + 30 };
      if (interiorWalkable(start, scene))
        assert.ok(
          interiorMove(start, { x: 0, y: -300 }, scene).y >=
            r.y + r.height + 13 - 0.01,
          id + ':' + solid.id,
        );
    }
});
void test('Manual hall walking stops at neighbouring room boundaries without blocking actual entrances', () => {
  const hall = EINZBERN_ROOMS.hall;
  const start = { x: 558, y: 97 };
  assert.ok(interiorWalkable(start, hall.scene));
  const end = interiorMove(start, { x: -800, y: 0 }, hall.scene);
  const painted = interiorProject(end, hall.scene.floor);
  assert.ok(
    painted.x >= 384,
    'The left room remains behind its actual threshold',
  );
  assert.equal(end.y, start.y);
  const door = hall.doors.find((d) => d.to === 'lounge')!;
  assert.ok(interiorRoute(end, door.point, hall.scene));
  assert.ok(interiorWalkable(door.point, hall.scene));
});

void test('Family preview keeps the three existing identities and Shirou in his separate Emiya home', () => {
  assert.deepEqual(
    EINZBERN_CAST.map((a) => a.id),
    ['kiritsugu', 'irisviel', 'illya'],
  );
  for (const actor of EINZBERN_CAST)
    assert.equal(homeOf(actor.id, defaultHousing()), 'einzbern');
  assert.equal(homeOf('shirou', defaultHousing()), 'emiya');
});
function nativeCrop(sprite: PreviewSprite) {
  const png = readFileSync('public' + sprite.file);
  assert.equal(png.readUInt32BE(16), sprite.imageWidth);
  assert.equal(png.readUInt32BE(20), sprite.imageHeight);
  assert.equal(png[25], 6);
  assert.ok(
    sprite.cropX >= 0 &&
      sprite.cropY >= 0 &&
      sprite.cropX + sprite.cellWidth <= sprite.imageWidth &&
      sprite.cropY + sprite.cellHeight <= sprite.imageHeight,
  );
  assert.ok(
    sprite.bounds.x >= 0 &&
      sprite.bounds.y >= 0 &&
      sprite.bounds.x + sprite.bounds.width <= sprite.cellWidth &&
      sprite.bounds.y + sprite.bounds.height <= sprite.cellHeight,
  );
}
void test('Illya retains all twenty-four native gait cells and her original direction anchors, without redrawing', () => {
  for (const direction of directions)
    for (let phase = 0; phase <= 6; phase++) {
      const sprite = einzbernSprite('illya', direction, phase);
      nativeCrop(sprite);
      const col = phase ? (phase - 1) % 6 : 0,
        row = ['down', 'left', 'right', 'up'].indexOf(direction),
        original = ART_SPRITE_FRAMES[direction][col];
      assert.equal(sprite.file, '/fate/art-sample/illya-walk-v1.png');
      assert.equal(sprite.cropX + sprite.anchorX, col * 256 + original.x);
      assert.equal(sprite.cropY + sprite.anchorY, row * 256 + original.y);
      assert.equal(sprite.scale, original.scale);
    }
  const sit = einzbernSprite('illya', 'down', 0, 'sit'),
    bench = originalIllya.actions.frames.bench[0];
  nativeCrop(sit);
  assert.equal(sit.file, originalIllya.actions.path);
  assert.equal(sit.cropX, bench.x);
  assert.equal(sit.cropY, bench.y);
  assert.equal(sit.anchorY, bench.anchorY);
  assert.equal(
    einzbernSprite('illya', 'down', 0, 'read').file,
    '/fate/character-art/einzbern-seated-soft-v1.png',
  );
});
void test('Adult gaits use actual native cells, stable row scales, six side phases and correct rightward mirroring', () => {
  for (const actor of ['kiritsugu', 'irisviel'] as const)
    for (const direction of directions) {
      for (let phase = 0; phase <= 6; phase++)
        nativeCrop(einzbernSprite(actor, direction, phase));
      const moving = Array.from({ length: 6 }, (_, i) =>
        einzbernSprite(actor, direction, i + 1),
      );
      assert.equal(new Set(moving.map((s) => s.scale)).size, 1);
      assert.equal(
        new Set(moving.map((s) => s.index)).size,
        direction === 'left' || direction === 'right' ? 6 : 3,
      );
      for (const sprite of moving)
        assert.ok(
          sprite.bounds.height * sprite.scale >= 295 &&
            sprite.bounds.height * sprite.scale <= 315,
        );
      if (direction === 'right')
        for (let i = 0; i < 6; i++)
          assert.deepEqual(
            moving[i],
            mirrorPreviewSprite(einzbernSprite(actor, 'left', i + 1)),
          );
      assert.ok(!einzbernSprite(actor, direction, 0).mirror);
    }
});
void test('Five seated contacts are separate from safe approaches and keep each full body visible on desktop and small mobile', () => {
  let poses = 0;
  for (const id of EINZBERN_ROOM_IDS) {
    const room = EINZBERN_ROOMS[id],
      checkpoints = [...room.doors, ...room.scene.spots].map((s) => ({
        point: s.point,
        action: null as (typeof room.actions)[number] | null,
      }));
    for (const action of room.actions) {
      poses++;
      const spot = room.scene.spots.find((s) => s.id === action.id)!;
      assert.ok(interiorWalkable(spot.point, room.scene));
      assert.notDeepEqual(spot.point, action.contact);
      assert.ok(action.elevation > 0);
      checkpoints.push({ point: action.contact, action });
    }
    for (const actor of EINZBERN_CAST)
      for (const { point, action } of checkpoints)
        for (const size of [
          { width: 1100, height: 560 },
          { width: 390, height: 430 },
          { width: 320, height: 180 },
        ]) {
          let sprite = einzbernSprite(actor.id, 'down', 0, action?.pose);
          if (action?.mirror) sprite = mirrorPreviewSprite(sprite);
          nativeCrop(sprite);
          const scale =
              Math.min(size.width / 1600, size.height / 900) *
              houseZoom(2.5, size),
            foot = interiorProject(point, room.scene.floor),
            depth = interiorDepth(point, room.scene.floor);
          foot.y -= (action?.elevation ?? 0) * depth;
          const d = depth * sprite.scale * (action?.scale ?? 1),
            body = {
              x: foot.x + (sprite.bounds.x - sprite.anchorX) * d,
              y: foot.y + (sprite.bounds.y - sprite.anchorY) * d,
              width: sprite.bounds.width * d,
              height: sprite.bounds.height * d,
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
            origin.x + body.x * scale >= -0.1 &&
              origin.y + body.y * scale >= -0.1,
            `${id}:${actor.id}:top`,
          );
          assert.ok(
            origin.x + (body.x + body.width) * scale <= size.width + 0.1,
            `${id}:${actor.id}:right`,
          );
          assert.ok(
            origin.y + (body.y + body.height) * scale <= size.height + 0.1,
            `${id}:${actor.id}:bottom`,
          );
          if (1600 * scale > size.width)
            assert.ok(
              origin.x <= 0 && origin.x >= size.width - 1600 * scale - 0.1,
            );
        }
  }
  assert.equal(poses, 5);
});

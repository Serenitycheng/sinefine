import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  MATOU_ROOMS,
  MATOU_ROOM_IDS,
  MATOU_CAST,
} from '../lib/fate-matou-house';
import { matouSprite } from '../lib/fate-matou-sprites';
import {
  nearestPreviewDoor,
  mirrorPreviewSprite,
  type PreviewSprite,
} from '../lib/fate-preview-house';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import {
  TOHSAKA_CAST,
  houseCamera,
  houseZoom,
} from '../lib/fate-tohsaka-house';
import { tohsakaSprite } from '../lib/fate-tohsaka-sprites';
import { emiyaVisitorSprite } from '../lib/fate-emiya-walk';
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
import { defaultHousing, homeOf, SERVANT_MASTERS } from '../lib/fate-housing';

const directions = ['down', 'up', 'left', 'right'] as const;
const sizes = [
  { width: 1100, height: 560 },
  { width: 390, height: 430 },
  { width: 320, height: 180 },
];

void test('Matou has five distinct native rooms and reuses the approved lounge', () => {
  assert.equal(MATOU_ROOM_IDS.length, 5);
  assert.equal(
    new Set(MATOU_ROOM_IDS.map((id) => MATOU_ROOMS[id].scene.painting)).size,
    5,
  );
  for (const id of MATOU_ROOM_IDS)
    assert.ok(existsSync('public' + MATOU_ROOMS[id].scene.painting));
  assert.equal(
    MATOU_ROOMS.lounge.scene.painting,
    '/fate/interior-art/matou-main-soft-v1.png',
  );
  assert.match(MATOU_ROOMS.archive.scene.basis, /改编/);
});

void test('All four Matou connections are bidirectional, with safe arrivals and one hall street exit', () => {
  let links = 0,
    exits = 0;
  for (const id of MATOU_ROOM_IDS)
    for (const door of MATOU_ROOMS[id].doors) {
      assert.ok(
        interiorWalkable(door.point, MATOU_ROOMS[id].scene),
        id + ':' + door.id,
      );
      assert.equal(
        nearestPreviewDoor(door.point, MATOU_ROOMS[id])?.id,
        door.id,
      );
      if (!door.to) {
        assert.equal(id, 'hall');
        exits++;
        continue;
      }
      links++;
      const next = MATOU_ROOMS[door.to as typeof id];
      assert.ok(next.doors.some((back) => back.to === id));
      assert.ok(
        interiorWalkable(door.arrival, next.scene),
        id + '->' + door.to,
      );
    }
  assert.equal(links, 8);
  assert.equal(exits, 1);
});

void test('Every Matou door and all eleven interaction approaches have complete collision-tested routes', () => {
  let interactions = 0;
  for (const id of MATOU_ROOM_IDS) {
    const room = MATOU_ROOMS[id];
    interactions += room.scene.spots.length;
    const starts = [{ x: 500, y: 560 }, ...room.doors.map((d) => d.point)];
    for (const start of starts)
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
  assert.equal(interactions, 11);
});

void test('Wall-side Matou solids register finite bounds and block long keyboard steps', () => {
  for (const id of MATOU_ROOM_IDS)
    for (const solid of MATOU_ROOMS[id].scene.furniture) {
      const scene = MATOU_ROOMS[id].scene,
        r = solid.footprint;
      assert.ok(Object.values(r).every(Number.isFinite));
      assert.ok(r.width > 0 && r.height > 0);
      const start = { x: r.x + r.width / 2, y: r.y + r.height + 30 };
      assert.ok(interiorWalkable(start, scene), id + ':' + solid.id);
      const end = interiorMove(start, { x: 0, y: -240 }, scene);
      assert.ok(end.y >= r.y + r.height + 13 - 0.01, id + ':' + solid.id);
    }
});

void test('Matou preview keeps all three existing identities, homes and Sakura-Rider mapping', () => {
  assert.deepEqual(
    MATOU_CAST.map((a) => a.id),
    ['sakura', 'kariya', 'medusa'],
  );
  assert.equal(SERVANT_MASTERS.medusa, 'sakura');
  for (const actor of MATOU_CAST)
    assert.equal(homeOf(actor.id, defaultHousing()), 'matou');
});

void test('Sakura reuses her approved uneven native crops, scale and mirrored anchor in every direction', () => {
  for (const direction of directions)
    for (let phase = 0; phase <= 6; phase++) {
      const original = emiyaVisitorSprite('sakura', direction, phase),
        sprite = matouSprite('sakura', direction, phase);
      assert.equal(sprite.file, original.sheet.path);
      assert.equal(sprite.cropX, original.frame.x);
      assert.equal(sprite.cropY, original.frame.y);
      assert.equal(sprite.cellWidth, original.frame.width);
      assert.equal(sprite.cellHeight, original.frame.height);
      assert.equal(sprite.imageWidth, original.sheet.width);
      assert.equal(sprite.imageHeight, original.sheet.height);
      assert.equal(sprite.scale, original.scale);
      assert.equal(sprite.mirror, original.mirror);
      assert.equal(
        sprite.anchorX,
        original.mirror
          ? original.frame.width - original.frame.anchorX
          : original.frame.anchorX,
      );
      assert.equal(sprite.anchorY, original.frame.anchorY);
    }
});

function nativeCrop(sprite: PreviewSprite) {
  const png = readFileSync('public' + sprite.file);
  assert.equal(png.readUInt32BE(16), sprite.imageWidth);
  assert.equal(png.readUInt32BE(20), sprite.imageHeight);
  assert.equal(png[25], 6, 'native RGBA alpha is retained');
  assert.ok(sprite.cropX >= 0 && sprite.cropY >= 0);
  assert.ok(
    sprite.cropX + sprite.cellWidth <= sprite.imageWidth &&
      sprite.cropY + sprite.cellHeight <= sprite.imageHeight,
  );
  assert.ok(sprite.bounds.x >= 0 && sprite.bounds.y >= 0);
  assert.ok(
    sprite.bounds.x + sprite.bounds.width <= sprite.cellWidth &&
      sprite.bounds.y + sprite.bounds.height <= sprite.cellHeight,
  );
}

void test('New Matou gaits use native crops, six side phases, three front/back phases and a fixed scale per row', () => {
  for (const actor of ['kariya', 'medusa'] as const) {
    const heights: number[] = [];
    for (const direction of directions) {
      for (let phase = 0; phase <= 6; phase++) {
        const sprite = matouSprite(actor, direction, phase);
        nativeCrop(sprite);
        heights.push(sprite.bounds.height * sprite.scale);
      }
      const moving = Array.from({ length: 6 }, (_, i) =>
        matouSprite(actor, direction, i + 1),
      );
      assert.equal(
        new Set(moving.map((s) => s.scale)).size,
        1,
        'scale is not adjusted on each animation frame',
      );
      assert.equal(
        new Set(moving.map((s) => s.index)).size,
        direction === 'left' || direction === 'right' ? 6 : 3,
      );
    }
    assert.ok(
      Math.max(...heights) / Math.min(...heights) < 1.07,
      actor + ': turning must not change body size',
    );
    for (let phase = 1; phase <= 6; phase++) {
      const left = matouSprite(actor, 'left', phase),
        right = matouSprite(actor, 'right', phase);
      assert.equal(right.anchorX, left.cellWidth - left.anchorX);
      assert.equal(right.mirror, true);
      assert.deepEqual(mirrorPreviewSprite(right), left);
    }
  }
  assert.equal(
    matouSprite('kariya', 'left', 1).file,
    '/fate/character-art/kariya-walk-side-soft-v2.png',
  );
});

void test('Whole Matou actors and all seated poses stay in view at doors and chair contacts on desktop and phones', () => {
  let poses = 0;
  for (const id of MATOU_ROOM_IDS) {
    const room = MATOU_ROOMS[id];
    const checkpoints = room.doors.map((door) => ({
      point: door.point,
      action: undefined as (typeof room.actions)[number] | undefined,
    }));
    for (const action of room.actions) {
      poses++;
      const spot = room.scene.spots.find((s) => s.id === action.id)!;
      assert.ok(spot && interiorWalkable(spot.point, room.scene));
      assert.notDeepEqual(spot.point, action.contact);
      checkpoints.push({ point: action.contact, action });
    }
    for (const { id: actor } of MATOU_CAST)
      for (const { point, action } of checkpoints)
        for (const size of sizes) {
          let sprite = matouSprite(actor, 'down', 0, action?.pose);
          if (action?.mirror) sprite = mirrorPreviewSprite(sprite);
          if (action) {
            assert.equal(
              sprite.file,
              '/fate/character-art/matou-seated-soft-v1.png',
            );
            nativeCrop(sprite);
          }
          const scale =
            Math.min(size.width / 1600, size.height / 900) *
            houseZoom(2.5, size);
          const foot = interiorProject(point, room.scene.floor),
            d =
              interiorDepth(point, room.scene.floor) *
              sprite.scale *
              (action?.scale ?? 1);
          const body = {
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
          );
          assert.ok(
            origin.x + (body.x + body.width) * scale <= size.width + 0.1,
          );
          assert.ok(
            origin.y + (body.y + body.height) * scale <= size.height + 0.1,
          );
          if (1600 * scale > size.width)
            assert.ok(
              origin.x <= 0 && origin.x >= size.width - 1600 * scale - 0.1,
            );
        }
  }
  assert.equal(poses, 3);
});

void test('Shared preview rendering retains every Tohsaka frame and its original atlas offsets', () => {
  for (const { id: actor } of TOHSAKA_CAST)
    for (const direction of directions)
      for (const pose of [undefined, 'sit', 'read'] as const)
        for (let phase = 0; phase <= 6; phase++) {
          const original = tohsakaSprite(actor, direction, phase, pose);
          const adapted = HOUSE_PREVIEWS.tohsaka.sprite(
            actor,
            direction,
            phase,
            pose,
          );
          assert.equal(adapted.cropX, original.col * original.cellWidth);
          assert.equal(adapted.cropY, original.row * original.cellHeight);
          assert.equal(
            adapted.imageWidth,
            original.columns * original.cellWidth,
          );
          assert.equal(
            adapted.imageHeight,
            original.rows * original.cellHeight,
          );
          for (const key of [
            'anchorX',
            'anchorY',
            'scale',
            'file',
            'bounds',
            'mirror',
          ] as const)
            assert.deepEqual(adapted[key], original[key]);
        }
});

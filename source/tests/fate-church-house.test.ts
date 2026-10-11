import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  CHURCH_ROOMS,
  CHURCH_ROOM_IDS,
  CHURCH_CAST,
} from '../lib/fate-church-house';
import { churchSprite } from '../lib/fate-church-sprites';
import {
  mirrorPreviewSprite,
  nearestPreviewDoor,
  type PreviewSprite,
} from '../lib/fate-preview-house';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import {
  interiorDepth,
  interiorProject,
  CITY_INTERIOR_SCENES,
} from '../lib/fate-city-interior-scenes';
import {
  interiorWalkable,
  interiorClearSegment,
  interiorRoute,
  interiorMove,
} from '../lib/fate-city-interior-navigation';
import { homeOf, defaultHousing } from '../lib/fate-housing';
import { CHARACTER_ART } from '../lib/fate-character-art';
import frames from '../lib/fate-church-sprite-data.json';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';

void test('Church preserves the real city doorway and keeps the descending stair landing reachable', () => {
  assert.deepEqual(HOME_ENTRANCES.church.door, { x: 2553, y: 443 });
  const hall = CHURCH_ROOMS.hall;
  const down = hall.doors.find((door) => door.to === 'cellar')!;
  const back = CHURCH_ROOMS.cellar.doors[0];
  assert.ok(back.arrival.y < down.point.y);
  assert.ok(interiorWalkable(back.arrival, hall.scene));
  assert.ok(interiorRoute(back.arrival, down.point, hall.scene));
  assert.ok(hall.scene.furniture.some((item) => item.id === 'cellar-boundary'));
});

void test('Church adds five distinct areas while retaining its approved chapel', () => {
  assert.equal(CHURCH_ROOM_IDS.length, 5);
  assert.equal(
    new Set(CHURCH_ROOM_IDS.map((id) => CHURCH_ROOMS[id].scene.painting)).size,
    5,
  );
  assert.equal(
    CHURCH_ROOMS.chapel.scene.painting,
    CITY_INTERIOR_SCENES.church.painting,
  );
  for (const id of CHURCH_ROOM_IDS) {
    assert.equal(CHURCH_ROOMS[id].scene.id, 'church');
    assert.ok(existsSync('public' + CHURCH_ROOMS[id].scene.painting));
  }
});
void test('All four church room connections are bidirectional with safe arrival points and one street exit', () => {
  let links = 0,
    exits = 0;
  for (const id of CHURCH_ROOM_IDS)
    for (const door of CHURCH_ROOMS[id].doors) {
      assert.ok(
        interiorWalkable(door.point, CHURCH_ROOMS[id].scene),
        id + ':' + door.id,
      );
      assert.equal(
        nearestPreviewDoor(door.point, CHURCH_ROOMS[id])?.id,
        door.id,
      );
      if (door.to === null) {
        assert.equal(id, 'hall');
        exits++;
        continue;
      }
      links++;
      const other = CHURCH_ROOMS[door.to as keyof typeof CHURCH_ROOMS];
      assert.ok(other.doors.some((back) => back.to === id));
      assert.ok(interiorWalkable(door.arrival, other.scene), id + ':arrival');
      assert.ok(
        interiorRoute(
          door.arrival,
          other.doors.find((back) => back.to === id)!.point,
          other.scene,
        ),
      );
    }
  assert.equal(links, 8);
  assert.equal(exits, 1);
});
void test('All thirteen church spots are reachable through real unobstructed routes', () => {
  let count = 0;
  for (const id of CHURCH_ROOM_IDS) {
    const room = CHURCH_ROOMS[id];
    const checks = [
      ...room.doors.map((door) => door.point),
      ...room.scene.spots.map((spot) => spot.point),
    ];
    count += room.scene.spots.length;
    for (const from of checks)
      for (const to of checks) {
        const route = interiorRoute(from, to, room.scene);
        assert.ok(route, id + ':route');
        let previous = from;
        for (const point of route) {
          assert.ok(
            interiorClearSegment(previous, point, room.scene),
            id + ':segment',
          );
          previous = point;
        }
        assert.ok(Math.hypot(previous.x - to.x, previous.y - to.y) < 0.01);
      }
  }
  assert.equal(count, 13);
});
void test('Hall room boundaries and physical furniture stop manual movement without blocking door routes', () => {
  const hall = CHURCH_ROOMS.hall;
  assert.equal(
    hall.scene.furniture.filter((item) => item.id.endsWith('-boundary')).length,
    4,
  );
  for (const id of CHURCH_ROOM_IDS)
    for (const item of CHURCH_ROOMS[id].scene.furniture) {
      const point = {
        x: item.footprint.x + item.footprint.width / 2,
        y: item.footprint.y + item.footprint.height / 2,
      };
      assert.equal(
        interiorWalkable(point, CHURCH_ROOMS[id].scene),
        false,
        id + ':' + item.id,
      );
      if (item.id.endsWith('-boundary'))
        assert.equal(item.silhouette, undefined);
    }
  const threshold = hall.doors.find((door) => door.id === 'chapel')!.point;
  let point = { x: threshold.x, y: threshold.y + 65 };
  for (let step = 0; step < 90; step++)
    point = interiorMove(point, { x: 0, y: -8 }, hall.scene);
  assert.ok(point.y > 0);
  assert.ok(interiorWalkable(point, hall.scene));
});
void test('Church models preserve original identities, home and servant master assignment', () => {
  assert.deepEqual(
    CHURCH_CAST.map((actor) => actor.id),
    ['kirei', 'cu'],
  );
  const housing = defaultHousing();
  assert.equal(homeOf('kirei', housing), 'church');
  assert.equal(homeOf('cu', housing), 'church');
  assert.equal(housing.masters.cu, 'kirei');
  for (const actor of CHURCH_CAST) {
    assert.equal(frames[actor.id].variant, 'four-direction-six-frame');
    const art = CHARACTER_ART.find((person) => person.id === actor.id)!;
    assert.equal(art.scope, 'church-sample');
    assert.equal(art.frames, 'four-direction-six-frame');
  }
});
function nativeCrop(sprite: PreviewSprite) {
  const bytes = readFileSync('public' + sprite.file);
  assert.equal(bytes.readUInt32BE(16), sprite.imageWidth);
  assert.equal(bytes.readUInt32BE(20), sprite.imageHeight);
  assert.ok(sprite.cropX >= 0 && sprite.cropY >= 0);
  assert.ok(
    sprite.cropX + sprite.cellWidth <= sprite.imageWidth &&
      sprite.cropY + sprite.cellHeight <= sprite.imageHeight,
  );
  assert.ok(sprite.bounds.width > 0 && sprite.bounds.height > 0);
  assert.ok(sprite.bounds.x >= 0 && sprite.bounds.y >= 0);
  assert.ok(
    sprite.bounds.x + sprite.bounds.width <= sprite.cellWidth &&
      sprite.bounds.y + sprite.bounds.height <= sprite.cellHeight,
  );
  assert.ok(sprite.anchorX >= 0 && sprite.anchorX <= sprite.cellWidth);
}
void test('Priest and lancer sprites use real native crops, fixed direction scales and six distinct phases in every direction', () => {
  for (const actor of CHURCH_CAST)
    for (const direction of ['down', 'up', 'left', 'right'] as const) {
      nativeCrop(churchSprite(actor.id, direction, 0));
      const moving = Array.from({ length: 6 }, (_, i) =>
        churchSprite(actor.id, direction, i + 1),
      );
      for (const sprite of moving) nativeCrop(sprite);
      assert.equal(new Set(moving.map((sprite) => sprite.scale)).size, 1);
      assert.equal(new Set(moving.map((sprite) => sprite.index)).size, 6);
      assert.notEqual(
        churchSprite(actor.id, direction, 0).index,
        moving[0].index,
      );
      if (direction === 'right')
        assert.ok(moving.every((sprite) => sprite.mirror));
    }
  assert.ok(
    churchSprite('kirei', 'down', 0).bounds.height *
      churchSprite('kirei', 'down', 0).scale >
      churchSprite('cu', 'down', 0).bounds.height *
        churchSprite('cu', 'down', 0).scale,
  );
});
void test('Five chair contacts preserve safe approaches and complete bodies on desktop and narrow views', () => {
  let count = 0;
  for (const id of CHURCH_ROOM_IDS) {
    const room = CHURCH_ROOMS[id];
    const checkpoints = room.doors.map((door) => ({
      point: door.point,
      action: undefined as (typeof room.actions)[number] | undefined,
    }));
    for (const action of room.actions) {
      count++;
      const spot = room.scene.spots.find((spot) => spot.id === action.id)!;
      assert.ok(spot);
      assert.ok(interiorWalkable(spot.point, room.scene));
      assert.notDeepEqual(spot.point, action.contact);
      assert.ok(action.elevation > 0);
      checkpoints.push({ point: action.contact, action });
    }
    for (const actor of CHURCH_CAST)
      for (const { point, action } of checkpoints)
        for (const size of [
          { width: 1100, height: 560 },
          { width: 390, height: 430 },
          { width: 320, height: 180 },
        ]) {
          let sprite = churchSprite(actor.id, 'down', 0, action?.pose);
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
            id + ':' + actor.id + ':top',
          );
          assert.ok(
            origin.x + (body.x + body.width) * scale <= size.width + 0.1,
            id + ':' + actor.id + ':right',
          );
          assert.ok(
            origin.y + (body.y + body.height) * scale <= size.height + 0.1,
            id + ':' + actor.id + ':bottom',
          );
        }
  }
  assert.equal(count, 5);
});

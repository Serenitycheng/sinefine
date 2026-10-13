import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SHOP_BUILDING_IDS, SHOP_PREVIEWS } from '../lib/fate-shops-house';
import { CITY_INTERIOR_SCENES } from '../lib/fate-city-interior-scenes';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import { interiorWalkable, interiorRoute, interiorClearSegment } from '../lib/fate-city-interior-navigation';
import { nearestPreviewDoor, mirrorPreviewSprite } from '../lib/fate-preview-house';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import { schoolSprite } from '../lib/fate-school-sprites';
import { waverSprite } from '../lib/fate-waver-sprites';
import { einzbernSprite } from '../lib/fate-einzbern-sprites';
import { defaultHousing, homeOf } from '../lib/fate-housing';

for (const id of SHOP_BUILDING_IDS) void test(`${id}: real two-way door, every furniture-safe route and full-body seated camera`, () => {
  const plan = SHOP_PREVIEWS[id];
  assert.equal(HOUSE_PREVIEWS[id], plan);
  assert.deepEqual(Object.keys(plan.rooms), ['hall', 'annex']);
  assert.equal(plan.rooms.hall.scene.painting, CITY_INTERIOR_SCENES[id].painting);
  assert.notEqual(plan.rooms.annex.scene.painting, plan.rooms.hall.scene.painting);
  assert.ok(interiorWalkable({ x: 500, y: 560 }, plan.rooms.hall.scene), `${id}:spawn`);
  let exits = 0, links = 0;
  for (const [roomId, room] of Object.entries(plan.rooms)) {
    assert.equal(room.scene.id, id);
    assert.ok(existsSync('public' + room.scene.painting));
    const points = [...room.doors.map((door) => door.point), ...room.scene.spots.map((spot) => spot.point)];
    for (const p of points) assert.ok(p && interiorWalkable(p, room.scene), `${id}:${roomId}:point ${JSON.stringify(p)}`);
    for (const from of points) for (const to of points) {
      const route = interiorRoute(from, to, room.scene);
      assert.ok(route, `${id}:${roomId}:route ${JSON.stringify({ from, to })}`);
      let previous = from;
      for (const point of route) { assert.ok(interiorClearSegment(previous, point, room.scene), `${id}:${roomId}:route crosses furniture`); previous = point; }
    }
    for (const furniture of room.scene.furniture) {
      const r = furniture.footprint;
      assert.ok(!interiorWalkable({ x: r.x + r.width / 2, y: r.y + r.height / 2 }, room.scene), `${id}:${roomId}:${furniture.id}:solid`);
    }
    for (const door of room.doors) {
      assert.equal(nearestPreviewDoor(door.point, room)?.id, door.id);
      if (!door.to) { exits++; assert.equal(roomId, 'hall'); continue; }
      links++;
      const other = plan.rooms[door.to];
      const back = other.doors.find((candidate) => candidate.to === roomId)!;
      assert.ok(back && interiorWalkable(door.arrival, other.scene), `${id}:${roomId}:arrival`);
      assert.ok(interiorRoute(door.arrival, back.point, other.scene), `${id}:${roomId}:return`);
    }
    for (const action of room.actions) for (const actor of plan.cast) {
      const approach = room.scene.spots.find((spot) => spot.id === action.id)!.point;
      assert.notDeepEqual(approach, action.contact);
      let sprite = plan.sprite(actor.id, 'down', 0, action.pose);
      if (action.mirror) sprite = mirrorPreviewSprite(sprite);
      const { foot, body, spriteScale } = previewPresentation(room.scene, approach, sprite, action);
      assert.ok(sprite.seat && action.seat && body.height > 0);
      assert.ok(Math.abs(foot.x + (sprite.seat.x - sprite.anchorX) * spriteScale - action.seat.x) < 1e-8);
      assert.ok(Math.abs(foot.y + (sprite.seat.y - sprite.anchorY) * spriteScale - action.seat.y) < 1e-8);
      for (const size of [{ width: 1100, height: 560 }, { width: 390, height: 430 }, { width: 320, height: 180 }]) {
        const zoom = houseZoom(2.5, size, body.height), scale = Math.min(size.width / 1600, size.height / 900) * zoom;
        const origin = houseCamera({ x: size.width / 2 - foot.x * scale, y: size.height * .7 - foot.y * scale }, scale, size, body);
        assert.ok(origin.x + body.x * scale >= -.1 && origin.y + body.y * scale >= -.1, `${id}:${actor.id}:top`);
        assert.ok(origin.x + (body.x + body.width) * scale <= size.width + .1, `${id}:${actor.id}:right`);
        assert.ok(origin.y + (body.y + body.height) * scale <= size.height + .1, `${id}:${actor.id}:bottom`);
      }
    }
  }
  assert.equal(exits, 1); assert.equal(links, 2);
  assert.equal(Object.values(plan.rooms).reduce((count, room) => count + room.scene.spots.length, 0), 9);
});

void test('All six approved main paintings remain byte-identical and original single-room geometry is retained', () => {
  const hashes = {
    shops: '90108fbe2d64717acdf2b2513fba98e8eeedf6b4137b491eefeb39041e11bac0',
    'miyama-florist': 'a2cca080acef18774a2e075bf5ed8f895f3ebea870fb1e43ef4b6512b914f0d1',
    'old-bookshop': 'ccd525f1583d329df6e9ffe7d18acad541131dcb4887b94681ac0b7b120bc1b7',
    'miyama-bakery': '0f655b032257c0f40118c8fe3742bd96a1588011823c7d6c6f5d3596653f409f',
    'old-repair': 'ef4bfb50501d2509892dc76851342ab63d0a1ebbd515d5e4c6f8de4c54685e6b',
    'shinto-convenience': 'f033e7e6427cac8c21702e57d928e95a7e2cb404ad1dc8c3c809ec060419d47c',
  };
  const backY = { shops: 350, 'miyama-florist': 340, 'old-bookshop': 410, 'miyama-bakery': 412.5, 'old-repair': 435, 'shinto-convenience': 342.5 };
  for (const id of SHOP_BUILDING_IDS) {
    const original = CITY_INTERIOR_SCENES[id];
    assert.equal(createHash('sha256').update(readFileSync('public' + original.painting)).digest('hex'), hashes[id]);
    assert.equal(original.floor.backY, backY[id]);
    assert.notEqual(SHOP_PREVIEWS[id].rooms.hall.scene.floor, original.floor);
  }
});

void test('Shop visitor models reuse approved frames and poses without changing identity, homes or character stages', () => {
  const housing = defaultHousing();
  assert.equal(homeOf('shirou', housing), 'emiya'); assert.equal(homeOf('rin', housing), 'tohsaka');
  assert.equal(homeOf('sakura', housing), 'matou'); assert.equal(homeOf('kiritsugu', housing), 'einzbern');
  const visited = new Set<string>();
  for (const plan of Object.values(SHOP_PREVIEWS)) for (const actor of plan.cast) {
    visited.add(actor.id);
    const original = (direction: 'up' | 'down' | 'left' | 'right', phase: number, pose?: 'sit' | 'read') => actor.id === 'waver'
      ? waverSprite('waver', direction, phase, pose) : actor.id === 'kiritsugu' ? einzbernSprite('kiritsugu', direction, phase, pose)
        : schoolSprite(actor.id as 'shirou' | 'rin' | 'sakura', direction, phase, pose);
    for (const direction of ['up', 'down', 'left', 'right'] as const) for (let phase = 0; phase <= 6; phase++) assert.deepEqual(plan.sprite(actor.id, direction, phase), original(direction, phase));
    for (const pose of ['sit', 'read'] as const) {
      const current = plan.sprite(actor.id, 'down', 0, pose), reused = original('down', 0, pose);
      for (const key of ['file', 'cellWidth', 'cellHeight', 'cropX', 'cropY', 'imageWidth', 'imageHeight', 'index', 'scale', 'clip'] as const) assert.deepEqual(current[key], reused[key], `${actor.id}:${pose}:${key}`);
      assert.equal(current.bounds.width, reused.bounds.width); assert.equal(current.bounds.height, reused.bounds.height);
    }
  }
  assert.deepEqual([...visited].sort(), ['kiritsugu', 'rin', 'sakura', 'shirou', 'waver']);
});

void test('Seated visitors remain visible in front of their chair and desk; walking and earlier interiors retain floor depth', () => {
  for (const plan of Object.values(SHOP_PREVIEWS)) for (const room of Object.values(plan.rooms)) for (const action of room.actions) {
    const approach = room.scene.spots.find((spot) => spot.id === action.id)!.point;
    const actor = plan.cast[0], standing = plan.sprite(actor.id, 'down', 0);
    assert.equal(previewPresentation(room.scene, approach, standing).layer, approach.y);
    const seated = previewPresentation(room.scene, approach, plan.sprite(actor.id, 'down', 0, action.pose), action);
    assert.ok(action.inFrontOf?.length);
    for (const id of action.inFrontOf!) {
      const furniture = room.scene.furniture.find((f) => f.id === id)!;
      assert.ok(furniture, `${plan.name}:${action.id}:${id}`);
      assert.ok(seated.layer > furniture.footprint.y + furniture.footprint.height);
    }
  }
  const room = SHOP_PREVIEWS.shops.rooms.annex, approach = room.scene.spots.find((spot) => spot.id === 'notes')!.point;
  const desk = room.scene.furniture.find((f) => f.id === 'desk')!;
  assert.ok(approach.y < desk.footprint.y + desk.footprint.height, 'the safe approach alone would incorrectly hide the seated body');
  for (const [id, plan] of Object.entries(HOUSE_PREVIEWS)) {
    if ((SHOP_BUILDING_IDS as readonly string[]).includes(id)) continue;
    for (const room of Object.values(plan.rooms)) for (const action of room.actions) {
      const point = room.scene.spots.find((spot) => spot.id === action.id)!.point;
      assert.equal(previewPresentation(room.scene, point, plan.sprite(plan.cast[0].id, 'down', 0, action.pose), action).layer, point.y);
    }
  }
});

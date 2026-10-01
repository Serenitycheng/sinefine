import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BUILDING_ATLAS, ATLAS_SIZE, BUILDING_FRAMES,
  NEIGHBOURHOOD_BUILDINGS, overlapsStreet } from '../lib/fate-environment';
import { DISTRICT_LANDMARKS } from '../lib/fate-district';
import { easeCamera, sceneCameraFor } from '../lib/fate-camera';
import { screenToWorld, STREET } from '../lib/street';

void test('all destinations have distinct readable art and the compressed atlas stays small', () => {
  for (const place of DISTRICT_LANDMARKS)
    assert.ok(place.id in BUILDING_FRAMES, place.id);
  for (const [name, [x, y, w, h]] of Object.entries(BUILDING_FRAMES)) {
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= ATLAS_SIZE && y + h <= ATLAS_SIZE, name);
  }
  const atlas = join(process.cwd(), 'public', BUILDING_ATLAS.slice(1));
  assert.ok(statSync(atlas).size < 1_000_000);
  assert.equal(readFileSync(atlas).subarray(0, 4).toString(), 'RIFF');
  for (const b of NEIGHBOURHOOD_BUILDINGS)
    assert.ok(!overlapsStreet(b.x, b.y, b.width, b.height));
});

void test('street follow stays in bounds and its on-screen point converts back to world coordinates', () => {
  for (const size of [{ width: 1280, height: 680 }, { width: 390, height: 700 }]) {
    for (const point of [{ x: 0, y: 0 }, { x: 1550, y: 900 }, { x: 3100, y: 1660 }]) {
      const camera = sceneCameraFor(point, size.width, size.height, 1.24, 'street');
      assert.ok(camera.scale >= 0.6);
      assert.ok(camera.x >= 0 && camera.y >= 0);
      assert.ok(camera.x + size.width / camera.scale <= STREET.width * 2 + 0.01);
      assert.ok(camera.y + size.height / camera.scale <= STREET.height * 2 + 0.01);
      const screen = { x: (point.x * 2 - camera.x) * camera.scale,
        y: (point.y * 2 - camera.y) * camera.scale };
      assert.deepEqual(screenToWorld(screen.x, screen.y, camera), { x: point.x * 2, y: point.y * 2 });
    }
  }
});

void test('overview starts fitted and camera eases without jumping; reduced motion can snap', () => {
  const overview = sceneCameraFor({ x: 1000, y: 1000 }, 930, 600, 1.24, 'map');
  assert.ok(overview.x <= 0 && overview.y <= 0);
  const target = sceneCameraFor({ x: 2600, y: 1400 }, 1280, 680, 1.24, 'street');
  const current = sceneCameraFor({ x: 300, y: 300 }, 1280, 680, 1.24, 'street');
  const eased = easeCamera(current, target, 0.016);
  assert.ok(eased.x > current.x && eased.x < target.x);
  assert.ok(eased.y > current.y && eased.y < target.y);
  assert.deepEqual(easeCamera(current, target, 0.016, true), target);
});

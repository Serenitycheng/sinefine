import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  BUILDING_ATLAS,
  ATLAS_SIZE,
  BUILDING_FRAMES,
  NEIGHBOURHOOD_BUILDINGS,
  overlapsStreet,
} from '../lib/fate-environment';
import { DISTRICT_LANDMARKS } from '../lib/fate-district';
import {
  easeCamera,
  sceneCameraFor,
  DEFAULT_ZOOM,
  ZOOM_LIMITS,
  clampZoom,
  cameraAnchor,
  panCamera,
} from '../lib/fate-camera';
import { screenToWorld, STREET } from '../lib/street';

void test('all destinations have distinct readable art and the compressed atlas stays small', () => {
  for (const place of DISTRICT_LANDMARKS)
    assert.ok(place.id in BUILDING_FRAMES, place.id);
  for (const [name, [x, y, w, h]] of Object.entries(BUILDING_FRAMES)) {
    assert.ok(
      x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= ATLAS_SIZE &&
        y + h <= ATLAS_SIZE,
      name,
    );
  }
  const atlas = join(process.cwd(), 'public', BUILDING_ATLAS.slice(1));
  assert.ok(statSync(atlas).size < 1_000_000);
  assert.equal(readFileSync(atlas).subarray(0, 4).toString(), 'RIFF');
  for (const b of NEIGHBOURHOOD_BUILDINGS)
    assert.ok(!overlapsStreet(b.x, b.y, b.width, b.height));
});

void test('street follow stays in bounds and its on-screen point converts back to world coordinates', () => {
  for (const size of [
    { width: 1280, height: 680 },
    { width: 390, height: 700 },
  ]) {
    for (const point of [
      { x: 0, y: 0 },
      { x: 1550, y: 900 },
      { x: 3100, y: 1660 },
    ]) {
      const camera = sceneCameraFor(
        point,
        size.width,
        size.height,
        1.24,
        'street',
      );
      assert.ok(camera.scale >= 0.6);
      assert.ok(camera.x >= 0 && camera.y >= 0);
      assert.ok(
        camera.x + size.width / camera.scale <= STREET.width * 2 + 0.01,
      );
      assert.ok(
        camera.y + size.height / camera.scale <= STREET.height * 2 + 0.01,
      );
      const screen = {
        x: (point.x * 2 - camera.x) * camera.scale,
        y: (point.y * 2 - camera.y) * camera.scale,
      };
      assert.deepEqual(screenToWorld(screen.x, screen.y, camera), {
        x: point.x * 2,
        y: point.y * 2,
      });
    }
  }
});

void test('overview starts fitted and camera eases without jumping; reduced motion can snap', () => {
  const overview = sceneCameraFor({ x: 1000, y: 1000 }, 930, 600, 1.24, 'map');
  assert.ok(overview.x <= 0 && overview.y <= 0);
  const target = sceneCameraFor(
    { x: 2600, y: 1400 },
    1280,
    680,
    1.24,
    'street',
  );
  const current = sceneCameraFor({ x: 300, y: 300 }, 1280, 680, 1.24, 'street');
  const eased = easeCamera(current, target, 0.016);
  assert.ok(eased.x > current.x && eased.x < target.x);
  assert.ok(eased.y > current.y && eased.y < target.y);
  assert.deepEqual(easeCamera(current, target, 0.016, true), target);
});

void test('street and overview can zoom past both old limits and use the same input and rendering bounds', () => {
  for (const scene of ['street', 'map'] as const) {
    const limits = ZOOM_LIMITS[scene];
    const point = { x: 1550, y: 830 };
    const normal = sceneCameraFor(point, 1000, 600, DEFAULT_ZOOM, scene);
    const far = sceneCameraFor(point, 1000, 600, limits.min, scene);
    const close = sceneCameraFor(point, 1000, 600, limits.max, scene);
    assert.ok(far.scale < sceneCameraFor(point, 1000, 600, 1, scene).scale);
    assert.ok(close.scale > sceneCameraFor(point, 1000, 600, 1.8, scene).scale);
    assert.ok(
      Math.abs(close.scale / normal.scale - (scene === 'street' ? 10 : 20)) <
        1e-10,
    );
    assert.deepEqual(sceneCameraFor(point, 1000, 600, 999, scene), close);
    assert.deepEqual(sceneCameraFor(point, 1000, 600, -1, scene), far);
    assert.equal(clampZoom(NaN, scene), DEFAULT_ZOOM);
  }
});

void test('drag starts at the visible framing and moves the world by the pointer distance', () => {
  for (const scene of ['street', 'map'] as const) {
    const width = 1000,
      height = 600;
    const zoom = DEFAULT_ZOOM * 3;
    const camera = sceneCameraFor(
      { x: 1550, y: 830 },
      width,
      height,
      zoom,
      scene,
    );
    const anchor = cameraAnchor(camera, width, height, scene);
    const target = panCamera(anchor, { x: 85, y: -60 }, camera.scale, scene);
    const moved = sceneCameraFor(target, width, height, zoom, scene);
    assert.ok(Math.abs((camera.x - moved.x) * camera.scale - 85) < 1e-8);
    assert.ok(Math.abs((camera.y - moved.y) * camera.scale + 60) < 1e-8);
    const corner = panCamera(anchor, { x: 1e8, y: -1e8 }, camera.scale, scene);
    assert.deepEqual(corner, { x: 0, y: STREET.height });
  }
});

void test('minimum street zoom can show the full city even in a narrow viewport', () => {
  const c = sceneCameraFor(
    { x: 1550, y: 830 },
    390,
    220,
    ZOOM_LIMITS.street.min,
    'street',
  );
  assert.ok(390 / c.scale >= STREET.width * 2);
  assert.ok(220 / c.scale >= STREET.height * 2);
});

void test('expanded zoom preserves pointer projection and bounds on desktop, narrow and tall screens', () => {
  for (const scene of ['street', 'map'] as const)
    for (const size of [
      { width: 1280, height: 680 },
      { width: 390, height: 700 },
      { width: 390, height: 1250 },
    ])
      for (const zoom of [
        ZOOM_LIMITS[scene].min,
        DEFAULT_ZOOM,
        ZOOM_LIMITS[scene].max,
      ])
        for (const point of [
          { x: 0, y: 0 },
          { x: STREET.width, y: STREET.height },
        ]) {
          const c = sceneCameraFor(point, size.width, size.height, zoom, scene);
          const factor = scene === 'street' ? 2 : 1;
          for (const [origin, viewport, extent] of [
            [c.x, size.width, STREET.width * factor],
            [c.y, size.height, STREET.height * factor],
          ]) {
            const visible = viewport / c.scale;
            if (visible >= extent)
              assert.ok(Math.abs(origin - (extent - visible) / 2) < 1e-8);
            else assert.ok(origin >= 0 && origin + visible <= extent + 1e-8);
          }
          const projected = screenToWorld(
            (point.x * factor - c.x) * c.scale,
            (point.y * factor - c.y) * c.scale,
            c,
          );
          assert.ok(Math.abs(projected.x - point.x * factor) < 1e-8);
          assert.ok(Math.abs(projected.y - point.y * factor) < 1e-8);
        }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import {
  ART_SAMPLE,
  SAMPLE_STREET_GROUND,
  SAMPLE_PLACES,
  onSampleGround,
  sampleDistance,
  sampleRoute,
} from '../lib/fate-art-sample';
import {
  NEUTRAL_LOOK,
  constrainSampleLook,
  paintedHeight,
  paintedFollowCamera,
  paintedFrameBounds,
  paintedPosition,
  projectPaintedPoint,
  sampleLookInput,
  sampleLookBasis,
  sampleSurfaceData,
  unprojectPaintedGround,
} from '../lib/fate-art-depth';

void test('neutral look keeps the approved painting registered at every depth', () => {
  for (let x = 0; x <= ART_SAMPLE.width; x += 97) {
    for (let y = 0; y <= ART_SAMPLE.height; y += 83) {
      for (const height of [0, 1, 3.4]) {
        const point = { x, y };
        assert.ok(
          sampleDistance(
            point,
            projectPaintedPoint(point, NEUTRAL_LOOK, height),
          ) < 1e-8,
        );
      }
    }
  }
});

void test('the recessed alley wall stays behind the full standing character', () => {
  const data = sampleSurfaceData();
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(data.positions, 3));
  geometry.setIndex(data.indices);
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const surface = new T.Mesh(geometry, material);
  surface.updateMatrixWorld();
  for (const look of [
    { yaw: -6, tilt: 0.6 },
    { yaw: 0, tilt: 0 },
    { yaw: 8, tilt: 0 },
    { yaw: -10, tilt: 3 },
    { yaw: 10, tilt: -3 },
  ]) {
    const { eye, right } = sampleLookBasis(look);
    const view = new T.Vector3(eye.x, eye.y, eye.z);
    for (const foot of [
      { x: 1058, y: 328 },
      { x: 1085, y: 360 },
      { x: 1114, y: 391 },
    ]) {
      const person = paintedPosition(foot);
      for (const height of [0.12, 0.6, 1, 1.35]) {
        for (const side of [-0.12, 0, 0.12]) {
          const body = new T.Vector3(
            person.x + right.x * side,
            height,
            person.z + right.z * side,
          );
          const ray = new T.Raycaster(
            body.clone().addScaledVector(view, 40),
            view.clone().negate(),
          );
          const hit = ray.intersectObject(surface, false)[0];
          assert.ok(
            !hit || hit.distance >= 40 - 0.005,
            JSON.stringify({
              foot,
              height,
              side,
              look,
              distance: hit?.distance,
            }),
          );
        }
      }
    }
  }
  geometry.dispose();
  material.dispose();
});

void test('normal following stays inside the painted frame after either turn, while explicit zoom-out is retained', () => {
  for (const look of [
    { yaw: -6, tilt: 0.6 },
    { yaw: -10, tilt: 3 },
    { yaw: 10, tilt: -3 },
    NEUTRAL_LOOK,
  ]) {
    const bounds = paintedFrameBounds(look);
    for (const [width, height] of [
      [1280, 568],
      [390, 580],
    ]) {
      const point = projectPaintedPoint({ x: 1058, y: 328 }, look);
      const camera = paintedFollowCamera(point, look, width, height, 1.05);
      assert.ok(
        camera.x >= bounds.left - 1e-7 && camera.y >= bounds.top - 1e-7,
      );
      assert.ok(camera.x + width / camera.scale <= bounds.right + 1e-7);
      assert.ok(camera.y + height / camera.scale <= bounds.bottom + 1e-7);
      assert.ok((point.x - camera.x) * camera.scale > 0);
      assert.ok((point.y - camera.y) * camera.scale > 0);
      assert.ok(
        paintedFollowCamera(point, look, width, height, 0.5).scale <
          camera.scale,
      );
    }
  }
});

void test('turning and tilting do not change clicked ground, route destinations or wall rejection', () => {
  const points = [
    ART_SAMPLE.start,
    { x: 950, y: 595 },
    ...SAMPLE_PLACES.map((p) => p.point),
    { x: 1047, y: 365 },
    { x: 540, y: 420 },
    { x: 1240, y: 210 },
  ];
  for (const yaw of [-10, -4.5, 0, 7.5, 10]) {
    for (const tilt of [-3, 0, 3]) {
      for (const point of points) {
        const restored = unprojectPaintedGround(
          projectPaintedPoint(point, { yaw, tilt }),
          { yaw, tilt },
        );
        assert.ok(sampleDistance(restored, point) < 1e-7);
        assert.equal(onSampleGround(restored), onSampleGround(point));
        assert.equal(
          Boolean(sampleRoute(ART_SAMPLE.start, restored)),
          Boolean(sampleRoute(ART_SAMPLE.start, point)),
        );
      }
    }
  }
});

void test('movement remains screen relative and turning never stretches the walk speed', () => {
  for (const look of [
    { yaw: -10, tilt: 3 },
    { yaw: 10, tilt: -3 },
    NEUTRAL_LOOK,
  ]) {
    for (const input of [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
    ]) {
      const delta = sampleLookInput(input, look);
      assert.ok(Math.abs(Math.hypot(delta.x, delta.y) - 1) < 1e-8);
      const start = projectPaintedPoint(ART_SAMPLE.start, look);
      const end = projectPaintedPoint(
        { x: ART_SAMPLE.start.x + delta.x, y: ART_SAMPLE.start.y + delta.y },
        look,
      );
      const cross = (end.x - start.x) * input.y - (end.y - start.y) * input.x;
      assert.ok(Math.abs(cross) < 1e-8);
      assert.ok((end.x - start.x) * input.x + (end.y - start.y) * input.y > 0);
    }
    assert.deepEqual(sampleLookInput({ x: 0, y: 0 }, look), { x: 0, y: 0 });
  }
  assert.deepEqual(
    constrainSampleLook({ yaw: Infinity, tilt: NaN }),
    NEUTRAL_LOOK,
  );
  assert.deepEqual(constrainSampleLook({ yaw: 999, tilt: -999 }), {
    yaw: 18,
    tilt: -5,
  });
});

void test('the continuous relief has finite geometry and preserves level doorways and road edges', () => {
  for (const point of [
    ...SAMPLE_STREET_GROUND.flat(),
    ART_SAMPLE.start,
    ...SAMPLE_PLACES.map((p) => p.point),
  ]) {
    assert.equal(paintedHeight(point), 0);
    assert.equal(paintedPosition(point).y, 0);
  }
  const data = sampleSurfaceData();
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.uv.every((v) => v >= 0 && v <= 1));
  assert.ok(data.indices.every((i) => i >= 0 && i < data.positions.length / 3));
  assert.ok(data.indices.length / 3 < 60000);
  assert.ok(paintedHeight({ x: 600, y: 200 }) > 1);
});

void test('turning preserves straight door frames, poles and roof edges', () => {
  const lines = [
    [
      { x: 525, y: 305 },
      { x: 525, y: 405 },
      { x: 525, y: 505 },
    ],
    [
      { x: 142, y: 80 },
      { x: 142, y: 320 },
      { x: 142, y: 560 },
    ],
    [
      { x: 400, y: 252 },
      { x: 650, y: 208 },
      { x: 900, y: 164 },
    ],
  ];
  for (const look of [
    { yaw: -10, tilt: -3 },
    { yaw: 10, tilt: 3 },
  ]) {
    for (const line of lines) {
      const [a, midpoint, b] = line.map((point) =>
        projectPaintedPoint(point, look, paintedHeight(point)),
      );
      if (line[0].x === line[2].x) assert.ok(Math.abs(a.x - b.x) < 1e-7);
      assert.ok(
        sampleDistance(midpoint, {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        }) < 1e-7,
      );
    }
  }
});

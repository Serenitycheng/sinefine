import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ART_SAMPLE,
  SAMPLE_PLACES,
  moveInSample,
  onSampleGround,
  sampleCamera,
  sampleDistance,
  sampleFrame,
  sampleRoute,
  sampleScreenToWorld,
  sampleSegmentClear,
} from '../lib/fate-art-sample';

void test('the same painted street reaches both doors and the connected side alley', () => {
  const destinations = [
    ...SAMPLE_PLACES.map((p) => p.point),
    { x: 1047, y: 365 },
  ];
  for (const destination of destinations) {
    const path = sampleRoute(ART_SAMPLE.start, destination);
    assert.ok(path, JSON.stringify(destination));
    let previous = { ...ART_SAMPLE.start } as { x: number; y: number };
    for (const point of path) {
      assert.ok(sampleSegmentClear(previous, point));
      previous = point;
    }
    assert.deepEqual(previous, destination);
  }
  assert.ok(sampleRoute(SAMPLE_PLACES[0].point, SAMPLE_PLACES[1].point));
});

void test('walking cannot cross the painted walls or cut through a closed courtyard', () => {
  for (const wall of [
    { x: 540, y: 420 },
    { x: 1240, y: 210 },
    { x: 920, y: 760 },
  ]) {
    assert.equal(onSampleGround(wall), false);
    assert.equal(sampleRoute(ART_SAMPLE.start, wall), null);
  }
  const end = moveInSample(ART_SAMPLE.start, { x: 0, y: -500 });
  assert.ok(onSampleGround(end));
  assert.ok(end.y > 450);
  const alongWall = moveInSample(end, { x: 90, y: -90 });
  assert.ok(onSampleGround(alongWall));
  assert.ok(alongWall.x > end.x);
  assert.deepEqual(
    moveInSample(ART_SAMPLE.start, { x: NaN, y: 1 }),
    ART_SAMPLE.start,
  );
});

void test('camera coordinates remain correct after follow, zoom and narrow-screen framing', () => {
  for (const [width, height] of [
    [1360, 720],
    [390, 662],
  ]) {
    for (const zoom of [0.5, 1.05, 3.5]) {
      for (const place of [
        ART_SAMPLE.start,
        ...SAMPLE_PLACES.map((p) => p.point),
      ]) {
        const camera = sampleCamera(place, width, height, zoom);
        const screen = {
          x: (place.x - camera.x) * camera.scale,
          y: (place.y - camera.y) * camera.scale,
        };
        assert.ok(
          sampleDistance(sampleScreenToWorld(screen, camera), place) < 1e-8,
        );
        assert.ok(
          screen.x >= 0 &&
            screen.x <= width &&
            screen.y >= 0 &&
            screen.y <= height,
        );
      }
    }
  }
});

void test('gait advances only with actual travel and returns to a planted pose at rest', () => {
  assert.equal(sampleFrame(0, true), 0);
  assert.equal(sampleFrame(35, true), 3);
  assert.equal(sampleFrame(70, true), 0);
  assert.equal(sampleFrame(50, false), 0);
});

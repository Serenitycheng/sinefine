import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ART_SAMPLE,
  SAMPLE_ALLEY,
  SAMPLE_PLACES,
  advanceSampleRoute,
  moveInSample,
  onSampleGround,
  onSampleStreetGround,
  sampleDistance,
  sampleRoute,
  sampleSegmentClear,
  softenSampleRoute,
  type SamplePoint,
} from '../lib/fate-art-sample';
import {
  sampleAlleyLook,
  sampleTravelLead,
  stepSampleSpring,
} from '../lib/fate-art-camera';

void test('the alley can be walked in both directions from the street and both doors without clipping corners', () => {
  for (const origin of [
    ART_SAMPLE.start,
    ...SAMPLE_PLACES.map((p) => p.point),
    SAMPLE_ALLEY.street,
  ]) {
    for (const [from, to] of [
      [origin, SAMPLE_ALLEY.inside],
      [SAMPLE_ALLEY.inside, origin],
    ]) {
      const raw = sampleRoute(from, to);
      assert.ok(raw, JSON.stringify({ from, to }));
      const route = softenSampleRoute(from, raw);
      let last: SamplePoint = from;
      for (const waypoint of route) {
        assert.ok(
          sampleSegmentClear(last, waypoint),
          JSON.stringify({ last, waypoint }),
        );
        last = waypoint;
      }
      for (const fps of [20, 60, 120]) {
        let current: SamplePoint = from;
        let remaining = [...route];
        for (let frame = 0; frame < fps * 45 && remaining.length; frame++) {
          const advanced = advanceSampleRoute(
            current,
            remaining,
            ART_SAMPLE.walkSpeed / fps,
          );
          const moved = moveInSample(current, {
            x: advanced.point.x - current.x,
            y: advanced.point.y - current.y,
          });
          assert.ok(
            sampleDistance(moved, advanced.point) < 0.001,
            'movement must not rely on sliding through a corner',
          );
          assert.ok(onSampleGround(moved));
          assert.ok(
            sampleDistance(current, moved) <= ART_SAMPLE.walkSpeed / fps + 1e-7,
          );
          remaining = remaining.slice(advanced.used);
          current = moved;
        }
        assert.equal(
          remaining.length,
          0,
          'route cannot stick at the alley mouth',
        );
        assert.ok(sampleDistance(current, to) < 0.001);
      }
    }
  }
  for (const wall of [
    { x: 990, y: 363 },
    { x: 1130, y: 310 },
    { x: 1000, y: 250 },
  ]) {
    assert.equal(onSampleStreetGround(wall), false);
  }
});

void test('route rounding softens a right angle but never cuts across an alley wall', () => {
  const from = { x: 1020, y: 468 };
  const route = softenSampleRoute(from, [
    SAMPLE_ALLEY.mouth,
    SAMPLE_ALLEY.bend,
    SAMPLE_ALLEY.inside,
  ]);
  assert.ok(route.length > 4);
  let previous = from;
  for (const point of route) {
    assert.ok(sampleSegmentClear(previous, point));
    previous = point;
  }
  assert.deepEqual(route.at(-1), SAMPLE_ALLEY.inside);
});

void test('turn damping has continuous momentum, no overshoot from rest and the same timing at different frame rates', () => {
  const results: number[] = [];
  for (const fps of [20, 60, 120]) {
    let state = { value: 0, velocity: 0 };
    let last = 0;
    for (let frame = 0; frame < fps; frame++) {
      state = stepSampleSpring(state, -6, 1 / fps, 5);
      assert.ok(state.value <= last && state.value >= -6);
      assert.ok(
        Math.abs(state.velocity) < 12,
        'small look change must not whip around',
      );
      last = state.value;
    }
    results.push(state.value);
    const reversed = stepSampleSpring(state, 0, 1 / fps, 5);
    assert.ok(
      Math.abs(reversed.value - state.value) < 12 / fps,
      'reversing has a bounded angular speed',
    );
  }
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-8);
});

void test('the alley look cue is gradual and does not rotate the cafe or the main road', () => {
  assert.deepEqual(sampleAlleyLook(ART_SAMPLE.start), { yaw: 0, tilt: 0 });
  assert.deepEqual(sampleAlleyLook(SAMPLE_PLACES[1].point), {
    yaw: 0,
    tilt: 0,
  });
  assert.deepEqual(sampleAlleyLook(SAMPLE_ALLEY.street), { yaw: 0, tilt: 0 });
  let previous = 0;
  for (let step = 0; step <= 100; step++) {
    const point = {
      x:
        SAMPLE_ALLEY.mouth.x +
        ((SAMPLE_ALLEY.inside.x - SAMPLE_ALLEY.mouth.x) * step) / 100,
      y:
        SAMPLE_ALLEY.mouth.y +
        ((SAMPLE_ALLEY.inside.y - SAMPLE_ALLEY.mouth.y) * step) / 100,
    };
    const look = sampleAlleyLook(point);
    assert.ok(Math.abs(look.yaw - previous) < 0.1);
    assert.ok(look.yaw >= -6 && look.yaw <= 0);
    previous = look.yaw;
  }
  assert.equal(previous, -6);
});

void test('look-ahead anticipates the next path segment and stays bounded on reversals and at rest', () => {
  const point = { x: SAMPLE_ALLEY.mouth.x - 8, y: SAMPLE_ALLEY.mouth.y };
  const lead = sampleTravelLead(
    point,
    [SAMPLE_ALLEY.mouth, SAMPLE_ALLEY.bend],
    { x: 1.1, y: 0 },
    1 / 60,
  );
  assert.ok(lead.y < -10, 'camera can see the bend before the feet reach it');
  assert.ok(Math.hypot(lead.x, lead.y) <= 36);
  assert.deepEqual(sampleTravelLead(point, [], { x: 0, y: 0 }, 1 / 60), {
    x: 0,
    y: 0,
  });
  const reverse = sampleTravelLead(point, [], { x: -1.1, y: 0 }, 1 / 60);
  assert.ok(reverse.x < 0 && Math.abs(reverse.x) <= 36);
});

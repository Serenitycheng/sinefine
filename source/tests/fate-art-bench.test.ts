import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import {
  NEIGHBORHOOD_CENTER,
  sampleNeighborhoodWorld,
} from '../lib/fate-art-alley';
import {
  SAMPLE_BENCH,
  BENCH_SPRITE_CELL,
  arriveAtSampleBench,
  atSampleBench,
  sampleBenchSeat,
  type BenchPosture,
} from '../lib/fate-art-bench';
import {
  advanceVisibleSampleRoute,
  visibleSampleRoute,
} from '../lib/fate-art-navigation';
import { sampleDistance } from '../lib/fate-art-sample';
import {
  onViewPaving,
  sampleViewPoint,
  type PaintedView,
} from '../lib/fate-art-views';

const views: PaintedView[] = [
  'neighborhood',
  'neighborhood-along',
  'neighborhood-eye',
];

void test('all three bench views can approach, sit after arrival, and leave on actual paving', () => {
  for (const view of views) {
    let point = { ...NEIGHBORHOOD_CENTER };
    let posture: BenchPosture = 'approaching';
    for (const destination of [SAMPLE_BENCH.point, NEIGHBORHOOD_CENTER]) {
      const route = visibleSampleRoute(point, destination, view);
      assert.ok(route, `${view}: route must exist`);
      let steps = 0;
      while (route.length && steps++ < 2000) {
        const next = advanceVisibleSampleRoute(point, route, 2, view);
        assert.equal(
          next.blocked,
          false,
          `${view}: approach/exit must not stick`,
        );
        point = next.point;
        route.splice(0, next.used);
        assert.ok(onViewPaving(sampleViewPoint(point, view), view));
        posture = arriveAtSampleBench(posture, point, !route.length);
        if (route.length)
          assert.equal(
            posture,
            destination === SAMPLE_BENCH.point ? 'approaching' : 'standing',
          );
      }
      assert.equal(route.length, 0);
      assert.ok(sampleDistance(point, destination) < 1e-6);
      if (destination === SAMPLE_BENCH.point) {
        assert.equal(posture, 'sitting');
        posture = 'standing'; // Explicit player stand/walk input releases the seat.
      } else assert.equal(posture, 'standing');
    }
  }
});

void test('proximity alone, unfinished or cancelled routes cannot trigger a delayed sit', () => {
  const near = sampleNeighborhoodWorld({ x: 1250, y: 580 });
  assert.ok(sampleDistance(near, SAMPLE_BENCH.point) < 45);
  assert.equal(atSampleBench(near), false);
  assert.equal(arriveAtSampleBench('approaching', near, true), 'approaching');
  assert.equal(
    arriveAtSampleBench('approaching', SAMPLE_BENCH.point, false),
    'approaching',
  );
  assert.equal(
    arriveAtSampleBench('standing', SAMPLE_BENCH.point, true),
    'standing',
  );
  assert.equal(
    arriveAtSampleBench('sitting', SAMPLE_BENCH.point, false),
    'sitting',
  );
});

void test('the seat is an authored interaction anchor, never a walkable chair or garden', () => {
  const bounds = [
    { x: [1350, 1465], y: [512, 555] },
    { x: [1270, 1390], y: [349, 375] },
    { x: [1320, 1440], y: [469, 486] },
  ];
  for (const [index, view] of views.entries()) {
    const seat = sampleBenchSeat(view);
    assert.ok(seat);
    assert.ok(
      seat.point.x >= bounds[index].x[0] && seat.point.x <= bounds[index].x[1],
    );
    assert.ok(
      seat.point.y >= bounds[index].y[0] && seat.point.y <= bounds[index].y[1],
    );
    assert.equal(onViewPaving(seat.point, view), false);
    assert.ok(onViewPaving(sampleViewPoint(SAMPLE_BENCH.point, view), view));
    assert.ok(seat.hip.x > 0 && seat.hip.x < BENCH_SPRITE_CELL);
    assert.ok(seat.hip.y > 0 && seat.hip.y < BENCH_SPRITE_CELL);
  }
  assert.equal(sampleBenchSeat('street-eye'), null);
  assert.equal(sampleBenchSeat('alley'), null);
});

void test('the actual seated atlas has RGBA transparency and matches the frame dimensions', () => {
  const png = readFileSync(resolve('public/fate/art-sample/illya-sit-v1.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), BENCH_SPRITE_CELL * 2);
  assert.equal(png.readUInt32BE(20), BENCH_SPRITE_CELL * 2);
  assert.equal(png[25], 6); // Truecolor RGBA; keep the generated alpha channel.
});

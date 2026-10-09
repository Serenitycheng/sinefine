import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BLOCK_AREAS,
  BLOCK_CONNECTIONS,
  BLOCK_PLACES,
  blockExits,
} from '../lib/fate-art-block';
import { SLOPE_ENDS, SLOPE_PLACES } from '../lib/fate-art-extension';
import { sampleDistance, type SamplePoint } from '../lib/fate-art-sample';
import { type SampleScene } from '../lib/fate-art-alley';
import {
  ROAD_MODES,
  onViewPaving,
  sampleViewPoint,
  sampleViewWorld,
  viewArea,
  viewForArea,
  type RoadMode,
} from '../lib/fate-art-views';
import {
  advanceVisibleSampleRoute,
  onVisibleSampleGround,
  sampleClickTarget,
  sampleNavigableScene,
  sampleNavigableView,
  visibleSampleRoute,
} from '../lib/fate-art-navigation';

function walk(
  from: SamplePoint,
  fromArea: SampleScene,
  to: SamplePoint,
  mode: RoadMode,
  fps = 60,
) {
  let point = { ...from },
    area = fromArea;
  const route = visibleSampleRoute(point, to, viewForArea(area, mode));
  assert.ok(route, `${fromArea} ${mode}: route exists`);
  const visited = new Set<SampleScene>([area]);
  let frames = 0,
    switches = 0;
  while (route.length && frames++ < fps * 120) {
    const view = sampleNavigableView(area, point, mode);
    const result = advanceVisibleSampleRoute(point, route, 110 / fps, view);
    point = result.point;
    route.splice(0, result.used);
    area = sampleNavigableScene(area, point, mode);
    const next = sampleNavigableView(area, point, mode);
    assert.ok(
      onVisibleSampleGround(point, 0, next),
      'feet remain inside both shared floors and the shown painting',
    );
    if (mode !== 'overview')
      assert.ok(
        next === 'alley' || next.endsWith(mode),
        'a facing view never falls back to overhead',
      );
    if (next !== view) switches++;
    // At an old, narrow doorway the frame may first reach contact, then cut
    // to its overlapping paving. The next frame must be able to continue.
    assert.ok(
      !result.blocked || next !== view,
      'a wall must not trap a cross-area route',
    );
    visited.add(viewArea(next));
  }
  assert.equal(route.length, 0, 'the full route is consumed');
  assert.ok(
    sampleDistance(point, to) < 1e-6,
    'arrival retains the world destination',
  );
  assert.ok(
    switches <= 4,
    'entry/exit hysteresis prevents repeated camera cuts',
  );
  return visited;
}

void test('the registry forms a four-road loop, with all exits and destinations on shared paving', () => {
  assert.equal(Object.keys(BLOCK_AREAS).length, 4);
  assert.equal(BLOCK_CONNECTIONS.length, 4);
  assert.equal(BLOCK_PLACES.length, 7);
  const reached = new Set<SampleScene>(['street']);
  for (let i = 0; i < 4; i++)
    for (const c of BLOCK_CONNECTIONS) {
      if (reached.has(c.a) || reached.has(c.b)) {
        reached.add(c.a);
        reached.add(c.b);
      }
      for (const p of Object.values(c.approaches))
        assert.ok(onVisibleSampleGround(p), `${c.id}: usable approach`);
    }
  assert.equal(reached.size, 4);
  for (const a of Object.values(BLOCK_AREAS)) {
    assert.equal(blockExits(a.id).length, 2);
    for (const p of [{ point: a.center }, ...a.places])
      for (const mode of ROAD_MODES) {
        const view = viewForArea(a.id, mode),
          paint = sampleViewPoint(p.point, view);
        assert.ok(
          onViewPaving(paint, view),
          `${a.id} ${mode}: reachable anchor`,
        );
        assert.ok(sampleDistance(p.point, sampleViewWorld(paint, view)) < 1e-6);
      }
  }
  for (const [i, adjacent] of ['neighborhood', 'street'].entries())
    for (const mode of ROAD_MODES) {
      for (const a of ['slope', adjacent] as SampleScene[]) {
        const view = viewForArea(a, mode);
        assert.ok(
          onViewPaving(sampleViewPoint(SLOPE_ENDS[i], view), view),
          'both sides of each new port show paving',
        );
      }
    }
});

for (const mode of ROAD_MODES) {
  void test(`${mode}: the full block loop works in both directions, including the returning road`, () => {
    for (const order of [
      ['street', 'alley', 'neighborhood', 'slope', 'street'],
      ['street', 'slope', 'neighborhood', 'alley', 'street'],
    ] as SampleScene[][]) {
      for (let i = 1; i < order.length; i++) {
        const a = BLOCK_AREAS[order[i - 1]],
          b = BLOCK_AREAS[order[i]];
        const visited = walk(a.center, a.id, b.center, mode);
        assert.ok(visited.has(b.id));
        if (a.id === 'slope' && b.id === 'street')
          assert.ok(
            !visited.has('alley'),
            'use the forward return exit instead of backtracking through the alley',
          );
      }
    }
    for (const place of SLOPE_PLACES) {
      walk(BLOCK_AREAS.slope.center, 'slope', place.point, mode);
      walk(place.point, 'slope', BLOCK_AREAS.slope.center, mode);
    }
  });
}

void test('new return-road transitions remain stable at 20 and 120 fps', () => {
  for (const fps of [20, 120])
    for (const mode of ROAD_MODES) {
      walk(
        BLOCK_AREAS.slope.center,
        'slope',
        BLOCK_AREAS.street.center,
        mode,
        fps,
      );
      walk(
        BLOCK_AREAS.street.center,
        'street',
        BLOCK_AREAS.slope.center,
        mode,
        fps,
      );
    }
});

void test('new street clicks reject walls and preserve the correct door destination in every view', () => {
  for (const mode of ROAD_MODES) {
    const view = viewForArea('slope', mode);
    for (const point of [
      { x: 200, y: 200 },
      { x: 1580, y: 200 },
    ])
      assert.equal(sampleClickTarget(point, view), null);
    for (const p of SLOPE_PLACES) {
      const point = sampleClickTarget(sampleViewPoint(p.point, view), view);
      assert.ok(point);
      assert.ok(sampleDistance(point, p.point) < 1e-6);
    }
  }
});

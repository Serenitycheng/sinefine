import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLEY_AHEAD,
  NEIGHBORHOOD_CENTER,
  NEIGHBORHOOD_JUNCTIONS,
  NEIGHBORHOOD_PAVING,
  NEIGHBORHOOD_PLACES,
  SAMPLE_SCENES,
  neighborhoodPaintedHeight,
  onNeighborhoodPaving,
  sampleAlleyWorld,
  sampleConnectedScene,
  sampleNeighborhoodPoint,
  sampleNeighborhoodWorld,
  sampleSceneIndex,
  sampleScenePoint,
  sampleSceneTransition,
  sampleSceneWorld,
  sampleViewWalkScale,
  type SampleScene,
} from '../lib/fate-art-alley';
import {
  ART_SAMPLE,
  SAMPLE_PLACES,
  advanceSampleRoute,
  moveInSample,
  onSampleGround,
  sampleDistance,
  sampleRoute,
  sampleSegmentClear,
  softenSampleRoute,
} from '../lib/fate-art-sample';
import { stepSampleSpring } from '../lib/fate-art-camera';
import {
  paintedFollowCamera,
  paintedFrameBounds,
  projectPaintedPoint,
  sampleSceneInput,
  sampleSurfaceData,
} from '../lib/fate-art-depth';

void test('the pilot uses one world for the street, alley and residential lane', () => {
  for (const scene of SAMPLE_SCENES)
    for (const world of [
      ART_SAMPLE.start,
      ALLEY_AHEAD,
      NEIGHBORHOOD_CENTER,
      ...NEIGHBORHOOD_PLACES.map((p) => p.point),
    ]) {
      assert.ok(
        sampleDistance(
          sampleSceneWorld(sampleScenePoint(world, scene), scene),
          world,
        ) < 1e-8,
      );
    }
  assert.equal(sampleConnectedScene('street', ART_SAMPLE.start), 'street');
  assert.equal(sampleConnectedScene('alley', ALLEY_AHEAD), 'alley');
  for (const p of [
    NEIGHBORHOOD_CENTER,
    ...NEIGHBORHOOD_PLACES.map((p) => p.point),
  ]) {
    assert.equal(sampleConnectedScene('alley', p), 'neighborhood');
  }
  for (const y of [228, 232, 240]) {
    const world = sampleAlleyWorld({ x: 992, y });
    assert.equal(sampleConnectedScene('alley', world), 'alley');
    assert.equal(sampleConnectedScene('neighborhood', world), 'neighborhood');
  }
});

void test('every pilot entrance and resting place connects to the main street in both directions', () => {
  for (const world of NEIGHBORHOOD_JUNCTIONS) assert.ok(onSampleGround(world));
  const destinations = [
    NEIGHBORHOOD_CENTER,
    ...NEIGHBORHOOD_PLACES.map((p) => p.point),
  ];
  for (const origin of [
    ART_SAMPLE.start,
    ...SAMPLE_PLACES.map((p) => p.point),
  ]) {
    for (const destination of destinations)
      for (const [from, to] of [
        [origin, destination],
        [destination, origin],
      ]) {
        const raw = sampleRoute(from, to);
        assert.ok(raw, JSON.stringify({ from, to }));
        let previous = from;
        for (const step of softenSampleRoute(from, raw)) {
          assert.ok(sampleSegmentClear(previous, step));
          previous = step;
        }
      }
  }
  for (const fps of [20, 60, 120])
    for (const [from, to] of [
      [ART_SAMPLE.start, NEIGHBORHOOD_PLACES[2].point],
      [NEIGHBORHOOD_PLACES[2].point, ART_SAMPLE.start],
    ]) {
      let point = from;
      const raw = sampleRoute(from, to);
      assert.ok(raw);
      let remaining = softenSampleRoute(from, raw);
      let scene: SampleScene =
        from === ART_SAMPLE.start ? 'street' : 'neighborhood';
      let spring = { value: sampleSceneIndex(scene), velocity: 0 };
      const visits: SampleScene[] = [scene];
      for (let i = 0; i < fps * 80 && remaining.length; i++) {
        const scale = sampleViewWalkScale(spring.value);
        const step = advanceSampleRoute(
          point,
          remaining,
          ART_SAMPLE.walkSpeed / fps / scale,
        );
        const moved = moveInSample(point, {
          x: step.point.x - point.x,
          y: step.point.y - point.y,
        });
        assert.ok(
          sampleDistance(moved, step.point) < 0.001,
          JSON.stringify({
            fps,
            point,
            next: step.point,
            moved,
            scene,
            from,
            to,
          }),
        );
        assert.ok(onSampleGround(moved));
        assert.ok(
          sampleDistance(point, moved) * scale <=
            ART_SAMPLE.walkSpeed / fps + 1e-7,
        );
        const next = sampleConnectedScene(scene, moved);
        if (scene !== next) visits.push(next);
        scene = next;
        spring = stepSampleSpring(spring, sampleSceneIndex(scene), 1 / fps, 8);
        point = moved;
        remaining = remaining.slice(step.used);
      }
      assert.equal(remaining.length, 0);
      assert.ok(sampleDistance(point, to) < 0.001);
      assert.deepEqual(
        visits,
        from === ART_SAMPLE.start
          ? ['street', 'alley', 'neighborhood']
          : ['neighborhood', 'alley', 'street'],
      );
    }
});

void test('planting, bench furniture and houses stay outside the pilot walking paths', () => {
  for (const image of [
    { x: 775, y: 180 },
    { x: 1440, y: 484 },
    { x: 1310, y: 695 },
    { x: 450, y: 770 },
    { x: 245, y: 362 },
    { x: 1197, y: 491 },
  ]) {
    assert.equal(onNeighborhoodPaving(image), false);
    assert.equal(
      sampleRoute(NEIGHBORHOOD_CENTER, sampleNeighborhoodWorld(image)),
      null,
    );
  }
  for (const p of NEIGHBORHOOD_PLACES)
    assert.ok(onNeighborhoodPaving(sampleNeighborhoodPoint(p.point)));
});

void test('camera changes at both pilot corners stay covered and screen-relative controls keep their direction', () => {
  for (const [start, target] of [
    [0, 1],
    [1, 2],
    [2, 1],
    [1, 0],
  ])
    for (const fps of [20, 60, 120]) {
      let spring = { value: start, velocity: 0 };
      for (let frame = 0; frame < fps * 2; frame++) {
        const previous = sampleSceneTransition(spring.value);
        spring = stepSampleSpring(spring, target, 1 / fps, 8);
        const next = sampleSceneTransition(spring.value);
        if (previous.scene !== next.scene)
          assert.ok(previous.cover > 0.94 && next.cover > 0.94);
      }
      assert.equal(
        sampleSceneTransition(spring.value).scene,
        SAMPLE_SCENES[target],
      );
      assert.equal(sampleSceneTransition(spring.value).cover, 0);
    }
  for (const scene of SAMPLE_SCENES)
    for (const look of [
      { yaw: 0, tilt: 0 },
      { yaw: 10, tilt: -3 },
      { yaw: -10, tilt: 3 },
    ])
      for (const input of [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 1 },
      ]) {
        const delta = sampleSceneInput(input, look, scene);
        const from = projectPaintedPoint(
          sampleScenePoint(NEIGHBORHOOD_CENTER, scene),
          look,
        );
        const to = projectPaintedPoint(
          sampleScenePoint(
            {
              x: NEIGHBORHOOD_CENTER.x + delta.x,
              y: NEIGHBORHOOD_CENTER.y + delta.y,
            },
            scene,
          ),
          look,
        );
        assert.ok(
          Math.abs((to.x - from.x) * input.y - (to.y - from.y) * input.x) <
            1e-7,
        );
        assert.ok((to.x - from.x) * input.x + (to.y - from.y) * input.y > 0);
      }
});

void test('the lane camera frames upcoming road, doors and resting places at desktop and phone sizes', () => {
  const data = sampleSurfaceData(8, 'neighborhood');
  assert.ok(data.positions.every(Number.isFinite));
  for (const polygon of NEIGHBORHOOD_PAVING)
    for (const p of polygon) assert.equal(neighborhoodPaintedHeight(p), 0);
  for (const look of [
    { yaw: 0, tilt: 0 },
    { yaw: 10, tilt: -3 },
    { yaw: -10, tilt: 3 },
  ]) {
    const bounds = paintedFrameBounds(look, 'neighborhood');
    assert.ok(bounds.left < bounds.right && bounds.top < bounds.bottom);
    for (const p of [
      NEIGHBORHOOD_CENTER,
      ...NEIGHBORHOOD_PLACES.map((p) => p.point),
    ])
      for (const [width, height] of [
        [1280, 568],
        [390, 590],
      ]) {
        const foot = projectPaintedPoint(sampleNeighborhoodPoint(p), look);
        const camera = paintedFollowCamera(
          foot,
          look,
          width,
          height,
          1.05,
          look,
          'neighborhood',
        );
        const x = (foot.x - camera.x) * camera.scale;
        const y = (foot.y - camera.y) * camera.scale;
        assert.ok(
          x > 30 &&
            x < width - 30 &&
            y > 115 * camera.scale &&
            y < height - 25 * camera.scale,
          JSON.stringify({ p, look, width, height, camera, x, y }),
        );
      }
  }
});

void test('the pilot storefront and roof are continuous under maximum oblique observation', () => {
  for (const look of [
    { yaw: 10, tilt: -3 },
    { yaw: -10, tilt: 3 },
  ]) {
    for (let y = 30; y < 941; y += 24) {
      for (let x = 0; x < 1672; x += 8) {
        const point = { x, y };
        const next = { x: Math.min(1672, x + 8), y };
        const left = projectPaintedPoint(
          point,
          look,
          neighborhoodPaintedHeight(point),
        );
        const right = projectPaintedPoint(
          next,
          look,
          neighborhoodPaintedHeight(next),
        );
        assert.ok(
          right.x > left.x,
          'painted facade must not fold backwards across a disconnected entrance',
        );
        assert.ok(
          Math.abs(
            neighborhoodPaintedHeight(next) - neighborhoodPaintedHeight(point),
          ) <=
            8 * 0.019,
          JSON.stringify({ point, next }),
        );
      }
    }
  }
});

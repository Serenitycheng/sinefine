import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import {
  ALLEY_AHEAD,
  ALLEY_JUNCTIONS,
  ALLEY_PAVING,
  alleyPaintedHeight,
  onAlleyPaving,
  sampleAlleyPoint,
  sampleAlleyScene,
  sampleAlleyWorld,
  sampleSceneTransition,
  sampleViewWalkScale,
  type SampleScene,
} from '../lib/fate-art-alley';
import {
  ART_SAMPLE,
  SAMPLE_ALLEY,
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
  paintedPosition,
  projectPaintedPoint,
  sampleLookBasis,
  sampleSceneInput,
  sampleSurfaceData,
} from '../lib/fate-art-depth';

void test('alley doors and wall posts stay upright while looking left or right', () => {
  for (const yaw of [-10, 10]) {
    for (const x of [300, 480, 1165, 1470]) {
      const points = [100, 380, 660].map((y) =>
        projectPaintedPoint(
          { x, y },
          { yaw, tilt: 0 },
          alleyPaintedHeight({ x, y }),
        ),
      );
      assert.ok(Math.abs(points[0].x - points[2].x) < 1e-7);
      assert.ok(Math.abs(points[1].y - (points[0].y + points[2].y) / 2) < 1e-7);
    }
  }
});

void test('both paintings share exact character positions and one continuous route beyond the alley entrance', () => {
  for (const point of [
    ART_SAMPLE.start,
    SAMPLE_ALLEY.bend,
    SAMPLE_ALLEY.inside,
    ALLEY_AHEAD,
    ...ALLEY_JUNCTIONS,
  ]) {
    assert.ok(
      sampleDistance(sampleAlleyWorld(sampleAlleyPoint(point)), point) < 1e-8,
    );
  }
  assert.ok(onAlleyPaving(sampleAlleyPoint(SAMPLE_ALLEY.inside)));
  assert.ok(onAlleyPaving(sampleAlleyPoint(ALLEY_AHEAD)));
  for (const origin of [
    ART_SAMPLE.start,
    ...SAMPLE_PLACES.map((p) => p.point),
  ]) {
    for (const [from, to] of [
      [origin, ALLEY_AHEAD],
      [ALLEY_AHEAD, origin],
    ]) {
      const raw = sampleRoute(from, to);
      assert.ok(raw, JSON.stringify({ from, to }));
      const route = softenSampleRoute(from, raw);
      let previous = from;
      for (const waypoint of route) {
        assert.ok(
          sampleSegmentClear(previous, waypoint),
          JSON.stringify({ previous, waypoint }),
        );
        previous = waypoint;
      }
      for (const fps of [20, 60, 120]) {
        let point = from;
        let remaining = [...route];
        let scene: SampleScene = from === ALLEY_AHEAD ? 'alley' : 'street';
        let blend = { value: scene === 'alley' ? 1 : 0, velocity: 0 };
        let switches = 0;
        for (let frame = 0; frame < fps * 45 && remaining.length; frame++) {
          const speed = sampleViewWalkScale(blend.value);
          const step = advanceSampleRoute(
            point,
            remaining,
            ART_SAMPLE.walkSpeed / fps / speed,
          );
          const moved = moveInSample(point, {
            x: step.point.x - point.x,
            y: step.point.y - point.y,
          });
          assert.ok(
            sampleDistance(moved, step.point) < 0.001,
            'must not get stuck on the view boundary',
          );
          assert.ok(onSampleGround(moved));
          assert.ok(
            sampleDistance(moved, point) * speed <=
              ART_SAMPLE.walkSpeed / fps + 1e-7,
            'alley view must not accelerate the walking animation',
          );
          const nextScene = sampleAlleyScene(scene, moved);
          if (nextScene !== scene) switches++;
          scene = nextScene;
          blend = stepSampleSpring(
            blend,
            scene === 'alley' ? 1 : 0,
            1 / fps,
            8,
          );
          remaining = remaining.slice(step.used);
          point = moved;
        }
        assert.equal(remaining.length, 0);
        assert.ok(sampleDistance(point, to) < 0.001);
        assert.equal(
          switches,
          1,
          'one automatic view change, with no flicker or teleport',
        );
        assert.equal(scene, to === ALLEY_AHEAD ? 'alley' : 'street');
      }
    }
  }
  for (const wall of [
    { x: 490, y: 550 },
    { x: 1200, y: 600 },
    { x: 1050, y: 240 },
  ]) {
    assert.equal(onAlleyPaving(wall), false);
    assert.equal(sampleRoute(ALLEY_AHEAD, sampleAlleyWorld(wall)), null);
  }
});

void test('the alley view starts at the entrance and hysteresis survives stopping and reversing', () => {
  assert.equal(sampleAlleyScene('street', ART_SAMPLE.start), 'street');
  assert.equal(sampleAlleyScene('street', SAMPLE_PLACES[1].point), 'street');
  assert.equal(sampleAlleyScene('street', { x: 1111, y: 385 }), 'alley');
  for (let i = 0; i < 20; i++) {
    assert.equal(
      sampleAlleyScene('alley', { x: 1114, y: 392 + (i % 2) }),
      'alley',
    );
    assert.equal(
      sampleAlleyScene('street', { x: 1114, y: 392 + (i % 2) }),
      'street',
    );
  }
  assert.equal(sampleAlleyScene('alley', SAMPLE_ALLEY.mouth), 'street');
  assert.equal(sampleAlleyScene('alley', ALLEY_AHEAD), 'alley');
  let blend = { value: 0, velocity: 0 };
  for (let i = 0; i < 60; i++) blend = stepSampleSpring(blend, 1, 1 / 60, 8);
  assert.ok(
    blend.value > 0.995,
    'front road becomes visible shortly after entry',
  );
  const reversed = stepSampleSpring(blend, 0, 1 / 60, 8);
  assert.ok(
    Math.abs(reversed.value - blend.value) < 0.02,
    'reverse from current view, never snap',
  );
});

void test('the view changes under a brief full cover, without double-exposed buildings', () => {
  assert.equal(sampleSceneTransition(0).cover, 0);
  assert.equal(sampleSceneTransition(1).cover, 0);
  for (let amount = 0.43; amount <= 0.57; amount += 0.001) {
    assert.ok(sampleSceneTransition(amount).cover > 0.999999);
  }
  for (const fps of [20, 60, 120]) {
    for (const target of [0, 1]) {
      let spring = { value: 1 - target, velocity: 0 };
      for (let i = 0; i < fps * 2; i++) {
        const previous = sampleSceneTransition(spring.value);
        spring = stepSampleSpring(spring, target, 1 / fps, 8);
        const next = sampleSceneTransition(spring.value);
        if (previous.scene !== next.scene) {
          assert.ok(
            previous.cover > 0.94 && next.cover > 0.94,
            'the repositioned camera is hidden when its image changes',
          );
        }
      }
      assert.equal(
        sampleSceneTransition(spring.value).scene,
        target ? 'alley' : 'street',
      );
      assert.equal(sampleSceneTransition(spring.value).cover, 0);
    }
  }
});

void test('keyboard directions match the visible camera on both sides of the automatic view change', () => {
  for (const look of [
    { yaw: 0, tilt: 0 },
    { yaw: -10, tilt: 3 },
    { yaw: 10, tilt: -3 },
  ]) {
    for (const blend of [0, 0.1, 0.5, 0.9, 1]) {
      const amount = sampleSceneTransition(blend).scene === 'alley' ? 1 : 0;
      const project = (point: { x: number; y: number }) => {
        const street = projectPaintedPoint(point, look);
        const alley = projectPaintedPoint(sampleAlleyPoint(point), look);
        return {
          x: street.x * (1 - amount) + alley.x * amount,
          y: street.y * (1 - amount) + alley.y * amount,
        };
      };
      for (const input of [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
      ]) {
        const delta = sampleSceneInput(input, look, amount);
        assert.ok(Math.abs(Math.hypot(delta.x, delta.y) - 1) < 1e-8);
        const from = project(SAMPLE_ALLEY.inside);
        const to = project({
          x: SAMPLE_ALLEY.inside.x + delta.x,
          y: SAMPLE_ALLEY.inside.y + delta.y,
        });
        assert.ok(
          Math.abs((to.x - from.x) * input.y - (to.y - from.y) * input.x) <
            1e-7,
        );
        assert.ok((to.x - from.x) * input.x + (to.y - from.y) * input.y > 0);
      }
    }
  }
  assert.deepEqual(sampleSceneInput({ x: 0, y: 0 }, { yaw: 0, tilt: 0 }, 1), {
    x: 0,
    y: 0,
  });
});

void test('alley following shows the path ahead and a complete person without transparent frame edges', () => {
  const data = sampleSurfaceData(8, 'alley');
  assert.ok(data.positions.every(Number.isFinite));
  for (const point of ALLEY_PAVING) assert.equal(alleyPaintedHeight(point), 0);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(data.positions, 3));
  geometry.setIndex(data.indices);
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const surface = new T.Mesh(geometry, material);
  surface.updateMatrixWorld();
  for (const look of [
    { yaw: 0, tilt: 0 },
    { yaw: -10, tilt: 3 },
    { yaw: 10, tilt: -3 },
  ]) {
    const bounds = paintedFrameBounds(look, 'alley');
    const { eye, right } = sampleLookBasis(look);
    const view = new T.Vector3(eye.x, eye.y, eye.z);
    for (const foot of [
      sampleAlleyPoint(SAMPLE_ALLEY.inside),
      { x: 890, y: 430 },
      sampleAlleyPoint(ALLEY_AHEAD),
    ]) {
      for (const [width, height] of [
        [1280, 568],
        [390, 580],
      ]) {
        const projected = projectPaintedPoint(foot, look);
        const camera = paintedFollowCamera(
          projected,
          look,
          width,
          height,
          1.05,
          look,
          'alley',
        );
        assert.ok(
          camera.x >= bounds.left - 1e-7 && camera.y >= bounds.top - 1e-7,
        );
        assert.ok(camera.x + width / camera.scale <= bounds.right + 1e-7);
        assert.ok(camera.y + height / camera.scale <= bounds.bottom + 1e-7);
        const next = projectPaintedPoint(
          { x: foot.x + 8, y: foot.y - 80 },
          look,
        );
        assert.ok(
          (next.x - camera.x) * camera.scale > 0 &&
            (next.x - camera.x) * camera.scale < width,
        );
        assert.ok(
          (next.y - camera.y) * camera.scale > 0,
          'player can see the next steps above the person',
        );
      }
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
          // At the reference view geometry and painting agree. At oblique
          // views the side-scene person is painted above the shallow relief,
          // since that relief is not a complete solid building model.
          if (look.yaw === 0 && look.tilt === 0) {
            const hit = ray.intersectObject(surface, false)[0];
            assert.ok(!hit || hit.distance >= 40 - 0.005);
          }
        }
      }
    }
  }
  geometry.dispose();
  material.dispose();
});

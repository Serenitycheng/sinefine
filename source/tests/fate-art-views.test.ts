import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ART_SAMPLE,
  SAMPLE_PLACES,
  SAMPLE_STREET_GROUND,
  onSampleStreetGround,
  sampleDistance,
  sampleRoute,
  moveInSample,
} from '../lib/fate-art-sample';
import {
  NEIGHBORHOOD_PAVING,
  NEIGHBORHOOD_PLACES,
  NEIGHBORHOOD_CENTER,
  onNeighborhoodPaving,
  sampleSceneWorld,
} from '../lib/fate-art-alley';
import {
  SAMPLE_LOOK,
  paintedFollowCamera,
  projectPaintedPoint,
  sampleSceneInput,
  unprojectPaintedGround,
} from '../lib/fate-art-depth';
import {
  ROAD_MODES,
  ROAD_REGISTRATION,
  PAINTED_VIEWS,
  beginViewCut,
  stepViewCut,
  viewCutCover,
  sampleViewPoint,
  sampleViewWorld,
  viewForArea,
  viewArea,
  onViewPaving,
  viewActorScale,
  viewTravelScale,
  advanceViewRoute,
} from '../lib/fate-art-views';
import { onRoadFloor } from '../lib/fate-art-road-ground';

const cross = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

void test('road projection is invertible throughout every walkable polygon, including entrances and the bench', () => {
  for (const [view, registration] of Object.entries(ROAD_REGISTRATION) as [
    keyof typeof ROAD_REGISTRATION,
    (typeof ROAD_REGISTRATION)['street-eye'],
  ][]) {
    for (const tri of registration.triangles) {
      assert.ok(
        cross(
          ...(tri.map((i) => registration.pairs[i].source) as [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
          ]),
        ) > 0,
      );
      assert.ok(
        cross(
          ...(tri.map((i) => registration.pairs[i].target) as [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
          ]),
        ) > 0,
        `${view} must not fold`,
      );
    }
    const main = viewArea(view) === 'street';
    const points = (main ? SAMPLE_STREET_GROUND : NEIGHBORHOOD_PAVING).flat();
    for (let x = 100; x < 1672; x += 19)
      for (let y = 170; y < 940; y += 19) {
        if (
          main ? onSampleStreetGround({ x, y }) : onNeighborhoodPaving({ x, y })
        )
          points.push({ x, y });
      }
    for (const local of points) {
      const world = sampleSceneWorld(local, viewArea(view)),
        paint = sampleViewPoint(world, view);
      assert.ok(
        paint.x >= 0 && paint.x <= 1672 && paint.y >= 0 && paint.y <= 941,
        `${view}: frame coverage ${JSON.stringify(local)}`,
      );
      assert.ok(
        sampleDistance(world, sampleViewWorld(paint, view)) < 1e-6,
        `${view}: inverse at ${JSON.stringify(local)}`,
      );
      assert.equal(
        onViewPaving(paint, view),
        onRoadFloor(paint, view),
        `${view}: registration alone must not declare walls walkable`,
      );
    }
  }
});

void test('walls remain rejected after projection; authored doorway anchors and world routes stay the same', () => {
  for (const view of Object.keys(
    ROAD_REGISTRATION,
  ) as (keyof typeof ROAD_REGISTRATION)[]) {
    const main = viewArea(view) === 'street';
    for (const p of [
      main ? { x: 540, y: 420 } : { x: 600, y: 200 },
      main ? { x: 1300, y: 200 } : { x: 1270, y: 520 },
    ]) {
      const world = sampleSceneWorld(p, viewArea(view));
      assert.equal(onViewPaving(sampleViewPoint(world, view), view), false);
    }
    for (const place of main ? SAMPLE_PLACES : NEIGHBORHOOD_PLACES) {
      const restored = sampleViewWorld(
        sampleViewPoint(place.point, view),
        view,
      );
      assert.ok(sampleDistance(place.point, restored) < 1e-7);
      const route = sampleRoute(
        main ? ART_SAMPLE.start : NEIGHBORHOOD_CENTER,
        restored,
      );
      assert.ok(route, `${view}: route to ${place.id}`);
      assert.ok(sampleDistance(route.at(-1)!, place.point) < 1e-7);
    }
  }
});

void test('screen-relative controls use the local perspective and preserve direction at the expanded look limits', () => {
  for (const view of PAINTED_VIEWS) {
    const point =
      viewArea(view) === 'street'
        ? ART_SAMPLE.start
        : viewArea(view) === 'neighborhood'
          ? NEIGHBORHOOD_CENTER
          : { x: 1070, y: 340 };
    for (const look of [
      { yaw: -SAMPLE_LOOK.yaw, tilt: -SAMPLE_LOOK.tilt },
      { yaw: SAMPLE_LOOK.yaw, tilt: SAMPLE_LOOK.tilt },
      { yaw: 0, tilt: 0 },
    ]) {
      for (const input of [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 1 },
      ]) {
        const d = sampleSceneInput(input, look, view, point);
        assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-8);
        const a = projectPaintedPoint(
          sampleViewPoint(point, view),
          look,
          0,
          view,
        );
        const b = projectPaintedPoint(
          sampleViewPoint(
            { x: point.x + d.x * 0.0001, y: point.y + d.y * 0.0001 },
            view,
          ),
          look,
          0,
          view,
        );
        assert.ok(
          Math.abs((b.x - a.x) * input.y - (b.y - a.y) * input.x) < 1e-7,
          `${view} direction`,
        );
        assert.ok((b.x - a.x) * input.x + (b.y - a.y) * input.y > 0);
        const unprojected = unprojectPaintedGround(a, look, view);
        assert.ok(
          sampleDistance(sampleViewWorld(unprojected, view), point) < 1e-7,
        );
      }
      const camera = paintedFollowCamera(
        projectPaintedPoint(sampleViewPoint(point, view), look, 0, view),
        look,
        1280,
        560,
        1.05,
        look,
        view,
      );
      assert.ok(Object.values(camera).every(Number.isFinite));
      assert.ok(camera.scale > 0 && camera.scale < 3);
    }
  }
});

void test('perspective walking slows apparent motion with distance and leaves the original views unchanged', () => {
  for (const view of PAINTED_VIEWS) {
    const point =
      viewArea(view) === 'street' ? ART_SAMPLE.start : NEIGHBORHOOD_CENTER;
    const scale = viewActorScale(point, view);
    assert.ok(scale >= 0.38 && scale <= 2.9);
    for (const input of [
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ]) {
      const pace = viewTravelScale(point, input, view);
      assert.ok(Number.isFinite(pace) && pace >= 0.15);
    }
  }
  assert.equal(viewActorScale(ART_SAMPLE.start, 'street'), 1);
  assert.equal(viewTravelScale(ART_SAMPLE.start, { x: 1, y: 0 }, 'street'), 1);
  const near = sampleViewWorld({ x: 1200, y: 820 }, 'street-eye'),
    far = sampleViewWorld({ x: 1050, y: 430 }, 'street-eye');
  assert.ok(
    viewActorScale(near, 'street-eye') > viewActorScale(far, 'street-eye'),
  );
});

void test('walking past perspective seams and doorways never jumps and reaches every destination', () => {
  for (const view of Object.keys(
    ROAD_REGISTRATION,
  ) as (keyof typeof ROAD_REGISTRATION)[]) {
    const main = viewArea(view) === 'street';
    const points = [
      main ? ART_SAMPLE.start : NEIGHBORHOOD_CENTER,
      ...(main ? SAMPLE_PLACES : NEIGHBORHOOD_PLACES).map((p) => p.point),
    ];
    for (let from = 0; from < points.length; from++) {
      for (let to = 0; to < points.length; to++) {
        if (from === to) continue;
        // All door/bench combinations at a long frame; a representative route
        // also runs at 60/120 Hz so the distance budget is not frame-dependent.
        for (const fps of from === 0 && to === 1 ? [20, 60, 120] : [20]) {
          let point = points[from];
          const route = sampleRoute(point, points[to]);
          assert.ok(route, `${view}: destination must be reachable`);
          const travel = ART_SAMPLE.walkSpeed / fps;
          for (let frame = 0; frame < fps * 150 && route.length; frame++) {
            const advance = advanceViewRoute(point, route, travel, view);
            const next = moveInSample(point, {
              x: advance.point.x - point.x,
              y: advance.point.y - point.y,
            });
            const paintedTravel =
              sampleDistance(
                sampleViewPoint(point, view),
                sampleViewPoint(next, view),
              ) /
              ((viewActorScale(point, view) + viewActorScale(next, view)) / 2);
            assert.ok(
              paintedTravel <= travel * 1.02 + 1e-7,
              `${view} ${from}->${to} at ${fps} Hz: visible step ${paintedTravel} exceeds ${travel}`,
            );
            point = next;
            route.splice(0, advance.used);
          }
          assert.equal(route.length, 0, `${view}: walking must finish`);
          assert.ok(
            sampleDistance(point, points[to]) < 0.1,
            `${view}: exact arrival`,
          );
        }
      }
    }
  }
});

void test('a cut preserves its old painting until fully covered and reaches the requested view', () => {
  for (const dt of [1 / 144, 1 / 60, 1 / 24, 0.05]) {
    let cut = beginViewCut('street');
    let swapped = false;
    for (let i = 0; i < 150; i++) {
      const previous = cut;
      cut = stepViewCut(cut, 'street-eye', dt);
      if (previous.shown !== cut.shown) {
        swapped = true;
        assert.equal(viewCutCover(cut), 1);
      }
      assert.ok(viewCutCover(cut) >= 0 && viewCutCover(cut) <= 1);
    }
    assert.ok(swapped);
    assert.equal(cut.shown, 'street-eye');
    assert.equal(cut.changing, false);
  }
});

void test('rapid retargeting finishes covered cuts; reduced motion switches immediately', () => {
  let cut = stepViewCut(beginViewCut('street'), 'street-eye', 0.05);
  for (let i = 0; i < 80; i++) cut = stepViewCut(cut, 'street-along', 0.02);
  assert.deepEqual(cut, beginViewCut('street-along'));
  assert.deepEqual(
    stepViewCut(cut, 'neighborhood-eye', 0.02, true),
    beginViewCut('neighborhood-eye'),
  );
});

void test('all selected road modes survive an alley crossing', () => {
  for (const mode of ROAD_MODES) {
    assert.equal(viewForArea('alley', mode), 'alley');
    for (const area of ['street', 'neighborhood'] as const) {
      const view = viewForArea(area, mode);
      assert.equal(viewArea(view), area);
      assert.equal(view, mode === 'overview' ? area : `${area}-${mode}`);
    }
  }
});

void test('facing road views keep walls upright and straight while looking sideways', () => {
  for (const view of [
    'street-eye',
    'street-along',
    'neighborhood-eye',
    'neighborhood-along',
  ] as const) {
    for (const yaw of [-18, -9, 0, 9, 18]) {
      for (const x of [210, 750, 1350]) {
        const top = projectPaintedPoint(
          { x, y: 180 },
          { yaw, tilt: 0 },
          0,
          view,
        );
        const bottom = projectPaintedPoint(
          { x, y: 720 },
          { yaw, tilt: 0 },
          0,
          view,
        );
        assert.ok(
          Math.abs(top.x - bottom.x) < 1e-8,
          `${view}: vertical wall must not roll with yaw`,
        );
        assert.ok(bottom.y > top.y);
      }
    }
  }
});

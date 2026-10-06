import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ART_SAMPLE,
  SAMPLE_ALLEY,
  SAMPLE_PLACES,
  sampleDistance,
  type SamplePoint,
} from '../lib/fate-art-sample';
import {
  NEIGHBORHOOD_PLACES,
  sampleAlleyWorld,
  type SampleScene,
} from '../lib/fate-art-alley';
import {
  onVisibleSampleGround,
  visibleSampleRoute,
  moveOnVisibleSampleGround,
  sampleNavigableScene,
  sampleNavigableView,
  sampleClickTarget,
  visibleSampleSegmentClear,
  advanceVisibleSampleRoute,
  moveVisibleSampleInput,
} from '../lib/fate-art-navigation';
import {
  ROAD_MODES,
  onViewPaving,
  sampleViewWorld,
  sampleViewPoint,
  viewArea,
  viewActorScale,
  beginViewCut,
  stepViewCut,
  viewForArea,
  type PaintedView,
} from '../lib/fate-art-views';
import { projectPaintedPoint } from '../lib/fate-art-depth';

const places = [
  { id: 'start', point: ART_SAMPLE.start },
  ...SAMPLE_PLACES,
  ...NEIGHBORHOOD_PLACES,
];

void test('a road camera never silently falls back to an overview at a scene boundary', () => {
  for (const mode of ['eye', 'along'] as const)
    for (const place of places)
      for (const scene of ['street', 'alley', 'neighborhood'] as const) {
        const selected = sampleNavigableView(scene, place.point, mode);
        assert.ok(
          selected === 'alley' || selected.endsWith(`-${mode}`),
          `${place.id}/${scene}/${mode}: preserve the chosen camera instead of ${selected}`,
        );
        assert.ok(
          onViewPaving(sampleViewPoint(place.point, selected), selected),
          'the retained camera must also show the feet on real paving',
        );
      }
});

void test('walking past the leafy house wall and back keeps the eye-level camera and visible feet', () => {
  const view = 'neighborhood-eye';
  const wallSide = sampleViewWorld({ x: 805, y: 462 }, view);
  for (const fps of [20, 60, 120]) {
    let point = { ...NEIGHBORHOOD_PLACES[0].point };
    let scene: SampleScene = 'neighborhood';
    let cut = beginViewCut(view);
    for (const destination of [wallSide, NEIGHBORHOOD_PLACES[0].point]) {
      const route = visibleSampleRoute(point, destination, view);
      assert.ok(route, 'the visible sidewalk must connect to the house door');
      const remaining = route.slice();
      for (let frame = 0; remaining.length && frame < fps * 20; frame++) {
        const step = advanceVisibleSampleRoute(
          point,
          remaining,
          ART_SAMPLE.walkSpeed / fps,
          cut.shown,
        );
        assert.equal(step.blocked, false, `${fps} Hz: no sidewalk sticking`);
        point = step.point;
        remaining.splice(0, step.used);
        const proposed = sampleNavigableScene(scene, point, 'eye');
        const selected = sampleNavigableView(proposed, point, 'eye');
        scene = viewArea(selected);
        cut = stepViewCut(cut, selected, 1 / fps);
        assert.equal(
          cut.shown,
          view,
          'never replace the road with an overview',
        );
        assert.equal(cut.changing, false, 'no unnecessary cut along this wall');
        assert.ok(onViewPaving(sampleViewPoint(point, cut.shown), cut.shown));
      }
      assert.equal(remaining.length, 0, `${fps} Hz: finish the walk`);
      assert.ok(sampleDistance(point, destination) < 1e-6);
    }
  }
});

void test('independently painted walls are rejected while every doorway and the bench remain reachable', () => {
  for (const [view, wall] of [
    ['street-eye', { x: 230, y: 550 }],
    ['street-along', { x: 300, y: 620 }],
    ['neighborhood-eye', { x: 610, y: 450 }],
    ['neighborhood-along', { x: 490, y: 300 }],
  ] as const)
    assert.equal(onViewPaving(wall, view), false, view);
  for (const place of places) {
    assert.ok(onVisibleSampleGround(place.point), place.id);
    const path = visibleSampleRoute(ART_SAMPLE.start, place.point);
    assert.ok(path, place.id);
    let previous: SamplePoint = ART_SAMPLE.start;
    for (const waypoint of path) {
      assert.ok(
        visibleSampleSegmentClear(previous, waypoint),
        `${place.id}: no corner cutting`,
      );
      previous = waypoint;
    }
  }
});

void test('walking between all places at low frame rates reaches them without clipping or visible jumps in all modes', () => {
  for (const mode of ROAD_MODES)
    for (const from of places)
      for (const to of places) {
        if (from.id === to.id) continue;
        let point = from.point,
          scene = sampleNavigableScene('street', point, mode);
        let cut = beginViewCut(sampleNavigableView(scene, point, mode));
        const path = visibleSampleRoute(point, to.point, cut.shown);
        assert.ok(path, `${mode}: ${from.id}->${to.id}`);
        for (let frame = 0; frame < 6000 && path.length; frame++) {
          if (!cut.changing) {
            const step = advanceVisibleSampleRoute(
              point,
              path,
              ART_SAMPLE.walkSpeed / 20,
              cut.shown,
            );
            const next = step.point;
            assert.ok(
              !step.blocked,
              `${mode} ${from.id}->${to.id}: must not stick`,
            );
            assert.ok(onVisibleSampleGround(next));
            const visibleTravel =
              sampleDistance(
                sampleViewPoint(point, cut.shown),
                sampleViewPoint(next, cut.shown),
              ) /
              ((viewActorScale(point, cut.shown) +
                viewActorScale(next, cut.shown)) /
                2);
            assert.ok(
              visibleTravel <= (ART_SAMPLE.walkSpeed / 20) * 1.02 + 1e-6,
              'no stretched projection step',
            );
            point = next;
            path.splice(0, step.used);
          }
          scene = sampleNavigableScene(scene, point, mode);
          cut = stepViewCut(cut, sampleNavigableView(scene, point, mode), 0.05);
          assert.ok(
            onViewPaving(sampleViewPoint(point, cut.shown), cut.shown),
            `${mode} ${from.id}->${to.id}: feet remain in the shown painting`,
          );
        }
        assert.equal(
          path.length,
          0,
          `${mode} ${from.id}->${to.id}: complete route`,
        );
        assert.ok(sampleDistance(point, to.point) < 1e-6);
      }
});

void test('manual controls at maximum look angles stop before painted walls and keep each projected step bounded', () => {
  for (const view of [
    'street-eye',
    'street-along',
    'neighborhood-eye',
    'neighborhood-along',
  ] as const) {
    for (const look of [
      { yaw: -18, tilt: -5 },
      { yaw: 18, tilt: 5 },
    ]) {
      for (const key of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: -1, y: -1 },
      ]) {
        let point: SamplePoint =
          viewArea(view) === 'street'
            ? SAMPLE_PLACES[0].point
            : NEIGHBORHOOD_PLACES[0].point;
        for (let frame = 0; frame < 120; frame++) {
          const next = moveVisibleSampleInput(point, key, 66 / 60, view, look);
          assert.ok(onVisibleSampleGround(next));
          const travel =
            sampleDistance(
              sampleViewPoint(point, view),
              sampleViewPoint(next, view),
            ) /
            ((viewActorScale(point, view) + viewActorScale(next, view)) / 2);
          assert.ok(travel <= (66 / 60) * 1.02 + 1e-6);
          point = next;
        }
        assert.ok(
          visibleSampleRoute(point, ART_SAMPLE.start),
          `${view}: can leave a manual wall contact by clicking a destination`,
        );
      }
    }
    const start =
      viewArea(view) === 'street'
        ? SAMPLE_PLACES[0].point
        : NEIGHBORHOOD_PLACES[0].point;
    const wall = sampleViewWorld({ x: 230, y: 520 }, view);
    const moved = moveOnVisibleSampleGround(start, {
      x: wall.x - start.x,
      y: wall.y - start.y,
    });
    assert.ok(sampleDistance(moved, wall) > 1);
    assert.ok(onVisibleSampleGround(moved));
  }
});

void test('held manual direction remains straight and moves forward across a leafy-road perspective seam', () => {
  const view = 'neighborhood-eye';
  const from = { x: 1350, y: 800 },
    input = { x: -170 / Math.hypot(170, 25), y: -25 / Math.hypot(170, 25) };
  for (const fps of [20, 60, 120]) {
    let point = sampleViewWorld(from, view),
      paint = from;
    for (let frame = 0; paint.x > 1190 && frame < fps * 10; frame++) {
      point = moveVisibleSampleInput(point, input, 66 / fps, view);
      const next = sampleViewPoint(point, view);
      const dx = next.x - paint.x,
        dy = next.y - paint.y;
      assert.ok(dx < -1e-6, 'never reverse or stick on open pavement');
      assert.ok(
        Math.abs(dx * input.y - dy * input.x) < 1e-4,
        'do not rotate movement at an affine seam',
      );
      assert.ok(onVisibleSampleGround(point));
      paint = next;
    }
    assert.ok(paint.x <= 1190);
  }
});

void test('the leafy foreground stays walkable downward and diagonally across the old overview edge', () => {
  const view = 'neighborhood-eye';
  for (const fps of [20, 60, 120])
    for (const input of [
      { x: 0, y: 1 },
      { x: -1, y: 1 },
    ]) {
      let point = sampleViewWorld({ x: 1350, y: 800 }, view);
      for (let frame = 0; frame < fps * 2; frame++) {
        const before = sampleViewPoint(point, view);
        if (before.y >= 860) break;
        const next = moveVisibleSampleInput(point, input, 66 / fps, view);
        const after = sampleViewPoint(next, view);
        assert.ok(after.y > before.y + 1e-6, 'open foreground cannot stick');
        if (input.x)
          assert.ok(after.x < before.x, 'lower-left input keeps its direction');
        assert.ok(onVisibleSampleGround(next, 0, view));
        assert.ok(onViewPaving(after, view), 'walking cannot hide the person');
        assert.equal(
          sampleNavigableScene('neighborhood', next, 'eye'),
          'neighborhood',
        );
        point = next;
      }
      assert.ok(
        sampleViewPoint(point, view).y >= 860,
        `${fps} Hz: cross the former barrier`,
      );
    }
});

void test('reachable leafy foreground keeps a valid painting when requesting every camera mode', () => {
  const point = sampleViewWorld({ x: 1350, y: 860 }, 'neighborhood-eye');
  assert.ok(onVisibleSampleGround(point));
  for (const mode of ROAD_MODES) {
    const selected = sampleNavigableView('neighborhood', point, mode);
    const cut = stepViewCut(
      beginViewCut('neighborhood-eye'),
      selected,
      0.05,
      true,
    );
    assert.ok(onViewPaving(sampleViewPoint(point, cut.shown), cut.shown));
    assert.equal(viewArea(cut.shown), 'neighborhood');
  }
});

void test('walking toward a leafy edge that has no shared floor stops with feet visible and allows returning', () => {
  const view = 'neighborhood-eye';
  const from = sampleViewWorld({ x: 1350, y: 800 }, view);
  const hidden = sampleViewWorld({ x: 1560, y: 900 }, view);
  assert.equal(onVisibleSampleGround(hidden, 0, view), false);
  assert.equal(sampleClickTarget({ x: 1560, y: 900 }, view), null);
  assert.deepEqual(sampleClickTarget({ x: 1350, y: 800 }, view), from);
  const moved = moveOnVisibleSampleGround(
    from,
    {
      x: hidden.x - from.x,
      y: hidden.y - from.y,
    },
    view,
    false,
  );
  assert.ok(sampleDistance(moved, hidden) > 1);
  assert.ok(onVisibleSampleGround(moved, 0, view));
  assert.ok(onViewPaving(sampleViewPoint(moved, view), view));
  assert.ok(visibleSampleRoute(moved, NEIGHBORHOOD_PLACES[0].point, view));
});

void test('angled wall contact keeps sliding along the wall instead of stopping or crossing it', () => {
  const view = 'street-eye';
  let point = sampleViewWorld({ x: 260, y: 690 }, view);
  let slides = 0;
  for (let frame = 0; frame < 35; frame++) {
    const before = sampleViewPoint(point, view);
    const next = moveVisibleSampleInput(point, { x: -1, y: -1 }, 66 / 60, view);
    const after = sampleViewPoint(next, view);
    assert.ok(onVisibleSampleGround(next), 'footprint stays outside the wall');
    const dx = after.x - before.x,
      dy = after.y - before.y;
    assert.ok(-dx - dy >= -1e-4, 'sliding must not send the person backward');
    const travel =
      Math.hypot(dx, dy) /
      ((viewActorScale(point, view) + viewActorScale(next, view)) / 2);
    assert.ok(
      travel <= (66 / 60) * 1.02 + 1e-6,
      'collision cannot increase walking speed',
    );
    if (frame > 5 && travel > 0.1) slides++;
    point = next;
  }
  assert.ok(
    slides > 25,
    'continuous diagonal contact should keep making progress',
  );
});

const curbPresses: {
  view: PaintedView;
  paint: SamplePoint;
  input: SamplePoint;
  along: SamplePoint;
}[] = [
  {
    view: 'neighborhood',
    paint: { x: 1020, y: 467 },
    input: { x: 0, y: 1 },
    along: { x: -1, y: 0 },
  },
  {
    view: 'neighborhood-eye',
    paint: { x: 1190, y: 660 },
    input: { x: 0, y: -1 },
    along: { x: 1, y: 1 },
  },
  {
    view: 'neighborhood-along',
    paint: { x: 1100, y: 300 },
    input: { x: 1, y: 0 },
    along: { x: 0, y: 1 },
  },
];

void test('holding into the bench curb stops without being steered sideways in any camera mode or frame rate', () => {
  for (const { view, paint, input } of curbPresses)
    for (const fps of [20, 60, 120]) {
      let point = sampleViewWorld(paint, view);
      assert.ok(onVisibleSampleGround(point, 0, view));
      const trace = [];
      for (let frame = 0; frame < fps * 3; frame++) {
        const before = sampleViewPoint(point, view);
        point = moveVisibleSampleInput(point, input, 66 / fps, view);
        const after = sampleViewPoint(point, view);
        assert.ok(onVisibleSampleGround(point, 0, view));
        assert.ok(
          Math.abs(
            (after.x - before.x) * input.y - (after.y - before.y) * input.x,
          ) < 1e-5,
          `${view}, ${fps} Hz: do not turn a held key into lateral travel`,
        );
        trace.push(point);
      }
      assert.ok(
        sampleDistance(point, trace[fps * 2]) < 1e-5,
        `${view}, ${fps} Hz: keep still while the same blocked key is held`,
      );
      assert.ok(sampleDistance(sampleViewWorld(paint, view), point) > 1);
      assert.equal(
        moveVisibleSampleInput(point, { x: 0, y: 0 }, 66, view),
        point,
      );
    }
});

void test('the curb intent check follows the turned screen, not the unturned background', () => {
  for (const { view, paint, input } of curbPresses)
    for (const look of [
      { yaw: -18, tilt: -5 },
      { yaw: 18, tilt: -5 },
      { yaw: -18, tilt: 5 },
      { yaw: 18, tilt: 5 },
    ]) {
      let point = sampleViewWorld(paint, view);
      for (let frame = 0; frame < 180; frame++) {
        const before = projectPaintedPoint(
          sampleViewPoint(point, view),
          look,
          0,
          view,
        );
        point = moveVisibleSampleInput(point, input, 66 / 60, view, look);
        const after = projectPaintedPoint(
          sampleViewPoint(point, view),
          look,
          0,
          view,
        );
        assert.ok(onVisibleSampleGround(point, 0, view));
        assert.ok(
          Math.abs(
            (after.x - before.x) * input.y - (after.y - before.y) * input.x,
          ) < 1e-5,
          `${view}, yaw ${look.yaw}, tilt ${look.tilt}: preserve the screen direction`,
        );
      }
      const stopped = point;
      for (let frame = 0; frame < 60; frame++)
        point = moveVisibleSampleInput(point, input, 66 / 60, view, look);
      assert.ok(sampleDistance(point, stopped) < 1e-5);
    }
});

void test('a stopped curb contact still allows intentional along-edge walking and backing away', () => {
  for (const { view, paint, input, along } of curbPresses) {
    let point = sampleViewWorld(paint, view);
    for (let frame = 0; frame < 180; frame++)
      point = moveVisibleSampleInput(point, input, 66 / 60, view);
    const contact = point;
    for (let frame = 0; frame < 10; frame++) {
      point = moveVisibleSampleInput(point, along, 66 / 60, view);
      assert.ok(onVisibleSampleGround(point, 0, view));
    }
    assert.ok(
      sampleDistance(point, contact) > 0.1,
      `${view}: along-edge input can move`,
    );
    point = contact;
    for (let frame = 0; frame < 10; frame++) {
      point = moveVisibleSampleInput(
        point,
        { x: -input.x, y: -input.y },
        66 / 60,
        view,
      );
      assert.ok(onVisibleSampleGround(point, 0, view));
    }
    assert.ok(
      sampleDistance(point, contact) > 0.1,
      `${view}: opposite input backs away`,
    );
  }
});

void test('clicking across open foreground pavement in the leafy road does not detour around an invisible junction seam', () => {
  const view = 'neighborhood-eye';
  const paintFrom = { x: 1350, y: 800 },
    paintTo = { x: 1180, y: 775 };
  const from = sampleViewWorld(paintFrom, view),
    to = sampleViewWorld(paintTo, view);
  const route = visibleSampleRoute(from, to, view);
  assert.ok(route);
  let previous = from,
    length = 0;
  for (const waypoint of route) {
    length += sampleDistance(
      sampleViewPoint(previous, view),
      sampleViewPoint(waypoint, view),
    );
    assert.ok(visibleSampleSegmentClear(previous, waypoint));
    previous = waypoint;
  }
  assert.ok(
    Math.abs(length - sampleDistance(paintFrom, paintTo)) < 1e-6,
    'take the visible direct path',
  );
  for (const fps of [20, 60, 120]) {
    let point = from;
    const remaining = route.slice();
    for (let frame = 0; remaining.length && frame < fps * 10; frame++) {
      const step = advanceVisibleSampleRoute(
        point,
        remaining,
        ART_SAMPLE.walkSpeed / fps,
        view,
      );
      assert.equal(step.blocked, false);
      point = step.point;
      remaining.splice(0, step.used);
      const p = sampleViewPoint(point, view);
      const cross =
        (p.x - paintFrom.x) * (paintTo.y - paintFrom.y) -
        (p.y - paintFrom.y) * (paintTo.x - paintFrom.x);
      assert.ok(
        Math.abs(cross) < 1e-5,
        'each frame stays on the same straight painted line',
      );
    }
    assert.equal(remaining.length, 0, `${fps} Hz: finish without sticking`);
    assert.ok(sampleDistance(point, to) < 1e-6);
  }
});

void test('a frame consumes short turn points without pausing and never consumes a blocked destination', () => {
  const from = ART_SAMPLE.start;
  const path = [
    { x: from.x + 0.1, y: from.y },
    { x: from.x + 0.2, y: from.y + 0.1 },
    { x: from.x + 0.3, y: from.y + 0.2 },
    { x: from.x + 10, y: from.y + 0.2 },
  ];
  const advanced = advanceVisibleSampleRoute(from, path, 3.3, 'street');
  assert.equal(advanced.blocked, false);
  assert.equal(advanced.used, 3);
  assert.ok(
    sampleDistance(advanced.point, from) > 3.1,
    'use the rest of the frame after small corners',
  );
  const wall = sampleViewWorld({ x: 230, y: 520 }, 'street-eye');
  const blocked = advanceVisibleSampleRoute(
    SAMPLE_PLACES[0].point,
    [wall],
    1000,
    'street-eye',
  );
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.used, 0);
  assert.ok(onVisibleSampleGround(blocked.point));
  assert.ok(sampleDistance(blocked.point, wall) > 1);
});

void test('road views turn into the alley at its mouth with hysteresis before the painted wall hides the route', () => {
  const mouth = { x: 1110, y: 385 };
  assert.equal(sampleNavigableScene('street', mouth, 'eye'), 'alley');
  assert.equal(
    sampleNavigableScene('alley', { x: 1118, y: 430 }, 'eye'),
    'alley',
  );
  assert.equal(
    sampleNavigableScene('alley', { x: 1118, y: 437 }, 'eye'),
    'street',
  );
});

void test('fresh direction presses after exiting do not send the camera back into the alley', () => {
  let point: SamplePoint = { ...SAMPLE_ALLEY.inside },
    scene: SampleScene = 'alley',
    cut = beginViewCut('alley'),
    exits = 0;
  for (let frame = 0; frame < 250; frame++) {
    if (!cut.changing)
      point = moveVisibleSampleInput(point, { x: 0, y: 1 }, 2, cut.shown);
    scene = sampleNavigableScene(scene, point, 'eye');
    const oldView = cut.shown;
    cut = stepViewCut(cut, sampleNavigableView(scene, point, 'eye'), 0.05);
    if (oldView === 'alley' && cut.shown === 'street-eye') exits++;
    if (exits)
      assert.equal(
        cut.shown,
        'street-eye',
        'a fresh key must not recross the exit',
      );
    assert.ok(onViewPaving(sampleViewPoint(point, cut.shown), cut.shown));
  }
  assert.equal(exits, 1);
});

void test('a held manual exit changes paintings before feet leave the alley ground at different frame rates', () => {
  for (const mode of ['eye', 'along'] as const)
    for (const fps of [20, 60, 120]) {
      let point: SamplePoint = { ...SAMPLE_ALLEY.inside },
        scene: SampleScene = 'alley',
        cut = beginViewCut('alley'),
        returned = false;
      for (let frame = 0; frame < fps * 20; frame++) {
        if (!cut.changing)
          point = moveVisibleSampleInput(
            point,
            { x: 0, y: 1 },
            ART_SAMPLE.walkSpeed / fps,
            cut.shown,
            { yaw: 0, tilt: 0 },
            'alley',
          );
        scene = sampleNavigableScene(scene, point, mode);
        cut = stepViewCut(
          cut,
          sampleNavigableView(scene, point, mode),
          1 / fps,
        );
        if (cut.shown === 'alley')
          assert.ok(
            onViewPaving(sampleViewPoint(point, cut.shown), cut.shown),
            `${mode}/${fps}: do not step outside the old painting before its cut`,
          );
        if (!cut.changing && cut.shown === `street-${mode}`) {
          assert.ok(onViewPaving(sampleViewPoint(point, cut.shown), cut.shown));
          returned = true;
          break;
        }
      }
      assert.ok(returned, `${mode}/${fps}: recover the selected road view`);
    }
});

void test('a road-mode request at a hidden alley position uses its actual paving without relocating the person', () => {
  const point = sampleAlleyWorld({ x: 950, y: 275 });
  assert.ok(onVisibleSampleGround(point));
  const original = { ...point };
  for (const mode of ['eye', 'along'] as const) {
    for (const scene of ['street', 'alley', 'neighborhood'] as const) {
      const view = sampleNavigableView(scene, point, mode);
      assert.ok(onViewPaving(sampleViewPoint(point, view), view));
      assert.deepEqual(point, original);
    }
  }
});

void test('visible sidewalks beside the cafe and leafy curb are clickable beyond the old overview boundary', () => {
  for (const [view, paint] of [
    ['street-eye', { x: 600, y: 520 }],
    ['street-eye', { x: 805, y: 450 }],
    ['neighborhood-eye', { x: 450, y: 600 }],
    ['neighborhood-eye', { x: 500, y: 580 }],
  ] as const) {
    const point = sampleViewWorld(paint, view);
    assert.equal(
      onViewPaving(sampleViewPoint(point, viewArea(view)), viewArea(view)),
      false,
      'old outline clips this sidewalk',
    );
    assert.ok(onVisibleSampleGround(point, 0, view), view);
    assert.ok(sampleDistance(sampleClickTarget(paint, view)!, point) < 1e-6);
    for (const mode of ['eye', 'along'] as const) {
      const selected = viewForArea(viewArea(view), mode);
      assert.ok(onViewPaving(sampleViewPoint(point, selected), selected));
    }
    const selected = sampleNavigableView(viewArea(view), point, 'overview');
    assert.equal(viewArea(selected), viewArea(view));
    assert.ok(onViewPaving(sampleViewPoint(point, selected), selected));
  }
  for (const [view, obstacle] of [
    ['street-eye', { x: 740, y: 408 }],
    ['street-eye', { x: 828, y: 397 }],
    ['neighborhood-eye', { x: 160, y: 605 }],
    ['neighborhood-eye', { x: 550, y: 471 }],
    ['neighborhood-eye', { x: 1390, y: 518 }],
  ] as const)
    assert.equal(sampleClickTarget(obstacle, view), null, 'props stay solid');
});

void test('extended sidewalk routes reach both doorsteps and allow returning through the alley at different frame rates', () => {
  for (const [view, paint, destinations] of [
    ['street-eye', { x: 805, y: 450 }, SAMPLE_PLACES.map((p) => p.point)],
    [
      'neighborhood-eye',
      { x: 450, y: 600 },
      [
        NEIGHBORHOOD_PLACES[0].point,
        NEIGHBORHOOD_PLACES[1].point,
        ART_SAMPLE.start,
      ],
    ],
  ] as const)
    for (const destination of destinations)
      for (const fps of [20, 60, 120]) {
        let point = sampleViewWorld(paint, view),
          scene = viewArea(view),
          cut = beginViewCut(view);
        const route = visibleSampleRoute(point, destination, view);
        assert.ok(route, `${view}: route from curb to doorstep or main road`);
        for (let frame = 0; route.length && frame < fps * 60; frame++) {
          if (!cut.changing) {
            const step = advanceVisibleSampleRoute(
              point,
              route,
              ART_SAMPLE.walkSpeed / fps,
              cut.shown,
            );
            assert.equal(
              step.blocked,
              false,
              'no hidden curb or disconnected approach',
            );
            point = step.point;
            route.splice(0, step.used);
          }
          scene = sampleNavigableScene(scene, point, 'eye');
          cut = stepViewCut(
            cut,
            sampleNavigableView(scene, point, 'eye'),
            1 / fps,
          );
          assert.ok(
            onViewPaving(sampleViewPoint(point, cut.shown), cut.shown),
            'feet stay visible',
          );
        }
        assert.equal(
          route.length,
          0,
          `${view}/${fps}: reach the requested place`,
        );
        assert.ok(sampleDistance(point, destination) < 1e-6);
      }
});

void test('manual walking follows the leafy curb and reaches the cafe doorstep without freezing at the old boundary', () => {
  for (const fps of [20, 60, 120]) {
    for (const [view, from, to] of [
      ['neighborhood-eye', { x: 450, y: 650 }, { x: 450, y: 600 }],
      ['neighborhood-eye', { x: 450, y: 600 }, { x: 600, y: 507 }],
      ['street-eye', { x: 805, y: 450 }, { x: 810, y: 431 }],
    ] as const) {
      const input = { x: to.x - from.x, y: to.y - from.y };
      let point = sampleViewWorld(from, view),
        arrived = false;
      for (let frame = 0; frame < fps * 10; frame++) {
        const before = sampleViewPoint(point, view);
        if (sampleDistance(before, to) < 2) {
          arrived = true;
          break;
        }
        const next = moveVisibleSampleInput(
          point,
          input,
          ART_SAMPLE.walkSpeed / fps,
          view,
        );
        const after = sampleViewPoint(next, view);
        assert.ok(
          sampleDistance(after, before) > 1e-6,
          `${view}/${fps}: open sidewalk must keep moving at ${JSON.stringify(before)} toward ${JSON.stringify(to)}`,
        );
        assert.ok(onVisibleSampleGround(next, 0, view));
        const distance =
          sampleDistance(before, after) /
          ((viewActorScale(point, view) + viewActorScale(next, view)) / 2);
        assert.ok(
          distance <= (ART_SAMPLE.walkSpeed / fps) * 1.02 + 1e-6,
          'no jump at a compressed triangle',
        );
        point = next;
      }
      assert.ok(arrived, `${view}/${fps}: manually reach the visible approach`);
    }
  }
});

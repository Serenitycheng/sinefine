import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CITY_ART_SCENES,
  type CityArtScene,
} from '../lib/fate-city-art-scenes';
import { CITY_ART_MODES, type CityArtMode } from '../lib/fate-city-art-camera';
import { CITY_ART_PORTALS } from '../lib/fate-city-art-portals';
import { projectOnSegment, type CityPoint } from '../lib/fate-city-layout';
import { cityPilotPaint } from '../lib/fate-city-art';
import {
  advanceCityPilotInput,
  cityPilotInputCrossing,
  cityPilotWalkable,
} from '../lib/fate-city-art-navigation';

const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const screenDirection = (
  from: CityPoint,
  toward: CityPoint,
  mode: CityArtMode,
  scene: CityArtScene,
) => {
  const length = gap(from, toward);
  const a = cityPilotPaint(from, mode, scene),
    b = cityPilotPaint(
      {
        x: from.x + (toward.x - from.x) / length,
        y: from.y + (toward.y - from.y) / length,
      },
      mode,
      scene,
    );
  return { x: b.x - a.x, y: b.y - a.y };
};

void test('walking back out of either private driveway crosses even when its own painted floor has already clipped a frame', () => {
  for (const [scene, parent] of [
    ['tohsaka-approach', 'temple-path'],
    ['matou-approach', 'estate-lane'],
  ] as const)
    for (const mode of CITY_ART_MODES) {
      const start = CITY_ART_SCENES[scene].start,
        inside = CITY_ART_SCENES[scene].points[1],
        outside = { x: start.x * 2 - inside.x, y: start.y * 2 - inside.y },
        input = screenDirection(start, outside, mode, scene);
      const blocked = advanceCityPilotInput(start, input, 100, mode, scene);
      const foot = { ...blocked.point };
      // Repeat after motion is clipped, the frame in which the old crossing
      // detector had no actual displacement left from which to derive intent.
      const stopped = advanceCityPilotInput(foot, input, 1, mode, scene);
      assert.ok(gap(stopped.point, foot) < 1e-6);
      const exit = cityPilotInputCrossing(foot, input, mode, scene);
      assert.equal(exit?.scene, parent, `${scene}/${mode}`);
      assert.ok(cityPilotWalkable(foot, 1, scene));
      assert.ok(cityPilotWalkable(foot, 1, parent));
      assert.deepEqual(
        blocked.point,
        foot,
        'detecting an exit must never relocate the actor',
      );
      assert.equal(
        cityPilotInputCrossing(foot, { x: 0, y: 0 }, mode, scene),
        null,
      );
      assert.equal(
        cityPilotInputCrossing(foot, input, mode, scene, parent),
        null,
      );
    }
});

void test('every real street junction supports directional crossing in both directions and all three views', () => {
  for (const portal of CITY_ART_PORTALS)
    for (const [scene, destination] of [
      [portal.a, portal.b],
      [portal.b, portal.a],
    ] as const)
      for (const mode of CITY_ART_MODES) {
        const points = CITY_ART_SCENES[destination].points;
        const outgoing = points
          .slice(1)
          .flatMap((b, i) =>
            gap(projectOnSegment(portal.point, points[i], b), portal.point) <
            1e-5
              ? [points[i], b].filter((p) => gap(portal.point, p) > 1e-5)
              : [],
          );
        assert.ok(
          outgoing.some(
            (toward) =>
              cityPilotInputCrossing(
                portal.point,
                screenDirection(portal.point, toward, mode, scene),
                mode,
                scene,
              )?.scene === destination,
          ),
          `${portal.id}: ${scene} to ${destination}, ${mode}`,
        );
      }
});

void test('real keyboard sectors can walk across every shared junction in both directions and resume on the incoming road', () => {
  const inputs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];
  for (const portal of CITY_ART_PORTALS)
    for (const [scene, destination] of [
      [portal.a, portal.b],
      [portal.b, portal.a],
    ] as const)
      for (const mode of CITY_ART_MODES) {
        const feet = [portal.point];
        for (const radius of [5, 10, 20, 30, 40])
          for (let angle = 0; angle < 16; angle++)
            feet.push({
              x: portal.point.x + Math.cos((angle * Math.PI) / 8) * radius,
              y: portal.point.y + Math.sin((angle * Math.PI) / 8) * radius,
            });
        const crossing = feet.some((foot) => {
          if (
            !cityPilotWalkable(foot, 1, scene) ||
            !cityPilotWalkable(foot, 1, destination)
          )
            return false;
          return inputs.some((input) => {
            const step = advanceCityPilotInput(foot, input, 1, mode, scene);
            const exit = cityPilotInputCrossing(step.point, input, mode, scene);
            if (exit?.scene !== destination) return false;
            const paint = cityPilotPaint(step.point, mode, destination);
            const forward = cityPilotPaint(
              {
                x: step.point.x + exit.direction.x,
                y: step.point.y + exit.direction.y,
              },
              mode,
              destination,
            );
            const continued = advanceCityPilotInput(
              step.point,
              {
                x: forward.x - paint.x,
                y: forward.y - paint.y,
              },
              1,
              mode,
              destination,
            );
            return continued.spent > 1e-6;
          });
        });
        assert.ok(
          crossing,
          `${portal.id}: ${scene} → ${destination}/${mode}: actual keys, overlap, and continued motion`,
        );
      }
});

void test('a bridge exit accepts the actual road width instead of requiring everyone to touch a twelve-unit center dot', () => {
  const scene = 'fuyuki-bridge',
    foot = { x: 1770, y: 932 };
  assert.ok(gap(foot, { x: 1770, y: 907 }) > 12);
  for (const mode of CITY_ART_MODES) {
    const input = screenDirection(
      foot,
      { x: foot.x + 1, y: foot.y },
      mode,
      scene,
    );
    assert.equal(
      cityPilotInputCrossing(foot, input, mode, scene)?.scene,
      'bridge-east',
    );
  }
});

void test('passing a junction on the current road stays on it and a wall without an exit still blocks movement', () => {
  const foot = { x: 890.5, y: 495 };
  for (const mode of CITY_ART_MODES) {
    const input = screenDirection(
      foot,
      { x: 1060, y: 585 },
      mode,
      'residential',
    );
    assert.equal(
      cityPilotInputCrossing(foot, input, mode, 'residential'),
      null,
    );
    const scene = 'tohsaka-approach',
      inside = CITY_ART_SCENES[scene].points.at(-2)!,
      door = CITY_ART_SCENES[scene].points.at(-1)!,
      outward = screenDirection(
        door,
        { x: door.x * 2 - inside.x, y: door.y * 2 - inside.y },
        mode,
        scene,
      );
    const blocked = advanceCityPilotInput(door, outward, 100, mode, scene);
    const stopped = advanceCityPilotInput(
      blocked.point,
      outward,
      100,
      mode,
      scene,
    );
    assert.ok(
      gap(blocked.point, stopped.point) < 1e-6,
      'repeated input at a wall must remain stopped',
    );
    assert.ok(cityPilotWalkable(blocked.point, 1, scene));
    assert.equal(
      cityPilotInputCrossing(blocked.point, outward, mode, scene),
      null,
    );
  }
});

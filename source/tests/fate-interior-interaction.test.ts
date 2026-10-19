import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  interiorCrossedDoor,
  interiorDoorGuard,
  interiorInteractionHint,
  nearestInteriorSpot,
} from '../lib/fate-interior-interaction';
import { EINZBERN_ROOMS } from '../lib/fate-einzbern-house';
import {
  interiorClearSegment,
  interiorMove,
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import { interiorUnproject } from '../lib/fate-city-interior-scenes';

void test('nearby action avoids the whole standing or seated body on desktop and phone', () => {
  for (const size of [
    { width: 1280, height: 502 },
    { width: 390, height: 530 },
  ]) {
    for (const body of [
      { x: size.width / 2 - 50, y: 200, width: 100, height: 190 },
      { x: size.width - 140, y: 300, width: 115, height: 190 },
    ]) {
      const hint = interiorInteractionHint(body, size),
        width = Math.min(250, size.width - 24);
      assert.ok(hint.x - width / 2 >= 0 && hint.x + width / 2 <= size.width);
      assert.ok(hint.y - 22 >= 0 && hint.y + 22 <= size.height);
      assert.ok(
        hint.x + width / 2 <= body.x ||
          hint.x - width / 2 >= body.x + body.width ||
          hint.y + 22 <= body.y ||
          hint.y - 22 >= body.y + body.height,
      );
    }
  }
});

void test('walk through the Illya doorway without E; arrival cannot bounce back', () => {
  const hall = EINZBERN_ROOMS.hall;
  const door = hall.doors.find((d) => d.to === 'illya')!;
  const before = { x: door.point.x, y: door.point.y + 90 };
  const guard = interiorDoorGuard(before, hall.doors);
  assert.equal(interiorCrossedDoor(before, before, hall.doors, guard), null);
  assert.equal(
    interiorCrossedDoor(
      before,
      { ...door.point, y: door.point.y + 40 },
      hall.doors,
      guard,
    ),
    null,
  );
  assert.equal(
    interiorCrossedDoor(before, door.point, hall.doors, guard)?.id,
    'illya',
  );
  const room = EINZBERN_ROOMS.illya,
    back = room.doors[0];
  const arrivalGuard = interiorDoorGuard(door.arrival, room.doors);
  assert.equal(
    interiorCrossedDoor(door.arrival, back.point, room.doors, arrivalGuard),
    null,
  );
  const away = { ...back.point, y: back.point.y + 110 };
  assert.equal(
    interiorCrossedDoor(door.arrival, away, room.doors, arrivalGuard),
    null,
  );
  assert.equal(
    interiorCrossedDoor(away, back.point, room.doors, arrivalGuard)?.id,
    'hall',
  );
});

void test('a passage requires approaching its opening, not passing beside it or walking away', () => {
  const door = EINZBERN_ROOMS.illya.doors[0];
  const guards = () => new Set<string>();
  assert.equal(
    interiorCrossedDoor(
      { x: door.point.x + 45, y: door.point.y + 100 },
      { x: door.point.x + 45, y: door.point.y - 100 },
      [door],
      guards(),
    ),
    null,
  );
  assert.equal(
    interiorCrossedDoor(
      door.point,
      { ...door.point, y: door.point.y + 100 },
      [door],
      guards(),
    ),
    null,
  );
  assert.equal(
    interiorCrossedDoor(
      { ...door.point, y: door.point.y + 100 },
      { ...door.point, y: door.point.y - 60 },
      [door],
      guards(),
    ),
    door,
  );
});

void test('interactions become available only beside the safe approach', () => {
  const scene = EINZBERN_ROOMS.illya.scene,
    read = scene.spots.find((s) => s.id === 'read')!;
  assert.equal(nearestInteriorSpot({ x: 500, y: 600 }, scene), null);
  assert.equal(nearestInteriorSpot(read.point, scene)?.id, 'read');
  assert.equal(
    nearestInteriorSpot({ ...read.point, x: read.point.x - 63 }, scene)?.id,
    'read',
  );
  assert.equal(
    nearestInteriorSpot({ ...read.point, x: read.point.x - 65 }, scene),
    null,
  );
  assert.ok(read.target && read.target.x > 1100 && read.target.y < 410);
  assert.ok(
    interiorRoute(
      EINZBERN_ROOMS.hall.doors.find((d) => d.to === 'illya')!.arrival,
      read.point,
      scene,
    ),
  );
});

void test('Illya chair leaves open floor beside it and between the furniture ground outlines', () => {
  const scene = EINZBERN_ROOMS.illya.scene;
  const p = (x: number, y: number) =>
    interiorUnproject({ x: x * 16, y: y * 9 }, scene.floor)!;
  assert.ok(
    interiorWalkable(p(64, 58), scene),
    'floor to the left of the chair',
  );
  assert.ok(interiorWalkable(p(75, 70), scene), 'floor in front of the chair');
  assert.equal(interiorWalkable(p(71, 56), scene), false, 'chair ground');
  assert.equal(interiorWalkable(p(85, 58), scene), false, 'desk support');
  assert.equal(interiorWalkable(p(94, 78), scene), false, 'sideboard');
  assert.ok(interiorClearSegment(p(61, 55), p(61, 77), scene));
  assert.equal(interiorClearSegment(p(61, 56), p(80, 56), scene), false);
  const stopped = interiorMove(p(61, 56), { x: 450, y: 0 }, scene);
  assert.ok(interiorWalkable(stopped, scene));
  assert.ok(stopped.x < p(71, 56).x);
  const chair = scene.furniture.find((f) => f.id === 'desk-chair')!;
  assert.ok(chair.silhouettes && chair.silhouettes.length > 6);
  // The previous joined mask covered this empty wall/floor column and erased
  // a straight slice of a standing body beside the chair.
  const contains = (
    x: number,
    y: number,
    poly: readonly { x: number; y: number }[],
  ) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  };
  for (const [x, y] of [
    [65.6, 40],
    [67.5, 54.5],
    [72, 55.5],
  ])
    assert.equal(
      chair.silhouettes!.some((poly) => contains(x * 16, y * 9, poly)),
      false,
      `${x},${y} stays transparent`,
    );
});

void test('polygon collision checks a complete swept segment and keeps a diagonal opening usable', () => {
  const scene = {
    ...EINZBERN_ROOMS.illya.scene,
    furniture: [
      {
        id: 'angled',
        footprint: { x: 300, y: 200, width: 200, height: 200 },
        collision: [
          { x: 300, y: 200 },
          { x: 500, y: 200 },
          { x: 500, y: 400 },
        ],
      },
    ],
  };
  assert.ok(interiorWalkable({ x: 320, y: 370 }, scene));
  assert.equal(interiorWalkable({ x: 480, y: 230 }, scene), false);
  assert.equal(
    interiorClearSegment({ x: 200, y: 300 }, { x: 600, y: 300 }, scene),
    false,
  );
  const path = interiorRoute({ x: 200, y: 300 }, { x: 600, y: 300 }, scene)!;
  assert.ok(path.length > 1);
  let previous = { x: 200, y: 300 };
  for (const next of path) {
    assert.ok(interiorClearSegment(previous, next, scene));
    previous = next;
  }
});

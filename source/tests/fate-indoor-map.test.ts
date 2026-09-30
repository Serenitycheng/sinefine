import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INDOOR_ENTRY,
  indoorRoom,
  indoorRoute,
  isIndoorWalkable,
  nearHomeEntrance,
  nearIndoorDoor,
  nearestIndoorPoint,
  stepIndoor,
} from '../lib/fate-indoor-map';
import { FATE_HOMES } from '../lib/fate-housing';
import { createDailyLife, parseDailyLife } from '../lib/fate-life';
import type { Point } from '../lib/street';

function follow(from: Point, destination: Point): Point {
  let position = from;
  for (const waypoint of indoorRoute(position, destination)) {
    for (let frame = 0; frame < 300; frame++) {
      const distance = Math.hypot(
        waypoint.x - position.x,
        waypoint.y - position.y,
      );
      if (distance < 1) break;
      position = stepIndoor(
        position,
        {
          x: (waypoint.x - position.x) / Math.max(distance, 5.2),
          y: (waypoint.y - position.y) / Math.max(distance, 5.2),
        },
        0.05,
      );
      assert.ok(isIndoorWalkable(position), 'route must stay on the floor');
    }
    assert.ok(
      Math.hypot(waypoint.x - position.x, waypoint.y - position.y) < 1,
      'each corridor waypoint must be reachable',
    );
  }
  return position;
}

void test('a character can cross the corridor between all four rooms and return to the door', () => {
  const rooms: Point[] = [
    { x: 170, y: 165 },
    { x: 550, y: 165 },
    { x: 170, y: 350 },
    { x: 550, y: 350 },
  ];
  let position = INDOOR_ENTRY;
  for (const room of [...rooms, INDOOR_ENTRY]) {
    position = follow(position, room);
    assert.ok(Math.hypot(position.x - room.x, position.y - room.y) < 1);
  }
  assert.ok(nearIndoorDoor(position));
  assert.deepEqual(rooms.map(indoorRoom), ['lounge', 'table', 'study', 'rest']);
});

void test('indoor movement is bounded and a floor click outside the building snaps to the floor', () => {
  assert.deepEqual(stepIndoor({ x: 360, y: 430 }, { x: 0, y: 1 }, 1), {
    x: 360,
    y: 430,
  });
  assert.ok(isIndoorWalkable(nearestIndoorPoint({ x: -500, y: 999 })));
  assert.ok(!isIndoorWalkable({ x: 4, y: 200 }));
});

void test('all ten homes restore the same indoor room and coordinate without changing outdoor position', () => {
  for (const [home, door] of Object.entries(FATE_HOMES)) {
    assert.ok(nearHomeEntrance(door, home as keyof typeof FATE_HOMES));
    assert.ok(
      !nearHomeEntrance(
        { x: door.x + 76, y: door.y },
        home as keyof typeof FATE_HOMES,
      ),
    );
    const life = createDailyLife();
    life.positions.shirou = { x: door.x, y: door.y };
    life.indoor = {
      actor: 'shirou',
      home: home as keyof typeof FATE_HOMES,
      x: 550,
      y: 350,
    };
    const restored = parseDailyLife(JSON.parse(JSON.stringify(life)));
    assert.deepEqual(restored.indoor, life.indoor, home);
    assert.deepEqual(restored.positions.shirou, life.positions.shirou, home);
    delete life.indoor;
    assert.equal(parseDailyLife(life).indoor, undefined, home);
  }
});

void test('invalid indoor saves cannot place a character beyond their entry door or inside a wall', () => {
  const life = createDailyLife();
  life.indoor = { actor: 'shirou', home: 'emiya', ...INDOOR_ENTRY };
  assert.throws(() => parseDailyLife(life), /室内位置无效/);
  life.positions.shirou = {
    x: FATE_HOMES.emiya.x,
    y: FATE_HOMES.emiya.y,
  };
  life.indoor = { actor: 'shirou', home: 'emiya', x: 0, y: 0 };
  assert.throws(() => parseDailyLife(life), /室内位置无效/);
});

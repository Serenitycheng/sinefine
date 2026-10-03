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
import {
  roomPoint,
  HOME_ROOMS,
  type RoomZone,
} from '../lib/fate-indoor-layout';

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
    { x: 234, y: 182 },
    { x: 615, y: 182 },
    { x: 235, y: 379 },
    { x: 618, y: 387 },
  ];
  let position = INDOOR_ENTRY;
  for (const room of [...rooms, INDOOR_ENTRY]) {
    position = follow(position, room);
    assert.ok(Math.hypot(position.x - room.x, position.y - room.y) < 1);
  }
  assert.ok(nearIndoorDoor(position));
  assert.deepEqual(
    rooms.map((point) => indoorRoom(point)),
    ['lounge', 'table', 'study', 'rest'],
  );
});

void test('indoor movement is bounded and a floor click outside the building snaps to the floor', () => {
  assert.deepEqual(stepIndoor({ x: 360, y: 430 }, { x: 0, y: 1 }, 1), {
    x: 360,
    y: 430,
  });
  assert.ok(isIndoorWalkable(nearestIndoorPoint({ x: -500, y: 999 })));
  assert.ok(!isIndoorWalkable({ x: 4, y: 200 }));
  assert.ok(
    !isIndoorWalkable({ x: 160, y: 152 }),
    'the coffee table blocks walking',
  );
  assert.ok(isIndoorWalkable(nearestIndoorPoint({ x: 160, y: 152 })));
  const approaching = stepIndoor({ x: 219, y: 155 }, { x: -1, y: 0 }, 0.05);
  const stopped = stepIndoor(approaching, { x: -1, y: 0 }, 0.05);
  assert.equal(stopped.x, approaching.x, 'movement stops at furniture');
});

void test('an indoor save from before furniture collisions moves only its indoor footpoint to nearby free floor', () => {
  const life = createDailyLife();
  life.positions.shirou = { x: FATE_HOMES.emiya.x, y: FATE_HOMES.emiya.y };
  life.indoor = { actor: 'shirou', home: 'emiya', x: 160, y: 152 };
  const restored = parseDailyLife(life);
  assert.equal(restored.indoor?.home, 'emiya');
  assert.ok(isIndoorWalkable(restored.indoor!));
  assert.deepEqual(restored.positions.shirou, life.positions.shirou);
});

void test('all ten homes migrate legacy positions into their distinct room layout without changing outdoor position', () => {
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
      x: 235,
      y: 379,
    };
    const restored = parseDailyLife(JSON.parse(JSON.stringify(life)));
    assert.equal(restored.indoor?.layout, 2, home);
    assert.equal(
      indoorRoom(restored.indoor!, home as keyof typeof FATE_HOMES),
      'study',
      home,
    );
    assert.ok(
      isIndoorWalkable(restored.indoor!, home as keyof typeof FATE_HOMES),
      home,
    );
    assert.deepEqual(restored.positions.shirou, life.positions.shirou, home);
    delete life.indoor;
    assert.equal(parseDailyLife(life).indoor, undefined, home);
  }
});

void test('all ten home layouts keep four rooms accessible and preserve current save coordinates', () => {
  const arrangements = new Set<string>();
  for (const [home, door] of Object.entries(FATE_HOMES)) {
    const homeId = home as keyof typeof FATE_HOMES;
    arrangements.add(HOME_ROOMS[homeId].join(','));
    const life = createDailyLife();
    life.positions.shirou = { x: door.x, y: door.y };
    for (const [zone, canonical] of Object.entries({
      lounge: { x: 238, y: 186 },
      table: { x: 620, y: 190 },
      study: { x: 240, y: 390 },
      rest: { x: 565, y: 395 },
    }) as Array<[RoomZone, Point]>) {
      const destination = roomPoint(homeId, zone, canonical);
      assert.equal(indoorRoom(destination, homeId), zone);
      assert.ok(isIndoorWalkable(destination, homeId));
      assert.ok(indoorRoute(INDOOR_ENTRY, destination, homeId).length > 0);
      life.indoor = {
        actor: 'shirou',
        home: homeId,
        ...destination,
        layout: 2,
      };
      assert.deepEqual(parseDailyLife(life).indoor, life.indoor);
    }
  }
  assert.equal(arrangements.size, 10);
});

void test('invalid indoor saves cannot place a character beyond their entry door or inside a wall', () => {
  const life = createDailyLife();
  life.indoor = { actor: 'shirou', home: 'emiya', ...INDOOR_ENTRY };
  life.positions.shirou = { x: 890.5, y: 907.5 };
  assert.throws(() => parseDailyLife(life), /室内位置无效/);
  life.positions.shirou = {
    x: FATE_HOMES.emiya.x,
    y: FATE_HOMES.emiya.y,
  };
  life.indoor = { actor: 'shirou', home: 'emiya', x: 0, y: 0 };
  assert.throws(() => parseDailyLife(life), /室内位置无效/);
});

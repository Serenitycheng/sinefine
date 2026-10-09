import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EMIYA_LIFE_SPRITES,
  SHIROU_WALK_SPRITES,
  emiyaActivityPose,
  emiyaActorContact,
  emiyaHasPaperWindow,
} from '../lib/fate-emiya-actions';
import {
  EMIYA_ACTIVITIES,
  EMIYA_DOORS,
  EMIYA_ENTRY,
  EMIYA_RESIDENT_ROUTINE,
  EMIYA_ROOMS,
  EMIYA_ROOM_IDS,
  emiyaAdvanceRoute,
  emiyaHouseRoute,
  emiyaScreenDirection,
  emiyaDoorReached,
  type EmiyaLocation,
} from '../lib/fate-emiya-house';
import { HOME_ROOMS } from '../lib/fate-indoor-layout';
import {
  interiorClearSegment,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import { interiorProject } from '../lib/fate-city-interior-scenes';

void test('the Emiya sample retains four formal room identities and adds connected circulation space', () => {
  assert.deepEqual(
    EMIYA_ROOM_IDS.filter((id) => EMIYA_ROOMS[id].zone),
    [...HOME_ROOMS.emiya],
  );
  assert.equal(EMIYA_ENTRY.room, 'forecourt');
  assert.equal(EMIYA_ROOM_IDS.length, 7);
  assert.equal(
    EMIYA_ROOMS.lounge.scene.painting,
    '/fate/interior-art/emiya-main-soft-v1.png',
  );
});

void test('every door has a reverse threshold and collision-safe arrival away from its trigger', () => {
  assert.equal(EMIYA_DOORS.length, 16);
  for (const door of EMIYA_DOORS) {
    const reverse = EMIYA_DOORS.find(
      (d) => d.from === door.to && d.to === door.from,
    )!;
    assert.ok(reverse, door.id);
    assert.ok(interiorWalkable(door.at, EMIYA_ROOMS[door.from].scene), door.id);
    assert.ok(
      interiorWalkable(door.arrival, EMIYA_ROOMS[door.to].scene),
      `${door.id} arrival`,
    );
    assert.ok(
      Math.hypot(door.arrival.x - reverse.at.x, door.arrival.y - reverse.at.y) >
        40,
    );
  }
});

void test('the street gate leads through the front courtyard and genkan before every indoor room', () => {
  assert.notEqual(EMIYA_ENTRY.room, 'garden');
  for (const room of EMIYA_ROOM_IDS.filter((id) => id !== 'forecourt')) {
    const target = emiyaRoomDoorsForTest(room);
    const route = emiyaHouseRoute(EMIYA_ENTRY, target)!;
    assert.equal(route[0].room, 'forecourt');
    assert.equal(route[0].door?.to, 'hall');
    const reverse = emiyaHouseRoute(target, EMIYA_ENTRY)!;
    assert.equal(reverse.at(-1)?.room, 'forecourt');
  }
});

const emiyaRoomDoorsForTest = (room: EmiyaLocation['room']): EmiyaLocation => ({
  room,
  point: EMIYA_DOORS.find((door) => door.to === room)!.arrival,
});

void test('a paused resident is routed around from the real near-contact failure point without blocking the exit', () => {
  const resident: EmiyaLocation = {
    room: 'garden',
    point: { x: 158.234, y: 433.971 },
  };
  let location: EmiyaLocation = {
    room: 'garden',
    point: { x: 184.801, y: 416.386 },
  };
  let legs = emiyaHouseRoute(location, EMIYA_ENTRY, resident)!;
  assert.ok(legs);
  for (let i = 0; legs.length && i < 300; i++) {
    const next = emiyaAdvanceRoute(location, legs, 40, resident);
    assert.equal(next.blocked, false);
    location = next.location;
    legs = next.legs;
    if (location.room === resident.room)
      assert.ok(
        Math.hypot(
          location.point.x - resident.point.x,
          location.point.y - resident.point.y,
        ) >= 30,
      );
  }
  assert.equal(legs.length, 0);
  assert.deepEqual(location, EMIYA_ENTRY);
});

void test('route shortcuts continuously avoid a resident rather than cutting between grid samples', () => {
  const scene = EMIYA_ROOMS.garden.scene,
    person = { x: 500, y: 480 };
  assert.equal(
    interiorClearSegment({ x: 450, y: 480 }, { x: 550, y: 480 }, scene, [
      person,
    ]),
    false,
  );
  assert.equal(
    interiorClearSegment({ x: 450, y: 515 }, { x: 550, y: 515 }, scene, [
      person,
    ]),
    true,
  );
});

void test('a resident blocking one garden doorway leaves the other connected doorway usable', () => {
  const threshold = EMIYA_DOORS.find(
    (door) => door.from === 'garden' && door.to === 'hall',
  )!;
  const route = emiyaHouseRoute(
    { room: 'garden', point: { x: 500, y: 560 } },
    EMIYA_ENTRY,
    { room: 'garden', point: threshold.at },
  );
  assert.ok(route);
  assert.equal(route[0].door?.to, 'lounge');
  assert.equal(route.at(-1)?.room, 'forecourt');
});

void test('life poses use complete transparent sprite regions without crossing a neighbouring figure', () => {
  for (const sheet of [EMIYA_LIFE_SPRITES, SHIROU_WALK_SPRITES]) {
    const png = readFileSync(resolve('public', sheet.path.slice(1)));
    assert.equal(png.readUInt32BE(16), sheet.width);
    assert.equal(png.readUInt32BE(20), sheet.height);
    assert.equal(png[25], 6, 'Sprite PNG must retain its RGBA channel');
    for (const frame of Object.values(sheet.frames).flat()) {
      assert.ok(frame.x >= 0 && frame.y >= 0);
      assert.ok(frame.x + frame.width <= sheet.width);
      assert.ok(frame.y + frame.height <= sheet.height);
      assert.ok(frame.bounds.x > 0 && frame.bounds.width > 30);
      assert.ok(frame.bounds.y >= 0 && frame.bounds.height > 30);
      assert.ok(frame.bounds.x + frame.bounds.width < frame.width);
      assert.ok(frame.bounds.y + frame.bounds.height < frame.height);
      assert.ok(frame.anchorX >= frame.bounds.x && frame.anchorX < frame.width);
      assert.ok(
        frame.anchorY >= frame.bounds.y && frame.anchorY < frame.height,
      );
    }
  }
});

void test('sleeping and sitting use furniture contacts while cancelling restores the unchanged floor approach', () => {
  for (const id of ['rest', 'garden']) {
    const activity = EMIYA_ACTIVITIES.find((activity) => activity.id === id)!;
    const location = { room: activity.room, point: { ...activity.point } };
    const before = JSON.stringify(location);
    const contact = emiyaActorContact(location, { id, seconds: 1 });
    const piece = EMIYA_ROOMS[activity.room].pieces.find(
      (piece) => piece.id === activity.piece,
    )!;
    assert.ok(
      contact.point.x > piece.footprint.x &&
        contact.point.x < piece.footprint.x + piece.footprint.width,
    );
    assert.ok(
      contact.point.y > piece.footprint.y &&
        contact.point.y < piece.footprint.y + piece.footprint.height,
    );
    assert.equal(contact.elevation, piece.height);
    assert.equal(JSON.stringify(location), before);
    assert.deepEqual(emiyaActorContact(location, null), {
      point: location.point,
      elevation: 0,
    });
    assert.ok(
      interiorWalkable(location.point, EMIYA_ROOMS[location.room].scene),
    );
    assert.ok(emiyaHouseRoute(location, EMIYA_ENTRY));
  }
});

void test('each life activity selects its own pose and only complete animation phases are used', () => {
  const expected = {
    sit: 'sit',
    cook: 'cook',
    eat: 'eat',
    read: 'read',
    study: 'read',
    rest: 'sleep',
    garden: 'bench',
  };
  for (const activity of EMIYA_ACTIVITIES) {
    const first = emiyaActivityPose(activity, 0);
    const second = emiyaActivityPose(activity, 0.9);
    assert.equal(first.pose, expected[activity.id as keyof typeof expected]);
    assert.ok(first.frame && second.frame);
    if (activity.id === 'garden') assert.equal(second.phase, 0);
    else assert.equal(second.phase, 1);
    assert.equal(emiyaActivityPose(activity, -1).phase, 0);
  }
});

void test('both courtyards are distinct outdoor areas while indoor paper windows stay independently controllable', () => {
  assert.notEqual(
    EMIYA_ROOMS.forecourt.scene.painting,
    EMIYA_ROOMS.garden.scene.painting,
  );
  assert.equal(emiyaHasPaperWindow('forecourt'), false);
  assert.equal(emiyaHasPaperWindow('garden'), false);
  assert.equal(emiyaHasPaperWindow('hall'), true);
  assert.equal(emiyaHasPaperWindow('rest'), true);
  assert.deepEqual(Object.keys(SHIROU_WALK_SPRITES.frames), [
    'down',
    'left',
    'right',
    'up',
  ]);
  for (const frames of Object.values(SHIROU_WALK_SPRITES.frames))
    assert.equal(frames.length, 6);
});

void test('all seven room pairs and every activity are reached along clear floor segments', () => {
  const targets: EmiyaLocation[] = [
    EMIYA_ENTRY,
    ...EMIYA_ACTIVITIES.map((a) => ({ room: a.room, point: a.point })),
    ...EMIYA_RESIDENT_ROUTINE,
  ];
  for (const from of targets)
    for (const to of targets) {
      const route = emiyaHouseRoute(from, to);
      assert.ok(route, `${from.room} -> ${to.room}`);
      let location = from;
      for (const leg of route) {
        assert.equal(leg.room, location.room);
        for (const point of leg.points) {
          assert.ok(
            interiorClearSegment(
              location.point,
              point,
              EMIYA_ROOMS[leg.room].scene,
            ),
          );
          location = { room: leg.room, point };
        }
        if (leg.door) location = { room: leg.door.to, point: leg.door.arrival };
      }
      assert.equal(location.room, to.room);
      assert.ok(
        Math.hypot(
          location.point.x - to.point.x,
          location.point.y - to.point.y,
        ) < 1e-8,
      );
    }
});

void test('cross-room travel consumes movement distance and finishes at the exact furniture approach', () => {
  const activity = EMIYA_ACTIVITIES.find((a) => a.id === 'read')!;
  const target = { room: activity.room, point: activity.point };
  let location: EmiyaLocation = EMIYA_ENTRY,
    route = emiyaHouseRoute(location, target)!;
  const rooms = new Set([location.room]);
  for (let i = 0; route.length && i < 2000; i++) {
    const next = emiyaAdvanceRoute(location, route, 185 / 60);
    assert.equal(next.blocked, false);
    assert.ok(next.travelled <= 185 / 60 + 1e-8);
    location = next.location;
    route = next.legs;
    rooms.add(location.room);
    assert.ok(
      interiorWalkable(location.point, EMIYA_ROOMS[location.room].scene),
    );
  }
  assert.equal(route.length, 0);
  assert.ok(
    rooms.has('forecourt') &&
      rooms.has('hall') &&
      rooms.has('lounge') &&
      rooms.has('table') &&
      rooms.has('study'),
  );
  assert.deepEqual(location, target);
  assert.ok(emiyaHouseRoute(location, EMIYA_ENTRY)?.length);
});

void test('a resident occupies real space and blocks travel without being crossed or finishing the goal', () => {
  const from: EmiyaLocation = { room: 'hall', point: { x: 500, y: 500 } };
  const to: EmiyaLocation = { room: 'hall', point: { x: 500, y: 90 } };
  const occupied: EmiyaLocation = { room: 'hall', point: { x: 500, y: 300 } };
  const route = emiyaHouseRoute(from, to)!;
  const blocked = emiyaAdvanceRoute(from, route, 500, occupied);
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.legs.length);
  assert.ok(blocked.location.point.y >= 330);
  assert.ok(blocked.travelled < 200);
  const resumed = emiyaAdvanceRoute(blocked.location, blocked.legs, 500, {
    ...occupied,
    room: 'garden',
  });
  assert.equal(resumed.blocked, false);
  assert.equal(resumed.legs.length, 0);
  assert.deepEqual(resumed.location, to);
});

void test('screen-space indoor keys keep horizontal and vertical travel aligned with the authored camera', () => {
  for (const id of EMIYA_ROOM_IDS) {
    const p = { x: 750, y: 520 },
      floor = EMIYA_ROOMS[id].scene.floor;
    for (const input of [
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ]) {
      const delta = emiyaScreenDirection(p, input, id);
      const a = interiorProject(p, floor),
        b = interiorProject(
          { x: p.x + delta.x * 0.01, y: p.y + delta.y * 0.01 },
          floor,
        );
      if (input.x) {
        assert.ok(b.x > a.x);
        assert.ok(Math.abs(b.y - a.y) < 1e-8);
      } else {
        assert.ok(b.y < a.y);
        assert.ok(Math.abs(b.x - a.x) < 1e-8);
      }
    }
  }
});

void test('invalid floor destinations are rejected and original activity IDs remain compatible', () => {
  assert.equal(
    emiyaHouseRoute(EMIYA_ENTRY, { room: 'rest', point: { x: 650, y: 350 } }),
    null,
  );
  assert.equal(
    emiyaHouseRoute(EMIYA_ENTRY, { room: 'study', point: { x: NaN, y: 350 } }),
    null,
  );
  for (const activity of EMIYA_ACTIVITIES) {
    assert.ok(
      interiorWalkable(activity.point, EMIYA_ROOMS[activity.room].scene),
      activity.id,
    );
    assert.ok(
      EMIYA_ROOMS[activity.room].pieces.some((p) => p.id === activity.piece),
    );
    assert.ok(
      ['rest', 'cook', 'eat', 'read', 'study', 'look'].includes(activity.kind),
    );
  }
  assert.deepEqual(
    EMIYA_RESIDENT_ROUTINE.map((r) => r.kind),
    ['cook', 'eat', 'study', 'rest'],
  );
});

void test('a tiny diagonal table corner is checked continuously instead of falling between route samples', () => {
  const scene = EMIYA_ROOMS.table.scene;
  const from = { x: 912, y: 560 },
    to = { x: 680, y: 480 };
  assert.ok(interiorWalkable(from, scene) && interiorWalkable(to, scene));
  assert.equal(interiorClearSegment(from, to, scene), false);
  const route = emiyaHouseRoute(
    { room: 'table', point: from },
    { room: 'table', point: to },
  )!;
  assert.ok(route[0].points.length > 1);
});

void test('keyboard doorway triggers cover the actual opening while keeping actors out of the door jamb', () => {
  const north = EMIYA_DOORS.find((d) => d.id === 'hall-lounge')!;
  assert.equal(emiyaDoorReached({ x: 551, y: 20 }, north), true);
  assert.equal(emiyaDoorReached({ x: 576, y: 20 }, north), false);
  assert.equal(emiyaDoorReached({ x: 551, y: 85 }, north), false);
  const side = EMIYA_DOORS.find((d) => d.id === 'lounge-table')!;
  assert.equal(emiyaDoorReached({ x: 20, y: side.at.y + 45 }, side), true);
  assert.equal(emiyaDoorReached({ x: 20, y: side.at.y + 62 }, side), false);
});
